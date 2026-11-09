import "server-only";
import { GridFSBucket, MongoClient, type Db, type ObjectId } from "mongodb";
import type { ColorKey, Settings, SourceKind } from "./types";

// ---------------------------------------------------------------------------
// Document shapes stored in MongoDB (database: DB_NAME, default
// "abstract-english-dept").
// ---------------------------------------------------------------------------

export interface CategoryDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  color: ColorKey;
  keywords: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AbstractDoc {
  _id: ObjectId;
  serial: number;
  title: string;
  authors: string;
  affiliation: string;
  email: string;
  phone: string;
  body: string;
  keywords: string[];
  proposedTheme: string;
  categoryId: ObjectId | null;
  hidden: boolean;
  notes: string;
  wordCount: number;
  source: {
    kind: SourceKind;
    fileName?: string;
    mimeType?: string;
    size?: number;
    fileId?: ObjectId;
    driveFileId?: string;
    /** Hash of the original file, used to skip duplicate uploads. */
    sha256?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  categorizedAt: Date | null;
}

export interface SettingsDoc extends Partial<Settings> {
  _id: "site";
  updatedAt?: Date;
}

interface CounterDoc {
  _id: string;
  seq: number;
}

// ---------------------------------------------------------------------------
// Connection (one client per server process, reused across requests and HMR).
// ---------------------------------------------------------------------------

const globalForMongo = globalThis as unknown as {
  __mongoClient?: Promise<MongoClient>;
  __mongoIndexes?: Promise<void>;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.DB_URI;
  if (!uri) throw new Error("DB_URI is not set. Add it to .env.local.");
  if (!globalForMongo.__mongoClient) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 12_000,
      appName: "abstract-english-dept",
    });
    globalForMongo.__mongoClient = client.connect().catch((err) => {
      globalForMongo.__mongoClient = undefined;
      throw err;
    });
  }
  return globalForMongo.__mongoClient;
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("categories").createIndex({ order: 1 }),
    db.collection("abstracts").createIndex({ serial: 1 }, { unique: true }),
    db.collection("abstracts").createIndex({ categoryId: 1, hidden: 1, serial: 1 }),
    db.collection("abstracts").createIndex({ createdAt: -1 }),
    db.collection("abstracts").createIndex(
      { "source.driveFileId": 1 },
      { unique: true, partialFilterExpression: { "source.driveFileId": { $type: "string" } } },
    ),
    db.collection("abstracts").createIndex(
      { "source.sha256": 1 },
      { partialFilterExpression: { "source.sha256": { $type: "string" } } },
    ),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.DB_NAME || "abstract-english-dept");
  if (!globalForMongo.__mongoIndexes) {
    globalForMongo.__mongoIndexes = ensureIndexes(db).catch((err) => {
      globalForMongo.__mongoIndexes = undefined;
      console.error("[db] index creation failed", err);
    });
  }
  await globalForMongo.__mongoIndexes;
  return db;
}

export async function collections() {
  const db = await getDb();
  return {
    db,
    categories: db.collection<CategoryDoc>("categories"),
    abstracts: db.collection<AbstractDoc>("abstracts"),
    settings: db.collection<SettingsDoc>("settings"),
    counters: db.collection<CounterDoc>("counters"),
    files: new GridFSBucket(db, { bucketName: "originals" }),
  };
}

/** Next paper number (1, 2, 3 …). Numbers are never reused. */
export async function nextSerial(): Promise<number> {
  const { counters, abstracts } = await collections();
  // Seed the counter from existing data the first time (e.g. after a restore).
  const existing = await counters.findOne({ _id: "abstractSerial" });
  if (!existing) {
    const last = await abstracts.find({}, { projection: { serial: 1 } }).sort({ serial: -1 }).limit(1).next();
    await counters.updateOne({ _id: "abstractSerial" }, { $setOnInsert: { seq: last?.serial ?? 0 } }, { upsert: true });
  }
  const doc = await counters.findOneAndUpdate(
    { _id: "abstractSerial" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error("Could not allocate a paper number.");
  return doc.seq;
}

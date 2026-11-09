import "server-only";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ObjectId } from "mongodb";
import { collections, nextSerial, type AbstractDoc } from "./db";
import { ExtractError, extractText } from "./extract";
import { parseAbstract } from "./parse-abstract";
import { prepareCategories, suggestCategory } from "./suggest";
import { countWords } from "./text";
import type { ImportOutcome, SourceKind } from "./types";

export type { ImportOutcome };

interface ImportInput {
  data: Uint8Array;
  fileName: string;
  mimeType: string;
  kind: SourceKind;
  driveFileId?: string;
}

/** Extracts, parses and stores one abstract file. Throws ExtractError for unreadable files. */
export async function importAbstractFile(input: ImportInput): Promise<ImportOutcome> {
  const { abstracts, files, categories } = await collections();
  const sha256 = createHash("sha256").update(input.data).digest("hex");

  const existing = await abstracts.findOne(
    input.driveFileId
      ? { $or: [{ "source.driveFileId": input.driveFileId }, { "source.sha256": sha256 }] }
      : { "source.sha256": sha256 },
    { projection: { serial: 1, title: 1, authors: 1 } },
  );
  if (existing) {
    return {
      status: "duplicate",
      id: existing._id.toHexString(),
      serial: existing.serial,
      title: existing.title,
      authors: existing.authors,
      warnings: [`Already imported as No. ${existing.serial}.`],
      suggestion: null,
    };
  }

  const { text } = await extractText(input.data, input.fileName, input.mimeType);
  const parsed = parseAbstract(text, input.fileName);

  // Keep the original so admins can open it later (stored in GridFS).
  let fileId: ObjectId | undefined;
  try {
    const upload = files.openUploadStream(input.fileName, {
      metadata: { contentType: input.mimeType || "application/octet-stream", sha256 },
    });
    await pipeline(Readable.from(Buffer.from(input.data)), upload);
    fileId = upload.id as ObjectId;
  } catch (err) {
    console.error("[import] could not store original file", err);
    parsed.warnings.push("The original file could not be stored, but the text was imported.");
  }

  const now = new Date();
  const serial = await nextSerial();
  const doc: Omit<AbstractDoc, "_id"> = {
    serial,
    title: parsed.title,
    authors: parsed.authors,
    affiliation: parsed.affiliation,
    email: parsed.email,
    phone: parsed.phone,
    body: parsed.body,
    keywords: parsed.keywords,
    proposedTheme: parsed.proposedTheme,
    categoryId: null,
    hidden: false,
    notes: "",
    wordCount: countWords(parsed.body),
    source: {
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      fileId,
      sha256,
      ...(input.driveFileId ? { driveFileId: input.driveFileId } : {}),
    },
    createdAt: now,
    updatedAt: now,
    categorizedAt: null,
  };
  // The driver generates _id; the cast only satisfies its typing.
  const { insertedId } = await abstracts.insertOne(doc as AbstractDoc);

  const cats = await categories.find().toArray();
  const suggestion = suggestCategory(
    { title: parsed.title, keywords: parsed.keywords, body: parsed.body, proposedTheme: parsed.proposedTheme },
    prepareCategories(cats.map((c) => ({ id: c._id.toHexString(), name: c.name, keywords: c.keywords ?? [] }))),
  );
  const suggestedName = suggestion ? (cats.find((c) => c._id.toHexString() === suggestion.categoryId)?.name ?? null) : null;

  return {
    status: "created",
    id: insertedId.toHexString(),
    serial,
    title: parsed.title,
    authors: parsed.authors,
    warnings: parsed.warnings,
    suggestion: suggestedName,
  };
}

export { ExtractError };

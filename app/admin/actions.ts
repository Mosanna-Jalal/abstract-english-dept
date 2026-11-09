"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { passwordMatches } from "@/lib/auth-token";
import { COLOR_KEYS, isColorKey } from "@/lib/colors";
import { collections, nextSerial } from "@/lib/db";
import { DriveError, downloadDriveFile, isGoogleDoc, listDriveFolder, parseDriveFolderId, type DriveFile } from "@/lib/drive";
import { ExtractError, MAX_FILE_BYTES, detectKind } from "@/lib/extract";
import { importAbstractFile, type ImportOutcome } from "@/lib/importer";
import { endSession, requireAdmin, startSession } from "@/lib/session";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { STARTER_CATEGORIES } from "@/lib/starter-categories";
import { countWords, parseKeywords, slugify } from "@/lib/text";
import type { ActionResult, Settings } from "@/lib/types";

export interface FormState {
  ok: boolean;
  message: string;
  savedAt?: number;
}

const fail = (error: string) => ({ ok: false as const, error });

function oid(id: unknown): ObjectId | null {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

function field(fd: FormData, key: string, max = 300): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function normaliseBody(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 30_000);
}

function publicChanged(...tags: Array<"abstracts" | "categories" | "settings">) {
  for (const tag of tags) updateTag(tag);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const attempts = new Map<string, { count: number; until: number }>();

export async function loginAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  let entry = attempts.get(ip);
  if (entry?.until && entry.until <= now) {
    attempts.delete(ip);
    entry = undefined;
  }
  if (entry?.until) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, message: "ADMIN_PASSWORD isn’t set on the server. Add it to .env.local." };
  }
  const password = String(formData.get("password") ?? "");
  if (!password || !passwordMatches(password)) {
    const count = (entry?.count ?? 0) + 1;
    attempts.set(ip, { count, until: count >= 5 ? now + 5 * 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 450));
    return { ok: false, message: "That password isn’t right." };
  }
  attempts.delete(ip);
  await startSession();
  const next = String(formData.get("next") ?? "");
  redirect(/^\/admin(?:[/?]|$)/.test(next) && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Categorising
// ---------------------------------------------------------------------------

export async function assignCategoryAction(id: string, categoryId: string | null): Promise<ActionResult> {
  await requireAdmin();
  const _id = oid(id);
  if (!_id) return fail("Unknown abstract.");
  const { abstracts, categories } = await collections();
  let cat: ObjectId | null = null;
  if (categoryId) {
    cat = oid(categoryId);
    if (!cat || !(await categories.countDocuments({ _id: cat }, { limit: 1 }))) {
      return fail("That category no longer exists.");
    }
  }
  const now = new Date();
  const res = await abstracts.updateOne(
    { _id },
    { $set: { categoryId: cat, categorizedAt: cat ? now : null, updatedAt: now } },
  );
  if (!res.matchedCount) return fail("That abstract no longer exists.");
  publicChanged("abstracts");
  refresh();
  return { ok: true };
}

export type BulkOperation =
  | { type: "assign"; categoryId: string | null }
  | { type: "hide" }
  | { type: "unhide" }
  | { type: "delete" };

export async function bulkAction(ids: string[], op: BulkOperation): Promise<ActionResult> {
  await requireAdmin();
  const objectIds = ids.slice(0, 1000).map(oid).filter((x): x is ObjectId => x !== null);
  if (!objectIds.length) return fail("Nothing selected.");
  const { abstracts, categories, files } = await collections();
  const now = new Date();
  const scope = { _id: { $in: objectIds } };
  let n = 0;

  if (op.type === "assign") {
    let cat: ObjectId | null = null;
    if (op.categoryId) {
      cat = oid(op.categoryId);
      if (!cat || !(await categories.countDocuments({ _id: cat }, { limit: 1 }))) return fail("That category no longer exists.");
    }
    n = (await abstracts.updateMany(scope, { $set: { categoryId: cat, categorizedAt: cat ? now : null, updatedAt: now } }))
      .modifiedCount;
  } else if (op.type === "hide" || op.type === "unhide") {
    n = (await abstracts.updateMany(scope, { $set: { hidden: op.type === "hide", updatedAt: now } })).modifiedCount;
  } else if (op.type === "delete") {
    const docs = await abstracts.find(scope, { projection: { "source.fileId": 1 } }).toArray();
    await Promise.all(
      docs
        .map((d) => d.source?.fileId)
        .filter((f): f is ObjectId => Boolean(f))
        .map((f) => files.delete(f).catch(() => undefined)),
    );
    n = (await abstracts.deleteMany(scope)).deletedCount;
  }

  publicChanged("abstracts");
  refresh();
  const verb = { assign: "Updated", hide: "Hid", unhide: "Restored", delete: "Deleted" }[op.type];
  return { ok: true, message: `${verb} ${n} abstract${n === 1 ? "" : "s"}.` };
}

// ---------------------------------------------------------------------------
// Abstracts
// ---------------------------------------------------------------------------

export async function saveAbstractAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { abstracts, categories } = await collections();

  const id = oid(field(formData, "id", 24));
  const title = field(formData, "title", 400).replace(/\s+/g, " ");
  if (!title) return { ok: false, message: "Please add a title." };

  const categoryInput = field(formData, "categoryId", 24);
  let categoryId: ObjectId | null = null;
  if (categoryInput) {
    categoryId = oid(categoryInput);
    if (!categoryId || !(await categories.countDocuments({ _id: categoryId }, { limit: 1 }))) {
      return { ok: false, message: "That category no longer exists." };
    }
  }

  const body = normaliseBody(String(formData.get("body") ?? ""));
  const email = field(formData, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email address doesn’t look right." };

  const values = {
    title,
    authors: field(formData, "authors", 400),
    affiliation: field(formData, "affiliation", 600),
    email,
    phone: field(formData, "phone", 40),
    keywords: parseKeywords(field(formData, "keywords", 1000)),
    proposedTheme: field(formData, "proposedTheme", 300),
    notes: field(formData, "notes", 4000),
    hidden: formData.get("hidden") === "on",
    body,
    wordCount: countWords(body),
    categoryId,
  };
  const now = new Date();

  if (!id) {
    const serial = await nextSerial();
    const { insertedId } = await abstracts.insertOne({
      _id: new ObjectId(),
      ...values,
      serial,
      source: { kind: "manual" },
      createdAt: now,
      updatedAt: now,
      categorizedAt: categoryId ? now : null,
    });
    publicChanged("abstracts");
    redirect(`/admin/abstracts/${insertedId.toHexString()}?created=${serial}`);
  }

  const before = await abstracts.findOne({ _id: id }, { projection: { categoryId: 1 } });
  if (!before) return { ok: false, message: "This abstract was deleted." };
  const categoryChanged = String(before.categoryId ?? "") !== String(categoryId ?? "");
  await abstracts.updateOne(
    { _id: id },
    {
      $set: {
        ...values,
        updatedAt: now,
        ...(categoryChanged ? { categorizedAt: categoryId ? now : null } : {}),
      },
    },
  );
  publicChanged("abstracts");
  refresh();
  return { ok: true, message: "Changes saved.", savedAt: now.getTime() };
}

export async function deleteAbstractAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const _id = oid(id);
  if (!_id) return fail("Unknown abstract.");
  const { abstracts, files } = await collections();
  const doc = await abstracts.findOne({ _id }, { projection: { "source.fileId": 1 } });
  if (doc?.source?.fileId) await files.delete(doc.source.fileId).catch(() => undefined);
  await abstracts.deleteOne({ _id });
  publicChanged("abstracts");
  redirect("/admin/abstracts");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function categoryKeywords(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,;\n]/)
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 1 && k.length <= 60),
    ),
  ].slice(0, 60);
}

async function uniqueSlug(name: string, exceptId?: ObjectId): Promise<string> {
  const { categories } = await collections();
  const base = slugify(name) || "category";
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const clash = await categories.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { projection: { _id: 1 } });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveCategoryAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { categories } = await collections();
  const id = oid(field(formData, "id", 24));
  const name = field(formData, "name", 80).replace(/\s+/g, " ");
  if (!name) return { ok: false, message: "Please give the category a name." };

  const duplicate = await categories.findOne(
    { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, ...(id ? { _id: { $ne: id } } : {}) },
    { projection: { _id: 1 } },
  );
  if (duplicate) return { ok: false, message: "A category with this name already exists." };

  const colorInput = field(formData, "color", 20);
  const description = field(formData, "description", 300);
  const keywords = categoryKeywords(field(formData, "keywords", 3000));
  const now = new Date();

  if (id) {
    const res = await categories.updateOne(
      { _id: id },
      {
        $set: {
          name,
          slug: await uniqueSlug(name, id),
          description,
          keywords,
          ...(isColorKey(colorInput) ? { color: colorInput } : {}),
          updatedAt: now,
        },
      },
    );
    if (!res.matchedCount) return { ok: false, message: "This category was deleted." };
  } else {
    const existing = await categories.find({}, { projection: { order: 1, color: 1 } }).toArray();
    const used = new Set(existing.map((c) => c.color));
    const color = isColorKey(colorInput) ? colorInput : (COLOR_KEYS.find((c) => !used.has(c)) ?? COLOR_KEYS[existing.length % COLOR_KEYS.length]);
    await categories.insertOne({
      _id: new ObjectId(),
      name,
      slug: await uniqueSlug(name),
      description,
      keywords,
      color,
      order: existing.reduce((max, c) => Math.max(max, c.order ?? 0), -1) + 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  publicChanged("categories", "abstracts");
  refresh();
  return { ok: true, message: id ? "Category updated." : `“${name}” added.`, savedAt: now.getTime() };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const _id = oid(id);
  if (!_id) return fail("Unknown category.");
  const { categories, abstracts } = await collections();
  const moved = await abstracts.updateMany(
    { categoryId: _id },
    { $set: { categoryId: null, categorizedAt: null, updatedAt: new Date() } },
  );
  await categories.deleteOne({ _id });
  publicChanged("categories", "abstracts");
  refresh();
  const n = moved.modifiedCount;
  return {
    ok: true,
    message: n ? `Category deleted. ${n} abstract${n === 1 ? "" : "s"} moved back to the queue.` : "Category deleted.",
  };
}

export async function moveCategoryAction(id: string, direction: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  const { categories } = await collections();
  const list = await categories.find({}, { projection: { _id: 1 } }).sort({ order: 1, name: 1 }).toArray();
  const index = list.findIndex((c) => c._id.toHexString() === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return { ok: true };
  [list[index], list[target]] = [list[target], list[index]];
  await categories.bulkWrite(list.map((c, order) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { order } } } })));
  publicChanged("categories", "abstracts");
  refresh();
  return { ok: true };
}

export async function addStarterCategoriesAction(): Promise<ActionResult> {
  await requireAdmin();
  const { categories } = await collections();
  if (await categories.countDocuments({}, { limit: 1 })) return fail("Categories already exist.");
  const now = new Date();
  await categories.insertMany(
    STARTER_CATEGORIES.map((c, order) => ({
      _id: new ObjectId(),
      ...c,
      slug: slugify(c.name),
      order,
      createdAt: now,
      updatedAt: now,
    })),
  );
  publicChanged("categories", "abstracts");
  refresh();
  return { ok: true, message: `Added ${STARTER_CATEGORIES.length} starter categories.` };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveSettingsAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const limits: Partial<Record<keyof Settings, number>> = { about: 1500, guidelines: 6000 };
  const update: Record<string, string | number> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
    const raw = formData.get(key);
    if (raw === null) continue;
    if (typeof DEFAULT_SETTINGS[key] === "number") {
      const n = Math.floor(Number(raw));
      update[key] = Number.isFinite(n) ? Math.min(Math.max(n, 0), 10_000) : 0;
    } else {
      const max = limits[key] ?? 200;
      update[key] = String(raw).replace(/\r\n?/g, "\n").trim().slice(0, max);
    }
  }
  const wmin = Number(update.wordLimitMin ?? 0);
  const wmax = Number(update.wordLimitMax ?? 0);
  if (wmin && wmax && wmin > wmax) return { ok: false, message: "The minimum word count is larger than the maximum." };
  const kmin = Number(update.keywordsMin ?? 0);
  const kmax = Number(update.keywordsMax ?? 0);
  if (kmin && kmax && kmin > kmax) return { ok: false, message: "The minimum keyword count is larger than the maximum." };

  const { settings } = await collections();
  const now = new Date();
  await settings.updateOne({ _id: "site" }, { $set: { ...update, updatedAt: now } }, { upsert: true });
  publicChanged("settings");
  refresh();
  return { ok: true, message: "Settings saved.", savedAt: now.getTime() };
}

// ---------------------------------------------------------------------------
// Importing
// ---------------------------------------------------------------------------

export async function importUploadAction(formData: FormData): Promise<ActionResult<ImportOutcome>> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("No file received.");
  if (file.size > MAX_FILE_BYTES) return fail("This file is larger than 10 MB.");
  if (!file.size) return fail("This file is empty.");
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const outcome = await importAbstractFile({ data, fileName: file.name, mimeType: file.type, kind: "upload" });
    return { ok: true, data: outcome };
  } catch (err) {
    if (err instanceof ExtractError) return fail(err.message);
    console.error("[import] upload failed", err);
    return fail("Something went wrong while importing this file.");
  }
}

export interface DriveListing {
  folderId: string;
  files: Array<
    DriveFile & {
      status: "new" | "imported" | "skipped";
      reason: string;
      serial: number | null;
    }
  >;
}

const NOT_AN_ABSTRACT = /brochure|poster|flyer|banner|schedule|programme|program|invitation|certificate|notice|circular|registration\s*form/i;

export async function scanDriveAction(folderInput: string): Promise<ActionResult<DriveListing>> {
  await requireAdmin();
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return fail("NO_API_KEY");
  const folderId = parseDriveFolderId(folderInput || process.env.DRIVE_FOLDER_ID || "");
  if (!folderId) return fail("Paste a Google Drive folder link or ID.");

  try {
    const files = await listDriveFolder(folderId, apiKey);
    const { abstracts } = await collections();
    const imported = await abstracts
      .find({ "source.driveFileId": { $in: files.map((f) => f.id) } }, { projection: { serial: 1, "source.driveFileId": 1 } })
      .toArray();
    const importedMap = new Map(imported.map((d) => [d.source.driveFileId as string, d.serial]));

    return {
      ok: true,
      data: {
        folderId,
        files: files.map((f) => {
          const serial = importedMap.get(f.id) ?? null;
          if (serial) return { ...f, status: "imported" as const, reason: `Imported as No. ${serial}`, serial };
          const kind = isGoogleDoc(f.mimeType) ? "text" : detectKind(f.name, f.mimeType);
          if (kind === "unsupported" || kind === "doc") {
            return { ...f, status: "skipped" as const, reason: kind === "doc" ? "Old .doc format" : "Not a PDF, Word or text file", serial };
          }
          if (NOT_AN_ABSTRACT.test(f.name)) return { ...f, status: "skipped" as const, reason: "Looks like a brochure or notice", serial };
          if (f.size > MAX_FILE_BYTES) return { ...f, status: "skipped" as const, reason: "Larger than 10 MB", serial };
          return { ...f, status: "new" as const, reason: "", serial };
        }),
      },
    };
  } catch (err) {
    if (err instanceof DriveError) return fail(err.message);
    console.error("[drive] scan failed", err);
    return fail("Couldn’t reach Google Drive. Check your connection and try again.");
  }
}

export async function importDriveFileAction(file: { id: string; name: string; mimeType: string }): Promise<ActionResult<ImportOutcome>> {
  await requireAdmin();
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return fail("NO_API_KEY");
  if (!/^[A-Za-z0-9_-]{10,}$/.test(file.id)) return fail("Invalid Drive file.");
  try {
    const { data, mimeType, fileName } = await downloadDriveFile(file, apiKey);
    if (data.byteLength > MAX_FILE_BYTES) return fail("This file is larger than 10 MB.");
    const outcome = await importAbstractFile({ data, fileName, mimeType, kind: "drive", driveFileId: file.id });
    return { ok: true, data: outcome };
  } catch (err) {
    if (err instanceof ExtractError || err instanceof DriveError) return fail(err.message);
    console.error("[drive] import failed", err);
    return fail("Something went wrong while importing this file.");
  }
}

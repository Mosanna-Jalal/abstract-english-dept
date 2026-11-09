import "server-only";
import type { AbstractDoc, CategoryDoc } from "./db";
import type { AbstractCardDTO, AdminAbstractDTO, CategoryRef } from "./types";
import { excerpt } from "./text";

export function toCategoryRef(c: CategoryDoc): CategoryRef {
  return { id: c._id.toHexString(), name: c.name, slug: c.slug, color: c.color };
}

export type CardSource = Pick<
  AbstractDoc,
  "_id" | "serial" | "title" | "authors" | "affiliation" | "keywords" | "wordCount" | "categoryId"
> & { bodyStart?: string; body?: string };

export function toCard(doc: CardSource, cats: Map<string, CategoryRef>): AbstractCardDTO {
  const catId = doc.categoryId ? doc.categoryId.toHexString() : null;
  return {
    id: doc._id.toHexString(),
    serial: doc.serial,
    title: doc.title || "Untitled abstract",
    authors: doc.authors ?? "",
    affiliation: doc.affiliation ?? "",
    keywords: doc.keywords ?? [],
    excerpt: excerpt(doc.bodyStart ?? doc.body ?? "", 240),
    wordCount: doc.wordCount ?? 0,
    category: catId ? (cats.get(catId) ?? null) : null,
  };
}

export function toAdmin(doc: AbstractDoc, cats: Map<string, CategoryRef>, includeBody = true): AdminAbstractDTO {
  const card = toCard(doc, cats);
  return {
    ...card,
    body: includeBody ? (doc.body ?? "") : "",
    createdAt: (doc.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (doc.updatedAt ?? doc.createdAt ?? new Date(0)).toISOString(),
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    notes: doc.notes ?? "",
    hidden: Boolean(doc.hidden),
    proposedTheme: doc.proposedTheme ?? "",
    categoryId: doc.categoryId ? doc.categoryId.toHexString() : null,
    source: {
      kind: doc.source?.kind ?? "manual",
      fileName: doc.source?.fileName ?? "",
      mimeType: doc.source?.mimeType ?? "",
      size: doc.source?.size ?? 0,
      hasFile: Boolean(doc.source?.fileId),
      driveFileId: doc.source?.driveFileId ?? "",
    },
  };
}

export function categoryMap(cats: CategoryDoc[]): Map<string, CategoryRef> {
  return new Map(cats.map((c) => [c._id.toHexString(), toCategoryRef(c)]));
}

/** Splits an authors line ("Dr. A, B and C") into individual names. */
export function splitAuthors(authors: string): string[] {
  return authors
    .split(/\s*(?:,|;|&|\band\b)\s*/i)
    .map((s) => s.replace(/^(?:dr|prof|mr|mrs|ms|miss|shri|smt|sri)\.?\s+/i, "").trim().toLowerCase())
    .filter((s) => s.length > 2);
}

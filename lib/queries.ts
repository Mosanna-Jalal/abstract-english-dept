import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ObjectId, type Document, type Filter } from "mongodb";
import { collections, type AbstractDoc, type CategoryDoc } from "./db";
import { splitAuthors, toCard } from "./mappers";
import { mergeSettings } from "./settings";
import { escapeRegex } from "./text";
import type { AbstractCardDTO, AbstractDetailDTO, CategoryDTO, CategoryRef, Settings } from "./types";

// Public, cached reads. Tags are invalidated by the admin Server Actions
// (updateTag), and `hours` is a safety net for edits made outside the app
// (e.g. directly in MongoDB Compass).
//
// An abstract is public once it has a category and isn't hidden.

const PAGE_SIZE = 12;

function visible(): Filter<AbstractDoc> {
  return { hidden: { $ne: true }, categoryId: { $ne: null } };
}

const CARD_FIELDS = {
  serial: 1,
  title: 1,
  authors: 1,
  affiliation: 1,
  keywords: 1,
  wordCount: 1,
  categoryId: 1,
  bodyStart: { $substrCP: [{ $ifNull: ["$body", ""] }, 0, 420] },
} as const;

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const { settings } = await collections();
  return mergeSettings(await settings.findOne({ _id: "site" }));
}

async function categoryDocs(): Promise<CategoryDoc[]> {
  const { categories } = await collections();
  return categories.find().sort({ order: 1, name: 1 }).toArray();
}

export async function getCategories(): Promise<CategoryDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "abstracts");
  const { abstracts } = await collections();
  const [cats, counts] = await Promise.all([
    categoryDocs(),
    abstracts
      .aggregate<{ _id: ObjectId; n: number }>([{ $match: visible() }, { $group: { _id: "$categoryId", n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toHexString(), c.n]));
  return cats.map((c) => ({
    id: c._id.toHexString(),
    name: c.name,
    slug: c.slug,
    color: c.color,
    description: c.description ?? "",
    keywords: c.keywords ?? [],
    order: c.order ?? 0,
    count: countMap.get(c._id.toHexString()) ?? 0,
  }));
}

function refMap(cats: CategoryDTO[]): Map<string, CategoryRef> {
  return new Map(cats.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug, color: c.color }]));
}

export async function getCategory(slug: string): Promise<CategoryDTO | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "abstracts");
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export interface SiteStats {
  abstracts: number;
  categories: number;
  contributors: number;
  words: number;
}

export async function getStats(): Promise<SiteStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("abstracts", "categories");
  const { abstracts } = await collections();
  const [rows, cats] = await Promise.all([
    abstracts
      .find(visible(), { projection: { authors: 1, wordCount: 1 } })
      .toArray(),
    getCategories(),
  ]);
  const names = new Set<string>();
  let words = 0;
  for (const r of rows) {
    words += r.wordCount ?? 0;
    for (const n of splitAuthors(r.authors ?? "")) names.add(n);
  }
  return {
    abstracts: rows.length,
    categories: cats.filter((c) => c.count > 0).length,
    contributors: names.size,
    words,
  };
}

export interface SearchInput {
  q: string;
  category: string;
  page: number;
}

export interface SearchResult {
  items: AbstractCardDTO[];
  total: number;
  page: number;
  pages: number;
  category: CategoryDTO | null;
  unknownCategory: boolean;
}

export async function searchAbstracts({ q, category, page }: SearchInput): Promise<SearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("abstracts", "categories");

  const { abstracts } = await collections();
  const cats = await getCategories();
  const filter: Filter<AbstractDoc> = visible();
  let active: CategoryDTO | null = null;

  if (category) {
    active = cats.find((c) => c.slug === category) ?? null;
    if (!active) return { items: [], total: 0, page: 1, pages: 0, category: null, unknownCategory: true };
    filter.categoryId = new ObjectId(active.id);
  }

  const terms = q
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .slice(0, 6)
    .map((t) => escapeRegex(t.slice(0, 40)));

  if (terms.length) {
    filter.$and = terms.map((t) => {
      const rx = new RegExp(t, "i");
      return { $or: [{ title: rx }, { authors: rx }, { affiliation: rx }, { keywords: rx }, { body: rx }] };
    });
  }

  const total = await abstracts.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);

  const pipeline: Document[] = [{ $match: filter }];
  if (terms.length) {
    // Rank title / author / keyword hits above body-only hits.
    const hit = (field: unknown, t: string, weight: number) => ({
      $cond: [{ $regexMatch: { input: field, regex: t, options: "i" } }, weight, 0],
    });
    const keywordsText = {
      $reduce: { input: { $ifNull: ["$keywords", []] }, initialValue: "", in: { $concat: ["$$value", " ", "$$this"] } },
    };
    pipeline.push({
      $addFields: {
        _rank: {
          $add: terms.flatMap((t) => [
            hit({ $ifNull: ["$title", ""] }, t, 5),
            hit({ $ifNull: ["$authors", ""] }, t, 4),
            hit(keywordsText, t, 3),
          ]),
        },
      },
    });
    pipeline.push({ $sort: { _rank: -1, serial: 1 } });
  } else {
    pipeline.push({ $sort: { serial: 1 } });
  }
  pipeline.push({ $skip: (current - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }, { $project: CARD_FIELDS });

  const docs = await abstracts.aggregate<AbstractDoc & { bodyStart: string }>(pipeline).toArray();
  const map = refMap(cats);
  return {
    items: docs.map((d) => toCard(d, map)),
    total,
    page: current,
    pages: total ? pages : 0,
    category: active,
    unknownCategory: false,
  };
}

export async function getRecentAbstracts(limit = 6): Promise<AbstractCardDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("abstracts", "categories");
  const { abstracts } = await collections();
  const [docs, cats] = await Promise.all([
    abstracts
      .aggregate<AbstractDoc & { bodyStart: string }>([
        { $match: visible() },
        { $sort: { categorizedAt: -1, serial: -1 } },
        { $limit: limit },
        { $project: CARD_FIELDS },
      ])
      .toArray(),
    getCategories(),
  ]);
  const map = refMap(cats);
  return docs.map((d) => toCard(d, map));
}

export interface AbstractPage {
  abstract: AbstractDetailDTO;
  prev: { serial: number; title: string } | null;
  next: { serial: number; title: string } | null;
  position: number;
  ofTotal: number;
}

export async function getAbstractPage(serial: number): Promise<AbstractPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("abstracts", "categories");
  if (!Number.isInteger(serial) || serial < 1) return null;
  const { abstracts } = await collections();
  const doc = await abstracts.findOne({ ...visible(), serial });
  if (!doc || !doc.categoryId) return null;

  const cats = await getCategories();
  const map = refMap(cats);
  const sameCategory: Filter<AbstractDoc> = { ...visible(), categoryId: doc.categoryId };
  const [prev, next, position, ofTotal] = await Promise.all([
    abstracts.find({ ...sameCategory, serial: { $lt: serial } }, { projection: { serial: 1, title: 1 } }).sort({ serial: -1 }).limit(1).next(),
    abstracts.find({ ...sameCategory, serial: { $gt: serial } }, { projection: { serial: 1, title: 1 } }).sort({ serial: 1 }).limit(1).next(),
    abstracts.countDocuments({ ...sameCategory, serial: { $lte: serial } }),
    abstracts.countDocuments(sameCategory),
  ]);

  return {
    abstract: { ...toCard(doc, map), body: doc.body ?? "", createdAt: (doc.createdAt ?? new Date(0)).toISOString() },
    prev: prev ? { serial: prev.serial, title: prev.title } : null,
    next: next ? { serial: next.serial, title: next.title } : null,
    position,
    ofTotal,
  };
}

export interface BookSection {
  category: CategoryDTO;
  items: AbstractDetailDTO[];
}

export async function getBook(): Promise<BookSection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("abstracts", "categories");
  const { abstracts } = await collections();
  const [docs, cats] = await Promise.all([
    abstracts.find(visible()).sort({ serial: 1 }).toArray(),
    getCategories(),
  ]);
  const map = refMap(cats);
  return cats
    .map((category) => ({
      category,
      items: docs
        .filter((d) => d.categoryId?.toHexString() === category.id)
        .map((d) => ({ ...toCard(d, map), body: d.body ?? "", createdAt: (d.createdAt ?? new Date(0)).toISOString() })),
    }))
    .filter((s) => s.items.length > 0);
}

export async function getFooterYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

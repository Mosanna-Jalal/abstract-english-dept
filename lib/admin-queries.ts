import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { collections, type AbstractDoc } from "./db";
import { categoryMap, toAdmin } from "./mappers";
import { requireAdmin } from "./session";
import { mergeSettings } from "./settings";
import { prepareCategories, suggestCategory } from "./suggest";
import { escapeRegex } from "./text";
import type { AdminAbstractDTO, CategoryDTO, QueueItemDTO, Settings } from "./types";

// Admin reads: always fresh (no cache) and always behind requireAdmin().

export async function getAdminCategories(): Promise<CategoryDTO[]> {
  await requireAdmin();
  const { categories, abstracts } = await collections();
  const [cats, counts] = await Promise.all([
    categories.find().sort({ order: 1, name: 1 }).toArray(),
    abstracts
      .aggregate<{ _id: ObjectId | null; n: number }>([
        { $match: { hidden: { $ne: true } } },
        { $group: { _id: "$categoryId", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const countMap = new Map(counts.map((c) => [c._id ? c._id.toHexString() : "none", c.n]));
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

export async function getAdminSettings(): Promise<Settings> {
  await requireAdmin();
  const { settings } = await collections();
  return mergeSettings(await settings.findOne({ _id: "site" }));
}

export interface DashboardData {
  total: number;
  categorised: number;
  uncategorised: number;
  hidden: number;
  categories: CategoryDTO[];
  recent: AdminAbstractDTO[];
}

export async function getDashboard(): Promise<DashboardData> {
  await requireAdmin();
  const { abstracts, categories } = await collections();
  const [cats, catDocs, total, hidden, uncategorised, recentDocs] = await Promise.all([
    getAdminCategories(),
    categories.find().toArray(),
    abstracts.countDocuments({}),
    abstracts.countDocuments({ hidden: true }),
    abstracts.countDocuments({ hidden: { $ne: true }, categoryId: null }),
    abstracts.find({}).sort({ createdAt: -1 }).limit(6).toArray(),
  ]);
  const map = categoryMap(catDocs);
  return {
    total,
    hidden,
    uncategorised,
    categorised: total - hidden - uncategorised,
    categories: cats,
    recent: recentDocs.map((d) => toAdmin(d, map, false)),
  };
}

export async function getQueue(limit = 25): Promise<{ items: QueueItemDTO[]; remaining: number; categories: CategoryDTO[] }> {
  await requireAdmin();
  const { abstracts } = await collections();
  const filter: Filter<AbstractDoc> = { hidden: { $ne: true }, categoryId: null };
  const [cats, remaining, docs] = await Promise.all([
    getAdminCategories(),
    abstracts.countDocuments(filter),
    abstracts.find(filter).sort({ serial: 1 }).limit(limit).toArray(),
  ]);
  const prepared = prepareCategories(cats);
  const map = new Map(cats.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug, color: c.color }]));
  return {
    remaining,
    categories: cats,
    items: docs.map((d) => ({
      ...toAdmin(d, map),
      suggestion: suggestCategory(
        { title: d.title, keywords: d.keywords ?? [], body: d.body ?? "", proposedTheme: d.proposedTheme ?? "" },
        prepared,
      ),
    })),
  };
}

export interface AdminListInput {
  q: string;
  cat: string; // "" = all, "none" = uncategorised, otherwise a category id
  status: string; // "" | "visible" | "hidden"
  page: number;
}

export const ADMIN_PAGE_SIZE = 40;

export async function listAdminAbstracts(input: AdminListInput): Promise<{
  items: AdminAbstractDTO[];
  total: number;
  page: number;
  pages: number;
}> {
  await requireAdmin();
  const { abstracts, categories } = await collections();
  const filter: Filter<AbstractDoc> = {};

  if (input.cat === "none") filter.categoryId = null;
  else if (input.cat && ObjectId.isValid(input.cat)) filter.categoryId = new ObjectId(input.cat);

  if (input.status === "hidden") filter.hidden = true;
  else if (input.status === "visible") filter.hidden = { $ne: true };

  const q = input.q.trim();
  if (q) {
    const asNumber = Number(q.replace(/^(?:no\.?|#)\s*/i, ""));
    const terms = q.split(/\s+/).slice(0, 6).map((t) => new RegExp(escapeRegex(t.slice(0, 40)), "i"));
    const textMatch = {
      $and: terms.map((rx) => ({
        $or: [{ title: rx }, { authors: rx }, { affiliation: rx }, { email: rx }, { keywords: rx }, { body: rx }, { "source.fileName": rx }],
      })),
    };
    filter.$or = Number.isInteger(asNumber) && asNumber > 0 ? [{ serial: asNumber }, textMatch] : [textMatch];
  }

  const total = await abstracts.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, input.page), pages);
  const [docs, catDocs] = await Promise.all([
    abstracts
      .find(filter, { projection: { body: 0 } })
      .sort({ serial: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .toArray(),
    categories.find().toArray(),
  ]);
  const map = categoryMap(catDocs);
  return { items: docs.map((d) => toAdmin(d as AbstractDoc, map, false)), total, page, pages };
}

export async function getAdminAbstract(id: string): Promise<AdminAbstractDTO | null> {
  await requireAdmin();
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  const { abstracts, categories } = await collections();
  const [doc, catDocs] = await Promise.all([abstracts.findOne({ _id: new ObjectId(id) }), categories.find().toArray()]);
  return doc ? toAdmin(doc, categoryMap(catDocs)) : null;
}

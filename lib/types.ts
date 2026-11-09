// Shapes that cross the server/client boundary. Everything here is plain,
// serialisable data (ids are strings, dates are ISO strings).

export type ColorKey =
  | "claret"
  | "indigo"
  | "sage"
  | "ochre"
  | "teal"
  | "plum"
  | "slate"
  | "terracotta"
  | "olive"
  | "rose"
  | "navy"
  | "copper";

export interface Settings {
  siteTitle: string;
  eventTitle: string;
  eventSubtitle: string;
  organizer: string;
  institution: string;
  eventDate: string;
  venue: string;
  about: string;
  /** One guideline per line. */
  guidelines: string;
  /** 0 means "no limit". */
  wordLimitMin: number;
  wordLimitMax: number;
  keywordsMin: number;
  keywordsMax: number;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  color: ColorKey;
}

export interface CategoryDTO extends CategoryRef {
  description: string;
  keywords: string[];
  order: number;
  /** Abstracts in this category (public counts only visible ones). */
  count: number;
}

export interface AbstractCardDTO {
  id: string;
  serial: number;
  title: string;
  authors: string;
  affiliation: string;
  keywords: string[];
  excerpt: string;
  wordCount: number;
  category: CategoryRef | null;
}

export interface AbstractDetailDTO extends AbstractCardDTO {
  body: string;
  createdAt: string;
}

export type SourceKind = "upload" | "drive" | "manual";

export interface SourceDTO {
  kind: SourceKind;
  fileName: string;
  mimeType: string;
  size: number;
  hasFile: boolean;
  driveFileId: string;
}

export interface Suggestion {
  categoryId: string;
  score: number;
  confidence: "high" | "medium" | "low";
  matched: string[];
}

export interface AdminAbstractDTO extends AbstractDetailDTO {
  email: string;
  phone: string;
  notes: string;
  hidden: boolean;
  proposedTheme: string;
  categoryId: string | null;
  source: SourceDTO;
  updatedAt: string;
}

export interface QueueItemDTO extends AdminAbstractDTO {
  suggestion: Suggestion | null;
}

export interface ImportOutcome {
  status: "created" | "duplicate";
  id: string;
  serial: number;
  title: string;
  authors: string;
  warnings: string[];
  suggestion: string | null;
}

export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

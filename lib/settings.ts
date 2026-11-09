import type { Settings } from "./types";

// Defaults used until an admin saves the Settings page. Edit them there
// (Admin → Settings) rather than here, so the site updates without a deploy.
export const DEFAULT_SETTINGS: Settings = {
  siteTitle: "Abstract Archive",
  eventTitle: "Book of Abstracts",
  eventSubtitle: "Research abstracts, read and catalogued by theme.",
  organizer: "Department of English",
  institution: "GBM College, Gaya",
  eventDate: "",
  venue: "",
  about:
    "A curated, categorised collection of research abstracts submitted to the Department of English. Browse by category, search by author or keyword, and read each abstract in full.",
  guidelines: "",
  wordLimitMin: 0,
  wordLimitMax: 0,
  keywordsMin: 0,
  keywordsMax: 0,
};

export function mergeSettings(doc: Partial<Settings> | null | undefined): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!doc) return out;
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
    const value = doc[key];
    if (value === undefined || value === null) continue;
    if (typeof DEFAULT_SETTINGS[key] === "number") {
      const n = Number(value);
      (out[key] as number) = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } else if (typeof value === "string") {
      (out[key] as string) = value;
    }
  }
  return out;
}

export function guidelineLines(settings: Settings): string[] {
  return settings.guidelines
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export interface GuidelineCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/** Compares an abstract with the word / keyword limits from Settings. */
export function guidelineChecks(
  settings: Settings,
  a: { wordCount: number; keywords: string[]; title: string; authors: string },
): GuidelineCheck[] {
  const checks: GuidelineCheck[] = [];
  const { wordLimitMin: wmin, wordLimitMax: wmax, keywordsMin: kmin, keywordsMax: kmax } = settings;
  if (wmin || wmax) {
    const range = wmin && wmax ? `${wmin}–${wmax}` : wmax ? `up to ${wmax}` : `at least ${wmin}`;
    checks.push({
      label: "Word limit",
      ok: (!wmin || a.wordCount >= wmin) && (!wmax || a.wordCount <= wmax),
      detail: `${a.wordCount} words (guideline: ${range})`,
    });
  }
  if (kmin || kmax) {
    const n = a.keywords.length;
    const range = kmin && kmax ? `${kmin}–${kmax}` : kmax ? `up to ${kmax}` : `at least ${kmin}`;
    checks.push({
      label: "Keywords",
      ok: (!kmin || n >= kmin) && (!kmax || n <= kmax),
      detail: `${n} keyword${n === 1 ? "" : "s"} (guideline: ${range})`,
    });
  }
  checks.push({ label: "Title", ok: a.title.trim().length > 0, detail: a.title.trim() ? "Present" : "Missing" });
  checks.push({ label: "Author", ok: a.authors.trim().length > 0, detail: a.authors.trim() ? "Present" : "Missing" });
  return checks;
}

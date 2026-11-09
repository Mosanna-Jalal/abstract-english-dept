import type { Suggestion } from "./types";

// Lightweight, explainable category suggestions: each category contributes
// search terms (its name plus admin-defined keywords) and an abstract is
// scored by where those terms occur. Title and keywords weigh more than body.

export interface SuggestInput {
  title: string;
  keywords: string[];
  body: string;
  proposedTheme: string;
}

export interface SuggestCategory {
  id: string;
  name: string;
  keywords: string[];
}

interface PreparedTerm {
  term: string;
  rx: RegExp;
}

export interface PreparedCategory {
  id: string;
  nameTokens: string[];
  terms: PreparedTerm[];
}

const GENERIC = new Set([
  "and", "the", "of", "in", "on", "a", "an", "to", "for", "with", "its", "their",
  "studies", "study", "literature", "literatures", "literary", "writing", "writings",
  "english", "new", "voices", "perspectives", "approaches", "issues", "themes", "theme",
  "sub", "contemporary", "modern", "texts", "text", "representation", "representations",
]);

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !GENERIC.has(t));
}

function compile(term: string): RegExp {
  const single = !/\s/.test(term);
  // Prefix-match longer single words so "postcolonial" also finds "postcolonialism".
  const pattern = single && term.length >= 5 ? `\\b${escape(term)}\\w*` : `\\b${escape(term)}\\b`;
  return new RegExp(pattern, "gi");
}

export function prepareCategories(categories: SuggestCategory[]): PreparedCategory[] {
  return categories.map((c) => {
    const nameTokens = tokens(c.name);
    const raw = [...nameTokens, ...c.keywords.map((k) => k.toLowerCase().trim())].filter((k) => k.length > 1);
    const unique = [...new Set(raw)];
    return { id: c.id, nameTokens, terms: unique.map((term) => ({ term, rx: compile(term) })) };
  });
}

function count(rx: RegExp, text: string): number {
  if (!text) return 0;
  rx.lastIndex = 0;
  return text.match(rx)?.length ?? 0;
}

export function suggestCategory(input: SuggestInput, prepared: PreparedCategory[]): Suggestion | null {
  if (!prepared.length) return null;
  const title = input.title ?? "";
  const kw = (input.keywords ?? []).join(" · ");
  const body = input.body ?? "";
  const themeTokens = new Set(tokens(input.proposedTheme ?? ""));

  const scored = prepared.map((c) => {
    const contributions: Array<{ term: string; points: number }> = [];
    let score = 0;
    for (const { term, rx } of c.terms) {
      const points = count(rx, title) * 4 + count(rx, kw) * 4 + Math.min(count(rx, body), 4);
      if (points > 0) {
        contributions.push({ term, points });
        score += points;
      }
    }
    // The author's own sub-theme is the strongest signal we have.
    if (themeTokens.size && c.nameTokens.length) {
      const overlap = c.nameTokens.filter((t) => themeTokens.has(t)).length;
      if (overlap / c.nameTokens.length >= 0.5) {
        score += 14;
        contributions.unshift({ term: "stated sub-theme", points: 14 });
      }
    }
    contributions.sort((a, b) => b.points - a.points);
    return { id: c.id, score, matched: contributions.slice(0, 4).map((x) => x.term) };
  });

  scored.sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  if (!best || best.score < 2) return null;
  const runnerUp = second?.score ?? 0;
  const confidence: Suggestion["confidence"] =
    best.score >= 10 && best.score >= runnerUp * 1.6 ? "high" : best.score >= 5 && best.score > runnerUp ? "medium" : "low";
  return { categoryId: best.id, score: best.score, confidence, matched: best.matched };
}

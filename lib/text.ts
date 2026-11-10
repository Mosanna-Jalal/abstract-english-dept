// Small, dependency-free text helpers shared by server and client code.

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function excerpt(text: string, max = 220): string {
  const flat = collapseWhitespace(text);
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits stored abstract text into paragraphs (blank-line separated). Drops
 * leftovers from extraction that aren't prose, such as a lone "-".
 */
export function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => collapseWhitespace(p))
    .filter((p) => (p.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2);
}

export function parseKeywords(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,;•·|\n]/)) {
    const k = collapseWhitespace(raw).replace(/^[-–—*\s]+|[.\s]+$/g, "");
    if (!k || k.length > 60) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out.slice(0, 15);
}

export function padSerial(serial: number): string {
  return String(serial).padStart(3, "0");
}

const ROMAN: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(n: number): string {
  let out = "";
  let rest = Math.max(0, Math.floor(n));
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Heuristic parser that turns the raw text of an abstract (from a PDF, DOCX
// or plain text) into structured fields. It never throws: anything it can't
// recognise is left blank and reported in `warnings` so an admin can fix it.
//
// Kept free of imports so it can be unit-tested with plain Node.

export interface ParsedAbstract {
  title: string;
  authors: string;
  affiliation: string;
  email: string;
  phone: string;
  keywords: string[];
  proposedTheme: string;
  /** Paragraphs separated by a blank line. */
  body: string;
  warnings: string[];
}

interface Line {
  text: string;
  blankBefore: boolean;
}

const SEP = String.raw`\s*[:：\-–—]\s*`;
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RX = /(?:\+?91[\s-]?)?(?:0[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
const KEYWORDS_RX = /^(?:key\s*-?\s*words?|index\s+terms)\s*(?:[:：\-–—.]\s*(.*)|$)/i;
const INLINE_KEYWORDS_RX = /\s*\bkey\s*-?\s*words?\s*[:：\-–—]\s*(.+)$/i;
const THEME_RX = new RegExp(
  String.raw`^(?:sub[\s-]*theme|theme|track|area\s+of\s+(?:the\s+)?paper|category)\s*(?:no\.?\s*\d+)?${SEP}(.+)$`,
  "i",
);
const TITLE_RX = new RegExp(
  String.raw`^(?:title(?:\s+of\s+(?:the\s+)?(?:research\s+)?(?:paper|abstract|article))?|paper\s+title|topic)${SEP}(.*)$`,
  "i",
);
const ABSTRACT_RX = /^abstract\b\s*(?:[:：\-–—.]\s*(.*))?$/i;
const NAME_LABEL_RX = new RegExp(
  String.raw`^(?:name(?:\s+of\s+(?:the\s+)?(?:author|presenter|participant|scholar|candidate|paper\s+presenter)s?)?|authors?|presenters?|presented\s+by|submitted\s+by|participant|by)${SEP}(.+)$`,
  "i",
);
const AFFIL_LABEL_RX = new RegExp(
  String.raw`^(?:designation|institution|institute|affiliation|college|university|department|organi[sz]ation|address)${SEP}(.+)$`,
  "i",
);
const CONTACT_LABEL_RX =
  /^(?:e-?mail(?:\s+(?:id|address))?|mail|mobile(?:\s+no\.?)?|phone(?:\s+no\.?)?|contact(?:\s+(?:no\.?|number|details))?|ph\.?|mob\.?|whats\s*app(?:\s+no\.?)?)(?=\W|$)/i;
const AFFIL_WORDS_RX =
  /\b(?:college|universit(?:y|ies)|institute|department|dept\.?|school|research\s+scholar|scholar|professor|prof\.|lecturer|faculty|student|academy|mahavidyalaya|vidyalaya|campus|centre|center|guest\s+faculty|teacher|hod|ph\.?\s*d\.?|m\.\s*a\.|p\.\s*g\.)(?=\W|$)/i;
const STRONG_AFFIL_RX =
  /\b(?:college|university|department|dept\.|institute|mahavidyalaya|research\s+scholar|assistant\s+professor|associate\s+professor|professor|lecturer|guest\s+faculty)(?=\W|$)/i;
const HONORIFIC_RX = /^(?:dr|prof|mr|mrs|ms|miss|shri|smt|sri|km|kumari)\.?\s+/i;
const END_RX = /^(?:references|works\s+cited|bibliography|notes|acknowledg(?:e)?ments?)\s*[:：]?\s*$/i;
const TITLE_WORDS_RX = /\b(?:the|of|in|on|a|an|to|for|with|from|at|as|its|their|through|between|towards?|beyond|study|analysis|reading)\b/i;
const CONNECTOR_END_RX = /\b(?:of|in|and|the|a|an|on|to|for|with|from|through|between|towards?)$/i;

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor",
  "of", "on", "or", "the", "to", "upon", "via", "with", "vs", "versus",
]);
const ROMAN_RX = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x)$/i;

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​﻿­]/g, "")
    .replace(/\t/g, " ")
    .replace(/([A-Za-z])-\n([a-z])/g, "$1$2")
    .replace(/^ *(?:page\s*)?\d{1,3}(?:\s*(?:of|\/)\s*\d{1,3})? *$/gim, "")
    .replace(/ {2,}/g, " ");
}

function toLines(text: string): Line[] {
  const out: Line[] = [];
  let blank = false;
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) {
      blank = true;
      continue;
    }
    out.push({ text: t, blankBefore: blank });
    blank = false;
  }
  return out;
}

function wordsIn(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function isMostlyUpper(s: string): boolean {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8;
}

export function smartTitleCase(input: string): string {
  let first = true;
  return input
    .toLowerCase()
    .split(/(\s+|(?<=[-–—/:(“"‘]))/)
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const core = token.replace(/^[^a-z0-9]+/i, "");
      const lead = token.slice(0, token.length - core.length);
      const bare = core.replace(/[^a-z]/gi, "");
      let word = core;
      if (ROMAN_RX.test(bare)) word = word.toUpperCase();
      else if (first || !SMALL_WORDS.has(bare)) word = word.charAt(0).toUpperCase() + word.slice(1);
      first = /[:—–]$/.test(token);
      return lead + word;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(s: string): string {
  let t = s
    .replace(/\s+/g, " ")
    .replace(/^[\s"“”'‘’«»]+|[\s"“”'‘’«»]+$/g, "")
    .replace(/[.;,]$/, "")
    .trim();
  if (isMostlyUpper(t)) t = smartTitleCase(t);
  return t;
}

function stripContacts(s: string): string {
  return s
    .replace(new RegExp(EMAIL_RX.source, "gi"), "")
    .replace(new RegExp(PHONE_RX.source, "g"), "")
    .replace(/\b(?:e-?mail(?:\s+id)?|mobile(?:\s+no\.?)?|phone(?:\s+no\.?)?|contact(?:\s+no\.?)?|mob\.?|ph\.?)\s*[:：\-–—]?\s*/gi, "")
    .replace(/[\s,;|/–—-]+$/g, "")
    .replace(/^[\s,;|/–—-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeName(s: string): boolean {
  const t = s.replace(/[,;]+$/, "").trim();
  if (!t || t.length > 80 || /\d/.test(t) || EMAIL_RX.test(t)) return false;
  if (AFFIL_WORDS_RX.test(t)) return false;
  if (HONORIFIC_RX.test(t)) return true;
  if (TITLE_WORDS_RX.test(t) || /[:?!]/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length < 2 || words.length > 8) return false;
  const capitalised = words.filter((w) => /^[A-Z][A-Za-z.'’-]*$/.test(w) || /^(?:&|and)$/i.test(w));
  return capitalised.length / words.length >= 0.75;
}

/** A short line in Title Case or CAPITALS with no closing punctuation. */
function looksLikeTitleLine(t: string): boolean {
  if (/[.!?;,]$/.test(t) || wordsIn(t) > 22) return false;
  if (isMostlyUpper(t)) return true;
  const words = t.split(/\s+/).filter((w) => /[A-Za-z]/.test(w) && !SMALL_WORDS.has(w.toLowerCase()));
  if (words.length < 2) return false;
  return words.filter((w) => /^[“"‘(]?[A-Z]/.test(w)).length / words.length >= 0.7;
}

function blocksTitle(t: string): boolean {
  return (
    EMAIL_RX.test(t) ||
    CONTACT_LABEL_RX.test(t) ||
    HONORIFIC_RX.test(t) ||
    (STRONG_AFFIL_RX.test(t) && wordsIn(t) <= 12)
  );
}

function splitKeywords(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(/[,;•·|]|\s{2,}|\s[-–—]\s/)) {
    const k = raw.replace(/\s+/g, " ").replace(/^[\s\-–—*]+|[\s.]+$/g, "").trim();
    if (!k || k.length > 60 || wordsIn(k) > 6) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out.slice(0, 12);
}

function buildParagraphs(lines: Line[]): string[] {
  if (!lines.length) return [];
  const lengths = lines.map((l) => l.text.length).sort((a, b) => a - b);
  const typical = lengths[Math.floor(lengths.length * 0.8)] ?? 80;
  const paragraphs: string[] = [];
  let current = "";
  lines.forEach((line, i) => {
    const prev = lines[i - 1];
    const startsNew =
      i > 0 &&
      (line.blankBefore ||
        (/[.!?:"”’)]$/.test(prev.text) && prev.text.length < typical * 0.72 && typical > 45));
    if (startsNew && current) {
      paragraphs.push(current.trim());
      current = "";
    }
    if (!current) current = line.text;
    else if (/[A-Za-z]-$/.test(current) && /^[a-z]/.test(line.text)) current = current.slice(0, -1) + line.text;
    else current += ` ${line.text}`;
  });
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.map((p) => p.replace(/\s+/g, " "));
}

function classifyInto(texts: string[], title: string, authors: string[], affiliations: string[]) {
  for (const raw of texts) {
    if (CONTACT_LABEL_RX.test(raw)) continue;
    const t = stripContacts(raw);
    if (!t || t.length < 2 || (title && title.toLowerCase().includes(t.toLowerCase()))) continue;
    const parts = t.split(/\s*,\s*/);
    const rest = parts.slice(1).join(", ");
    if (parts.length > 1 && (HONORIFIC_RX.test(parts[0]) || looksLikeName(parts[0])) && AFFIL_WORDS_RX.test(rest)) {
      authors.push(parts[0]);
      affiliations.push(rest);
    } else if (AFFIL_WORDS_RX.test(t)) {
      affiliations.push(t);
    } else if (looksLikeName(t)) {
      authors.push(t);
    } else if (!authors.length && t.length < 60 && !/[.!?]$/.test(t) && wordsIn(t) <= 8) {
      authors.push(t);
    } else if (t.length < 140 && wordsIn(t) <= 18) {
      affiliations.push(t);
    }
  }
}

export function parseAbstract(raw: string, fileName = ""): ParsedAbstract {
  const warnings: string[] = [];
  const text = normalize(raw ?? "");
  const lines = toLines(text);

  const email = text.match(EMAIL_RX)?.[0] ?? "";
  const phone = (text.match(PHONE_RX)?.[0] ?? "").replace(/\s+/g, " ").trim();

  let title = "";
  let theme = "";
  const authors: string[] = [];
  const affiliations: string[] = [];
  let keywords: string[] = [];

  const consumed = new Set<number>();
  let abstractIdx = -1;
  let abstractRest = "";
  let keywordsIdx = -1;

  // Pass 1: labelled lines ("Title:", "Abstract", "Keywords:", "Name:", ...).
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text;
    let m: RegExpMatchArray | null;
    // Labels start with a capital letter; wrapped body lines usually don't.
    if (!/^[A-Z]/.test(t)) continue;

    if (abstractIdx < 0 && (m = t.match(ABSTRACT_RX))) {
      abstractIdx = i;
      abstractRest = (m[1] ?? "").trim();
      consumed.add(i);
      continue;
    }
    if (keywordsIdx < 0 && (m = t.match(KEYWORDS_RX))) {
      keywordsIdx = i;
      consumed.add(i);
      let rest = (m[1] ?? "").trim();
      let j = i + 1;
      while ((!rest || /[,;]$/.test(rest)) && j < lines.length && j <= i + 3) {
        const next = lines[j].text;
        if (ABSTRACT_RX.test(next) || END_RX.test(next) || wordsIn(next) > 14) break;
        rest = rest ? `${rest} ${next}` : next;
        consumed.add(j);
        j++;
      }
      keywords = splitKeywords(rest);
      continue;
    }
    if (!theme && (m = t.match(THEME_RX))) {
      theme = m[1].trim().replace(/[.;]$/, "");
      consumed.add(i);
      continue;
    }
    if (!title && (m = t.match(TITLE_RX))) {
      consumed.add(i);
      let value = (m[1] ?? "").trim();
      if (!value && lines[i + 1]) {
        value = lines[i + 1].text;
        consumed.add(i + 1);
      }
      title = value;
      continue;
    }
    if ((m = t.match(NAME_LABEL_RX))) {
      const value = stripContacts(m[1]);
      if (value) authors.push(value);
      consumed.add(i);
      continue;
    }
    if ((m = t.match(AFFIL_LABEL_RX))) {
      const value = stripContacts(m[1]);
      if (value) affiliations.push(value);
      consumed.add(i);
      continue;
    }
    if (CONTACT_LABEL_RX.test(t) && (EMAIL_RX.test(t) || PHONE_RX.test(t) || /^[^:：]{0,25}[:：]/.test(t))) {
      consumed.add(i);
    }
  }

  // Pass 2: where does the body start and end?
  let bodyStart = -1;
  if (abstractIdx >= 0) {
    bodyStart = abstractRest ? abstractIdx : abstractIdx + 1;
  } else {
    // Without an "Abstract" heading, the body is the first run of long lines
    // that together hold a substantial amount of prose.
    let runStart = -1;
    let runWords = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const long =
        !consumed.has(i) &&
        (line.text.length >= 55 || wordsIn(line.text) >= 10) &&
        !EMAIL_RX.test(line.text) &&
        // A title-like line can't open the body; it is usually the title itself.
        !(runStart < 0 && looksLikeTitleLine(line.text));
      if (!long) {
        runStart = -1;
        runWords = 0;
        continue;
      }
      if (runStart < 0) runStart = i;
      runWords += wordsIn(line.text);
      if (runWords >= 35) {
        bodyStart = runStart;
        break;
      }
    }
  }

  let bodyEnd = lines.length;
  if (bodyStart >= 0) {
    for (let i = bodyStart + 1; i < lines.length; i++) {
      const t = lines[i].text;
      if (END_RX.test(t) || consumed.has(i)) {
        bodyEnd = i;
        break;
      }
    }
  }

  // Pass 3: unlabelled header lines → title, then authors / affiliation.
  const headerEnd = bodyStart >= 0 ? (abstractIdx >= 0 ? abstractIdx : bodyStart) : lines.length;
  const header: string[] = [];
  for (let i = 0; i < headerEnd; i++) if (!consumed.has(i)) header.push(lines[i].text);
  const trailer: string[] = [];
  for (let i = bodyEnd; i < lines.length; i++) {
    if (!consumed.has(i) && wordsIn(lines[i].text) <= 18) trailer.push(lines[i].text);
  }

  if (!title && header.length) {
    if (!blocksTitle(header[0])) {
      title = header.shift() as string;
      while (header.length && title.length < 220) {
        const next = header[0];
        if (AFFIL_WORDS_RX.test(next) || EMAIL_RX.test(next) || HONORIFIC_RX.test(next)) break;
        // A title ending in "of", "and", ":" etc. must continue, even onto a name-like line.
        const mustContinue = /[:,\-–—]$/.test(title) || CONNECTOR_END_RX.test(title) || /^[a-z(]/.test(next);
        const mayContinue = isMostlyUpper(title) && isMostlyUpper(next) && !looksLikeName(next);
        if (!mustContinue && !mayContinue) break;
        title = `${title} ${header.shift()}`;
      }
    } else {
      // Details came first; the title is the first line that isn't a name,
      // an affiliation or contact information.
      const idx = header.findIndex(
        (t) => !blocksTitle(t) && !looksLikeName(t) && !AFFIL_WORDS_RX.test(t) && wordsIn(t) >= 3,
      );
      if (idx >= 0) title = header.splice(idx, 1)[0];
    }
  }

  classifyInto(header, title, authors, affiliations);
  if (!authors.length || !affiliations.length) {
    const tailAuthors: string[] = [];
    const tailAffils: string[] = [];
    classifyInto(trailer, title, tailAuthors, tailAffils);
    if (!authors.length) authors.push(...tailAuthors);
    if (!affiliations.length) affiliations.push(...tailAffils);
  }

  // Body text.
  const bodyLines: Line[] = [];
  if (bodyStart >= 0) {
    if (abstractRest) bodyLines.push({ text: abstractRest, blankBefore: false });
    for (let i = bodyStart; i < bodyEnd; i++) {
      if (i !== abstractIdx && !consumed.has(i)) bodyLines.push(lines[i]);
    }
  }
  let paragraphs = buildParagraphs(bodyLines);

  // "... final sentence. Keywords: a, b, c" on the same line as the body.
  if (!keywords.length && paragraphs.length) {
    const last = paragraphs[paragraphs.length - 1];
    const m = last.match(INLINE_KEYWORDS_RX);
    if (m && m.index !== undefined) {
      keywords = splitKeywords(m[1]);
      paragraphs[paragraphs.length - 1] = last.slice(0, m.index).trim();
      paragraphs = paragraphs.filter(Boolean);
    }
  }

  title = cleanTitle(title);
  if (!title && fileName) {
    title = cleanTitle(fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " "));
    warnings.push("Title not found in the text — used the file name instead.");
  } else if (!title) {
    warnings.push("Title not detected.");
  }

  const tidy = (xs: string[]) => [
    ...new Set(xs.map((x) => x.replace(/\s+/g, " ").replace(/^[,;\s]+|[,;\s]+$/g, "").trim()).filter(Boolean)),
  ];
  const authorList = tidy(authors).slice(0, 4);
  const affilList = tidy(affiliations).slice(0, 4);

  const body = paragraphs.join("\n\n");
  if (!text.trim()) {
    warnings.push("No selectable text found — the file may be a scanned image. Type or paste the abstract.");
  } else if (wordsIn(body) < 40) {
    warnings.push("Very little abstract text was detected — please check the body.");
  }
  if (!authorList.length) warnings.push("Author not detected.");

  return {
    title,
    authors: authorList.join(", "),
    affiliation: affilList.join("; "),
    email,
    phone,
    keywords,
    proposedTheme: theme,
    body,
    warnings,
  };
}

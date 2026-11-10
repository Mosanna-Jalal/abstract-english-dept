// Heuristic parser that turns the raw text of an abstract (from a PDF, DOCX
// or plain text) into structured fields. It never throws: anything it can't
// recognise is left blank and reported in `warnings` so an admin can fix it.
//
// Tuned on real conference submissions: abstract-only files, full papers
// with an "Abstract" section, Google Forms uploads ("file - Uploader.docx"),
// author blocks before or after the abstract, and papers with no abstract.
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

const SEP = String.raw`\s*[:：\-–—]+\s*`;
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RX = /(?:\+?91[\s-]?)?(?:0[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
const KEYWORDS_RX = /^(?:key\s*-?\s*(?:words?|terms?)|index\s+terms)\s*(?:[:：\-–—.]+\s*(.*)|$)/i;
const INLINE_KEYWORDS_RX = /\s*\bkey\s*-?\s*(?:words?|terms?)\s*[:：\-–—]+\s*(.+)$/i;
const THEME_RX = new RegExp(
  String.raw`^(?:sub[\s-]*theme|theme|track|area\s+of\s+(?:the\s+)?paper|category)\s*(?:no\.?\s*\d+)?${SEP}(.+)$`,
  "i",
);
const TITLE_RX = new RegExp(
  String.raw`^(?:title(?:\s+of\s+(?:the\s+)?(?:research\s+)?(?:paper|abstract|article))?|paper\s+title|topic|sub(?:ject)?)${SEP}(.*)$`,
  "i",
);
const ABSTRACT_RX = /^abstract\b\s*(?:\([^)]*\))?\s*(?:[:：\-–—.]+\s*(.*))?$/i;
const NAME_LABEL_RX = new RegExp(
  String.raw`^(?:name(?:\s+of\s+(?:the\s+)?(?:author|presenter|participant|scholar|candidate|paper\s+presenter)s?)?|authors?|presenters?|presented\s+by|submitted\s+by|participant|by)${SEP}(.*)$`,
  "i",
);
const AFFIL_LABEL_RX = new RegExp(
  String.raw`^(?:designation|institution|institute|affiliation|college|university|department|organi[sz]ation|address)${SEP}(.*)$`,
  "i",
);
const CONTACT_LABEL_RX =
  /^(?:e-?mail(?:\s+(?:id|address))?|mail|mobile(?:\s+no\.?)?|phone(?:\s+no\.?)?|contact(?:\s+(?:no\.?|number|details))?|ph\.?|mob\.?|whats\s*app(?:\s+no\.?)?|pin(?:\s*code)?)(?=\W|$)/i;
const AFFIL_WORDS_RX =
  /\b(?:college|universit(?:y|ies)|institute|department|dept\.?|school|research\s+scholar|scholar|professor|lecturer|faculty|student|academy|mahavidyalaya|vidyalaya|vidyapeeth|vishwavidyalaya|vishwavidyalay|campus|centre|center|guest\s+faculty|teacher|hod|head|dean|principal|former|retired|reader|director|coordinator|chairman|registrar|asstt\.?|assistant|associate|ph\.?\s*d\.?|m\.\s*a\.|p\.\s*g\.)(?=\W|$)/i;
// Institution nouns: "Dr Bhim Rao Ambedkar College" is a place, not a person.
const INSTITUTION_RX =
  /\b(?:college|universit(?:y|ies)|institute|school|vidyalaya|mahavidyalaya|vidyapeeth|vishwavidyalaya|vishwavidyalay|academy|campus|centre|center)\b/i;
const STRONG_AFFIL_RX =
  /\b(?:college|university|department|dept\.|institute|mahavidyalaya|research\s+scholar|assistant\s+professor|associate\s+professor|professor|lecturer|guest\s+faculty)(?=\W|$)/i;
// Case-sensitive on purpose: the name after the honorific must start with a
// capital ("Professor Sanjeev Kumar" yes, "Professor of English" no).
const HONORIFIC_RX =
  /^(?:[Dd][Rr]|[Pp][Rr][Oo][Ff](?:[Ee][Ss][Ss][Oo][Rr])?|[Mm][Rr][Ss]?|[Mm][Ss]|[Mm]iss|[Ss]hri|[Ss]mt|[Ss]ri|[Kk]m|[Kk]umari|[Mm][Dd]|[Mm]ohd)\.?\s*(?:\(\s*[Dd][Rr]\.?\s*\))?\s+(?=[A-Z])/;
const END_RX = /^(?:references|works?\s+cited|bibliography|notes|acknowledg(?:e)?ments?)\s*[:：]?\s*$/i;
const SECTION_RX =
  /^(?:(?:\d+(?:\.\d+)*|[ivx]+)[.)]?\s+)?(?:introduction|background|methodology|research\s+methodology|methods?|literature\s+review|review\s+of\s+literature|objectives?(?:\s+of\s+the\s+study)?|conclusions?|discussion|analysis|findings|limitations|significance|chapter\s+\w+|works?\s+cited|references|bibliography|notes|acknowledg(?:e)?ments?|table\s+of\s+contents)\b(?:\s*[:.\-–—]+.*)?$/i;
const NUMBERED_HEADING_RX = /^(?:\d+(?:\.\d+)*|[IVX]+)[.)]\s+\S/;
const EVENT_RX =
  /\b(?:aietc|aesi|all\s+india\s+english\s+teachers|under\s+the\s+aegis|organi[sz]ed\s+by|confe?rence|seminar|symposium|webinar|exploring\s+literature,?\s+language\s+and\s+society)\b|^theme\s*[:：]/i;
const MLA_HEADER_RX = /^[A-Z][a-z]+\s+\d{1,3}$/;
const DATE_LINE_RX =
  /^\(?\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*,?\s+\d{4}\)?$/i;
const CITATION_RX = /\(\d{4}\)|\b(?:print|web|pp?\.|ed\.|eds\.|vol\.|press|publishers?|trans\.)\b|\b(?:19|20)\d{2}\.\s*$/i;
const BIO_RX = /^(.{3,60}?)\s+(?:is|was|works\s+as|is\s+working\s+as|is\s+currently)\s+(?:an?\s+|the\s+)?(.+)$/i;
const TITLE_WORDS_RX = /\b(?:the|of|in|on|a|an|to|for|with|from|at|as|its|their|through|between|towards?|beyond|study|analysis|reading|versus)\b/i;
const CONNECTOR_END_RX = /\b(?:of|in|and|the|a|an|on|to|for|with|from|through|between|towards?)$/i;

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor",
  "of", "on", "or", "the", "to", "upon", "via", "with", "vs", "versus",
]);
const ROMAN_RX = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x)$/i;

const MAX_BODY_WORDS = 450;
const TRIM_TARGET_WORDS = 230;

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​﻿­]/g, "")
    // Tabs and wide gaps separate columns ("Abstract<TAB><TAB>Dr. Name").
    .replace(/[ ]*\t[\t ]*| {4,}/g, "\n")
    // Word runs glued together: "Dr. Md. SajjadAssistant Professor".
    .replace(/([a-z])(?=(?:Assistant|Associate|Professor|Research Scholar|Department|Head|Guest Faculty|Lecturer|Former|Retired)\b)/g, "$1\n")
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
    .split(/(\s+|(?<=[-–—/:(“"‘]))/)
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const core = token.replace(/^[^a-z0-9]+/i, "");
      const lead = token.slice(0, token.length - core.length);
      const bare = core.replace(/[^a-z]/gi, "");
      let word: string;
      if (/^(?:[A-Za-z]\.){1,4}[A-Za-z]*\.?/.test(core) && /\.[A-Za-z]/.test(core)) {
        // Initials such as "D.L.ROY" or "G.B." → "D.L.Roy", "G.B."
        word = core
          .split(".")
          .map((seg) => (seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg))
          .join(".");
      } else if (ROMAN_RX.test(bare)) {
        word = core.toUpperCase();
      } else if (first || !SMALL_WORDS.has(bare.toLowerCase())) {
        word = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      } else {
        word = core.toLowerCase();
      }
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
    .replace(/^[\s"“”'‘’«»*_]+|[\s"“”'‘’«»*_]+$/g, "")
    .replace(/[.;,]$/, "")
    .trim();
  if (isMostlyUpper(t)) return smartTitleCase(t);
  // "NATURE FOR ALL AS A NARRATIVE OF CHANGE (An Eco critical reading…)"
  t = t.replace(/[^():]+/g, (segment) =>
    isMostlyUpper(segment) && wordsIn(segment) >= 3 ? segment.replace(/\S.*\S/, (m) => smartTitleCase(m)) : segment,
  );
  return t;
}

function stripContacts(s: string): string {
  return s
    .replace(new RegExp(EMAIL_RX.source, "gi"), "")
    .replace(new RegExp(PHONE_RX.source, "g"), "")
    // Only strip a contact label when it is followed by a separator, so
    // "Ph.D." and "Physical" survive.
    .replace(
      /\b(?:e-?mail(?:\s+id)?|mobile(?:\s*\/\s*whats\s*app)?(?:\s+no\.?)?|phone(?:\s+no\.?)?|contact(?:\s+no\.?)?|mob\.?|ph\.?)\s*[:：\-–—]+\s*/gi,
      "",
    )
    .replace(/\b(?:e-?mail(?:\s+id)?|mobile(?:\s+no\.?)?|mob\.?)\s*$/gi, "")
    .replace(/^(?:authors?|name)\s*[:：\-–—]+\s*/i, "")
    .replace(/[\s,;|/–—*-]+$/g, "")
    .replace(/^[\s,;|/–—•*-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isNameWords(t: string): boolean {
  if (!t || t.length > 60 || /\d/.test(t) || AFFIL_WORDS_RX.test(t)) return false;
  if (TITLE_WORDS_RX.test(t) && !HONORIFIC_RX.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 6) return false;
  return words.every((w) => /^[A-Z][A-Za-z.'’-]*$/.test(w) || /^(?:&|and)$/i.test(w));
}

function isPersonWithTitle(t: string): boolean {
  return HONORIFIC_RX.test(t) && wordsIn(t) <= 7 && !/[,:]/.test(t) && !INSTITUTION_RX.test(t);
}

function looksLikeName(s: string): boolean {
  const t = s.replace(/[,;*]+$/, "").trim();
  if (!t || t.length > 80 || /\d/.test(t) || EMAIL_RX.test(t)) return false;
  if (isPersonWithTitle(t)) return true;
  if (AFFIL_WORDS_RX.test(t)) return false;
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

function isNoise(t: string): boolean {
  return (
    MLA_HEADER_RX.test(t) ||
    DATE_LINE_RX.test(t) ||
    SECTION_RX.test(t) ||
    (EVENT_RX.test(t) && wordsIn(t) <= 25 && !/[.]$/.test(t))
  );
}

function blocksTitle(t: string): boolean {
  return (
    EMAIL_RX.test(t) ||
    CONTACT_LABEL_RX.test(t) ||
    HONORIFIC_RX.test(t) ||
    isNoise(t) ||
    (STRONG_AFFIL_RX.test(t) && wordsIn(t) <= 12)
  );
}

/** Lines that belong to a title / author block rather than to prose. */
function isHeaderLike(t: string): boolean {
  if (wordsIn(t) > 18) return false;
  return (
    blocksTitle(t) ||
    looksLikeName(t) ||
    AFFIL_WORDS_RX.test(t) ||
    PHONE_RX.test(t) ||
    looksLikeTitleLine(t) ||
    /^[-–—•]\s*\S/.test(t) ||
    (wordsIn(t) <= 6 && !/[.!?]["”’]?$/.test(t))
  );
}

function isBodyBreak(t: string): boolean {
  if (END_RX.test(t) || SECTION_RX.test(t)) return true;
  const shortHeading = wordsIn(t) <= 10 && !/[.!?]["”’]?$/.test(t);
  if (NUMBERED_HEADING_RX.test(t) && shortHeading) return true;
  return shortHeading && wordsIn(t) >= 1 && isMostlyUpper(t) && wordsIn(t) <= 8;
}

function splitKeywords(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(/[,;•·|]|\s{2,}|\s[-–—]\s/)) {
    const k = raw.replace(/\s+/g, " ").replace(/^[\s\-–—*]+|[\s.]+$/g, "").replace(/^and\s+/i, "").trim();
    if (!k || k.length > 60 || wordsIn(k) > 6 || /^etc$/i.test(k)) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out.slice(0, 12);
}

/**
 * A body paragraph that isn't part of the abstract: a lone "-" left after a
 * stripped "Abstract: -" heading, a stray "I", or a contact line such as
 * "*Corresponding Author" or an email address, which must never go public.
 */
function isLeftover(p: string): boolean {
  if ((p.match(/[\p{L}\p{N}]/gu)?.length ?? 0) < 2) return true;
  if ((EMAIL_RX.test(p) || PHONE_RX.test(p)) && wordsIn(p) <= 12) return true;
  return /^\*?\s*corresponding\s+author\b/i.test(p) && wordsIn(p) <= 6;
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
        (/[.!?:"”’)]$/.test(prev.text) && prev.text.length < typical * 0.72 && typical > 45) ||
        // Word paragraphs arrive one per line; long lines ending a sentence end a paragraph.
        (/[.!?"”’)]$/.test(prev.text) && prev.text.length > 220));
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

/** Trims a long text to its opening paragraphs (or sentences). */
function trimToOpening(paragraphs: string[]): string[] {
  const out: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    const n = wordsIn(p);
    if (total + n <= MAX_BODY_WORDS || total < TRIM_TARGET_WORDS) {
      if (total + n > MAX_BODY_WORDS) {
        // One very long paragraph: cut at a sentence boundary.
        const sentences = p.match(/[^.!?]+[.!?]+["”’)]*\s*/g) ?? [p];
        let cut = "";
        for (const s of sentences) {
          if (wordsIn(cut) >= TRIM_TARGET_WORDS - total) break;
          cut += s;
        }
        out.push(cut.trim());
        break;
      }
      out.push(p);
      total += n;
      if (total >= TRIM_TARGET_WORDS) break;
    } else break;
  }
  return out;
}

interface Classified {
  authors: string[];
  affiliations: string[];
}

function classifyInto(texts: string[], title: string, into: Classified, strict: boolean) {
  let last: "author" | "affil" | null = null;
  const author = (s: string) => {
    into.authors.push(s);
    last = "author";
  };
  const affil = (s: string) => {
    into.affiliations.push(s);
    last = "affil";
  };
  for (const raw of texts) {
    if (CONTACT_LABEL_RX.test(raw) || isNoise(raw)) continue;
    if (strict && CITATION_RX.test(raw)) continue;
    const t = stripContacts(raw);
    if (!t || t.length < 2 || (title && title.toLowerCase().includes(t.toLowerCase()))) continue;
    if (wordsIn(t) > 20) continue; // prose, not a name or address

    const isPerson = (s: string) => (isNameWords(s) || HONORIFIC_RX.test(s)) && !INSTITUTION_RX.test(s);

    // "Rinki Kumari (Research Scholar)"
    const paren = t.match(/^(.{3,60}?)\s*\(([^)]*)\)\s*$/);
    if (paren && isPerson(paren[1]) && AFFIL_WORDS_RX.test(paren[2])) {
      author(paren[1]);
      affil(paren[2]);
      continue;
    }
    // "Dr. X is a retired Professor of English, Y University"
    const bio = wordsIn(t) >= 6 ? t.match(BIO_RX) : null;
    if (bio && isPerson(bio[1])) {
      if (!into.authors.length) author(bio[1]);
      if (AFFIL_WORDS_RX.test(bio[2])) affil(bio[2].replace(/\.$/, ""));
      continue;
    }
    // "Swati, Research Scholar, PG Dept. of English" / "Dr. X, Assistant Professor"
    const parts = t.split(/\s*,\s*/);
    const rest = parts.slice(1).join(", ");
    if (parts.length > 1 && isPerson(parts[0]) && AFFIL_WORDS_RX.test(rest)) {
      author(parts[0]);
      affil(rest);
      continue;
    }
    if (isPersonWithTitle(t)) {
      author(t);
    } else if (!into.authors.length && !strict && isNameWords(t) && wordsIn(t) <= 4) {
      // A bare name right under the title ("*Chhabi", "Swati").
      author(t);
    } else if (AFFIL_WORDS_RX.test(t) || INSTITUTION_RX.test(t)) {
      affil(t);
    } else if (looksLikeName(t)) {
      // A further name-like line after an address line continues the address
      // ("Akhil Bhartiya Sanskrit Hindi" / "Vidyapeeth, Begusarai").
      if (into.authors.length && last === "affil") affil(t);
      else author(t);
    } else if (!strict && t.length < 120 && wordsIn(t) <= 12 && !/[.!?]$/.test(t)) {
      affil(t);
    }
  }
}

function uploaderFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/\s*\(\d+\)\s*$/, "");
  const m = base.match(/\s-\s([^-]{3,60})$/);
  if (!m) return "";
  const name = m[1].replace(/\s*\(\d+\)\s*$/, "").trim();
  return /\d/.test(name) ? name.replace(/\s*\d+\s*$/, "").trim() : name;
}

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\s-\s[^-]{3,60}$/, "")
    .replace(/\.(?:docx?|pdf)\b/gi, "")
    .replace(/\b(?:copy of|document from|full (?:research )?paper|conference paper|abstract|docx?)\b/gi, " ")
    .replace(/[_]+/g, " ")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAbstract(raw: string, fileName = ""): ParsedAbstract {
  const warnings: string[] = [];
  const text = normalize(raw ?? "");
  const lines = toLines(text);

  const email = text.match(EMAIL_RX)?.[0] ?? "";
  const phone = (text.match(PHONE_RX)?.[0] ?? "").replace(/\s+/g, " ").trim();

  let title = "";
  let theme = "";
  const found: Classified = { authors: [], affiliations: [] };
  let keywords: string[] = [];

  const consumed = new Set<number>();
  let abstractIdx = -1;
  let abstractRest = "";
  let keywordsIdx = -1;

  const nextValue = (i: number): string => {
    const next = lines[i + 1]?.text ?? "";
    if (next && !ABSTRACT_RX.test(next) && !KEYWORDS_RX.test(next) && wordsIn(next) <= 16) {
      consumed.add(i + 1);
      return next;
    }
    return "";
  };

  // Pass 1: labelled lines ("Title:", "Abstract", "Keywords:", "Author:", ...).
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
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
      while ((!rest || /(?:[,;&]|\band)$/i.test(rest)) && j < lines.length && j <= i + 3) {
        const next = lines[j].text;
        if (ABSTRACT_RX.test(next) || END_RX.test(next) || SECTION_RX.test(next) || wordsIn(next) > 14) break;
        rest = rest ? `${rest} ${next}` : next;
        consumed.add(j);
        j++;
      }
      keywords = splitKeywords(rest);
      continue;
    }
    if (!theme && (m = t.match(THEME_RX)) && !EVENT_RX.test(m[1])) {
      theme = m[1].trim().replace(/[.;]$/, "");
      consumed.add(i);
      continue;
    }
    if (i < 14 && EVENT_RX.test(t) && wordsIn(t) <= 25 && !/[.]$/.test(t)) {
      consumed.add(i);
      continue;
    }
    if (!title && (m = t.match(TITLE_RX))) {
      consumed.add(i);
      title = (m[1] ?? "").trim() || nextValue(i);
      continue;
    }
    if ((m = t.match(NAME_LABEL_RX))) {
      consumed.add(i);
      const value = stripContacts((m[1] ?? "").trim() || nextValue(i));
      if (value) found.authors.push(value);
      continue;
    }
    if ((m = t.match(AFFIL_LABEL_RX))) {
      consumed.add(i);
      const value = stripContacts((m[1] ?? "").trim() || nextValue(i));
      if (value) found.affiliations.push(value);
      continue;
    }
    if (CONTACT_LABEL_RX.test(t) && (EMAIL_RX.test(t) || PHONE_RX.test(t) || /^[^:：]{0,25}[:：]/.test(t))) {
      consumed.add(i);
    }
  }

  // Pass 2: where does the body start?
  let bodyStart = -1;
  const postHeading: string[] = [];
  if (abstractIdx >= 0) {
    bodyStart = abstractRest ? abstractIdx : abstractIdx + 1;
    if (!abstractRest) {
      // A title / author block may sit right after the "Abstract" heading.
      let j = abstractIdx + 1;
      while (j < lines.length && j <= abstractIdx + 9 && (consumed.has(j) || isHeaderLike(lines[j].text))) {
        if (!consumed.has(j)) postHeading.push(lines[j].text);
        j++;
      }
      if (j < lines.length && !isBodyBreak(lines[j].text)) bodyStart = j;
      else postHeading.length = 0;
    }
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

  // ...and where does it end?
  let bodyEnd = lines.length;
  if (bodyStart >= 0) {
    for (let i = bodyStart + 1; i < lines.length; i++) {
      if (consumed.has(i) || isBodyBreak(lines[i].text)) {
        bodyEnd = i;
        break;
      }
    }
  }

  // Pass 3: title, then authors / affiliation.
  const headerEnd = bodyStart >= 0 ? (abstractIdx >= 0 ? abstractIdx : bodyStart) : lines.length;
  const header: string[] = [];
  for (let i = 0; i < headerEnd; i++) if (!consumed.has(i)) header.push(lines[i].text);
  header.push(...postHeading);

  if (!title && header.length) {
    const firstUsable = header.findIndex((t) => !isNoise(t));
    const start = firstUsable < 0 ? 0 : firstUsable;
    if (!blocksTitle(header[start]) && !looksLikeName(header[start])) {
      const take = header.splice(start, 1);
      title = take[0];
      while (header.length > start && title.length < 220) {
        const next = header[start];
        if (AFFIL_WORDS_RX.test(next) || EMAIL_RX.test(next) || HONORIFIC_RX.test(next) || isNoise(next)) break;
        // A title ending in "of", "and", ":" or "Adiga’s" must continue, even onto a name-like line.
        const mustContinue =
          /[:,\-–—]$/.test(title) || CONNECTOR_END_RX.test(title) || /['’]s$/.test(title) || /^[a-z(“"]/.test(next);
        // Otherwise continue onto a subtitle-looking line that isn't a name.
        const mayContinue =
          !looksLikeName(next) &&
          !INSTITUTION_RX.test(next) &&
          ((isMostlyUpper(title) && isMostlyUpper(next)) || (looksLikeTitleLine(next) && wordsIn(next) <= 16));
        if (!mustContinue && !mayContinue) break;
        title = `${title} ${header.splice(start, 1)[0]}`;
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

  classifyInto(header, title, found, false);
  if (!found.authors.length || !found.affiliations.length) {
    // Many papers end with a short biographical note: look at the last lines.
    const trailer: string[] = [];
    for (let i = Math.max(bodyEnd, lines.length - 14); i < lines.length; i++) {
      if (!consumed.has(i) && wordsIn(lines[i].text) <= 24) trailer.push(lines[i].text);
    }
    const tail: Classified = { authors: [], affiliations: [] };
    classifyInto(trailer, title, tail, true);
    if (!found.authors.length) found.authors.push(...tail.authors);
    if (!found.affiliations.length) found.affiliations.push(...tail.affiliations);
  }

  // Body text.
  const bodyLines: Line[] = [];
  if (bodyStart >= 0) {
    if (abstractRest) bodyLines.push({ text: abstractRest, blankBefore: false });
    for (let i = bodyStart; i < bodyEnd; i++) {
      if (i !== abstractIdx && !consumed.has(i)) bodyLines.push(lines[i]);
    }
  }
  let paragraphs = buildParagraphs(bodyLines).filter((p) => !isLeftover(p));

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

  const totalWords = wordsIn(paragraphs.join(" "));
  if (abstractIdx < 0 && wordsIn(text) > 1200 && totalWords <= MAX_BODY_WORDS) {
    warnings.push(
      "No abstract section was found (this looks like a full paper). Its opening paragraphs are shown — replace them with the author’s abstract if available.",
    );
  }
  if (totalWords > MAX_BODY_WORDS) {
    paragraphs = trimToOpening(paragraphs);
    warnings.push(
      abstractIdx >= 0
        ? "The abstract section was very long, so only its opening paragraphs were kept — please check it."
        : "No abstract section was found (this looks like a full paper). Its opening paragraphs are shown — replace them with the author’s abstract if available.",
    );
  }

  // "… A Comparative Study (Theme: Comparative Literature)"
  const themeInTitle = title.match(/\s*\((?:sub[\s-]*)?theme\s*[:：\-–—]+\s*([^)]+)\)\s*$/i);
  if (themeInTitle && themeInTitle.index !== undefined) {
    if (!theme) theme = themeInTitle[1].trim();
    title = title.slice(0, themeInTitle.index);
  }

  title = cleanTitle(title);
  if (!title && fileName) {
    title = cleanTitle(smartTitleCase(titleFromFileName(fileName)));
    warnings.push("Title not found in the text — used the file name instead.");
  } else if (!title) {
    warnings.push("Title not detected.");
  }

  const tidy = (xs: string[]) => [
    ...new Set(
      xs
        .map((x) => x.replace(/\s+/g, " ").replace(/^[,;\s*]+|[,;\s*]+$/g, "").replace(/\.$/, "").trim())
        .filter(Boolean),
    ),
  ];
  let authorList = tidy(found.authors)
    .slice(0, 4)
    .map((name) => (isMostlyUpper(name) ? smartTitleCase(name) : name));
  const affilList = tidy(found.affiliations).slice(0, 6);

  if (!authorList.length && fileName) {
    const uploader = uploaderFromFileName(fileName);
    if (uploader) {
      authorList = [isMostlyUpper(uploader) || uploader === uploader.toLowerCase() ? smartTitleCase(uploader) : uploader];
      warnings.push("Author taken from the uploader’s name in the file name — please check.");
    }
  }

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
    affiliation: affilList.join(", "),
    email,
    phone,
    keywords,
    proposedTheme: theme,
    body,
    warnings,
  };
}

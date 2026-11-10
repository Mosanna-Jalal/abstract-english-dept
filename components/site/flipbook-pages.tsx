import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { cn, padSerial, plural, toParagraphs, toRoman } from "@/lib/text";
import { TURN_BACK, TURN_FORWARD } from "@/lib/turn";
import type { AbstractDetailDTO, CategoryDTO, ColorKey, Settings } from "@/lib/types";

// The pages of the flipbook (flipbook.tsx turns them). Two books use them:
// - the Book of Abstracts (/book): every sub-theme, one page per abstract;
// - a sub-theme's own volume, which an abstract opens in (/abstracts/[no]):
//   in a two-page spread each abstract has a title page facing its text.

export interface FlipbookItem {
  id: string;
  serial: number;
  title: string;
  authors: string;
  affiliation: string;
  keywords: string[];
  body: string;
  wordCount: number;
}

export interface FlipbookSection {
  number: number;
  name: string;
  slug: string;
  color: ColorKey;
  description: string;
  items: FlipbookItem[];
}

export interface FlipbookMeta {
  eventTitle: string;
  eventSubtitle: string;
  organizer: string;
  institution: string;
  eventDate: string;
  venue: string;
  about: string;
}

/** The parts of the site settings the books show. */
export function toFlipbookMeta(s: Settings): FlipbookMeta {
  return {
    eventTitle: s.eventTitle,
    eventSubtitle: s.eventSubtitle,
    organizer: s.organizer,
    institution: s.institution,
    eventDate: s.eventDate,
    venue: s.venue,
    about: s.about,
  };
}

/** A sub-theme and its abstracts, as the books need them. */
export function toFlipbookSection(category: CategoryDTO, number: number, items: AbstractDetailDTO[]): FlipbookSection {
  return {
    number,
    name: category.name,
    slug: category.slug,
    color: category.color,
    description: category.description,
    items: items.map((a) => ({
      id: a.id,
      serial: a.serial,
      title: a.title,
      authors: a.authors,
      affiliation: a.affiliation,
      keywords: a.keywords,
      body: a.body,
      wordCount: a.wordCount,
    })),
  };
}

export type Page =
  | { kind: "cover" }
  | { kind: "about" }
  // The book's contents: its sub-themes.
  | { kind: "contents"; from: number; to: number }
  // A volume's contents: its abstracts.
  | { kind: "toc"; from: number; to: number }
  | { kind: "section"; s: number }
  // One page per abstract (the book, and a volume on a phone).
  | { kind: "abstract"; s: number; i: number }
  // A volume's spread: the abstract's title page, facing its text.
  | { kind: "head"; s: number; i: number }
  | { kind: "text"; s: number; i: number }
  | { kind: "end" }
  | { kind: "back" }
  | { kind: "blank" };

const CONTENTS_PER_PAGE = 10;
const TOC_PER_PAGE = 7;

/** The abstract a page shows, if any. */
export function abstractOn(p: Page | undefined): { s: number; i: number } | null {
  return p && (p.kind === "abstract" || p.kind === "head" || p.kind === "text") ? { s: p.s, i: p.i } : null;
}

/** Names a place in the book whatever the layout (one page or a spread). */
export function pageKey(p: Page): string {
  switch (p.kind) {
    case "contents":
      return `contents:${p.from}`;
    case "toc":
      return `toc:${p.from}`;
    case "section":
      return `section:${p.s}`;
    case "abstract":
    case "head":
    case "text":
      return `abstract:${p.s}:${p.i}`;
    default:
      return p.kind;
  }
}

/**
 * The Book of Abstracts, page by page. In a two-page spread, each section
 * opens on a right-hand page (as printed books do) and the back cover sits on
 * the back of the last leaf, so blank pages are inserted where needed.
 */
export function buildBook(sections: FlipbookSection[], spread: boolean): Page[] {
  const pages: Page[] = [{ kind: "cover" }, { kind: "about" }];
  for (let from = 0; from < sections.length; from += CONTENTS_PER_PAGE) {
    pages.push({ kind: "contents", from, to: Math.min(sections.length, from + CONTENTS_PER_PAGE) });
  }
  sections.forEach((section, s) => {
    if (spread && pages.length % 2 === 1) pages.push({ kind: "blank" });
    pages.push({ kind: "section", s });
    section.items.forEach((_, i) => pages.push({ kind: "abstract", s, i }));
  });
  pages.push({ kind: "end" });
  if (spread && pages.length % 2 === 0) pages.push({ kind: "blank" });
  pages.push({ kind: "back" });
  return pages;
}

/**
 * One sub-theme as a book of its own. In a two-page spread each abstract's
 * title page falls on the left, facing its text, so blank pages are inserted
 * where needed.
 */
export function buildVolume(section: FlipbookSection, spread: boolean): Page[] {
  const pages: Page[] = [{ kind: "cover" }, { kind: "about" }];
  const n = section.items.length;
  for (let from = 0; from < n; from += TOC_PER_PAGE) {
    pages.push({ kind: "toc", from, to: Math.min(n, from + TOC_PER_PAGE) });
  }
  section.items.forEach((_, i) => {
    if (!spread) {
      pages.push({ kind: "abstract", s: 0, i });
      return;
    }
    if (pages.length % 2 === 0) pages.push({ kind: "blank" });
    pages.push({ kind: "head", s: 0, i }, { kind: "text", s: 0, i });
  });
  pages.push({ kind: "end" });
  if (spread && pages.length % 2 === 0) pages.push({ kind: "blank" });
  pages.push({ kind: "back" });
  return pages;
}

/* ------------------------------------------------------------------------- */

function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 12" aria-hidden className={cn("h-3 w-20", className)} fill="currentColor">
      <path d="M0 5.5h30v1H0zM50 5.5h30v1H50z" opacity=".55" />
      <path d="M40 0 46 6 40 12 34 6Z" />
    </svg>
  );
}

function Folio({ index, side }: { index: number; side: "front" | "back" | "single" }) {
  return (
    <span
      className={cn(
        "folio",
        side === "front" && "pr-[9%] text-right",
        side === "back" && "pl-[9%] text-left",
      )}
    >
      {index + 1}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[5.5em] flex-none text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function PageView({
  page,
  index,
  side,
  meta,
  sections,
  volume,
  sectionPage,
  itemPage,
  onJump,
}: {
  page: Page;
  index: number;
  side: "front" | "back" | "single";
  meta: FlipbookMeta;
  sections: FlipbookSection[];
  /** True in a sub-theme's own volume (then `sections` holds just that one). */
  volume: boolean;
  /** Page where each section starts (the book). */
  sectionPage: Map<number, number>;
  /** Page where each abstract starts (a volume). */
  itemPage: Map<number, number>;
  onJump: (index: number) => void;
}) {
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  switch (page.kind) {
    case "cover": {
      if (volume) {
        const section = sections[0];
        return (
          <>
            <div className="cover-frame" />
            <div className="relative flex h-full flex-col items-center justify-between px-[13%] py-[16%] text-center">
              <p className="text-[0.6rem] font-semibold uppercase leading-relaxed tracking-[0.2em] opacity-90">
                {meta.eventTitle}
                <br />
                Book of Abstracts
              </p>
              <div>
                <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--foil)_55%,transparent)] bg-black/10">
                  <CategoryIcon category={section} className="size-7" strokeWidth={1.4} />
                </span>
                <p className="mt-5 font-serif text-[0.95rem] italic opacity-90">Sub-theme {toRoman(section.number)}</p>
                <h2 className="mt-2 font-serif text-[2.1rem] font-light italic leading-[1.06] text-[#f8eedb] text-balance">
                  {section.name}
                </h2>
                <Ornament className="mx-auto mt-5" />
              </div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] opacity-90">
                {plural(section.items.length, "abstract")}
              </p>
            </div>
          </>
        );
      }
      return (
        <>
          <div className="cover-frame" />
          <div className="relative flex h-full flex-col items-center justify-between px-[13%] py-[17%] text-center">
            <p className="text-[0.62rem] font-semibold uppercase leading-relaxed tracking-[0.2em] opacity-90">
              {meta.organizer}
              <br />
              {meta.institution}
            </p>
            <div>
              <BookOpenText className="mx-auto size-9" strokeWidth={1.3} aria-hidden />
              <p className="mt-5 text-[0.66rem] uppercase tracking-[0.32em] opacity-85">Book of Abstracts</p>
              <h2 className="mt-3 font-serif text-[2.35rem] font-light italic leading-[1.04] text-balance">
                {meta.eventTitle}
              </h2>
              <Ornament className="mx-auto mt-5" />
            </div>
            <p className="text-[0.7rem] tracking-[0.14em] opacity-90">{meta.eventDate}</p>
          </div>
        </>
      );
    }

    case "about": {
      if (volume) {
        const section = sections[0];
        return (
          <div className="relative flex h-full flex-col px-[9%] pb-12 pt-[11%]">
            <p className="running-head text-center">{meta.eventTitle}</p>
            <div className="page-scroll mt-6">
              <p className="font-serif italic text-gold">Sub-theme {toRoman(section.number)}</p>
              <h2 className="mt-1 font-serif text-[1.6em] font-light leading-tight tracking-tight">{section.name}</h2>
              {section.description && <p className="mt-4 font-serif leading-[1.65]">{section.description}</p>}
              <dl className="mt-6 space-y-2 text-[0.86em]">
                <Fact label="Papers">{plural(section.items.length, "abstract")}</Fact>
                <Fact label="Conference">{meta.eventTitle}</Fact>
                {meta.eventDate && <Fact label="Dates">{meta.eventDate}</Fact>}
                {meta.venue && <Fact label="Venue">{meta.venue}</Fact>}
              </dl>
              <p className="mt-6 text-[0.78em] leading-relaxed text-ink-3">
                Turn a page by tapping or clicking it, by swiping, or with the arrow keys.
              </p>
            </div>
            <Folio index={index} side={side} />
          </div>
        );
      }
      return (
        <div className="relative flex h-full flex-col px-[9%] pb-12 pt-[11%]">
          <p className="running-head text-center">{meta.eventTitle}</p>
          <div className="page-scroll mt-6">
            {meta.eventSubtitle && <p className="font-serif text-[1.08em] italic leading-snug text-ink-2">{meta.eventSubtitle}</p>}
            <p className="mt-4 font-serif leading-[1.65]">{meta.about}</p>
            <dl className="mt-6 space-y-2 text-[0.86em]">
              {meta.eventDate && <Fact label="Dates">{meta.eventDate}</Fact>}
              {meta.venue && <Fact label="Venue">{meta.venue}</Fact>}
              <Fact label="Papers">
                {total} abstracts in {sections.length} sub-themes
              </Fact>
            </dl>
            <p className="mt-6 text-[0.78em] leading-relaxed text-ink-3">
              Turn a page by tapping or clicking it, by swiping, or with the arrow keys.
            </p>
          </div>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "contents":
      return (
        <div className="relative flex h-full flex-col px-[9%] pb-12 pt-[11%]">
          <h2 className="text-center font-serif text-[1.7em] font-light tracking-tight">
            {page.from === 0 ? "Contents" : "Contents, continued"}
          </h2>
          <Ornament className="mx-auto mt-3 text-gold" />
          <ol className="page-scroll mt-5 space-y-0.5">
            {sections.slice(page.from, page.to).map((section, n) => {
              const target = sectionPage.get(page.from + n) ?? 0;
              return (
                <li key={section.slug}>
                  <button
                    type="button"
                    onClick={() => onJump(target)}
                    className="tone group flex w-full items-baseline gap-2 rounded-md px-1.5 py-1.5 text-left text-[0.9em] hover:bg-[var(--tone-bg)]"
                    style={toneStyle(section.color)}
                  >
                    <span className="w-8 flex-none font-serif italic text-gold">{toRoman(section.number)}.</span>
                    <CategoryIcon category={section} className="size-3.5 flex-none translate-y-0.5 text-[var(--tone-fg)]" />
                    <span className="min-w-0 flex-1 truncate group-hover:text-[var(--tone-fg)]">{section.name}</span>
                    <span className="tabular flex-none text-ink-3">{target + 1}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Folio index={index} side={side} />
        </div>
      );

    case "toc": {
      const section = sections[0];
      return (
        <div className="tone relative flex h-full flex-col px-[9%] pb-12 pt-[11%]" style={toneStyle(section.color)}>
          <h2 className="text-center font-serif text-[1.7em] font-light tracking-tight">
            {page.from === 0 ? "Contents" : "Contents, continued"}
          </h2>
          <Ornament className="mx-auto mt-3 text-gold" />
          <ol className="page-scroll mt-5 space-y-1">
            {section.items.slice(page.from, page.to).map((item, n) => {
              const target = itemPage.get(page.from + n) ?? 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onJump(target)}
                    className="group flex w-full items-baseline gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-[var(--tone-bg)]"
                  >
                    <span className="w-8 flex-none font-serif text-[0.82em] italic text-gold">{padSerial(item.serial)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-serif text-[0.95em] leading-snug group-hover:text-[var(--tone-fg)]">
                        {item.title}
                      </span>
                      {item.authors && <span className="mt-0.5 block truncate text-[0.74em] text-ink-3">{item.authors}</span>}
                    </span>
                    <span className="tabular flex-none text-[0.82em] text-ink-3">{target + 1}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "section": {
      const section = sections[page.s];
      return (
        <div
          className="tone relative flex h-full flex-col items-center justify-center px-[11%] pb-10 text-center"
          style={toneStyle(section.color)}
        >
          <span
            aria-hidden
            className="absolute right-[13%] top-0 h-[17%] w-[7.5%] bg-[var(--tone-solid)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
          />
          <span className="flex size-16 items-center justify-center rounded-full bg-[var(--tone-bg)] text-[var(--tone-fg)] shadow-[inset_0_0_0_1px_var(--tone-line)]">
            <CategoryIcon category={section} className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-6 font-serif text-lg italic text-gold">{toRoman(section.number)}</p>
          <h2 className="mt-1 font-serif text-[1.95em] font-light leading-tight tracking-tight text-balance">{section.name}</h2>
          {section.description && <p className="mt-3 max-w-[30ch] text-[0.92em] leading-relaxed text-ink-2">{section.description}</p>}
          <Ornament className="mt-6 text-gold" />
          <p className="mt-3 text-[0.8em] text-ink-3">{plural(section.items.length, "abstract")}</p>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "abstract": {
      const section = sections[page.s];
      const item = section.items[page.i];
      return (
        <div className="relative flex h-full flex-col px-[9%] pb-11 pt-[8%]">
          <div className="flex items-center justify-between gap-3">
            <span className="running-head min-w-0 truncate">{section.name}</span>
            {volume ? (
              <span className="flex-none font-serif text-[0.78em] italic text-ink-3">No. {padSerial(item.serial)}</span>
            ) : (
              <Link
                href={`/abstracts/${item.serial}`}
                transitionTypes={TURN_FORWARD}
                className="flex-none font-serif text-[0.78em] italic text-ink-3 hover:text-accent"
              >
                No. {padSerial(item.serial)} ↗
              </Link>
            )}
          </div>
          <h3 className="mt-4 font-serif text-[1.3em] font-normal leading-snug tracking-tight">{item.title}</h3>
          {item.authors && <p className="mt-2 text-[0.82em] font-semibold">{item.authors}</p>}
          {item.affiliation && <p className="mt-0.5 text-[0.76em] leading-snug text-ink-3">{item.affiliation}</p>}
          <div className="page-scroll book-drop-cap mt-4 pr-1 font-serif text-[0.97em] leading-[1.62]">
            {toParagraphs(item.body).map((p, n) => (
              <p key={n} className="mb-2.5">
                {p}
              </p>
            ))}
            {item.keywords.length > 0 && (
              <p className="mt-3 font-sans text-[0.8em] text-ink-2">
                <span className="font-semibold">Keywords:</span> <em>{item.keywords.join(", ")}</em>
              </p>
            )}
          </div>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "head": {
      const section = sections[page.s];
      const item = section.items[page.i];
      return (
        <div className="tone relative flex h-full flex-col px-[11%] pb-12 pt-[10%] text-center" style={toneStyle(section.color)}>
          <p className="running-head">{section.name}</p>
          {/* Centred when it fits; scrolls from the top when it doesn't. */}
          <div className="page-scroll flex flex-col">
            <div className="my-auto py-5">
              <p className="font-serif text-[0.95em] italic text-gold">Paper No. {padSerial(item.serial)}</p>
              <h3 className="mt-3 font-serif text-[1.75em] font-normal leading-[1.15] tracking-tight text-balance">{item.title}</h3>
              <Ornament className="mx-auto mt-6 text-gold" />
              {item.authors && <p className="mt-6 text-[0.98em] font-semibold">{item.authors}</p>}
              {item.affiliation && (
                <p className="mx-auto mt-1.5 max-w-[34ch] text-[0.82em] leading-snug text-ink-3">{item.affiliation}</p>
              )}
            </div>
          </div>
          <div className="border-t border-line pt-3 text-[0.78em] leading-relaxed text-ink-2">
            {item.keywords.length > 0 && (
              <p>
                <span className="font-semibold">Keywords:</span> <em>{item.keywords.join(", ")}</em>
              </p>
            )}
            <p className="text-ink-3">
              {item.wordCount > 0 && `${item.wordCount} words · `}Abstract {page.i + 1} of {section.items.length}
            </p>
          </div>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "text": {
      const item = sections[page.s].items[page.i];
      const paragraphs = toParagraphs(item.body);
      return (
        <div className="relative flex h-full flex-col px-[9%] pb-11 pt-[8%]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="running-head min-w-0 truncate">{item.title}</span>
            <span className="flex-none font-serif text-[0.78em] italic text-ink-3">No. {padSerial(item.serial)}</span>
          </div>
          {paragraphs.length ? (
            <div className="page-scroll book-drop-cap mt-5 pr-1 font-serif leading-[1.68]">
              {paragraphs.map((p, n) => (
                <p key={n} className="mb-3">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-ink-3">The text of this abstract hasn’t been added yet.</p>
          )}
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "end": {
      const section = sections[0];
      return (
        <div className="relative flex h-full flex-col items-center justify-center px-[12%] text-center">
          <Ornament className="text-gold" />
          <p className="mt-6 font-serif text-[1.6em] font-light italic">Finis</p>
          <p className="mt-3 max-w-[28ch] text-[0.88em] leading-relaxed text-ink-2">
            {volume
              ? `${plural(section.items.length, "abstract")} in ${section.name}, sub-theme ${toRoman(section.number)} of ${meta.eventTitle}.`
              : `${total} abstracts presented at ${meta.eventTitle}.`}
          </p>
          {volume && (
            <Link href="/categories" transitionTypes={TURN_BACK} className="mt-5 text-[0.84em] font-medium text-accent hover:underline">
              Back to the shelf
            </Link>
          )}
          <p className="mt-6 text-[0.72em] uppercase tracking-[0.16em] text-ink-3">
            {meta.organizer}
            <br />
            {meta.institution}
          </p>
          <Folio index={index} side={side} />
        </div>
      );
    }

    case "back":
      return (
        <>
          <div className="cover-frame" />
          <div className="relative flex h-full flex-col items-center justify-center px-[14%] text-center">
            {volume ? (
              <CategoryIcon category={sections[0]} className="size-8" strokeWidth={1.3} />
            ) : (
              <BookOpenText className="size-8" strokeWidth={1.3} aria-hidden />
            )}
            <p className="mt-5 font-serif text-xl font-light italic">{volume ? sections[0].name : meta.eventTitle}</p>
            <p className="mt-2 text-[0.66rem] uppercase tracking-[0.24em] opacity-85">
              {volume ? meta.eventTitle : meta.eventDate}
            </p>
          </div>
        </>
      );

    default:
      return null;
  }
}

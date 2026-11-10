"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, Printer, TableOfContents } from "lucide-react";
import { ShareButton } from "@/components/site/client-buttons";
import { SoundToggle } from "@/components/site/sound-toggle";
import { toneStyle } from "@/lib/colors";
import { playPageTurn } from "@/lib/page-sound";
import { cn, padSerial, toParagraphs } from "@/lib/text";
import { TURN_FORWARD } from "@/lib/turn";
import {
  abstractOn,
  buildBook,
  buildVolume,
  pageKey,
  PageView,
  type FlipbookItem,
  type FlipbookMeta,
  type FlipbookSection,
  type Page,
} from "./flipbook-pages";

export type { FlipbookItem, FlipbookMeta, FlipbookSection } from "./flipbook-pages";

interface Motion {
  order: number;
  delay: number;
  seq: number;
  /** 1 when turning forward, -1 when turning back. */
  dir: 1 | -1;
}

interface View {
  spread: boolean;
  turned: number;
  moving: Record<number, Motion>;
}

const RIFFLE_MAX = 8;
const STAGGER_MS = 55;
const SETTLE_MS = 950 + RIFFLE_MAX * STAGGER_MS;
const SPREAD_QUERY = "(min-width: 960px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(SPREAD_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useSpread(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SPREAD_QUERY).matches,
    () => false,
  );
}

const noopSubscribe = () => () => {};

/** False while hydrating, true afterwards. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, n) => from + n);
}

/** Index of the page a reader is "on" — used to keep their place. */
function primaryPage(spread: boolean, turned: number): number {
  return spread ? Math.max(0, turned * 2 - 1) : turned;
}

/** How far to turn to open the book at the abstract numbered `serial`. */
function turnedFor(pages: Page[], spread: boolean, items: FlipbookItem[], serial: number): number {
  const index = pages.findIndex((p) => {
    const at = abstractOn(p);
    return at !== null && items[at.i]?.serial === serial;
  });
  if (index < 0) return 0;
  return spread ? Math.ceil(index / 2) : index;
}

/**
 * A book whose pages turn. Without `volume` it is the Book of Abstracts, with
 * every sub-theme in `sections`. With `volume`, `sections` holds one sub-theme
 * and the book opens at the abstract numbered `volume.open`; the address
 * follows the abstract on the page, so it can be shared or reloaded.
 */
export function Flipbook({
  meta,
  sections,
  volume,
}: {
  meta: FlipbookMeta;
  sections: FlipbookSection[];
  volume?: { open: number };
}) {
  const openAt = volume?.open;
  const isVolume = openAt !== undefined;
  const spread = useSpread();
  const isClient = useIsClient();
  const books = useMemo(
    () =>
      isVolume
        ? { spread: buildVolume(sections[0], true), single: buildVolume(sections[0], false) }
        : { spread: buildBook(sections, true), single: buildBook(sections, false) },
    [sections, isVolume],
  );
  const [view, setView] = useState<View>(() => ({
    spread,
    turned:
      openAt === undefined ? 0 : turnedFor(spread ? books.spread : books.single, spread, sections[0].items, openAt),
    moving: {},
  }));
  const [restored, setRestored] = useState(false);
  const seq = useRef(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  // Switching between one page and a two-page spread keeps the reader's place.
  let current = view;
  if (view.spread !== spread) {
    const from = view.spread ? books.spread : books.single;
    const to = spread ? books.spread : books.single;
    let at = Math.min(primaryPage(view.spread, view.turned), from.length - 1);
    if (from[at].kind === "blank") at = Math.min(at + 1, from.length - 1);
    const index = Math.max(0, to.findIndex((p) => pageKey(p) === pageKey(from[at])));
    current = { spread, turned: spread ? Math.ceil(index / 2) : index, moving: {} };
    setView(current);
  }

  // The Book of Abstracts opens at ?page=N when the link was shared (once,
  // right after hydration). A volume opens at its abstract instead.
  if (isClient && !restored) {
    setRestored(true);
    const n = isVolume ? NaN : Number(new URLSearchParams(window.location.search).get("page"));
    if (Number.isInteger(n) && n > 1) {
      const index = n - 1;
      current = { ...current, turned: current.spread ? Math.ceil(index / 2) : index, moving: {} };
      setView(current);
    }
  }

  const pages = current.spread ? books.spread : books.single;
  const leaves = current.spread ? pages.length / 2 : pages.length;
  const maxTurned = current.spread ? leaves : leaves - 1;
  const turned = Math.min(current.turned, maxTurned);
  const onPage = abstractOn(pages[primaryPage(current.spread, turned)]);
  const currentItem = isVolume && onPage ? sections[0].items[onPage.i] : null;

  const jumps = useMemo(() => {
    const sectionPage = new Map<number, number>();
    const itemPage = new Map<number, number>();
    pages.forEach((p, index) => {
      if (p.kind === "section") sectionPage.set(p.s, index);
      if (p.kind === "head" || (p.kind === "abstract" && isVolume)) itemPage.set(p.i, index);
    });
    return { sectionPage, itemPage, contents: pages.findIndex((p) => p.kind === "contents" || p.kind === "toc") };
  }, [pages, isVolume]);

  /** Turn to `target(turned, max)` — one leaf animates, longer jumps riffle. */
  const move = useCallback(
    (target: (turned: number, max: number) => number) => {
      seq.current += 1;
      const id = seq.current;
      setView((v) => {
        const p = v.spread ? books.spread : books.single;
        const max = v.spread ? p.length / 2 : p.length - 1;
        const t = Math.max(0, Math.min(max, target(v.turned, max)));
        if (t === v.turned) return v;
        const changed = t > v.turned ? range(v.turned, t) : range(t, v.turned).reverse();
        const animate = changed.slice(-RIFFLE_MAX);
        const top = Object.values(v.moving).reduce((m, x) => Math.max(m, x.order), 0);
        const moving = { ...v.moving };
        const dir = t > v.turned ? 1 : -1;
        animate.forEach((leaf, n) => {
          moving[leaf] = { order: top + n + 1, delay: changed.length > 1 ? n * STAGGER_MS : 0, seq: id, dir };
        });
        return { ...v, turned: t, moving };
      });
      window.setTimeout(() => {
        setView((v) => {
          const entries = Object.entries(v.moving).filter(([, m]) => m.seq !== id);
          return entries.length === Object.keys(v.moving).length ? v : { ...v, moving: Object.fromEntries(entries) };
        });
      }, SETTLE_MS);
    },
    [books],
  );

  const goToPage = useCallback(
    (index: number) => move((_, max) => (current.spread ? Math.ceil(index / 2) : Math.min(index, max))),
    [move, current.spread],
  );

  // The rustle of paper for each turn: one leaf, or a riffle through several.
  const heard = useRef(0);
  useEffect(() => {
    let seq = 0;
    let leaves = 0;
    let dir: 1 | -1 = 1;
    for (const m of Object.values(current.moving)) {
      if (m.seq > seq) [seq, leaves, dir] = [m.seq, 0, m.dir];
      if (m.seq === seq) leaves += 1;
    }
    if (seq <= heard.current) return;
    heard.current = seq;
    playPageTurn({ leaves, direction: dir, seconds: current.spread ? 0.9 : 0.76, stagger: STAGGER_MS / 1000 });
  }, [current.moving, current.spread]);

  // Keep the address in step with the page, so it can be shared: ?page= in
  // the Book of Abstracts, the abstract's own address in a volume.
  const titleSuffix = useRef<string | null>(null);
  useEffect(() => {
    if (!restored) return;
    if (isVolume) {
      if (!currentItem) return;
      const path = `/abstracts/${currentItem.serial}`;
      if (window.location.pathname === path) return;
      if (titleSuffix.current === null) {
        // The page title is "<abstract> · <site>": keep the " · <site>" part.
        const opened = sections[0].items.find((item) => item.serial === openAt);
        const title = document.title;
        titleSuffix.current = opened && title.startsWith(opened.title) ? title.slice(opened.title.length) : "";
      }
      window.history.replaceState(null, "", path);
      document.title = currentItem.title + titleSuffix.current;
      return;
    }
    const url = new URL(window.location.href);
    const page = primaryPage(current.spread, turned);
    if (page > 0) url.searchParams.set("page", String(page + 1));
    else url.searchParams.delete("page");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [turned, current.spread, restored, isVolume, currentItem, sections, openAt]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const step: Record<string, (t: number, max: number) => number> = {
        ArrowRight: (t) => t + 1,
        PageDown: (t) => t + 1,
        ArrowLeft: (t) => t - 1,
        PageUp: (t) => t - 1,
        Home: () => 0,
        End: (_, max) => max,
      };
      const fn = step[e.key];
      if (fn) {
        e.preventDefault();
        move(fn);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input,select,textarea") || window.getSelection()?.toString()) return;
    if (current.spread) {
      const face = target.closest(".face");
      if (face?.classList.contains("face-front")) move((t) => t + 1);
      else if (face?.classList.contains("face-back")) move((t) => t - 1);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x > 0.62) move((t) => t + 1);
    else if (x < 0.38) move((t) => t - 1);
  }

  const shift = current.spread ? (turned === 0 ? "start" : turned === leaves ? "end" : undefined) : undefined;
  const total = pages.length;
  const showing = pages[primaryPage(current.spread, turned)];
  const indicator =
    turned === 0
      ? "Front cover"
      : (current.spread && turned === leaves) || (!current.spread && showing?.kind === "back")
        ? "Back cover"
        : currentItem && onPage
          ? `Abstract ${onPage.i + 1} of ${sections[0].items.length}`
          : current.spread
            ? `Pages ${2 * turned}–${2 * turned + 1} of ${total}`
            : `Page ${turned + 1} of ${total}`;

  const faceProps = (page: Page | null, index: number, side: "front" | "back", visible: boolean, rich: boolean) => ({
    className: cn("face", side === "front" ? "face-front" : "face-back", (page?.kind === "cover" || page?.kind === "back") && "cover-face"),
    "aria-hidden": !visible,
    children: (
      <>
        {page && rich && (
          <PageView
            page={page}
            index={index}
            side={current.spread ? side : "single"}
            meta={meta}
            sections={sections}
            volume={isVolume}
            sectionPage={jumps.sectionPage}
            itemPage={jumps.itemPage}
            onJump={goToPage}
          />
        )}
        {page?.kind !== "cover" && page?.kind !== "back" && <span className="page-curl" />}
      </>
    ),
  });

  // A volume is bound in its sub-theme's colour.
  const binding = isVolume
    ? {
        ...toneStyle(sections[0].color),
        "--cover": "color-mix(in oklab, var(--c) 78%, black)",
        "--cover-deep": "color-mix(in oklab, var(--c) 50%, black)",
      }
    : {};

  return (
    <>
      <div className="no-print">
        {isVolume && <h1 className="sr-only">{currentItem?.title ?? sections[0].name}</h1>}
        <noscript>
          <style>{".flipbook-stage .flipbook { visibility: visible !important; }"}</style>
        </noscript>
        <div className="flipbook-stage" data-ready={isClient || undefined}>
          <div
            role="region"
            aria-roledescription="book"
            aria-label={isVolume ? `${sections[0].name}: abstracts` : "Book of Abstracts"}
            className="flipbook"
            data-mode={current.spread ? "spread" : "single"}
            data-shift={shift}
            style={
              {
                ...binding,
                "--left-stack": turned / leaves,
                "--right-stack": (leaves - turned) / leaves,
              } as React.CSSProperties
            }
            onClick={onClick}
            onPointerDown={(e) => {
              pointer.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const start = pointer.current;
              pointer.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                swiped.current = true;
                move((t) => t + (dx < 0 ? 1 : -1));
              }
            }}
          >
            {range(0, leaves).map((k) => {
              const front = current.spread ? pages[2 * k] : pages[k];
              const back = current.spread ? (pages[2 * k + 1] ?? null) : null;
              const isTurned = k < turned;
              const motion = current.moving[k];
              const near = Math.abs(k - turned) <= 2 || k === turned - 1;
              const rich = Math.abs(k - turned) <= 3;
              const zIndex = motion ? 1000 + motion.order : isTurned ? k + 1 : leaves - k;
              return (
                <div
                  key={k}
                  className="leaf"
                  data-turned={isTurned}
                  data-moving={Boolean(motion)}
                  style={
                    {
                      zIndex,
                      visibility: near || motion ? "visible" : "hidden",
                      transition: motion
                        ? `transform var(--flip-ms) cubic-bezier(0.645, 0.045, 0.355, 1) ${motion.delay}ms`
                        : "none",
                      "--delay": `${motion?.delay ?? 0}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div {...faceProps(front, current.spread ? 2 * k : k, "front", k === turned, rich)} />
                  <div {...faceProps(back, 2 * k + 1, "back", current.spread && k === turned - 1, rich)} />
                </div>
              );
            })}
            {current.spread && (
              <div
                aria-hidden
                className="spine-shadow"
                style={{ zIndex: 3000, opacity: turned > 0 && turned < leaves ? 1 : 0 }}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => move(() => 0)}
            disabled={turned === 0}
            className="btn btn-ghost btn-icon"
            aria-label="Back to the cover"
          >
            <ChevronsLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => move((t) => t - 1)}
            disabled={turned === 0}
            className="btn btn-secondary btn-icon"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="tabular min-w-[9.5rem] text-center text-sm text-ink-2" aria-live="polite">
            {indicator}
          </span>
          <button
            type="button"
            onClick={() => move((t) => t + 1)}
            disabled={turned === maxTurned}
            className="btn btn-primary btn-icon"
            aria-label="Next page"
          >
            <ChevronRight className="size-5" />
          </button>
          <SoundToggle />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
          <button type="button" onClick={() => goToPage(jumps.contents)} className="btn btn-ghost btn-sm">
            <TableOfContents className="size-4" aria-hidden /> Contents
          </button>
          {isVolume ? (
            <>
              <ShareButton title={currentItem?.title ?? sections[0].name} className="btn btn-ghost btn-sm" />
              <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm">
                <Printer className="size-4" aria-hidden /> Print
              </button>
            </>
          ) : (
            <Link href="/book/print" transitionTypes={TURN_FORWARD} className="btn btn-ghost btn-sm">
              <Printer className="size-4" aria-hidden /> Print or save as PDF
            </Link>
          )}
        </div>
        <p className="mt-3 hidden text-center text-xs text-ink-3 md:block">
          Click a page to turn it, or use the ← → keys.
        </p>
      </div>

      {/* Printing a volume prints the abstract on the page, plainly. */}
      {currentItem && <PrintedAbstract item={currentItem} section={sections[0]} />}
    </>
  );
}

function PrintedAbstract({ item, section }: { item: FlipbookItem; section: FlipbookSection }) {
  return (
    <article className="hidden print:block">
      <p className="text-sm">
        {section.name} · Paper No. {padSerial(item.serial)}
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight">{item.title}</h2>
      {item.authors && <p className="mt-4 font-semibold">{item.authors}</p>}
      {item.affiliation && <p className="text-sm">{item.affiliation}</p>}
      <div className="mt-6 space-y-3 font-serif leading-relaxed">
        {toParagraphs(item.body).map((p, n) => (
          <p key={n}>{p}</p>
        ))}
      </div>
      {item.keywords.length > 0 && (
        <p className="mt-6 text-sm">
          <span className="font-semibold">Keywords:</span> <em>{item.keywords.join(", ")}</em>
        </p>
      )}
    </article>
  );
}

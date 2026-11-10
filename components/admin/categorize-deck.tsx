"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, EyeOff, FileText, Keyboard, Pencil, SkipForward, Sparkles, Undo2 } from "lucide-react";
import { assignCategoryAction, bulkAction } from "@/app/admin/actions";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { cn, padSerial, toParagraphs } from "@/lib/text";
import type { CategoryDTO, QueueItemDTO } from "@/lib/types";
import { useAdminUI } from "./providers";

type Step = { id: string; kind: "assign" | "skip" | "hide"; categoryName?: string };

export function CategorizeDeck({
  items,
  remaining,
  categories,
}: {
  items: QueueItemDTO[];
  remaining: number;
  categories: CategoryDTO[];
}) {
  const { toast } = useAdminUI();
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [history, setHistory] = useState<Step[]>([]);
  const [, startTransition] = useTransition();
  const [showKeys, setShowKeys] = useState(false);

  const queue = useMemo(() => items.filter((i) => !done.has(i.id) && !skipped.has(i.id)), [items, done, skipped]);
  const current = queue[0] ?? null;
  const pendingHere = items.filter((i) => done.has(i.id)).length;
  const left = Math.max(0, remaining - pendingHere);
  const handled = history.filter((h) => h.kind !== "skip").length;
  const progress = handled + left > 0 ? (handled / (handled + left)) * 100 : 100;
  const suggested = current?.suggestion ? categories.find((c) => c.id === current.suggestion?.categoryId) : undefined;

  const mark = useCallback((setter: typeof setDone, id: string, add: boolean) => {
    setter((prev) => {
      const next = new Set(prev);
      if (add) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const assign = useCallback(
    (category: CategoryDTO) => {
      if (!current) return;
      const id = current.id;
      mark(setDone, id, true);
      setHistory((h) => [...h, { id, kind: "assign", categoryName: category.name }]);
      navigator.vibrate?.(8);
      startTransition(async () => {
        const res = await assignCategoryAction(id, category.id);
        if (!res.ok) {
          mark(setDone, id, false);
          setHistory((h) => h.filter((s) => s.id !== id));
          toast(res.error, { tone: "error" });
        }
      });
    },
    [current, mark, toast],
  );

  const skip = useCallback(() => {
    if (!current) return;
    mark(setSkipped, current.id, true);
    setHistory((h) => [...h, { id: current.id, kind: "skip" }]);
  }, [current, mark]);

  const hide = useCallback(() => {
    if (!current) return;
    const id = current.id;
    mark(setDone, id, true);
    setHistory((h) => [...h, { id, kind: "hide" }]);
    startTransition(async () => {
      const res = await bulkAction([id], { type: "hide" });
      if (!res.ok) {
        mark(setDone, id, false);
        toast(res.error, { tone: "error" });
      }
    });
  }, [current, mark, toast]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    if (last.kind === "skip") {
      mark(setSkipped, last.id, false);
      return;
    }
    startTransition(async () => {
      const res = last.kind === "assign" ? await assignCategoryAction(last.id, null) : await bulkAction([last.id], { type: "unhide" });
      if (res.ok) mark(setDone, last.id, false);
      else toast(res.error, { tone: "error" });
    });
  }, [history, mark, toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (/^[1-9]$/.test(e.key)) {
        const cat = categories[Number(e.key) - 1];
        if (cat) {
          e.preventDefault();
          assign(cat);
        }
      } else if (e.key === "Enter" && suggested) {
        e.preventDefault();
        assign(suggested);
      } else if (e.key === "s" || e.key === "ArrowRight") {
        e.preventDefault();
        skip();
      } else if (e.key === "h") {
        e.preventDefault();
        hide();
      } else if (e.key === "z" || e.key === "Backspace") {
        e.preventDefault();
        undo();
      } else if (e.key === "?") {
        setShowKeys((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assign, categories, hide, skip, suggested, undo]);

  const last = history[history.length - 1];

  return (
    <div className="pb-[min(46vh,22rem)] lg:pb-10">
      {/* Progress */}
      <div className="sticky top-14 z-30 border-b border-line bg-[var(--glass)] px-4 py-3 backdrop-blur-xl sm:px-8 lg:top-0">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link href="/admin" className="hidden items-center gap-1.5 text-ink-3 hover:text-ink lg:inline-flex">
            <ArrowLeft className="size-4" aria-hidden /> Overview
          </Link>
          <span className="font-medium">
            <span className="tabular">{left}</span> <span className="text-ink-3">waiting</span>
            {skipped.size > 0 && <span className="text-ink-3"> · {skipped.size} skipped</span>}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowKeys((s) => !s)}
              className="btn btn-ghost btn-sm hidden lg:inline-flex"
              aria-expanded={showKeys}
            >
              <Keyboard className="size-4" aria-hidden /> Shortcuts
            </button>
            <button type="button" onClick={undo} disabled={!last} className="btn btn-ghost btn-sm">
              <Undo2 className="size-4" aria-hidden /> Undo
            </button>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        {last && last.kind !== "skip" && (
          <p className="mt-2 truncate text-xs text-ink-3" aria-live="polite">
            {last.kind === "assign" ? (
              <>
                Filed under <span className="font-medium text-ink-2">{last.categoryName}</span>
              </>
            ) : (
              "Hidden from the public site"
            )}
          </p>
        )}
      </div>

      {showKeys && (
        <div className="mx-4 mt-4 hidden rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2 sm:mx-8 lg:block">
          <span className="font-medium text-ink">Keyboard:</span> <Kbd>1</Kbd>–<Kbd>9</Kbd> file under a category ·{" "}
          <Kbd>Enter</Kbd> accept suggestion · <Kbd>S</Kbd> skip · <Kbd>H</Kbd> hide · <Kbd>Z</Kbd> undo
        </div>
      )}

      {current ? (
        <div className="grid gap-6 px-4 pt-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pt-6">
          <article key={current.id} className="card animate-card p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
              <span className="font-serif italic">No. {padSerial(current.serial)}</span>
              <span className="flex items-center gap-3">
                {current.source.hasFile && (
                  <a href={`/admin/files/${current.id}`} target="_blank" className="inline-flex items-center gap-1 hover:text-ink">
                    <FileText className="size-3.5" aria-hidden /> Original
                  </a>
                )}
                <Link href={`/admin/abstracts/${current.id}`} className="inline-flex items-center gap-1 hover:text-ink">
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Link>
              </span>
            </div>

            <h1 className="mt-3 font-serif text-[1.55rem] font-normal leading-snug tracking-tight sm:text-[1.9rem]">
              {current.title || "Untitled abstract"}
            </h1>
            {(current.authors || current.affiliation) && (
              <p className="mt-3 text-[0.95rem] leading-relaxed">
                {current.authors && <span className="font-semibold">{current.authors}</span>}
                {current.affiliation && <span className="block text-ink-2">{current.affiliation}</span>}
              </p>
            )}

            {current.proposedTheme && (
              <p className="mt-4 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2">
                <span className="font-medium text-ink">Author’s stated sub-theme:</span> {current.proposedTheme}
              </p>
            )}

            {suggested && current.suggestion && (
              <div className="tone mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--tone-line)] bg-[var(--tone-bg)] px-4 py-3" style={toneStyle(suggested.color)}>
                <p className="min-w-0 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--tone-fg)]">
                    <Sparkles className="size-4" aria-hidden /> Suggested: {suggested.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    {current.suggestion.confidence} confidence · matched {current.suggestion.matched.join(", ")}
                  </span>
                </p>
                <button type="button" onClick={() => assign(suggested)} className="btn btn-sm bg-[var(--tone-solid)] text-white dark:text-black">
                  Accept
                </button>
              </div>
            )}

            {current.keywords.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Keywords">
                {current.keywords.map((k) => (
                  <li key={k} className="pill">
                    {k}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-line pt-6">
              {toParagraphs(current.body).length ? (
                toParagraphs(current.body).map((p, i) => (
                  <p key={i} className="mb-4 font-serif text-[1.04rem] leading-[1.75] text-ink">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm text-ink-3">
                  No abstract text was extracted.{" "}
                  {current.source.hasFile ? "Open the original file to read it, or " : ""}
                  <Link href={`/admin/abstracts/${current.id}`} className="underline underline-offset-2">
                    add the text
                  </Link>
                  .
                </p>
              )}
            </div>
          </article>

          {/* Category picker: sticky sheet on phones, side panel on desktop */}
          <aside
            aria-label="Choose a category"
            className="glass fixed inset-x-0 bottom-0 z-40 flex max-h-[min(46vh,22rem)] flex-col overflow-y-auto border-t border-line px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-18px_rgb(0_0_0/0.35)] lg:sticky lg:top-24 lg:z-auto lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:rounded-[1.25rem] lg:border lg:bg-surface lg:p-4 lg:shadow-[var(--shadow-sm)]"
          >
            <p className="eyebrow mb-2.5 hidden lg:block">File under</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {categories.map((c, i) => {
                const isSuggested = suggested?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => assign(c)}
                    style={toneStyle(c.color)}
                    className={cn(
                      "tone group flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[0.88rem] font-medium leading-snug transition-colors active:scale-[0.98]",
                      isSuggested
                        ? "border-[var(--tone-solid)] bg-[var(--tone-bg)]"
                        : "border-line bg-surface hover:border-[var(--tone-line)] hover:bg-[var(--tone-bg)]",
                    )}
                  >
                    <CategoryIcon category={c} className="size-4 flex-none text-[var(--tone-fg)]" strokeWidth={1.9} />
                    <span className="min-w-0 flex-1">{c.name}</span>
                    {i < 9 && (
                      <kbd className="hidden size-5 flex-none items-center justify-center rounded-md border border-line text-[0.68rem] text-ink-3 lg:flex">
                        {i + 1}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
            {/* On phones Skip / Hide sit above the categories, within thumb reach. */}
            <div className="order-first mb-2 grid flex-none grid-cols-2 gap-2 lg:order-none lg:mb-0 lg:mt-2">
              <button type="button" onClick={skip} className="btn btn-secondary btn-sm h-10">
                <SkipForward className="size-4" aria-hidden /> Skip
              </button>
              <button type="button" onClick={hide} className="btn btn-ghost btn-sm h-10">
                <EyeOff className="size-4" aria-hidden /> Hide
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="px-4 pt-10 sm:px-8">
          <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center">
            <h2 className="font-serif text-2xl tracking-tight">
              {skipped.size ? `You skipped ${skipped.size} abstract${skipped.size === 1 ? "" : "s"}` : "Loading the next batch…"}
            </h2>
            {skipped.size > 0 && (
              <>
                <p className="mt-2 text-ink-2">Go back through them now, or leave them for later.</p>
                <div className="mt-6 flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => setSkipped(new Set())}>
                    Review skipped
                  </button>
                  <Link href="/admin" className="btn btn-secondary">
                    Done for now
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-xs">{children}</kbd>;
}

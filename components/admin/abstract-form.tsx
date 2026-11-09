"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, Sparkles, Trash, TriangleExclamationPoint } from "lucide-react";
import { deleteAbstractAction, saveAbstractAction } from "@/app/admin/actions";
import { toneStyle } from "@/lib/colors";
import { guidelineChecks } from "@/lib/settings";
import { prepareCategories, suggestCategory } from "@/lib/suggest";
import { cn, countWords, parseKeywords } from "@/lib/text";
import type { AdminAbstractDTO, CategoryDTO, Settings } from "@/lib/types";
import { useAdminUI } from "./providers";

export function AbstractForm({
  abstract,
  categories,
  settings,
  created,
}: {
  abstract: AdminAbstractDTO | null;
  categories: CategoryDTO[];
  settings: Settings;
  created?: string;
}) {
  const [state, action, pending] = useActionState(saveAbstractAction, null);
  const { toast, confirm } = useAdminUI();
  const [title, setTitle] = useState(abstract?.title ?? "");
  const [authors, setAuthors] = useState(abstract?.authors ?? "");
  const [body, setBody] = useState(abstract?.body ?? "");
  const [keywords, setKeywords] = useState(abstract?.keywords.join(", ") ?? "");
  const [categoryId, setCategoryId] = useState(abstract?.categoryId ?? "");
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (!state) return;
    toast(state.message, { tone: state.ok ? "success" : "error" });
  }, [state, toast]);

  useEffect(() => {
    if (created) toast(`Saved as paper No. ${created}.`, { tone: "success" });
  }, [created, toast]);

  const kw = useMemo(() => parseKeywords(keywords), [keywords]);
  const wordCount = countWords(body);
  const checks = guidelineChecks(settings, { wordCount, keywords: kw, title, authors });
  const prepared = useMemo(() => prepareCategories(categories), [categories]);
  const suggestion = useMemo(
    () => suggestCategory({ title, keywords: kw, body, proposedTheme: abstract?.proposedTheme ?? "" }, prepared),
    [title, kw, body, abstract?.proposedTheme, prepared],
  );
  const suggested = suggestion && suggestion.categoryId !== categoryId ? categories.find((c) => c.id === suggestion.categoryId) : undefined;
  const selectedCat = categories.find((c) => c.id === categoryId);

  async function onDelete() {
    if (!abstract) return;
    const ok = await confirm({
      title: "Delete this abstract?",
      body: "It will be removed from the archive along with its stored original file. This can’t be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    startDelete(async () => {
      const res = await deleteAbstractAction(abstract.id);
      if (res && !res.ok) toast(res.error, { tone: "error" });
    });
  }

  return (
    <form action={action} className="px-4 sm:px-8">
      {abstract && <input type="hidden" name="id" value={abstract.id} />}
      <input type="hidden" name="proposedTheme" value={abstract?.proposedTheme ?? ""} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="card space-y-5 p-5 sm:p-7">
            <div>
              <label htmlFor="title" className="label">
                Title
              </label>
              <textarea
                id="title"
                name="title"
                required
                rows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field resize-none font-serif text-[1.25rem] leading-snug [field-sizing:content]"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="authors" className="label">
                  Author(s)
                </label>
                <input id="authors" name="authors" value={authors} onChange={(e) => setAuthors(e.target.value)} className="field" placeholder="Dr. A. Kumar, B. Singh" />
              </div>
              <div>
                <label htmlFor="affiliation" className="label">
                  Designation & institution
                </label>
                <input id="affiliation" name="affiliation" defaultValue={abstract?.affiliation ?? ""} className="field" placeholder="Research Scholar, Magadh University" />
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-7">
            <div className="flex items-baseline justify-between">
              <label htmlFor="body" className="label mb-0">
                Abstract
              </label>
              <span className="tabular text-xs text-ink-3">{wordCount} words</span>
            </div>
            <p className="hint mt-1">Leave a blank line between paragraphs.</p>
            <textarea
              id="body"
              name="body"
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="field mt-3 min-h-80 font-serif text-[1.05rem] leading-[1.75] [field-sizing:content]"
            />
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card space-y-4 p-5">
            <div>
              <label htmlFor="categoryId" className="label">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="field tone"
                style={selectedCat ? toneStyle(selectedCat.color) : undefined}
              >
                <option value="">— Awaiting a category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {suggested && suggestion && (
              <button
                type="button"
                onClick={() => setCategoryId(suggested.id)}
                className="tone flex w-full items-start gap-2.5 rounded-xl border border-[var(--tone-line)] bg-[var(--tone-bg)] p-3 text-left text-sm"
                style={toneStyle(suggested.color)}
              >
                <Sparkles className="mt-0.5 size-4 flex-none text-[var(--tone-fg)]" aria-hidden />
                <span>
                  <span className="font-semibold text-[var(--tone-fg)]">Suggested: {suggested.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-3">Matched {suggestion.matched.join(", ")} · tap to use</span>
                </span>
              </button>
            )}
            <label className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
              <input type="checkbox" name="hidden" defaultChecked={abstract?.hidden ?? false} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span className="text-sm">
                <span className="font-medium">Hide from the public site</span>
                <span className="mt-0.5 block text-xs text-ink-3">For duplicates, withdrawn papers or non-abstract files.</span>
              </span>
            </label>
          </section>

          <section className="card space-y-4 p-5">
            <div>
              <label htmlFor="keywords" className="label">
                Keywords
              </label>
              <input
                id="keywords"
                name="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="field"
                placeholder="diaspora, identity, memory"
              />
              <p className="hint mt-1.5">Separate with commas.</p>
            </div>
            {abstract?.proposedTheme && (
              <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-2">
                <span className="font-medium text-ink">Author’s stated sub-theme:</span> {abstract.proposedTheme}
              </p>
            )}
          </section>

          <section className="card p-5">
            <p className="eyebrow">Guideline check</p>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-sm">
                  {c.ok ? (
                    <CircleCheck className="mt-0.5 size-4 flex-none text-success" aria-label="OK" />
                  ) : (
                    <TriangleExclamationPoint className="mt-0.5 size-4 flex-none text-warning" aria-label="Needs attention" />
                  )}
                  <span>
                    <span className="font-medium">{c.label}</span> <span className="text-ink-3">· {c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!settings.wordLimitMax && !settings.wordLimitMin && (
              <p className="hint mt-3">Set word and keyword limits in Settings to check abstracts against the brochure.</p>
            )}
          </section>

          <section className="card space-y-4 p-5">
            <p className="eyebrow">Private — admins only</p>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input id="email" name="email" type="email" inputMode="email" defaultValue={abstract?.email ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={abstract?.phone ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="notes" className="label">
                Notes
              </label>
              <textarea id="notes" name="notes" rows={3} defaultValue={abstract?.notes ?? ""} className="field [field-sizing:content]" />
            </div>
          </section>

          {abstract && (
            <section className="card p-5 text-sm text-ink-3">
              <p>
                Source:{" "}
                <span className="text-ink-2">
                  {abstract.source.kind === "manual" ? "typed in" : abstract.source.fileName || abstract.source.kind}
                </span>
              </p>
              <button type="button" onClick={onDelete} disabled={deleting} className="btn btn-danger btn-sm mt-4 w-full">
                {deleting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash className="size-4" aria-hidden />}
                Delete abstract
              </button>
            </section>
          )}
        </aside>
      </div>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-6 lg:bottom-4">
        <div className="glass mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-line p-2 pl-4 shadow-[var(--shadow-lg)]">
          <span className={cn("text-sm", state && !state.ok ? "text-danger" : "text-ink-3")} aria-live="polite">
            {state && !state.ok ? state.message : abstract ? "Edits go live as soon as you save." : "New abstracts get the next paper number."}
          </span>
          <button type="submit" disabled={pending} className="btn btn-primary flex-none">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {abstract ? "Save changes" : "Add abstract"}
          </button>
        </div>
      </div>
    </form>
  );
}

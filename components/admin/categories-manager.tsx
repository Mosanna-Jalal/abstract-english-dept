"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, LoaderCircle, Pencil, Plus, Sparkles, Trash } from "lucide-react";
import {
  addStarterCategoriesAction,
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
} from "@/app/admin/actions";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CATEGORY_COLORS, COLOR_KEYS, toneStyle } from "@/lib/colors";
import { cn } from "@/lib/text";
import type { CategoryDTO, ColorKey } from "@/lib/types";
import { useAdminUI } from "./providers";

function CategoryForm({
  category,
  defaultColor,
  onDone,
}: {
  category?: CategoryDTO;
  defaultColor: ColorKey;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveCategoryAction, null);
  const [color, setColor] = useState<ColorKey>(category?.color ?? defaultColor);
  const { toast } = useAdminUI();

  useEffect(() => {
    if (!state) return;
    toast(state.message, { tone: state.ok ? "success" : "error" });
    if (state.ok) onDone();
  }, [state, toast, onDone]);

  return (
    <form action={action} className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="color" value={color} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`name-${category?.id ?? "new"}`}>
            Name
          </label>
          <input
            id={`name-${category?.id ?? "new"}`}
            name="name"
            required
            maxLength={80}
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Postcolonial Studies"
            className="field"
            autoFocus={!category}
          />
        </div>
        <div>
          <label className="label" htmlFor={`desc-${category?.id ?? "new"}`}>
            Short description
          </label>
          <input
            id={`desc-${category?.id ?? "new"}`}
            name="description"
            maxLength={300}
            defaultValue={category?.description ?? ""}
            placeholder="Shown on the public category page"
            className="field"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`kw-${category?.id ?? "new"}`}>
          Suggestion keywords
        </label>
        <textarea
          id={`kw-${category?.id ?? "new"}`}
          name="keywords"
          rows={2}
          defaultValue={category?.keywords.join(", ") ?? ""}
          placeholder="diaspora, migration, exile, homeland, belonging"
          className="field [field-sizing:content]"
        />
        <p className="hint mt-1.5">Comma-separated words that signal this category in an abstract.</p>
      </div>
      <fieldset>
        <legend className="label">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={CATEGORY_COLORS[key].label}
              aria-pressed={color === key}
              className="tone flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-transform hover:scale-105 aria-pressed:ring-2 aria-pressed:ring-[var(--tone-solid)]"
              style={toneStyle(key)}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--tone-solid)] text-white dark:text-black">
                {color === key && <Check className="size-4" aria-hidden />}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {category ? "Save" : "Add category"}
        </button>
      </div>
    </form>
  );
}

export function CategoriesManager({ categories }: { categories: CategoryDTO[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [working, start] = useTransition();
  const { toast, confirm } = useAdminUI();
  const used = new Set(categories.map((c) => c.color));
  const nextColor = COLOR_KEYS.find((k) => !used.has(k)) ?? COLOR_KEYS[categories.length % COLOR_KEYS.length];
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  function remove(c: CategoryDTO) {
    void confirm({
      title: `Delete “${c.name}”?`,
      body: c.count
        ? `${c.count} abstract${c.count === 1 ? "" : "s"} in this category will go back to the categorising queue.`
        : "This category has no abstracts.",
      confirmLabel: "Delete category",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      start(async () => {
        const res = await deleteCategoryAction(c.id);
        toast(res.ok ? (res.message ?? "Deleted.") : res.error, { tone: res.ok ? "success" : "error" });
      });
    });
  }

  function move(c: CategoryDTO, dir: -1 | 1) {
    start(async () => {
      const res = await moveCategoryAction(c.id, dir);
      if (!res.ok) toast(res.error, { tone: "error" });
    });
  }

  function addStarter() {
    start(async () => {
      const res = await addStarterCategoriesAction();
      toast(res.ok ? (res.message ?? "Added.") : res.error, { tone: res.ok ? "success" : "error" });
    });
  }

  return (
    <div className="space-y-4 px-4 sm:px-8">
      {categories.length === 0 && !adding && (
        <div className="card relative overflow-hidden p-6 sm:p-10">
          <div aria-hidden className="hero-glow absolute inset-0 opacity-60" />
          <div className="relative max-w-2xl">
            <p className="eyebrow">Start here</p>
            <h2 className="mt-2 font-serif text-[1.8rem] font-light leading-tight tracking-tight">Set up your categories</h2>
            <p className="mt-3 leading-relaxed text-ink-2">
              Enter the seminar’s sub-themes exactly as they appear in the brochure, so every abstract is filed under the
              theme it was submitted for. If you’d like a head start, add a ready-made set of common English-studies areas
              and rename or delete them as needed.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setAdding(true)} className="btn btn-primary">
                <Plus className="size-4" aria-hidden /> Add a category
              </button>
              <button type="button" onClick={addStarter} disabled={working} className="btn btn-secondary">
                {working ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                Use a starter set (12)
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && !adding && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setAdding(true)} className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> New category
          </button>
        </div>
      )}

      {adding && (
        <div className="card p-5 sm:p-6 animate-rise">
          <h2 className="mb-4 font-serif text-xl">New category</h2>
          <CategoryForm defaultColor={nextColor} onDone={closeAdd} />
        </div>
      )}

      {categories.length > 0 && (
        <ul className={cn("card divide-y divide-line", working && "opacity-70")}>
          {categories.map((c, i) => (
            <li key={c.id} className="p-4 sm:px-5">
              {editing === c.id ? (
                <CategoryForm category={c} defaultColor={c.color} onDone={closeEdit} />
              ) : (
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="tone flex size-10 flex-none items-center justify-center rounded-xl bg-[var(--tone-bg)]" style={toneStyle(c.color)}>
                    <CategoryIcon category={c} className="size-5 text-[var(--tone-fg)]" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-3">
                      <Link href={`/admin/abstracts?cat=${c.id}`} className="hover:text-ink">
                        {c.count} abstract{c.count === 1 ? "" : "s"}
                      </Link>
                      {" · "}
                      {c.keywords.length ? `${c.keywords.length} keywords` : "no keywords"}
                      {c.description && <span className="hidden sm:inline"> · {c.description}</span>}
                    </p>
                  </div>
                  <div className="flex flex-none items-center">
                    <button
                      type="button"
                      onClick={() => move(c, -1)}
                      disabled={i === 0 || working}
                      aria-label={`Move ${c.name} up`}
                      className="btn btn-ghost btn-sm btn-icon"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(c, 1)}
                      disabled={i === categories.length - 1 || working}
                      aria-label={`Move ${c.name} down`}
                      className="btn btn-ghost btn-sm btn-icon"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`} className="btn btn-ghost btn-sm btn-icon">
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      aria-label={`Delete ${c.name}`}
                      className="btn btn-ghost btn-sm btn-icon text-danger hover:text-danger"
                    >
                      <Trash className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

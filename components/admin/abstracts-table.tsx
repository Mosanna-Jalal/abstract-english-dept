"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Cloud, EyeOff, FileText, LoaderCircle, PenLine, Search, Trash, Upload, X } from "lucide-react";
import { assignCategoryAction, bulkAction, type BulkOperation } from "@/app/admin/actions";
import { toneStyle } from "@/lib/colors";
import { cn, padSerial } from "@/lib/text";
import type { AdminAbstractDTO, CategoryDTO } from "@/lib/types";
import { useAdminUI } from "./providers";

interface Filters {
  q: string;
  cat: string;
  status: string;
  page: number;
}

const SOURCE_ICON = { upload: Upload, drive: Cloud, manual: PenLine } as const;

export function AbstractsTable({
  data,
  categories,
  filters,
}: {
  data: { items: AdminAbstractDTO[]; total: number; page: number; pages: number };
  categories: CategoryDTO[];
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast, confirm } = useAdminUI();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [navigating, startNav] = useTransition();
  const [working, startWork] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const visibleIds = data.items.map((i) => i.id);
  const selectedHere = visibleIds.filter((id) => selected.has(id));
  const allSelected = visibleIds.length > 0 && selectedHere.length === visibleIds.length;

  function setFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.cat) sp.set("cat", next.cat);
    if (next.status) sp.set("status", next.status);
    if (next.page > 1) sp.set("page", String(next.page));
    const qs = sp.toString();
    setSelected(new Set());
    startNav(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(op: BulkOperation) {
    const ids = [...selected];
    startWork(async () => {
      const res = await bulkAction(ids, op);
      if (res.ok) {
        toast(res.message ?? "Done.", { tone: "success" });
        setSelected(new Set());
      } else toast(res.error, { tone: "error" });
    });
  }

  async function bulkDelete() {
    const n = selected.size;
    const ok = await confirm({
      title: `Delete ${n} abstract${n === 1 ? "" : "s"}?`,
      body: "They will be removed from the archive along with any stored original files. This can’t be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) runBulk({ type: "delete" });
  }

  function changeCategory(item: AdminAbstractDTO, categoryId: string) {
    startWork(async () => {
      const res = await assignCategoryAction(item.id, categoryId || null);
      if (!res.ok) toast(res.error, { tone: "error" });
    });
  }

  return (
    <div className="px-4 sm:px-8">
      {/* Filters */}
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>
            {navigating ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
          </span>
          <input
            type="search"
            defaultValue={filters.q}
            placeholder="Search title, author, No."
            aria-label="Search abstracts"
            className="field h-11 pl-10"
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setFilter({ q: value.trim() }), 300);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            aria-label="Filter by category"
            className="field h-11 pr-8 text-[0.94rem] sm:w-52 sm:pr-10 sm:text-base"
            value={filters.cat}
            onChange={(e) => setFilter({ cat: e.currentTarget.value })}
          >
            <option value="">All categories</option>
            <option value="none">Awaiting a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by visibility"
            className="field h-11 pr-8 text-[0.94rem] sm:w-40 sm:pr-10 sm:text-base"
            value={filters.status}
            onChange={(e) => setFilter({ status: e.currentTarget.value })}
          >
            <option value="">Any visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm text-ink-3">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={allSelected}
            onChange={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                for (const id of visibleIds) {
                  if (allSelected) next.delete(id);
                  else next.add(id);
                }
                return next;
              })
            }
            disabled={!visibleIds.length}
          />
          Select page
        </label>
        <span aria-live="polite">
          {data.total.toLocaleString("en-IN")} result{data.total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Rows */}
      {data.items.length ? (
        <ul className={cn("card mt-3 divide-y divide-line overflow-hidden transition-opacity", navigating && "opacity-60")}>
          {data.items.map((item) => {
            const SourceIcon = SOURCE_ICON[item.source.kind] ?? FileText;
            const cat = categories.find((c) => c.id === item.categoryId);
            return (
              <li key={item.id} className={cn("flex gap-3 p-4 sm:items-center sm:gap-4 sm:px-5", selected.has(item.id) && "bg-surface-2/70")}>
                <input
                  type="checkbox"
                  aria-label={`Select ${item.title}`}
                  className="mt-1 size-4 flex-none accent-[var(--accent)] sm:mt-0"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="tabular hidden w-10 flex-none font-serif text-sm italic text-ink-3 sm:block">{padSerial(item.serial)}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/abstracts/${item.id}`} className="line-clamp-2 font-medium leading-snug hover:text-accent sm:line-clamp-1">
                    <span className="font-serif text-sm italic text-ink-3 sm:hidden">{padSerial(item.serial)} · </span>
                    {item.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    <SourceIcon className="size-3.5" aria-label={item.source.kind} />
                    <span className="max-w-[16rem] truncate">{item.authors || "Unknown author"}</span>
                    <span>· {item.wordCount} words</span>
                    {item.hidden && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium text-ink-2">
                        <EyeOff className="size-3" aria-hidden /> Hidden
                      </span>
                    )}
                  </p>
                  <select
                    aria-label={`Category for ${item.title}`}
                    className="field tone mt-3 h-10 py-1.5 text-sm sm:hidden"
                    style={cat ? toneStyle(cat.color) : undefined}
                    value={item.categoryId ?? ""}
                    disabled={working}
                    onChange={(e) => changeCategory(item, e.currentTarget.value)}
                  >
                    <option value="">— Awaiting a category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  aria-label={`Category for ${item.title}`}
                  className={cn("field hidden h-10 w-56 flex-none py-1.5 text-sm sm:block", !cat && "text-ink-3")}
                  value={item.categoryId ?? ""}
                  disabled={working}
                  onChange={(e) => changeCategory(item, e.currentTarget.value)}
                >
                  <option value="">— Awaiting a category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card mt-3 px-6 py-14 text-center">
          <p className="font-serif text-xl">No abstracts found</p>
          <p className="mt-1 text-sm text-ink-3">
            {filters.q || filters.cat || filters.status ? "Try clearing the filters." : "Import some files to get started."}
          </p>
          {!filters.q && !filters.cat && !filters.status && (
            <Link href="/admin/import" className="btn btn-primary mt-5">
              <Upload className="size-4" aria-hidden /> Import abstracts
            </Link>
          )}
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button type="button" className="btn btn-secondary btn-sm" disabled={data.page <= 1} onClick={() => setFilter({ page: data.page - 1 })}>
            Previous
          </button>
          <span className="px-2 text-sm text-ink-3">
            Page {data.page} of {data.pages}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={data.page >= data.pages} onClick={() => setFilter({ page: data.page + 1 })}>
            Next
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 lg:bottom-6 lg:pl-64">
          <div
            className="flex w-full max-w-3xl flex-col gap-1.5 rounded-2xl bg-ink p-2 text-bg shadow-[var(--shadow-lg)] sm:flex-row sm:items-center sm:pl-4"
            style={{ animation: "toast-in 0.25s var(--ease) both" }}
          >
            <div className="flex items-center justify-between pl-2 sm:mr-auto sm:pl-0">
              <span className="text-sm font-medium">
                {selected.size} selected
                {working && <LoaderCircle className="ml-2 inline size-4 animate-spin" aria-hidden />}
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
                className="flex size-9 items-center justify-center rounded-full hover:bg-white/10 sm:hidden dark:hover:bg-black/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
            <select
              aria-label="Move selected to category"
              className="h-9 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-3 text-sm text-bg sm:flex-none dark:border-black/20 dark:bg-black/10 [&>option]:text-black"
              value=""
              disabled={working}
              onChange={(e) => {
                const v = e.currentTarget.value;
                if (v) runBulk({ type: "assign", categoryId: v === "none" ? null : v });
              }}
            >
              <option value="">Move to…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">Remove category</option>
            </select>
            <button type="button" disabled={working} onClick={() => runBulk({ type: "hide" })} className="h-9 rounded-full px-3 text-sm hover:bg-white/10 dark:hover:bg-black/10">
              Hide
            </button>
            <button type="button" disabled={working} onClick={() => runBulk({ type: "unhide" })} className="h-9 rounded-full px-3 text-sm hover:bg-white/10 dark:hover:bg-black/10">
              Unhide
            </button>
            <button
              type="button"
              disabled={working}
              onClick={bulkDelete}
              aria-label="Delete selected"
              className="flex size-9 items-center justify-center rounded-full text-[#f3a3a3] hover:bg-white/10 dark:text-danger dark:hover:bg-black/10"
            >
              <Trash className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="hidden size-9 items-center justify-center rounded-full hover:bg-white/10 sm:flex dark:hover:bg-black/10"
            >
              <X className="size-4" />
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CircleCheck, Download, FilePlus2, Inbox, Tags, Upload } from "lucide-react";
import { AdminHeader, AdminSection } from "@/components/admin/ui";
import { CategoryChip } from "@/components/site/category-chip";
import { getDashboard } from "@/lib/admin-queries";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { formatDate, padSerial } from "@/lib/text";

export const metadata: Metadata = { title: "Overview" };

function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-4 sm:px-8" aria-hidden>
      <div className="card h-48 p-6">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-5 h-12 w-56" />
        <div className="skeleton mt-6 h-2 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-28 p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-4 h-8 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function Dashboard() {
  const d = await getDashboard();
  const workable = d.total - d.hidden;
  const pct = workable ? Math.round((d.categorised / workable) * 100) : 0;
  const ranked = [...d.categories].sort((a, b) => b.count - a.count || a.order - b.order);
  const max = Math.max(1, ...ranked.map((c) => c.count));

  const tiles = [
    { label: "Total abstracts", value: d.total, href: "/admin/abstracts" },
    { label: "Categorised", value: d.categorised, href: "/admin/abstracts?status=visible" },
    { label: "Awaiting a category", value: d.uncategorised, href: "/admin/abstracts?cat=none" },
    { label: "Hidden", value: d.hidden, href: "/admin/abstracts?status=hidden" },
  ];

  return (
    <AdminSection className="space-y-6">
      {(d.total === 0 || d.categories.length === 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {d.categories.length === 0 && (
            <Link href="/admin/categories" className="card card-hover flex items-start gap-4 p-5">
              <span className="flex size-10 flex-none items-center justify-center rounded-full bg-surface-2 text-accent">
                <Tags className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">Step 1 · Set up categories</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-2">
                  Add the sub-themes from the seminar brochure, or start from a ready-made set.
                </span>
              </span>
            </Link>
          )}
          {d.total === 0 && (
            <Link href="/admin/import" className="card card-hover flex items-start gap-4 p-5">
              <span className="flex size-10 flex-none items-center justify-center rounded-full bg-surface-2 text-accent">
                <Upload className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">Step 2 · Import abstracts</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-2">
                  Upload PDF or Word files, or pull them straight from the Google Drive folder.
                </span>
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Progress meter */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="hero-glow absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Categorisation progress</p>
            <p className="mt-3 text-[2.8rem] font-semibold leading-none tracking-tight sm:text-[3.4rem]">
              {pct}
              <span className="text-[0.5em] font-medium text-ink-3">%</span>
            </p>
            <p className="mt-2 text-[0.95rem] text-ink-2">
              {d.categorised.toLocaleString("en-IN")} of {workable.toLocaleString("en-IN")} abstracts filed under a category
            </p>
          </div>
          {d.uncategorised > 0 ? (
            <Link href="/admin/categorize" className="btn btn-accent h-12 px-6">
              <Inbox className="size-4" aria-hidden /> Categorise {d.uncategorised} waiting
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : workable > 0 ? (
            <span className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-success">
              <CircleCheck className="size-5" aria-hidden /> Every abstract is categorised
            </span>
          ) : null}
        </div>
        <div
          className="relative mt-6 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Share of abstracts categorised"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* KPI tiles */}
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card card-hover p-5">
            <p className="text-[0.8rem] font-medium text-ink-3">{t.label}</p>
            <p className="mt-3 text-[1.9rem] font-semibold leading-none tracking-tight">{t.value.toLocaleString("en-IN")}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Ranked bars: one series, one hue; the dot only repeats each category's identity colour. */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl tracking-tight">Abstracts per category</h2>
            <Link href="/admin/categories" className="text-sm text-ink-3 hover:text-ink">
              Manage
            </Link>
          </div>
          {ranked.length ? (
            <ul className="mt-5 space-y-1">
              {ranked.map((c) => {
                const share = d.categorised ? Math.round((c.count / d.categorised) * 100) : 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/admin/abstracts?cat=${c.id}`}
                      className="group relative block rounded-xl px-2 py-2 hover:bg-surface-2 focus-visible:bg-surface-2"
                    >
                      <span className="flex items-center justify-between gap-3 text-[0.9rem]">
                        <span className="tone flex min-w-0 items-center gap-2" style={toneStyle(c.color)}>
                          <CategoryIcon category={c} className="size-4 flex-none text-[var(--tone-fg)]" strokeWidth={1.9} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="tabular flex-none font-medium">{c.count}</span>
                      </span>
                      <span className="mt-1.5 block h-1.5">
                        {c.count > 0 && (
                          <span
                            className="block h-full rounded-[4px] bg-accent transition-colors group-hover:bg-accent-hover"
                            style={{ width: `${(c.count / max) * 100}%` }}
                          />
                        )}
                      </span>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute -top-8 right-2 z-10 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs text-bg shadow-[var(--shadow-md)] group-hover:block group-focus-visible:block"
                      >
                        {c.count} abstract{c.count === 1 ? "" : "s"} · {share}% of categorised
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-3">No categories yet.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl tracking-tight">Recently added</h2>
              <Link href="/admin/abstracts" className="text-sm text-ink-3 hover:text-ink">
                View all
              </Link>
            </div>
            {d.recent.length ? (
              <ul className="mt-4 divide-y divide-line">
                {d.recent.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/abstracts/${a.id}`} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                      <span className="tabular mt-0.5 w-9 flex-none font-serif text-sm italic text-ink-3">{padSerial(a.serial)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-[0.93rem] font-medium">{a.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                          {a.category ? <CategoryChip category={a.category} className="min-h-6 px-2 text-[0.7rem]" /> : <span>Awaiting a category</span>}
                          <span>{formatDate(a.createdAt)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-3">Nothing imported yet.</p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Link href="/admin/import" className="card card-hover flex flex-col gap-3 p-4">
              <Upload className="size-5 text-accent" aria-hidden />
              <span className="text-sm font-medium">Import files</span>
            </Link>
            <Link href="/admin/abstracts/new" className="card card-hover flex flex-col gap-3 p-4">
              <FilePlus2 className="size-5 text-accent" aria-hidden />
              <span className="text-sm font-medium">Add manually</span>
            </Link>
            <a href="/admin/export" className="card card-hover flex flex-col gap-3 p-4">
              <Download className="size-5 text-accent" aria-hidden />
              <span className="text-sm font-medium">Export CSV</span>
            </a>
            <Link href="/admin/categories" className="card card-hover flex flex-col gap-3 p-4">
              <Tags className="size-5 text-accent" aria-hidden />
              <span className="text-sm font-medium">Categories</span>
            </Link>
          </section>
        </div>
      </div>
    </AdminSection>
  );
}

export default function AdminHome() {
  return (
    <>
      <AdminHeader eyebrow="Department of English" title="Overview" />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

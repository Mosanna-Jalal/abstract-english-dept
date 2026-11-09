"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toneStyle } from "@/lib/colors";
import { cn } from "@/lib/text";
import type { CategoryDTO } from "@/lib/types";

function hrefFor(q: string | null, slug: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (slug) sp.set("category", slug);
  const qs = sp.toString();
  return qs ? `/abstracts?${qs}` : "/abstracts";
}

export function CategoryFilter({ categories }: { categories: CategoryDTO[] }) {
  const params = useSearchParams();
  return <CategoryFilterView categories={categories} active={params.get("category") ?? ""} q={params.get("q")} />;
}

/** Also used as the Suspense fallback (no active state yet). */
export function CategoryFilterView({
  categories,
  active,
  q,
}: {
  categories: CategoryDTO[];
  active: string | null;
  q: string | null;
}) {
  return (
    <nav aria-label="Filter by category" className="scroll-row -mx-4 scroll-px-4 px-4 py-1 sm:mx-0 sm:scroll-px-0 sm:px-0">
      <Link
        href={hrefFor(q, "")}
        scroll={false}
        aria-current={active === "" ? "true" : undefined}
        className={cn(
          "chip h-9 px-4 text-[0.82rem] transition-colors",
          active === ""
            ? "bg-ink text-bg shadow-none"
            : "bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:text-ink",
        )}
      >
        All
      </Link>
      {categories.map((c) => {
        const on = active === c.slug;
        return (
          <Link
            key={c.id}
            href={hrefFor(q, c.slug)}
            scroll={false}
            aria-current={on ? "true" : undefined}
            style={toneStyle(c.color)}
            className={cn(
              "tone chip h-9 px-4 text-[0.82rem] transition-colors",
              on && "bg-[var(--tone-solid)] text-white shadow-none dark:text-black",
            )}
          >
            {!on && <span className="dot" aria-hidden />}
            {c.name}
            <span className={cn("tabular text-[0.72rem] font-medium", on ? "opacity-80" : "opacity-60")}>{c.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

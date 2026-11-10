import type { Metadata } from "next";
import { Suspense } from "react";
import { BookSearch } from "lucide-react";
import { AbstractCard } from "@/components/site/abstract-card";
import { CardGridSkeleton, EmptyState, PageIntro, Pagination } from "@/components/site/bits";
import { CategoryFilter, CategoryFilterView } from "@/components/site/category-filter";
import { PageSheet, TurnRegion } from "@/components/site/page-sheet";
import { SearchField } from "@/components/site/search-field";
import { getCategories, searchAbstracts } from "@/lib/queries";
import { plural } from "@/lib/text";

export const metadata: Metadata = {
  title: "Browse abstracts",
  description: "Search and filter every catalogued abstract by category, author or keyword.",
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

async function Filters() {
  const categories = (await getCategories()).filter((c) => c.count > 0);
  if (!categories.length) return null;
  return (
    <Suspense fallback={<CategoryFilterView categories={categories} active={null} q={null} />}>
      <CategoryFilter categories={categories} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/abstracts">["searchParams"] }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 120);
  const category = one(sp.category).slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const result = await searchAbstracts({ q, category, page });

  const href = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/abstracts?${qs}` : "/abstracts";
  };

  if (result.unknownCategory) {
    return <EmptyState title="That category doesn’t exist">It may have been renamed. Choose another category above.</EmptyState>;
  }
  if (!result.items.length) {
    return (
      <EmptyState title={q ? "No abstracts match your search" : "Nothing here yet"}>
        {q ? (
          <>Try a different spelling, fewer words, or search by an author’s surname.</>
        ) : (
          <>Abstracts appear here once they have been catalogued.</>
        )}
      </EmptyState>
    );
  }

  return (
    <TurnRegion key={result.page}>
      <p className="mb-5 text-sm text-ink-3" aria-live="polite">
        {plural(result.total, "abstract")}
        {result.category && (
          <>
            {" "}
            in <span className="font-medium text-ink">{result.category.name}</span>
          </>
        )}
        {q && (
          <>
            {" "}
            matching <span className="font-medium text-ink">“{q}”</span>
          </>
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item, i) => (
          <AbstractCard key={item.id} item={item} index={i} showCategory={!result.category} />
        ))}
      </div>
      <Pagination page={result.page} pages={result.pages} href={href} />
    </TurnRegion>
  );
}

export default function BrowsePage(props: PageProps<"/abstracts">) {
  return (
    <PageSheet>
      <PageIntro eyebrow="The archive" title="Browse abstracts" icon={<BookSearch />}>
        Search across titles, authors, institutions, keywords and the full text of every abstract.
      </PageIntro>
      <div className="glass sticky top-16 z-30 border-b border-line md:top-[4.5rem]">
        <div className="container-page flex flex-col gap-3 py-3 sm:py-4">
          <Suspense fallback={<div className="field h-[3.25rem] rounded-full" />}>
            <SearchField />
          </Suspense>
          <Suspense fallback={<div className="h-11" />}>
            <Filters />
          </Suspense>
        </div>
      </div>
      <div className="container-page mt-6 sm:mt-8">
        <Suspense fallback={<CardGridSkeleton />}>
          <Results searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PageSheet>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AbstractCard } from "@/components/site/abstract-card";
import { CardGridSkeleton, EmptyState, Pagination } from "@/components/site/bits";
import { PageSheet, TurnRegion } from "@/components/site/page-sheet";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { TURN_BACK } from "@/lib/turn";
import { getCategories, getCategory, searchAbstracts } from "@/lib/queries";
import { plural, toRoman } from "@/lib/text";

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description || `Abstracts filed under ${category.name}.`,
  };
}

function HeaderSkeleton() {
  return (
    <div className="border-b border-line" aria-hidden>
      <div className="container-page pb-12 pt-8">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-10 h-5 w-10" />
        <div className="skeleton mt-4 h-12 w-2/3" />
        <div className="skeleton mt-4 h-5 w-1/2" />
      </div>
    </div>
  );
}

async function CategoryView(props: PageProps<"/categories/[slug]">) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const all = await getCategories();
  const index = all.findIndex((c) => c.slug === slug);
  if (index < 0) notFound();
  const category = all[index];
  const pageParam = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "", 10) || 1);
  const result = await searchAbstracts({ q: "", category: slug, page });

  return (
    <>
      <header className="tone relative overflow-hidden border-b border-line" style={toneStyle(category.color)}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 70% at 10% 0%, var(--tone-bg), transparent 70%), radial-gradient(40% 50% at 100% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="absolute right-6 top-0 h-20 w-9 bg-[var(--tone-solid)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)] sm:right-16 sm:h-28 sm:w-12"
        />
        <div className="container-page relative pb-12 pt-6 sm:pb-16 sm:pt-10">
          <Link
            href="/categories"
            transitionTypes={TURN_BACK}
            className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> All categories
          </Link>
          <div className="mt-9 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--tone-bg)] text-[var(--tone-fg)] shadow-[inset_0_0_0_1px_var(--tone-line)]">
              <CategoryIcon category={category} className="size-6" strokeWidth={1.7} />
            </span>
            <p className="font-serif text-lg italic text-[var(--tone-fg)]">{toRoman(index + 1)}.</p>
          </div>
          <h1 className="mt-2 max-w-3xl pr-14 font-serif text-[2.4rem] font-light leading-[1.05] tracking-tight sm:text-[3.6rem]">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-ink-2 sm:text-lg">{category.description}</p>
          )}
          <p className="mt-6 text-sm font-medium text-[var(--tone-fg)]">{plural(result.total, "abstract")}</p>
        </div>
      </header>

      <div className="container-page mt-8 sm:mt-10">
        {result.items.length ? (
          <TurnRegion key={result.page}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item, i) => (
                <AbstractCard key={item.id} item={item} index={i} showCategory={false} />
              ))}
            </div>
            <Pagination
              page={result.page}
              pages={result.pages}
              href={(p) => (p > 1 ? `/categories/${slug}?page=${p}` : `/categories/${slug}`)}
            />
          </TurnRegion>
        ) : (
          <EmptyState title="No abstracts here yet">Abstracts filed under this category will appear here.</EmptyState>
        )}
      </div>
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categories/[slug]">) {
  return (
    <PageSheet>
      <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <div className="container-page mt-10">
            <CardGridSkeleton />
          </div>
        </>
      }
    >
        <CategoryView {...props} />
      </Suspense>
    </PageSheet>
  );
}

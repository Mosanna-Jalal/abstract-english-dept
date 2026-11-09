import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/bits";
import { CategoryChip } from "@/components/site/category-chip";
import { ShareButton } from "@/components/site/client-buttons";
import { getAbstractPage } from "@/lib/queries";
import { excerpt, padSerial, toParagraphs } from "@/lib/text";

function serialFrom(id: string): number {
  return /^\d{1,7}$/.test(id) ? Number(id) : NaN;
}

export async function generateMetadata(props: PageProps<"/abstracts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const data = await getAbstractPage(serialFrom(id));
  if (!data) return { title: "Abstract not found" };
  const a = data.abstract;
  return {
    title: a.title,
    description: excerpt(a.body, 160),
    authors: a.authors ? a.authors.split(/\s*,\s*/).map((name) => ({ name })) : undefined,
    openGraph: { title: a.title, description: excerpt(a.body, 200), type: "article" },
  };
}

function DetailSkeleton() {
  return (
    <div className="container-page max-w-3xl pt-10" aria-hidden>
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-8 h-7 w-44 rounded-full" />
      <div className="skeleton mt-6 h-12 w-full" />
      <div className="skeleton mt-3 h-12 w-2/3" />
      <div className="skeleton mt-6 h-5 w-1/2" />
      <div className="mt-12 space-y-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="skeleton h-5" style={{ width: `${92 - (i % 3) * 9}%` }} />
        ))}
      </div>
    </div>
  );
}

async function AbstractView({ params }: { params: PageProps<"/abstracts/[id]">["params"] }) {
  const { id } = await params;
  const data = await getAbstractPage(serialFrom(id));
  if (!data) notFound();
  const { abstract: a, prev, next, position, ofTotal } = data;
  const paragraphs = toParagraphs(a.body);

  return (
    <article className="pb-6">
      <header className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="hero-glow absolute inset-0 opacity-70" />
        <div className="container-page relative max-w-3xl pb-10 pt-6 sm:pb-14 sm:pt-10">
          <nav className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={a.category ? `/categories/${a.category.slug}` : "/abstracts"}
              className="inline-flex min-w-0 items-center gap-1.5 text-ink-3 transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-4 flex-none" aria-hidden />
              <span className="truncate">{a.category ? a.category.name : "All abstracts"}</span>
            </Link>
            {a.category && ofTotal > 1 && (
              <span className="flex-none text-ink-3">
                {position} of {ofTotal}
              </span>
            )}
          </nav>

          <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise">
            {a.category && <CategoryChip category={a.category} link />}
            <span className="font-serif text-sm italic text-ink-3">Paper No. {padSerial(a.serial)}</span>
          </div>

          <h1
            className="mt-5 font-serif text-[2.1rem] font-normal leading-[1.1] tracking-[-0.015em] animate-rise sm:text-[3rem]"
            style={{ animationDelay: "60ms" }}
          >
            {a.title}
          </h1>

          {(a.authors || a.affiliation) && (
            <div className="mt-6 animate-rise" style={{ animationDelay: "120ms" }}>
              {a.authors && <p className="text-[1.05rem] font-semibold">{a.authors}</p>}
              {a.affiliation && <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-2">{a.affiliation}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="container-page max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 text-sm text-ink-3">
          <span>{a.wordCount ? `${a.wordCount.toLocaleString("en-IN")} words` : "Abstract"}</span>
          <ShareButton title={a.title} />
        </div>

        {paragraphs.length ? (
          <div className="prose-abstract drop-cap mt-10 animate-fade">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-ink-3">The text of this abstract hasn’t been added yet.</p>
        )}

        {a.keywords.length > 0 && (
          <section className="mt-10" aria-label="Keywords">
            <p className="eyebrow">Keywords</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {a.keywords.map((k) => (
                <li key={k}>
                  <Link href={`/abstracts?q=${encodeURIComponent(k)}`} className="pill transition-colors hover:border-line-strong hover:text-ink">
                    {k}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Ornament className="my-14" />

        {(prev || next) && (
          <nav aria-label="More in this category" className="grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={`/abstracts/${prev.serial}`} className="card card-hover group flex flex-col p-5">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-3">
                  <ArrowLeft className="size-3.5" aria-hidden /> Previous
                </span>
                <span className="mt-2 line-clamp-2 font-serif text-lg leading-snug">{prev.title}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next && (
              <Link href={`/abstracts/${next.serial}`} className="card card-hover group flex flex-col p-5 sm:text-right">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-3 sm:justify-end">
                  Next <ArrowRight className="size-3.5" aria-hidden />
                </span>
                <span className="mt-2 line-clamp-2 font-serif text-lg leading-snug">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </article>
  );
}

export default function AbstractPage(props: PageProps<"/abstracts/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AbstractView params={props.params} />
    </Suspense>
  );
}

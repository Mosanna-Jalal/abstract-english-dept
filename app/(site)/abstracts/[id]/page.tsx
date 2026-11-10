import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { Flipbook } from "@/components/site/flipbook";
import { toFlipbookMeta, toFlipbookSection } from "@/components/site/flipbook-pages";
import { PageSheet } from "@/components/site/page-sheet";
import { getSettings, getVolume } from "@/lib/queries";
import { excerpt } from "@/lib/text";
import { TURN_BACK, TURN_FORWARD } from "@/lib/turn";

// An abstract opens in its sub-theme's own book, at its page. Turning the
// page moves to the next abstract in the sub-theme, and the address follows.

function serialFrom(id: string): number {
  return /^\d{1,7}$/.test(id) ? Number(id) : NaN;
}

export async function generateMetadata(props: PageProps<"/abstracts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const volume = await getVolume(serialFrom(id));
  const a = volume?.items[volume.index];
  if (!a) return { title: "Abstract not found" };
  return {
    title: a.title,
    description: excerpt(a.body, 160),
    authors: a.authors ? a.authors.split(/\s*,\s*/).map((name) => ({ name })) : undefined,
    openGraph: { title: a.title, description: excerpt(a.body, 200), type: "article" },
  };
}

/** The shape of the open book while it loads. */
function BookSkeleton() {
  return (
    <div aria-hidden>
      <div className="container-page pt-5 sm:pt-7">
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="flipbook-stage">
        <div className="skeleton flipbook-placeholder" />
      </div>
    </div>
  );
}

async function Volume({ params }: { params: PageProps<"/abstracts/[id]">["params"] }) {
  const { id } = await params;
  const [volume, s] = await Promise.all([getVolume(serialFrom(id)), getSettings()]);
  if (!volume || volume.index < 0) notFound();
  const { category, number, items, index } = volume;
  const serial = items[index].serial;

  return (
    <>
      <nav className="container-page relative flex items-center justify-between gap-3 pt-5 text-sm no-print sm:pt-7">
        <Link
          href={`/categories/${category.slug}`}
          transitionTypes={TURN_BACK}
          className="inline-flex min-w-0 items-center gap-1.5 text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4 flex-none" aria-hidden />
          <span className="truncate">{category.name}</span>
        </Link>
        <Link
          href="/book"
          transitionTypes={TURN_FORWARD}
          className="inline-flex flex-none items-center gap-1.5 text-ink-3 transition-colors hover:text-ink"
        >
          <BookOpenText className="size-4" aria-hidden />
          Book of Abstracts
        </Link>
      </nav>
      <Flipbook
        key={serial}
        meta={toFlipbookMeta(s)}
        sections={[toFlipbookSection(category, number, items)]}
        volume={{ open: serial }}
      />
    </>
  );
}

export default function AbstractPage(props: PageProps<"/abstracts/[id]">) {
  return (
    <PageSheet>
      <div className="relative overflow-hidden pb-10">
        <div aria-hidden className="hero-glow absolute inset-x-0 top-0 h-96 opacity-70" />
        <Suspense fallback={<BookSkeleton />}>
          <Volume params={props.params} />
        </Suspense>
      </div>
    </PageSheet>
  );
}

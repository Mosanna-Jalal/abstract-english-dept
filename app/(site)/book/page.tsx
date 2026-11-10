import type { Metadata } from "next";
import { EmptyState } from "@/components/site/bits";
import { Flipbook } from "@/components/site/flipbook";
import { toFlipbookMeta, toFlipbookSection } from "@/components/site/flipbook-pages";
import { PageSheet } from "@/components/site/page-sheet";
import { getBook, getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Book of Abstracts",
  description: "Leaf through every abstract like a printed book, arranged by sub-theme.",
};

export default async function BookPage() {
  const [s, book] = await Promise.all([getSettings(), getBook()]);
  const sections = book.map(({ category, number, items }) => toFlipbookSection(category, number, items));

  return (
    <PageSheet>
      <div className="relative overflow-hidden pb-10">
        <div aria-hidden className="hero-glow absolute inset-x-0 top-0 h-96 opacity-70" />
        <div className="container-page relative pt-6 text-center sm:pt-8">
          <p className="eyebrow">
            {s.organizer} · {s.institution}
          </p>
          <h1 className="mt-2 font-serif text-[1.9rem] font-light tracking-tight sm:text-[2.3rem]">Book of Abstracts</h1>
        </div>
        {sections.length ? (
          <Flipbook meta={toFlipbookMeta(s)} sections={sections} />
        ) : (
          <div className="container-page mt-8 max-w-3xl">
            <EmptyState title="The book is still being assembled">
              Abstracts appear here, arranged by sub-theme, as soon as they are catalogued.
            </EmptyState>
          </div>
        )}
      </div>
    </PageSheet>
  );
}

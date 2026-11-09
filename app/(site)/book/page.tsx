import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { EmptyState, Ornament } from "@/components/site/bits";
import { PrintButton } from "@/components/site/client-buttons";
import { getBook, getSettings } from "@/lib/queries";
import { padSerial, plural, toParagraphs, toRoman } from "@/lib/text";

export const metadata: Metadata = {
  title: "Book of Abstracts",
  description: "Every catalogued abstract, arranged by category — ready to read, print or save as PDF.",
};

export default async function BookPage() {
  const [s, sections] = await Promise.all([getSettings(), getBook()]);
  const total = sections.reduce((n, sec) => n + sec.items.length, 0);

  return (
    <div>
      {/* Cover */}
      <section className="relative overflow-hidden border-b border-line print:flex print:min-h-[250mm] print:items-center print:border-0">
        <div aria-hidden className="hero-glow absolute inset-0 print:hidden" />
        <div aria-hidden className="ruled absolute inset-x-0 top-0 h-[26rem] opacity-60 print:hidden" />
        <div className="container-page relative max-w-3xl pb-14 pt-12 text-center sm:pb-20 sm:pt-20">
          <p className="eyebrow">
            {s.organizer} · {s.institution}
          </p>
          <h1 className="mt-5 font-serif text-[2.8rem] font-light leading-[1.02] tracking-[-0.02em] sm:text-[4.2rem]">
            {s.eventTitle}
          </h1>
          {s.eventSubtitle && <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{s.eventSubtitle}</p>}
          {(s.eventDate || s.venue) && (
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-2">
              {s.eventDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4 text-gold" aria-hidden /> {s.eventDate}
                </span>
              )}
              {s.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-gold" aria-hidden /> {s.venue}
                </span>
              )}
            </p>
          )}
          <Ornament className="mx-auto mt-10 w-56" />
          {total > 0 && (
            <p className="mt-6 text-sm text-ink-3">
              {plural(total, "abstract")} in {plural(sections.length, "category", "categories")}
            </p>
          )}
          {total > 0 && (
            <div className="mt-8 no-print">
              <PrintButton />
            </div>
          )}
        </div>
      </section>

      {total === 0 ? (
        <div className="container-page mt-10 max-w-3xl">
          <EmptyState title="The book is still being assembled">
            Abstracts appear here, arranged by category, as soon as they are catalogued.
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Contents */}
          <nav aria-label="Contents" className="container-page mt-14 max-w-3xl print-break-before">
            <p className="eyebrow">Contents</p>
            <ol className="mt-6 space-y-8">
              {sections.map((sec, i) => (
                <li key={sec.category.id}>
                  <a href={`#c-${sec.category.slug}`} className="group flex items-baseline gap-3">
                    <span className="w-8 flex-none font-serif italic text-gold">{toRoman(i + 1)}.</span>
                    <span className="font-serif text-xl tracking-tight group-hover:text-accent">{sec.category.name}</span>
                    <span className="flex-1 translate-y-[-4px] border-b border-dotted border-line-strong" aria-hidden />
                    <span className="text-sm text-ink-3">{sec.items.length}</span>
                  </a>
                  <ol className="mt-3 space-y-2 pl-11">
                    {sec.items.map((a) => (
                      <li key={a.id}>
                        <a href={`#a-${a.serial}`} className="group flex gap-3 text-[0.93rem] leading-snug">
                          <span className="tabular w-9 flex-none text-ink-3">{padSerial(a.serial)}</span>
                          <span>
                            <span className="text-ink group-hover:text-accent">{a.title}</span>
                            {a.authors && <span className="text-ink-3"> — {a.authors}</span>}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          {sections.map((sec, i) => (
            <section key={sec.category.id} id={`c-${sec.category.slug}`} className="container-page mt-24 max-w-3xl print-break-before print:mt-0">
              <header className="border-b border-line pb-8 text-center">
                <p className="font-serif text-lg italic text-gold">{toRoman(i + 1)}</p>
                <h2 className="mt-2 font-serif text-[2.1rem] font-light leading-tight tracking-tight sm:text-[2.6rem]">
                  {sec.category.name}
                </h2>
                {sec.category.description && (
                  <p className="mx-auto mt-3 max-w-xl text-[0.98rem] leading-relaxed text-ink-2">{sec.category.description}</p>
                )}
              </header>
              {sec.items.map((a) => (
                <article key={a.id} id={`a-${a.serial}`} className="border-b border-line py-12 last:border-0">
                  <div className="print-avoid-break">
                    <p className="font-serif text-sm italic text-ink-3">No. {padSerial(a.serial)}</p>
                    <h3 className="mt-2 font-serif text-[1.55rem] font-normal leading-snug tracking-tight sm:text-[1.8rem]">
                      <Link href={`/abstracts/${a.serial}`} className="hover:text-accent">
                        {a.title}
                      </Link>
                    </h3>
                    {(a.authors || a.affiliation) && (
                      <p className="mt-3 text-[0.95rem] leading-relaxed">
                        {a.authors && <span className="font-semibold">{a.authors}</span>}
                        {a.affiliation && <span className="block text-ink-2">{a.affiliation}</span>}
                      </p>
                    )}
                  </div>
                  <div className="prose-abstract mt-6">
                    {toParagraphs(a.body).map((p, k) => (
                      <p key={k}>{p}</p>
                    ))}
                  </div>
                  {a.keywords.length > 0 && (
                    <p className="text-[0.92rem] text-ink-2">
                      <span className="font-semibold text-ink">Keywords:</span> <em>{a.keywords.join(", ")}</em>
                    </p>
                  )}
                </article>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

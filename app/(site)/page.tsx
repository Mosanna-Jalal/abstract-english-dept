import Form from "next/form";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, MapPin, ScrollText, Search } from "lucide-react";
import { AbstractCard } from "@/components/site/abstract-card";
import { EmptyState, Ornament, SectionHeading } from "@/components/site/bits";
import { CategoryCard } from "@/components/site/category-card";
import { getCategories, getRecentAbstracts, getSettings, getStats } from "@/lib/queries";

function EditorialTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <>{text}</>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <em className="italic text-accent">{last}</em>
    </>
  );
}

async function Hero() {
  const [s, stats] = await Promise.all([getSettings(), getStats()]);
  const figures = [
    { value: stats.abstracts, label: stats.abstracts === 1 ? "Abstract" : "Abstracts" },
    { value: stats.categories, label: stats.categories === 1 ? "Category" : "Categories" },
    { value: stats.contributors, label: stats.contributors === 1 ? "Contributor" : "Contributors" },
  ];
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="ruled absolute inset-x-0 top-0 h-[30rem] opacity-70" />
      <div className="container-page relative pb-14 pt-12 sm:pb-20 sm:pt-20">
        <p className="eyebrow animate-rise">
          {s.organizer} · {s.institution}
        </p>
        <h1
          className="mt-4 max-w-4xl font-serif text-[3.1rem] font-light leading-[0.98] tracking-[-0.025em] animate-rise sm:text-[4.6rem] lg:text-[5.5rem]"
          style={{ animationDelay: "70ms" }}
        >
          <EditorialTitle text={s.eventTitle} />
        </h1>
        {s.eventSubtitle && (
          <p
            className="mt-5 max-w-2xl text-[1.1rem] leading-relaxed text-ink-2 animate-rise sm:text-xl"
            style={{ animationDelay: "140ms" }}
          >
            {s.eventSubtitle}
          </p>
        )}
        {(s.eventDate || s.venue) && (
          <div className="mt-5 flex flex-wrap gap-2 animate-rise" style={{ animationDelay: "180ms" }}>
            {s.eventDate && (
              <span className="pill gap-1.5 bg-surface/70 px-3 py-1 text-[0.82rem]">
                <Calendar className="size-3.5 text-gold" aria-hidden />
                {s.eventDate}
              </span>
            )}
            {s.venue && (
              <span className="pill gap-1.5 bg-surface/70 px-3 py-1 text-[0.82rem]">
                <MapPin className="size-3.5 text-gold" aria-hidden />
                {s.venue}
              </span>
            )}
          </div>
        )}

        <Form
          action="/abstracts"
          role="search"
          className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-line-strong bg-surface p-1.5 pl-5 shadow-[var(--shadow-md)] animate-rise focus-within:border-[color-mix(in_oklab,var(--accent)_55%,var(--line-strong))]"
          style={{ animationDelay: "220ms" }}
        >
          <Search className="size-[1.15rem] flex-none text-ink-3" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder="Title, author or keyword"
            aria-label="Search abstracts"
            enterKeyHint="search"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="submit" className="btn btn-primary h-11 px-5">
            Search
          </button>
        </Form>

        {stats.abstracts > 0 && (
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 animate-rise" style={{ animationDelay: "280ms" }}>
            {figures.map((f) => (
              <div key={f.label} className="border-l border-line-strong pl-4">
                <dd className="text-[1.9rem] font-semibold leading-none tracking-tight sm:text-[2.2rem]">
                  {f.value.toLocaleString("en-IN")}
                </dd>
                <dt className="mt-2 text-[0.8rem] text-ink-3">{f.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

async function Categories() {
  const all = await getCategories();
  const categories = all.filter((c) => c.count > 0);
  if (!categories.length) {
    return (
      <EmptyState title="The collection is being catalogued">
        Abstracts appear here as soon as the department files them under a category. Please check back shortly.
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c, i) => (
        <CategoryCard key={c.id} category={c} index={i} number={all.indexOf(c) + 1} />
      ))}
    </div>
  );
}

async function Recent() {
  const items = await getRecentAbstracts(6);
  if (!items.length) return null;
  return (
    <section className="container-page mt-20 sm:mt-24">
      <SectionHeading
        eyebrow="Recently catalogued"
        title="Latest abstracts"
        action={
          <Link href="/abstracts" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Browse all <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <AbstractCard key={item.id} item={item} index={i} />
        ))}
      </div>
      <Link href="/abstracts" className="btn btn-secondary mt-6 w-full sm:hidden">
        Browse all abstracts <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

async function About() {
  const s = await getSettings();
  return (
    <section className="container-page mt-20 sm:mt-28">
      <div className="card relative overflow-hidden px-6 py-12 sm:px-14 sm:py-16">
        <div aria-hidden className="hero-glow absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="eyebrow">About the collection</p>
          <p className="mt-5 font-serif text-[1.45rem] font-light leading-snug tracking-tight sm:text-[1.9rem]">
            {s.about}
          </p>
          <Ornament className="mx-auto mt-8 w-48" />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className="btn btn-primary">
              <BookOpen className="size-4" aria-hidden /> Read the Book of Abstracts
            </Link>
            <Link href="/guidelines" className="btn btn-secondary">
              <ScrollText className="size-4" aria-hidden /> Guidelines
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <section className="container-page mt-14 sm:mt-20">
        <SectionHeading
          eyebrow="Browse by category"
          title="The collection"
          action={
            <Link href="/categories" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              All categories <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <Categories />
      </section>
      <Recent />
      <About />
    </>
  );
}

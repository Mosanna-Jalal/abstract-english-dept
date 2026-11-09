import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleCheck, Tags, Upload } from "lucide-react";
import { CategorizeDeck } from "@/components/admin/categorize-deck";
import { getQueue } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Categorise" };

function DeckSkeleton() {
  return (
    <div className="px-4 pt-6 sm:px-8" aria-hidden>
      <div className="skeleton h-2 w-full rounded-full" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card space-y-4 p-6 sm:p-8">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-9 w-4/5" />
          <div className="skeleton h-4 w-1/2" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${95 - (i % 3) * 8}%` }} />
          ))}
        </div>
        <div className="card hidden h-96 p-6 lg:block" />
      </div>
    </div>
  );
}

function Notice({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="px-4 pt-10 sm:px-8">
      <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-accent">{icon}</span>
        <h1 className="mt-6 font-serif text-[1.8rem] font-light tracking-tight">{title}</h1>
        <p className="mt-2 max-w-sm leading-relaxed text-ink-2">{children}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">{action}</div>
      </div>
    </div>
  );
}

async function Deck() {
  const { items, remaining, categories } = await getQueue(40);

  if (!categories.length) {
    return (
      <Notice
        icon={<Tags className="size-6" aria-hidden />}
        title="Add categories first"
        action={
          <Link href="/admin/categories" className="btn btn-primary">
            Set up categories
          </Link>
        }
      >
        Create the categories (for example the seminar’s sub-themes) that abstracts will be filed under.
      </Notice>
    );
  }
  if (!remaining) {
    return (
      <Notice
        icon={<CircleCheck className="size-6" aria-hidden />}
        title="All caught up"
        action={
          <>
            <Link href="/admin/import" className="btn btn-primary">
              <Upload className="size-4" aria-hidden /> Import more
            </Link>
            <Link href="/admin/abstracts" className="btn btn-secondary">
              Review abstracts
            </Link>
          </>
        }
      >
        Every abstract has a category. New imports will appear here automatically.
      </Notice>
    );
  }
  return <CategorizeDeck items={items} remaining={remaining} categories={categories} />;
}

export default function CategorizePage() {
  return (
    <Suspense fallback={<DeckSkeleton />}>
      <Deck />
    </Suspense>
  );
}

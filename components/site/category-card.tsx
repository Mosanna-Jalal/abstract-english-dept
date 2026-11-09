import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toneStyle } from "@/lib/colors";
import { plural, toRoman } from "@/lib/text";
import type { CategoryDTO } from "@/lib/types";

/** `number` is the category's position in the full list (its sub-theme number). */
export function CategoryCard({ category, index, number }: { category: CategoryDTO; index: number; number: number }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      prefetch
      className="tone card card-hover group relative flex min-h-44 flex-col overflow-hidden p-5 animate-rise sm:p-6"
      style={{ ...toneStyle(category.color), animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      {/* Bookmark ribbon in the category colour */}
      <span
        aria-hidden
        className="absolute right-5 top-0 h-10 w-5 bg-[var(--tone-solid)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)] transition-[height] duration-500 group-hover:h-12"
      />
      <span className="font-serif text-sm italic text-ink-3">{toRoman(number)}.</span>
      <h3 className="mt-3 pr-8 font-serif text-[1.35rem] font-medium leading-snug tracking-tight">{category.name}</h3>
      {category.description && (
        <p className="mt-2 line-clamp-2 text-[0.92rem] leading-relaxed text-ink-2">{category.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="text-sm font-medium text-[var(--tone-fg)]">{plural(category.count, "abstract")}</span>
        <ArrowRight
          className="size-4 text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink"
          aria-hidden
        />
      </div>
    </Link>
  );
}

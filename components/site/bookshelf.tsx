import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { plural, toRoman } from "@/lib/text";
import { TURN_FORWARD } from "@/lib/turn";
import type { CategoryDTO } from "@/lib/types";

/**
 * The collection as books on shelves. Each sub-theme is a cloth-bound volume
 * standing face-out, and the more abstracts it holds, the thicker it is.
 * `all` is the full, ordered category list, which numbers the sub-themes.
 * Styles: "Bookshelf" in globals.css.
 */
export function Bookshelf({ categories, all }: { categories: CategoryDTO[]; all: CategoryDTO[] }) {
  const numbers = new Map(all.map((c, i) => [c.id, i + 1]));
  // Thickness from 0 to 1, relative to the fullest sub-theme. The square root
  // keeps small sub-themes from all looking equally thin.
  const most = Math.max(1, ...categories.map((c) => c.count));
  const thickness = (count: number) => Number(Math.sqrt(count / most).toFixed(3));
  return (
    <ul role="list" className="bookshelf">
      {categories.map((category, index) => {
        const number = numbers.get(category.id) ?? index + 1;
        return (
          <li
            key={category.id}
            className="shelf-slot"
            style={{ ...toneStyle(category.color), "--t": thickness(category.count) } as React.CSSProperties}
          >
            <Link
              href={`/categories/${category.slug}`}
              prefetch
              transitionTypes={TURN_FORWARD}
              className="shelf-book animate-rise"
              style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
            >
              <span aria-hidden className="book-shadow" />
              <span aria-hidden className="book-ribbon" />
              <span className="book">
                <span aria-hidden className="book-back" />
                <span aria-hidden className="book-pages" />
                <span className="book-cover">
                  <span aria-hidden className="book-frame" />
                  <span className="book-numeral">
                    <span className="sr-only">Sub-theme {number}: </span>
                    <span aria-hidden>{toRoman(number)}</span>
                  </span>
                  <span className="book-medal">
                    <CategoryIcon category={category} strokeWidth={1.5} />
                  </span>
                  <h3 className="book-title">{category.name}</h3>
                  <svg aria-hidden viewBox="0 0 80 12" className="book-rule" fill="currentColor">
                    <path d="M0 5.5h30v1H0zM50 5.5h30v1H50z" opacity=".55" />
                    <path d="M40 0 46 6 40 12 34 6Z" />
                  </svg>
                  <span className="book-count">{plural(category.count, "abstract")}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

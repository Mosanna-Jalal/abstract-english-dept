import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { padSerial } from "@/lib/text";
import { TURN_FORWARD } from "@/lib/turn";
import type { AbstractCardDTO } from "@/lib/types";
import { CategoryChip } from "./category-chip";

export function AbstractCard({
  item,
  showCategory = true,
  index = 0,
}: {
  item: AbstractCardDTO;
  showCategory?: boolean;
  index?: number;
}) {
  return (
    <article
      className="card card-hover group relative flex h-full flex-col p-5 animate-rise sm:p-6"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        {showCategory && item.category ? <CategoryChip category={item.category} /> : <span />}
        <span className="font-serif text-sm italic text-ink-3">No. {padSerial(item.serial)}</span>
      </div>

      <h3 className="mt-4 font-serif text-[1.3rem] font-medium leading-snug tracking-tight text-ink sm:text-[1.4rem]">
        <Link
          href={`/abstracts/${item.serial}`}
          transitionTypes={TURN_FORWARD}
          className="outline-none after:absolute after:inset-0 after:rounded-[1.25rem]"
        >
          {item.title}
        </Link>
      </h3>

      {(item.authors || item.affiliation) && (
        <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">
          {item.authors && <span className="font-medium text-ink">{item.authors}</span>}
          {item.authors && item.affiliation && <span className="text-ink-3"> · </span>}
          {item.affiliation && <span className="text-ink-3">{item.affiliation}</span>}
        </p>
      )}

      {item.excerpt && (
        <p className="mt-3 line-clamp-3 text-[0.94rem] leading-relaxed text-ink-2">{item.excerpt}</p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {item.keywords.slice(0, 3).map((k) => (
            <span key={k} className="pill">
              {k}
            </span>
          ))}
        </div>
        <span
          aria-hidden
          className="flex size-9 flex-none items-center justify-center rounded-full border border-line text-ink-3 transition-all duration-300 group-hover:border-transparent group-hover:bg-ink group-hover:text-bg"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </article>
  );
}

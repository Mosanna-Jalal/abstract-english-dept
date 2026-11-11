import Link from "next/link";
import { BookOpenText, BookSearch, LockKeyhole, ScrollText } from "lucide-react";
import { Seal } from "@/components/ui/seal";
import { getFooterYear, getSettings } from "@/lib/queries";
import { TURN_FORWARD } from "@/lib/turn";

export async function SiteFooter() {
  const [s, year] = await Promise.all([getSettings(), getFooterYear()]);
  return (
    <footer className="mt-24 border-t border-line no-print">
      <div className="container-page flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <Seal className="size-9 rounded-[0.8rem]" />
          <div>
            <p className="font-serif text-lg leading-tight">{s.siteTitle}</p>
            <p className="mt-1 text-sm text-ink-3">
              {s.organizer} · {s.institution}
            </p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-3">
          <Link href="/abstracts" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <BookSearch className="size-4" aria-hidden /> Browse
          </Link>
          <Link href="/book" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <BookOpenText className="size-4" aria-hidden /> Book of Abstracts
          </Link>
          <Link href="/guidelines" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <ScrollText className="size-4" aria-hidden /> Guidelines
          </Link>
          <Link href="/admin" className="inline-flex items-center gap-1.5 hover:text-ink">
            <LockKeyhole className="size-4" aria-hidden /> Admin
          </Link>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="container-page pt-4 pb-nav text-xs text-ink-3 md:pb-5">
          © {year} {s.organizer}, {s.institution}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Seal } from "@/components/ui/seal";
import { getFooterYear, getSettings } from "@/lib/queries";

export async function SiteFooter() {
  const [s, year] = await Promise.all([getSettings(), getFooterYear()]);
  return (
    <footer className="mt-24 border-t border-line no-print">
      <div className="container-page flex flex-col gap-8 py-10 pb-nav md:flex-row md:items-end md:justify-between md:pb-10">
        <div className="flex items-start gap-3">
          <Seal className="size-9 rounded-[0.8rem]" />
          <div>
            <p className="font-serif text-lg leading-tight">{s.siteTitle}</p>
            <p className="mt-1 text-sm text-ink-3">
              {s.organizer} · {s.institution}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-3">
          <Link href="/abstracts" className="hover:text-ink">
            Browse
          </Link>
          <Link href="/book" className="hover:text-ink">
            Book of Abstracts
          </Link>
          <Link href="/guidelines" className="hover:text-ink">
            Guidelines
          </Link>
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
          <span>© {year}</span>
        </div>
      </div>
    </footer>
  );
}

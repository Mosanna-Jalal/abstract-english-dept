import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Seal } from "@/components/ui/seal";
import { getSettings } from "@/lib/queries";
import { DesktopNav, DesktopNavView } from "./site-nav";

export async function SiteHeader() {
  const s = await getSettings();
  return (
    <header className="glass sticky top-0 z-40 border-b border-line no-print">
      <div className="container-page flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${s.siteTitle} home`}>
          <Seal />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-serif text-[1.08rem] font-medium tracking-tight">{s.siteTitle}</span>
            <span className="block truncate text-[0.66rem] font-medium uppercase tracking-[0.15em] text-ink-3">
              {s.organizer}
              <span className="hidden sm:inline"> · {s.institution}</span>
            </span>
          </span>
        </Link>

        <Suspense fallback={<DesktopNavView pathname={null} />}>
          <DesktopNav />
        </Suspense>

        <Link href="/abstracts" className="btn btn-ghost btn-icon -mr-2 md:hidden" aria-label="Search abstracts">
          <Search className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

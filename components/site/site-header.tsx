import Link from "next/link";
import { Suspense } from "react";
import { BookSearch } from "lucide-react";
import { Seal } from "@/components/ui/seal";
import { getSettings } from "@/lib/queries";
import { TURN_BACK, TURN_FORWARD } from "@/lib/turn";
import { DesktopNav, DesktopNavView } from "./site-nav";
import { SoundToggle } from "./sound-toggle";

export async function SiteHeader() {
  const s = await getSettings();
  return (
    <header style={{ viewTransitionName: "site-header" }} className="glass sticky top-0 z-40 border-b border-line no-print">
      <div className="container-page flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
        <Link href="/" transitionTypes={TURN_BACK} className="flex min-w-0 items-center gap-3" aria-label={`${s.siteTitle} home`}>
          <Seal />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-serif text-[1.08rem] font-medium tracking-tight">{s.siteTitle}</span>
            <span className="block truncate text-[0.66rem] font-medium uppercase tracking-[0.15em] text-ink-3">
              {s.organizer}
              <span className="hidden sm:inline"> · {s.institution}</span>
            </span>
          </span>
        </Link>

        <div className="-mr-2 flex items-center gap-1 md:mr-0 md:gap-2">
          <Suspense fallback={<DesktopNavView pathname={null} />}>
            <DesktopNav />
          </Suspense>
          <SoundToggle className="text-ink-2 md:-mr-2" />
          <Link
            href="/abstracts"
            transitionTypes={TURN_FORWARD}
            className="btn btn-ghost btn-icon md:hidden"
            aria-label="Search abstracts"
          >
            <BookSearch className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

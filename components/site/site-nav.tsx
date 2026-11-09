"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/text";
import { SITE_NAV, isActive } from "./nav-items";

// `usePathname` suspends on dynamic routes under Cache Components, so these
// are rendered inside <Suspense> with the `*View pathname={null}` versions
// (no active highlight) as the fallback.

export function DesktopNav() {
  return <DesktopNavView pathname={usePathname()} />;
}

export function DesktopNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {SITE_NAV.map((item) => {
        const on = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors",
              on ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return <BottomNavView pathname={pathname} />;
}

export function BottomNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-safe md:hidden no-print"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
        {SITE_NAV.map(({ href, label, icon: Icon }) => {
          const on = isActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium tracking-wide transition-colors",
                  on ? "text-accent" : "text-ink-3 active:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    on && "bg-[color-mix(in_oklab,var(--accent)_13%,transparent)]",
                  )}
                >
                  <Icon className="size-[1.2rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

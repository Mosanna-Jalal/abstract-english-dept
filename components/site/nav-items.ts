import { BookOpenText, BookSearch, House, NotebookTabs, ScrollText, type LucideIcon } from "lucide-react";
import { TURN_BACK, TURN_FORWARD } from "@/lib/turn";

export interface NavItem {
  href: "/" | "/abstracts" | "/categories" | "/book" | "/guidelines";
  label: string;
  icon: LucideIcon;
}

// The site reads like a book: these are its sections, in order.
export const SITE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/abstracts", label: "Browse", icon: BookSearch },
  { href: "/categories", label: "Categories", icon: NotebookTabs },
  { href: "/book", label: "Book", icon: BookOpenText },
  { href: "/guidelines", label: "Guidelines", icon: ScrollText },
];

export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Moving to a later section turns the page forward; an earlier one turns it back. */
export function turnTowards(href: string, pathname: string | null): string[] | undefined {
  if (pathname === href) return undefined;
  const from = SITE_NAV.findIndex((item) => isActive(item.href, pathname));
  const to = SITE_NAV.findIndex((item) => item.href === href);
  if (from < 0 || to < 0) return TURN_FORWARD;
  if (from === to) return TURN_BACK; // e.g. from an abstract back up to Browse
  return to > from ? TURN_FORWARD : TURN_BACK;
}

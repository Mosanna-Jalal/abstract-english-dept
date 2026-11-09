import { BookOpen, House, LayoutGrid, Library, ScrollText, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/abstracts" | "/categories" | "/book" | "/guidelines";
  label: string;
  icon: LucideIcon;
}

export const SITE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/abstracts", label: "Browse", icon: Library },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/book", label: "Book", icon: BookOpen },
  { href: "/guidelines", label: "Guidelines", icon: ScrollText },
];

export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

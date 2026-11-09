"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Settings,
  Tags,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { Seal } from "@/components/ui/seal";
import { cn } from "@/lib/text";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/categorize", label: "Categorise", icon: Inbox },
  { href: "/admin/abstracts", label: "Abstracts", icon: Library },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function active(item: Item, pathname: string | null) {
  if (!pathname) return false;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function titleFor(pathname: string | null) {
  if (!pathname) return "Admin";
  if (pathname === "/admin/abstracts/new") return "New abstract";
  if (pathname.startsWith("/admin/abstracts/")) return "Edit abstract";
  return NAV.find((i) => active(i, pathname))?.label ?? "Admin";
}

/* ---------------- Desktop sidebar ---------------- */

export function AdminSidebar() {
  return <AdminSidebarView pathname={usePathname()} />;
}

export function AdminSidebarView({ pathname }: { pathname: string | null }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/admin" className="flex items-center gap-3 px-2">
        <Seal />
        <span className="leading-tight">
          <span className="block font-serif text-[1.08rem]">Abstract Archive</span>
          <span className="block text-[0.66rem] font-medium uppercase tracking-[0.15em] text-ink-3">Admin</span>
        </span>
      </Link>
      <nav aria-label="Admin" className="mt-9 flex flex-col gap-1">
        {NAV.map((item) => {
          const on = active(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[0.93rem] font-medium transition-colors",
                on ? "bg-ink text-bg shadow-[var(--shadow-sm)]" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-[1.1rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        <a href="/admin/export" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9rem] text-ink-2 hover:bg-surface-2 hover:text-ink">
          <Download className="size-4" aria-hidden /> Export CSV
        </a>
        <Link href="/" target="_blank" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9rem] text-ink-2 hover:bg-surface-2 hover:text-ink">
          <ExternalLink className="size-4" aria-hidden /> View public site
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[0.9rem] text-ink-2 hover:bg-surface-2 hover:text-ink">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/* ---------------- Mobile top bar ---------------- */

export function AdminTopbar() {
  return <AdminTopbarView pathname={usePathname()} />;
}

export function AdminTopbarView({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
      <Link href="/admin" className="flex items-center gap-2.5">
        <Seal className="size-8 rounded-[0.7rem]" />
        <span className="font-serif text-[1.05rem]">{titleFor(pathname)}</span>
      </Link>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="btn btn-ghost btn-icon -mr-2"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        {open && (
          <div
            className="card absolute right-0 top-12 w-60 overflow-hidden p-1.5 shadow-[var(--shadow-lg)]"
            style={{ animation: "toast-in 0.2s var(--ease) both" }}
          >
            <Link href="/admin/settings" onClick={() => setOpen(false)} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.93rem] hover:bg-surface-2">
              <Settings className="size-4 text-ink-3" aria-hidden /> Settings
            </Link>
            <a href="/admin/export" onClick={() => setOpen(false)} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.93rem] hover:bg-surface-2">
              <Download className="size-4 text-ink-3" aria-hidden /> Export CSV
            </a>
            <Link href="/" target="_blank" onClick={() => setOpen(false)} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.93rem] hover:bg-surface-2">
              <ExternalLink className="size-4 text-ink-3" aria-hidden /> View public site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.93rem] text-danger hover:bg-surface-2">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------- Mobile bottom tabs ---------------- */

export function AdminBottomNav() {
  return <AdminBottomNavView pathname={usePathname()} />;
}

export function AdminBottomNavView({ pathname }: { pathname: string | null }) {
  // The categorising screen uses the bottom of the screen for category buttons.
  if (pathname === "/admin/categorize") return null;
  return (
    <nav aria-label="Admin" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-safe lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
        {NAV.slice(0, 5).map((item) => {
          const on = active(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium tracking-wide",
                  on ? "text-accent" : "text-ink-3",
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

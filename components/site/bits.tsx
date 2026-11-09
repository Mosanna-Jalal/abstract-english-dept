import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/text";

/** A thin rule with a small gold lozenge in the middle. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-4", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--line-strong)]" />
      <svg viewBox="0 0 40 12" className="h-3 w-10 text-gold" fill="currentColor">
        <path d="M20 0 26 6 20 12 14 6Z" />
        <path d="M6 4.5 7.5 6 6 7.5 4.5 6Z M34 4.5 35.5 6 34 7.5 32.5 6Z" opacity=".7" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--line-strong)]" />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-[1.85rem] font-normal leading-tight tracking-tight sm:text-[2.25rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="hero-glow absolute inset-0 opacity-80" />
      <div className="container-page relative pb-10 pt-10 sm:pb-14 sm:pt-16">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1
          className="mt-3 max-w-3xl font-serif text-[2.35rem] font-light leading-[1.05] tracking-tight animate-rise sm:text-[3.4rem]"
          style={{ animationDelay: "60ms" }}
        >
          {title}
        </h1>
        {children && (
          <div className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-2 animate-rise sm:text-lg" style={{ animationDelay: "120ms" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <Ornament className="w-40" />
      <h3 className="mt-6 font-serif text-2xl tracking-tight">{title}</h3>
      {children && <div className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-2">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn("btn btn-secondary btn-sm", page <= 1 && "pointer-events-none opacity-40")}
      >
        <ChevronLeft className="size-4" aria-hidden /> Previous
      </Link>
      <span className="px-3 text-sm text-ink-3">
        Page <span className="font-medium text-ink">{page}</span> of {pages}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        tabIndex={page >= pages ? -1 : undefined}
        className={cn("btn btn-secondary btn-sm", page >= pages && "pointer-events-none opacity-40")}
      >
        Next <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex h-64 flex-col gap-3 p-6">
          <div className="flex justify-between">
            <div className="skeleton h-7 w-32 rounded-full" />
            <div className="skeleton h-4 w-12" />
          </div>
          <div className="skeleton mt-2 h-6 w-11/12" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton mt-1 h-4 w-1/2" />
          <div className="skeleton mt-auto h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

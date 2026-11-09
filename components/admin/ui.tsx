import { cn } from "@/lib/text";

export function AdminHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pt-10">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className={cn("font-serif text-[2rem] font-light leading-tight tracking-tight sm:text-[2.4rem]", eyebrow && "mt-1.5")}>
          {title}
        </h1>
        {description && <div className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 sm:px-8", className)}>{children}</div>;
}

export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="px-4 sm:px-8" aria-hidden>
      <div className="card space-y-4 p-6">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4" style={{ width: `${80 - (i % 3) * 15}%` }} />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

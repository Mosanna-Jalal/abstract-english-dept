"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/text";

/** Live search that updates `?q=` (debounced) without leaving the page. */
export function SearchField({ placeholder = "Search title, author, keyword", className }: { placeholder?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasText, setHasText] = useState(Boolean(params.get("q")));
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(value: string) {
    const next = new URLSearchParams(params.toString());
    const q = value.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        go(inputRef.current?.value ?? "");
        inputRef.current?.blur();
      }}
    >
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>
        {pending ? <LoaderCircle className="size-[1.15rem] animate-spin" /> : <Search className="size-[1.15rem]" />}
      </span>
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder={placeholder}
        aria-label="Search abstracts"
        autoComplete="off"
        enterKeyHint="search"
        className="field h-[3.25rem] rounded-full pl-11 pr-12 shadow-[var(--shadow-sm)] [&::-webkit-search-cancel-button]:hidden"
        onChange={(e) => {
          const value = e.currentTarget.value;
          setHasText(value.length > 0);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => go(value), 300);
        }}
      />
      {hasText && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            setHasText(false);
            if (timer.current) clearTimeout(timer.current);
            go("");
            inputRef.current?.focus();
          }}
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

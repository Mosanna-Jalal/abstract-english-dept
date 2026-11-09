"use client";

import { RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 pt-16 sm:px-8">
      <div className="card mx-auto max-w-lg px-6 py-12 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 font-serif text-2xl tracking-tight">This page couldn’t load</h1>
        <p className="mt-2 text-ink-2">
          Usually this is a brief database connection problem. Try again — if it keeps happening, check the DB_URI setting.
        </p>
        {error.digest && <p className="mt-3 text-xs text-ink-3">Reference: {error.digest}</p>}
        <button type="button" onClick={reset} className="btn btn-primary mt-6">
          <RotateCcw className="size-4" aria-hidden /> Try again
        </button>
      </div>
    </div>
  );
}

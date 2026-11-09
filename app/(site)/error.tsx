"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 font-serif text-3xl tracking-tight">The archive couldn’t be reached</h1>
      <p className="mt-3 text-ink-2">This is usually a brief connection problem. Please try again in a moment.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RotateCcw className="size-4" aria-hidden /> Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}

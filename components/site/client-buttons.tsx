"use client";

import { useState } from "react";
import { Check, Printer, Share2 } from "lucide-react";

export function ShareButton({ title, className = "btn btn-secondary btn-sm" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The share sheet was dismissed.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }
  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}

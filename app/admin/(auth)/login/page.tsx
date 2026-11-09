import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Seal } from "@/components/ui/seal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="ruled absolute inset-x-0 top-0 h-[60vh] opacity-60" />

      <div className="relative w-full max-w-sm animate-rise">
        <div className="card p-7 shadow-[var(--shadow-lg)] sm:p-9">
          <Seal className="size-12 rounded-2xl" />
          <p className="eyebrow mt-7">Department of English</p>
          <h1 className="mt-2 font-serif text-[2rem] font-light leading-tight tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">
            Categorise abstracts, manage categories and import new submissions.
          </p>
          <Suspense fallback={<div className="mt-7 h-[8.5rem]" />}>
            <LoginForm />
          </Suspense>
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Back to the archive
        </Link>
      </div>
    </main>
  );
}

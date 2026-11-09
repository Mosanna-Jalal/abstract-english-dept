import Link from "next/link";
import { Seal } from "@/components/ui/seal";

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Seal className="size-12 rounded-2xl" />
      <p className="mt-8 font-serif text-7xl font-light italic text-accent">404</p>
      <h1 className="mt-4 font-serif text-3xl tracking-tight">This page isn’t in the archive</h1>
      <p className="mt-3 max-w-sm text-ink-2">It may have been moved, renamed, or never existed.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Go home
      </Link>
    </main>
  );
}

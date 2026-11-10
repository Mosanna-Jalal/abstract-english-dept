import Link from "next/link";
import { Ornament } from "@/components/site/bits";
import { TURN_BACK } from "@/lib/turn";

export default function NotFound() {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-24 text-center">
      <p className="font-serif text-7xl font-light italic text-accent">404</p>
      <Ornament className="mt-6 w-40" />
      <h1 className="mt-6 font-serif text-3xl tracking-tight">This page isn’t in the archive</h1>
      <p className="mt-3 text-ink-2">It may have been moved, renamed, or never existed.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" transitionTypes={TURN_BACK} className="btn btn-primary">
          Go home
        </Link>
        <Link href="/abstracts" transitionTypes={TURN_BACK} className="btn btn-secondary">
          Browse abstracts
        </Link>
      </div>
    </div>
  );
}

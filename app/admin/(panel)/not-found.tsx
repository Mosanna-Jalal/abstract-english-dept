import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="px-4 pt-16 sm:px-8">
      <div className="card mx-auto max-w-lg px-6 py-14 text-center">
        <h1 className="font-serif text-2xl tracking-tight">That abstract doesn’t exist</h1>
        <p className="mt-2 text-ink-2">It may have been deleted.</p>
        <Link href="/admin/abstracts" className="btn btn-primary mt-6">
          Back to abstracts
        </Link>
      </div>
    </div>
  );
}

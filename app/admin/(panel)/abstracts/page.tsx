import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, Plus } from "lucide-react";
import { AbstractsTable } from "@/components/admin/abstracts-table";
import { AdminHeader, PanelSkeleton } from "@/components/admin/ui";
import { getAdminCategories, listAdminAbstracts } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Abstracts" };

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/abstracts">["searchParams"] }) {
  const sp = await searchParams;
  const filters = {
    q: one(sp.q).slice(0, 120),
    cat: one(sp.cat).slice(0, 24),
    status: one(sp.status) === "hidden" || one(sp.status) === "visible" ? one(sp.status) : "",
    page: Math.max(1, Number.parseInt(one(sp.page), 10) || 1),
  };
  const [data, categories] = await Promise.all([listAdminAbstracts(filters), getAdminCategories()]);
  return <AbstractsTable data={data} categories={categories} filters={filters} />;
}

export default function AdminAbstractsPage(props: PageProps<"/admin/abstracts">) {
  return (
    <>
      <AdminHeader
        title="Abstracts"
        description="Search, edit and file abstracts. Select several to categorise, hide or delete them together."
        actions={
          <>
            <a href="/admin/export" className="btn btn-secondary btn-sm">
              <Download className="size-4" aria-hidden /> Export
            </a>
            <Link href="/admin/abstracts/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" aria-hidden /> Add abstract
            </Link>
          </>
        }
      />
      <Suspense fallback={<PanelSkeleton rows={8} />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

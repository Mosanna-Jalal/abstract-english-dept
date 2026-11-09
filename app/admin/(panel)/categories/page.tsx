import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { AdminHeader, PanelSkeleton } from "@/components/admin/ui";
import { getAdminCategories } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Categories" };

async function Manager() {
  const categories = await getAdminCategories();
  return <CategoriesManager categories={categories} />;
}

export default function CategoriesPage() {
  return (
    <>
      <AdminHeader
        title="Categories"
        description="The themes abstracts are filed under. Keywords help the app suggest a category while you categorise."
      />
      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <Manager />
      </Suspense>
    </>
  );
}

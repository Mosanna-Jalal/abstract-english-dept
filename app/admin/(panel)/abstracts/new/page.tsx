import type { Metadata } from "next";
import { Suspense } from "react";
import { AbstractForm } from "@/components/admin/abstract-form";
import { AdminHeader, PanelSkeleton } from "@/components/admin/ui";
import { getAdminCategories, getAdminSettings } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Add an abstract" };

async function NewForm() {
  const [categories, settings] = await Promise.all([getAdminCategories(), getAdminSettings()]);
  return <AbstractForm abstract={null} categories={categories} settings={settings} />;
}

export default function NewAbstractPage() {
  return (
    <>
      <AdminHeader title="Add an abstract" description="Type or paste an abstract that didn’t arrive as a file." />
      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <NewForm />
      </Suspense>
    </>
  );
}

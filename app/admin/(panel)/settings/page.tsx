import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminHeader, PanelSkeleton } from "@/components/admin/ui";
import { getAdminSettings } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Settings" };

async function Loader() {
  const settings = await getAdminSettings();
  return <SettingsForm settings={settings} />;
}

export default function SettingsPage() {
  return (
    <>
      <AdminHeader
        title="Settings"
        description="Event details and submission guidelines shown on the public site. Copy these from the seminar brochure."
      />
      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <Loader />
      </Suspense>
    </>
  );
}

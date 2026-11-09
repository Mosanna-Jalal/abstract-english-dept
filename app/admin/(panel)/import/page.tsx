import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportPanel } from "@/components/admin/import-panel";
import { AdminHeader, PanelSkeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Import" };

async function Loader() {
  await requireAdmin();
  return (
    <ImportPanel
      driveConfigured={Boolean(process.env.GOOGLE_API_KEY)}
      defaultFolder={process.env.DRIVE_FOLDER_ID ? `https://drive.google.com/drive/folders/${process.env.DRIVE_FOLDER_ID}` : ""}
    />
  );
}

export default function ImportPage() {
  return (
    <>
      <AdminHeader
        title="Import abstracts"
        description="Upload PDF, Word or text files, or pull them from Google Drive. The title, authors, institution, keywords and text are read automatically, and you can correct anything afterwards."
      />
      <Suspense fallback={<PanelSkeleton rows={4} />}>
        <Loader />
      </Suspense>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminBottomNav,
  AdminSidebar,
  AdminSidebarView,
  AdminTopbar,
  AdminTopbarView,
} from "@/components/admin/admin-nav";
import { AdminProviders } from "@/components/admin/providers";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <div className="min-h-dvh lg:pl-64">
        <Suspense fallback={<AdminSidebarView pathname={null} />}>
          <AdminSidebar />
        </Suspense>
        <Suspense fallback={<AdminTopbarView pathname={null} />}>
          <AdminTopbar />
        </Suspense>
        <main className="pb-nav lg:pb-16">{children}</main>
        <Suspense fallback={null}>
          <AdminBottomNav />
        </Suspense>
      </div>
    </AdminProviders>
  );
}

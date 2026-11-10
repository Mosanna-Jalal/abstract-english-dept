import { Suspense } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BottomNav, BottomNavView } from "@/components/site/site-nav";
import { SoundUnlock } from "@/components/site/sound-toggle";
import { TurnOrigin } from "@/components/site/turn-origin";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <TurnOrigin />
      <SoundUnlock />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={<BottomNavView pathname={null} />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}

import Link from "next/link";
import { BookOpenText, BookSearch, LockKeyhole, Mail, ScrollText } from "lucide-react";
import { GitHubIcon, InstagramIcon, LinkedInIcon, XIcon } from "@/components/ui/brand-icons";
import { Seal } from "@/components/ui/seal";
import { getFooterYear, getSettings } from "@/lib/queries";
import { TURN_FORWARD } from "@/lib/turn";

// The developer's credit, as in the footer of https://me-mj.vercel.app.
const DEVELOPER = {
  name: "Mosanna Jalal",
  site: "https://me-mj.vercel.app",
  place: "Gaya, India",
  studios: "MJX Web Studio · MJX Cinematix Studio",
  links: [
    { label: "GitHub", handle: "@Mosanna-Jalal", href: "https://github.com/Mosanna-Jalal", icon: GitHubIcon },
    {
      label: "LinkedIn",
      handle: "Mosanna Jalal",
      href: "https://www.linkedin.com/in/mosanna-jalal-2a1a931aa/",
      icon: LinkedInIcon,
    },
    { label: "Instagram", handle: "@theycallme_mj__", href: "https://www.instagram.com/theycallme_mj__/", icon: InstagramIcon },
    { label: "X", handle: "@JalalMosanna", href: "https://x.com/JalalMosanna", icon: XIcon },
    { label: "Email", handle: "mjiraqui322@gmail.com", href: "mailto:mjiraqui322@gmail.com", icon: Mail },
  ],
};

export async function SiteFooter() {
  const [s, year] = await Promise.all([getSettings(), getFooterYear()]);
  return (
    <footer className="mt-24 border-t border-line no-print">
      <div className="container-page flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <Seal className="size-9 rounded-[0.8rem]" />
          <div>
            <p className="font-serif text-lg leading-tight">{s.siteTitle}</p>
            <p className="mt-1 text-sm text-ink-3">
              {s.organizer} · {s.institution}
            </p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-3">
          <Link href="/abstracts" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <BookSearch className="size-4" aria-hidden /> Browse
          </Link>
          <Link href="/book" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <BookOpenText className="size-4" aria-hidden /> Book of Abstracts
          </Link>
          <Link href="/guidelines" transitionTypes={TURN_FORWARD} className="inline-flex items-center gap-1.5 hover:text-ink">
            <ScrollText className="size-4" aria-hidden /> Guidelines
          </Link>
          <Link href="/admin" className="inline-flex items-center gap-1.5 hover:text-ink">
            <LockKeyhole className="size-4" aria-hidden /> Admin
          </Link>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <a
              href={DEVELOPER.site}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${DEVELOPER.name}’s website`}
              className="font-serif text-[1.75rem] font-semibold leading-none tracking-tight"
            >
              MJ<span className="text-accent">.</span>
            </a>
            <div className="text-sm leading-snug">
              <p className="text-ink-2">
                Designed &amp; Developed by{" "}
                <a
                  href={DEVELOPER.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  {DEVELOPER.name}
                </a>
              </p>
              <p className="text-ink-3">{DEVELOPER.studios}</p>
            </div>
          </div>
          <ul aria-label={`${DEVELOPER.name} online`} className="-ml-2.5 flex items-center md:-mr-2.5 md:ml-0">
            {DEVELOPER.links.map(({ label, handle, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  aria-label={`${label}: ${handle}`}
                  title={`${label}: ${handle}`}
                  className="btn btn-ghost btn-icon text-ink-3 hover:text-ink"
                >
                  <Icon className="size-[1.1rem]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="container-page border-t border-line pt-4 pb-nav text-xs text-ink-3 md:pb-5">
          © {year} · {DEVELOPER.name} · {DEVELOPER.place} · All rights reserved.
        </p>
      </div>
    </footer>
  );
}

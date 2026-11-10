import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, FileText, Hash, MapPin, ScrollText } from "lucide-react";
import { EmptyState, PageIntro } from "@/components/site/bits";
import { PageSheet } from "@/components/site/page-sheet";
import { getSettings } from "@/lib/queries";
import { guidelineLines } from "@/lib/settings";
import { TURN_FORWARD } from "@/lib/turn";

export const metadata: Metadata = {
  title: "Guidelines",
  description: "Guidelines for preparing and submitting an abstract.",
};

const URL_RX = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)'"])/g;

/** Text with its web addresses (e.g. the registration form) made into links. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RX).map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {part.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

function range(min: number, max: number, unit: string) {
  const one = (n: number) => (n === 1 ? unit.replace(/s$/, "") : unit);
  if (min && max) return `${min}–${max} ${unit}`;
  if (max) return `Up to ${max} ${one(max)}`;
  return `At least ${min} ${one(min)}`;
}

export default async function GuidelinesPage() {
  const s = await getSettings();
  const lines = guidelineLines(s);
  const facts = [
    s.eventDate && { icon: Calendar, label: "Date", value: s.eventDate },
    s.venue && { icon: MapPin, label: "Venue", value: s.venue },
    (s.wordLimitMin || s.wordLimitMax) && {
      icon: FileText,
      label: "Abstract length",
      value: range(s.wordLimitMin, s.wordLimitMax, "words"),
    },
    (s.keywordsMin || s.keywordsMax) && {
      icon: Hash,
      label: "Keywords",
      value: range(s.keywordsMin, s.keywordsMax, "keywords"),
    },
  ].filter(Boolean) as Array<{ icon: typeof Calendar; label: string; value: string }>;

  return (
    <PageSheet>
      <PageIntro eyebrow={`${s.organizer} · ${s.institution}`} title="Guidelines" icon={<ScrollText />}>
        {s.eventSubtitle || "How to prepare an abstract for the collection."}
      </PageIntro>

      <div className="container-page mt-8 max-w-3xl space-y-6 sm:mt-10">
        {facts.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="card flex items-start gap-4 p-5">
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-surface-2 text-gold">
                  <Icon className="size-[1.1rem]" aria-hidden />
                </span>
                <div>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 font-medium leading-snug">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        {lines.length ? (
          <section className="card p-6 sm:p-10">
            <h2 className="font-serif text-2xl tracking-tight">Preparing your abstract</h2>
            <ol className="mt-6 space-y-5">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-7 flex-none pt-0.5 text-right font-serif text-lg italic leading-none text-gold">{i + 1}</span>
                  <p className="min-w-0 text-[1.02rem] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                    <Linkified text={line} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <EmptyState
            title="Guidelines will be published soon"
            action={
              <Link href="/abstracts" transitionTypes={TURN_FORWARD} className="btn btn-secondary">
                Browse abstracts
              </Link>
            }
          >
            The department will post the submission guidelines here.
          </EmptyState>
        )}
      </div>
    </PageSheet>
  );
}

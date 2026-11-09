"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { saveSettingsAction } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";
import { useAdminUI } from "./providers";

function Field({
  name,
  label,
  hint,
  defaultValue,
  placeholder,
}: {
  name: keyof Settings;
  label: string;
  hint?: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      {hint && <p className="hint mt-1.5">{hint}</p>}
    </div>
  );
}

function NumberField({ name, label, defaultValue }: { name: keyof Settings; label: string; defaultValue: number }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={10000}
        defaultValue={defaultValue || ""}
        placeholder="No limit"
        className="field"
      />
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  const { toast } = useAdminUI();

  useEffect(() => {
    if (state) toast(state.message, { tone: state.ok ? "success" : "error" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-6 px-4 sm:px-8">
      <section className="card p-5 sm:p-7">
        <h2 className="font-serif text-xl tracking-tight">Site & event</h2>
        <p className="hint mt-1">Shown in the header, on the home page and on the Book of Abstracts cover.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field name="siteTitle" label="Site name" defaultValue={settings.siteTitle} />
          <Field name="eventTitle" label="Main title" defaultValue={settings.eventTitle} hint="The large heading on the home page." />
          <div className="sm:col-span-2">
            <Field
              name="eventSubtitle"
              label="Subtitle"
              defaultValue={settings.eventSubtitle}
              placeholder="e.g. National Seminar on Literature and the Margins"
            />
          </div>
          <Field name="organizer" label="Organised by" defaultValue={settings.organizer} />
          <Field name="institution" label="Institution" defaultValue={settings.institution} />
          <Field name="eventDate" label="Date(s)" defaultValue={settings.eventDate} placeholder="e.g. 14–15 December 2026" />
          <Field name="venue" label="Venue" defaultValue={settings.venue} placeholder="e.g. Seminar Hall, GBM College, Gaya" />
          <div className="sm:col-span-2">
            <label htmlFor="about" className="label">
              About the collection
            </label>
            <textarea id="about" name="about" rows={3} defaultValue={settings.about} className="field [field-sizing:content]" />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-7">
        <h2 className="font-serif text-xl tracking-tight">Submission guidelines</h2>
        <p className="hint mt-1">
          One guideline per line, exactly as in the brochure. They appear on the public Guidelines page.
        </p>
        <textarea
          id="guidelines"
          name="guidelines"
          rows={8}
          defaultValue={settings.guidelines}
          placeholder={"Abstracts should not exceed 300 words.\nInclude 4–5 keywords.\nMention name, designation, institution and email."}
          className="field mt-4 [field-sizing:content]"
          aria-label="Guidelines, one per line"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField name="wordLimitMin" label="Min words" defaultValue={settings.wordLimitMin} />
          <NumberField name="wordLimitMax" label="Max words" defaultValue={settings.wordLimitMax} />
          <NumberField name="keywordsMin" label="Min keywords" defaultValue={settings.keywordsMin} />
          <NumberField name="keywordsMax" label="Max keywords" defaultValue={settings.keywordsMax} />
        </div>
        <p className="hint mt-3">The limits power the guideline check shown on every abstract in the editor.</p>
      </section>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
        <div className="glass mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-line p-2 pl-4 shadow-[var(--shadow-lg)]">
          <span className="text-sm text-ink-3">Changes appear on the public site immediately.</span>
          <button type="submit" disabled={pending} className="btn btn-primary flex-none">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Save settings
          </button>
        </div>
      </div>
    </form>
  );
}

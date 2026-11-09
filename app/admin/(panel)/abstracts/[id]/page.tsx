import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { AbstractForm } from "@/components/admin/abstract-form";
import { PanelSkeleton } from "@/components/admin/ui";
import { getAdminAbstract, getAdminCategories, getAdminSettings } from "@/lib/admin-queries";
import { padSerial } from "@/lib/text";

export const metadata: Metadata = { title: "Edit abstract" };

async function Editor(props: PageProps<"/admin/abstracts/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [abstract, categories, settings] = await Promise.all([getAdminAbstract(id), getAdminCategories(), getAdminSettings()]);
  if (!abstract) notFound();
  const isPublic = Boolean(abstract.categoryId) && !abstract.hidden;
  const created = typeof sp.created === "string" ? sp.created : undefined;

  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pt-8">
        <div>
          <Link href="/admin/abstracts" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> All abstracts
          </Link>
          <p className="eyebrow mt-4">Paper No. {padSerial(abstract.serial)}</p>
          <h1 className="mt-1 line-clamp-2 max-w-3xl font-serif text-[1.7rem] font-light leading-tight tracking-tight sm:text-[2.1rem]">
            {abstract.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {abstract.source.hasFile && (
            <a href={`/admin/files/${abstract.id}`} target="_blank" className="btn btn-secondary btn-sm">
              <FileText className="size-4" aria-hidden /> Original file
            </a>
          )}
          {isPublic && (
            <Link href={`/abstracts/${abstract.serial}`} target="_blank" className="btn btn-secondary btn-sm">
              <ExternalLink className="size-4" aria-hidden /> View on site
            </Link>
          )}
        </div>
      </div>
      <AbstractForm abstract={abstract} categories={categories} settings={settings} created={created} />
    </>
  );
}

export default function EditAbstractPage(props: PageProps<"/admin/abstracts/[id]">) {
  return (
    <Suspense fallback={<div className="pt-8"><PanelSkeleton rows={6} /></div>}>
      <Editor {...props} />
    </Suspense>
  );
}

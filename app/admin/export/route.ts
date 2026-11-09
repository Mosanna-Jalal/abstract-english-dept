import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// CSV of every abstract (opens directly in Excel / Google Sheets).
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const { abstracts, categories } = await collections();
  const [docs, cats] = await Promise.all([abstracts.find().sort({ serial: 1 }).toArray(), categories.find().toArray()]);
  const catName = new Map(cats.map((c) => [c._id.toHexString(), c.name]));

  const header = [
    "Paper No.",
    "Title",
    "Authors",
    "Designation & institution",
    "Email",
    "Phone",
    "Category",
    "Author's stated sub-theme",
    "Keywords",
    "Words",
    "Visibility",
    "Source file",
    "Added on",
    "Abstract",
  ];
  const rows = docs.map((d) => [
    d.serial,
    d.title,
    d.authors,
    d.affiliation,
    d.email,
    d.phone,
    d.categoryId ? (catName.get(d.categoryId.toHexString()) ?? "") : "Awaiting a category",
    d.proposedTheme,
    (d.keywords ?? []).join("; "),
    d.wordCount,
    d.hidden ? "Hidden" : d.categoryId ? "Public" : "Not yet public",
    d.source?.fileName ?? "",
    d.createdAt ? d.createdAt.toISOString().slice(0, 10) : "",
    d.body,
  ]);

  const cell = (value: unknown) => {
    let s = value === null || value === undefined ? "" : String(value);
    // Stop spreadsheet apps from treating text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = `﻿${[header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abstracts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

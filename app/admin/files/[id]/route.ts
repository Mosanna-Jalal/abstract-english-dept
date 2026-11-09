import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// Streams the original uploaded file of an abstract. Admin-only, because
// originals often include authors' phone numbers and email addresses.
export async function GET(_request: Request, ctx: RouteContext<"/admin/files/[id]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return new Response("Not found", { status: 404 });

  const { abstracts, files } = await collections();
  const doc = await abstracts.findOne({ _id: new ObjectId(id) }, { projection: { source: 1 } });
  const fileId = doc?.source?.fileId;
  if (!fileId) return new Response("Not found", { status: 404 });
  const info = await files.find({ _id: fileId }).next();
  if (!info) return new Response("Not found", { status: 404 });

  // Derive the type from the extension instead of trusting the uploader.
  const name = info.filename || "abstract";
  const ext = name.toLowerCase().split(".").pop();
  const type =
    ext === "pdf"
      ? "application/pdf"
      : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : ext === "txt" || ext === "md"
          ? "text/plain; charset=utf-8"
          : "application/octet-stream";
  const disposition = ext === "pdf" || ext === "txt" || ext === "md" ? "inline" : "attachment";

  const body = Readable.toWeb(files.openDownloadStream(fileId)) as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}

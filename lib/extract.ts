import "server-only";

export class ExtractError extends Error {}

export type FileKind = "pdf" | "docx" | "text" | "doc" | "unsupported";

export const ACCEPT_ATTR =
  ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function detectKind(fileName: string, mimeType: string, head?: Uint8Array): FileKind {
  const name = fileName.toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  const startsWith = (sig: string) => !!head && sig.split("").every((ch, i) => head[i] === ch.charCodeAt(0));
  if (startsWith("%PDF") || mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    (name.endsWith(".docx") && (!head || startsWith("PK")))
  ) {
    return "docx";
  }
  if (name.endsWith(".doc") || mime === "application/msword") return "doc";
  if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
  return "unsupported";
}

export async function extractText(
  data: Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<{ text: string; kind: FileKind; pages?: number }> {
  const kind = detectKind(fileName, mimeType, data.subarray(0, 8));

  if (kind === "pdf") {
    const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
    try {
      // pdf.js may detach the buffer it is given, so hand it a copy.
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const { totalPages, text } = await pdfText(pdf, { mergePages: true });
      return { text, kind, pages: totalPages };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/password/i.test(message)) throw new ExtractError("This PDF is password-protected.");
      throw new ExtractError("This PDF could not be read. It may be damaged.");
    }
  }

  if (kind === "docx") {
    const mod = await import("mammoth");
    const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
      return { text: value, kind };
    } catch {
      throw new ExtractError("This Word file could not be read. Try saving it again as .docx or PDF.");
    }
  }

  if (kind === "text") {
    return { text: new TextDecoder("utf-8").decode(data), kind };
  }

  if (kind === "doc") {
    throw new ExtractError("Old Word (.doc) files can’t be read. Save it as .docx or PDF and upload it again.");
  }

  throw new ExtractError("Unsupported file type. Upload PDF, Word (.docx) or plain-text files.");
}

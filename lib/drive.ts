import "server-only";

// Google Drive API v3 with an API key. This reads folders shared as
// "Anyone with the link" — no Google sign-in required on the server.

const API = "https://www.googleapis.com/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";
const GOOGLE_DOC = "application/vnd.google-apps.document";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  path: string;
}

export class DriveError extends Error {}

export function parseDriveFolderId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/folders\/([A-Za-z0-9_-]{10,})/) ?? s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

async function driveFetch(url: string): Promise<Response> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.ok) return res;
  let reason = "";
  let message = "";
  try {
    const body = (await res.json()) as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
    reason = body.error?.errors?.[0]?.reason ?? "";
    message = body.error?.message ?? "";
  } catch {
    // Non-JSON error body.
  }
  if (reason === "keyInvalid" || /API key not valid/i.test(message)) {
    throw new DriveError("The Google API key is not valid. Check GOOGLE_API_KEY in .env.local.");
  }
  if (reason === "accessNotConfigured" || /has not been used|is disabled/i.test(message)) {
    throw new DriveError("Enable the “Google Drive API” in the Google Cloud project that owns this API key.");
  }
  if (res.status === 404 || res.status === 403) {
    throw new DriveError(
      "Google Drive refused access. In Drive, open the folder → Share → General access → “Anyone with the link” (Viewer), then try again.",
    );
  }
  if (res.status === 429) throw new DriveError("Google Drive rate limit reached. Wait a minute and try again.");
  throw new DriveError(`Google Drive error ${res.status}${message ? `: ${message}` : ""}`);
}

export async function listDriveFolder(folderId: string, apiKey: string, maxFiles = 500): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  const queue: Array<{ id: string; path: string; depth: number }> = [{ id: folderId, path: "", depth: 0 }];
  while (queue.length && out.length < maxFiles) {
    const folder = queue.shift()!;
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
        pageSize: "1000",
        orderBy: "name_natural",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await driveFetch(`${API}/files?${params}`);
      const data = (await res.json()) as {
        nextPageToken?: string;
        files?: Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }>;
      };
      for (const f of data.files ?? []) {
        if (f.mimeType === FOLDER) {
          if (folder.depth < 4) queue.push({ id: f.id, path: `${folder.path}${f.name}/`, depth: folder.depth + 1 });
          continue;
        }
        out.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: Number(f.size ?? 0),
          modifiedTime: f.modifiedTime ?? "",
          path: folder.path,
        });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken && out.length < maxFiles);
  }
  return out;
}

export function isGoogleDoc(mimeType: string) {
  return mimeType === GOOGLE_DOC;
}

export async function downloadDriveFile(
  file: { id: string; name: string; mimeType: string },
  apiKey: string,
): Promise<{ data: Uint8Array; mimeType: string; fileName: string }> {
  if (isGoogleDoc(file.mimeType)) {
    const res = await driveFetch(`${API}/files/${file.id}/export?mimeType=text/plain&key=${apiKey}`);
    return { data: new Uint8Array(await res.arrayBuffer()), mimeType: "text/plain", fileName: `${file.name}.txt` };
  }
  const res = await driveFetch(`${API}/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`);
  return { data: new Uint8Array(await res.arrayBuffer()), mimeType: file.mimeType, fileName: file.name };
}

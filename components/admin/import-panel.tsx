"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Cloud,
  Copy,
  FileUp,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  TriangleExclamationPoint,
  Upload,
} from "lucide-react";
import { importDriveFileAction, importUploadAction, scanDriveAction, type DriveListing } from "@/app/admin/actions";
import type { ImportOutcome } from "@/lib/types";
import { cn, padSerial } from "@/lib/text";

const ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_BYTES = 10 * 1024 * 1024;

type RowStatus = "queued" | "working" | "created" | "duplicate" | "error" | "skipped" | "imported";

interface Row {
  key: string;
  name: string;
  detail?: string;
  status: RowStatus;
  outcome?: ImportOutcome;
  error?: string;
}

function StatusIcon({ status }: { status: RowStatus }) {
  switch (status) {
    case "working":
      return <LoaderCircle className="size-4 animate-spin text-accent" aria-label="Importing" />;
    case "created":
      return <CircleCheck className="size-4 text-success" aria-label="Imported" />;
    case "imported":
      return <CircleCheck className="size-4 text-ink-3" aria-label="Already imported" />;
    case "duplicate":
      return <Copy className="size-4 text-ink-3" aria-label="Duplicate" />;
    case "error":
      return <TriangleExclamationPoint className="size-4 text-danger" aria-label="Failed" />;
    case "skipped":
      return <span className="block size-2 rounded-full bg-ink-3/50" aria-label="Skipped" />;
    default:
      return <span className="block size-2 rounded-full border border-ink-3" aria-label="Queued" />;
  }
}

function ResultRow({ row }: { row: Row }) {
  const o = row.outcome;
  return (
    <li className="flex gap-3 px-4 py-3.5 sm:px-5">
      <span className="flex size-5 flex-none items-center justify-center pt-0.5">
        <StatusIcon status={row.status} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-3">
          {row.name}
          {row.detail && <span> · {row.detail}</span>}
        </p>
        {o && (
          <Link href={`/admin/abstracts/${o.id}`} className="mt-0.5 block font-medium leading-snug hover:text-accent">
            <span className="font-serif italic text-ink-3">No. {padSerial(o.serial)}</span> · {o.title || "Untitled"}
          </Link>
        )}
        {o?.authors && <p className="text-sm text-ink-2">{o.authors}</p>}
        {o?.suggestion && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-2">
            <Sparkles className="size-3.5 text-gold" aria-hidden /> Suggested: {o.suggestion}
          </p>
        )}
        {o?.warnings.map((w) => (
          <p key={w} className={cn("mt-1 text-xs", row.status === "duplicate" ? "text-ink-3" : "text-warning")}>
            {w}
          </p>
        ))}
        {row.error && <p className="mt-1 text-xs text-danger">{row.error}</p>}
      </div>
    </li>
  );
}

function Summary({ rows }: { rows: Row[] }) {
  const created = rows.filter((r) => r.status === "created").length;
  const dup = rows.filter((r) => r.status === "duplicate").length;
  const failed = rows.filter((r) => r.status === "error").length;
  const busy = rows.some((r) => r.status === "working" || r.status === "queued");
  if (!created && !dup && !failed) return null;
  return (
    <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-ink-2">
        <span className="font-semibold text-ink">{created} imported</span>
        {dup > 0 && <> · {dup} already in the archive</>}
        {failed > 0 && <span className="text-danger"> · {failed} failed</span>}
        {busy && <> · working…</>}
      </p>
      {created > 0 && !busy && (
        <Link href="/admin/categorize" className="btn btn-accent btn-sm">
          Start categorising <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function UploadTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);
  const running = useRef(false);
  const queue = useRef<Array<{ key: string; file: File }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const { key, file } = queue.current.shift()!;
      update(key, { status: "working" });
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await importUploadAction(fd);
        if (res.ok) update(key, { status: res.data.status, outcome: res.data });
        else update(key, { status: "error", error: res.error });
      } catch {
        update(key, { status: "error", error: "Upload failed — check your connection and try again." });
      }
    }
    running.current = false;
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    const added: Row[] = [];
    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      if (file.size > MAX_BYTES) {
        added.push({ key, name: file.name, detail: size, status: "error", error: "Larger than 10 MB." });
      } else if (!["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
        added.push({ key, name: file.name, detail: size, status: "error", error: "Unsupported file type." });
      } else {
        added.push({ key, name: file.name, detail: size, status: "queued" });
        queue.current.push({ key, file });
      }
    }
    setRows((rs) => [...added, ...rs]);
    void drain();
  }

  return (
    <>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16",
          dragging ? "border-accent bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))]" : "border-line-strong hover:border-ink-3",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-accent">
          <FileUp className="size-6" aria-hidden />
        </span>
        <span className="mt-5 font-serif text-[1.35rem] tracking-tight">
          <span className="hidden sm:inline">Drop abstract files here, or </span>
          <span className="text-accent underline decoration-1 underline-offset-4">choose files</span>
        </span>
        <span className="mt-2 text-sm text-ink-3">PDF, Word (.doc / .docx) or text · up to 10 MB each · select many at once</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            if (e.currentTarget.files) addFiles(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      <Summary rows={rows} />
      {rows.length > 0 && (
        <ul className="card mt-4 divide-y divide-line" aria-live="polite">
          {rows.map((r) => (
            <ResultRow key={r.key} row={r} />
          ))}
        </ul>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */

function DriveSetup() {
  return (
    <div className="card p-5 sm:p-7">
      <h3 className="font-serif text-xl tracking-tight">Connect the Google Drive folder</h3>
      <ol className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-ink-2">
        <li>
          <span className="font-semibold text-ink">1. Share the folder.</span> In Google Drive, open the folder → <em>Share</em> →
          General access → <em>Anyone with the link</em> (Viewer).
        </li>
        <li>
          <span className="font-semibold text-ink">2. Create an API key.</span> In the{" "}
          <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            Google Cloud console
          </a>
          , enable the Google Drive API, then go to <em>Credentials → Create credentials → API key</em>.
        </li>
        <li>
          <span className="font-semibold text-ink">3. Add it to the app.</span> Put <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">GOOGLE_API_KEY=…</code>{" "}
          in <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">.env.local</code> (and in your hosting settings), then restart the app.
        </li>
      </ol>
      <p className="mt-5 rounded-xl bg-surface-2 p-3.5 text-sm text-ink-2">
        <span className="font-semibold text-ink">No API key?</span> In Drive, select the files → <em>Download</em> (Drive zips them) →
        unzip → drop the files into the <em>Upload files</em> tab. The result is the same.
      </p>
    </div>
  );
}

function DriveTab({ configured, defaultFolder }: { configured: boolean; defaultFolder: string }) {
  const [folder, setFolder] = useState(defaultFolder);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(!configured);
  const [listing, setListing] = useState<DriveListing | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);

  async function scan() {
    setScanning(true);
    setError(null);
    try {
      const res = await scanDriveAction(folder);
      if (!res.ok) {
        if (res.error === "NO_API_KEY") setNeedsKey(true);
        else setError(res.error);
        return;
      }
      setListing(res.data);
      setRows(
        res.data.files.map((f) => ({
          key: f.id,
          name: `${f.path}${f.name}`,
          detail: f.status === "new" ? undefined : f.reason,
          status: f.status === "new" ? "queued" : f.status,
        })),
      );
    } finally {
      setScanning(false);
    }
  }

  async function importAll() {
    if (!listing) return;
    setImporting(true);
    for (const f of listing.files.filter((x) => x.status === "new")) {
      const current = rows.find((r) => r.key === f.id);
      if (current && current.status !== "queued" && current.status !== "error") continue;
      setRows((rs) => rs.map((r) => (r.key === f.id ? { ...r, status: "working", error: undefined } : r)));
      try {
        const res = await importDriveFileAction({ id: f.id, name: f.name, mimeType: f.mimeType });
        setRows((rs) =>
          rs.map((r) =>
            r.key === f.id ? (res.ok ? { ...r, status: res.data.status, outcome: res.data } : { ...r, status: "error", error: res.error }) : r,
          ),
        );
      } catch {
        setRows((rs) => rs.map((r) => (r.key === f.id ? { ...r, status: "error", error: "Connection lost." } : r)));
      }
    }
    setImporting(false);
  }

  if (needsKey) return <DriveSetup />;

  const pending = rows.filter((r) => r.status === "queued" || r.status === "error").length;

  return (
    <>
      <div className="card p-4 sm:p-5">
        <label htmlFor="folder" className="label">
          Google Drive folder link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            className="field flex-1"
          />
          <button type="button" onClick={scan} disabled={scanning || !folder.trim()} className="btn btn-primary">
            {scanning ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : listing ? <RefreshCw className="size-4" aria-hidden /> : <FolderOpen className="size-4" aria-hidden />}
            {listing ? "Rescan" : "Scan folder"}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-[color-mix(in_oklab,var(--danger)_9%,transparent)] px-3.5 py-2.5 text-sm text-danger">{error}</p>}
      </div>

      {listing && (
        <>
          <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-ink-2">
              Found <span className="font-semibold text-ink">{listing.files.length} files</span> ·{" "}
              {listing.files.filter((f) => f.status === "new").length} new ·{" "}
              {listing.files.filter((f) => f.status === "imported").length} already imported ·{" "}
              {listing.files.filter((f) => f.status === "skipped").length} skipped
            </p>
            <button type="button" onClick={importAll} disabled={importing || pending === 0} className="btn btn-accent btn-sm">
              {importing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Cloud className="size-4" aria-hidden />}
              {importing ? "Importing…" : `Import ${pending} new file${pending === 1 ? "" : "s"}`}
            </button>
          </div>
          <Summary rows={rows} />
          <ul className="card mt-4 divide-y divide-line" aria-live="polite">
            {rows.map((r) => (
              <ResultRow key={r.key} row={r} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */

export function ImportPanel({ driveConfigured, defaultFolder }: { driveConfigured: boolean; defaultFolder: string }) {
  const [tab, setTab] = useState<"upload" | "drive">("upload");
  return (
    <div className="px-4 sm:px-8">
      <div role="tablist" aria-label="Import source" className="mb-5 inline-flex rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-sm)]">
        {(
          [
            { id: "upload", label: "Upload files", icon: Upload },
            { id: "drive", label: "Google Drive", icon: Cloud },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              tab === id ? "bg-ink text-bg" : "text-ink-2 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {/* Both stay mounted so switching tabs never loses progress. */}
      <div hidden={tab !== "upload"}>
        <UploadTab />
      </div>
      <div hidden={tab !== "drive"}>
        <DriveTab configured={driveConfigured} defaultFolder={defaultFolder} />
      </div>
    </div>
  );
}

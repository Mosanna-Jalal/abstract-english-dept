"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Info, TriangleExclamationPoint } from "lucide-react";
import { cn } from "@/lib/text";

type Tone = "default" | "success" | "error";

interface ToastOptions {
  tone?: Tone;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
}

interface AdminUI {
  toast: (message: string, options?: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AdminContext = createContext<AdminUI | null>(null);

export function useAdminUI(): AdminUI {
  const ctx = use(AdminContext);
  if (!ctx) throw new Error("useAdminUI must be used inside <AdminProviders>");
  return ctx;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

let toastId = 0;

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++toastId;
      setToasts((t) => [...t.slice(-2), { id, message, ...options }]);
      setTimeout(() => dismiss(id), options.duration ?? (options.action ? 5000 : 3200));
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setDialog(options);
    });
  }, []);

  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [dialog]);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    if (dialogRef.current?.open) dialogRef.current.close();
    setDialog(null);
  }, []);

  return (
    <AdminContext value={{ toast, confirm }}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4 lg:top-5"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2.5 pl-4 pr-2.5 text-[0.9rem] text-bg shadow-[var(--shadow-lg)]"
            style={{ animation: "toast-in 0.32s var(--ease) both" }}
          >
            {t.tone === "error" ? (
              <TriangleExclamationPoint className="size-4 flex-none text-[#f3a3a3]" aria-hidden />
            ) : t.tone === "success" ? (
              <CircleCheck className="size-4 flex-none text-[#9fd8b4]" aria-hidden />
            ) : (
              <Info className="size-4 flex-none opacity-70" aria-hidden />
            )}
            <span className={cn("min-w-0 flex-1", !t.action && "pr-1.5")}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-full px-3 py-1 text-[0.85rem] font-semibold text-bg underline-offset-2 hover:bg-white/10 dark:hover:bg-black/10"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => settle(false)}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-3xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lg)] backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
      >
        {dialog && (
          <div className="p-6 sm:p-7">
            <h2 className="font-serif text-[1.4rem] leading-snug tracking-tight">{dialog.title}</h2>
            {dialog.body && <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{dialog.body}</p>}
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => settle(false)}>
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                className={dialog.tone === "danger" ? "btn btn-danger" : "btn btn-primary"}
                onClick={() => settle(true)}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </AdminContext>
  );
}

"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="mt-7 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            className="field h-12 pl-10 pr-12"
            aria-invalid={state && !state.ok ? true : undefined}
            aria-describedby={state && !state.ok ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {state && !state.ok && (
        <p id="login-error" role="alert" className="rounded-xl bg-[color-mix(in_oklab,var(--danger)_9%,transparent)] px-3.5 py-2.5 text-sm text-danger">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary h-12 w-full">
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "./auth-token";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  // The expiry check reads the clock, so it must run at request time — not
  // while Next.js prerenders a prefetch of an admin page.
  await connection();
  return verifySessionToken(token, Date.now());
}

/** Use at the top of every admin data read and Server Action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

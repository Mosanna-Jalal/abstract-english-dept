import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Stateless admin session token: "v1.<expiry>.<hmac>". Shared by proxy.ts
// (optimistic redirect) and lib/session.ts (the real check, close to data).

export const SESSION_COOKIE = "aed_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short. Set it in .env.local.");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(nowMs: number): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null, nowMs: number): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  const given = Buffer.from(parts[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Constant-time password comparison (hashing first equalises lengths). */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

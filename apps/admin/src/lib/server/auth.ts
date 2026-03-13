import { cookies } from "next/headers";
import { buildSessionValue, isSafeEqual, isValidSessionValue } from "./auth-core";

const SESSION_COOKIE = "audit-ops-admin-session";

function getAuthSecret(): string {
  return process.env.ADMIN_AUTH_SECRET ?? "audit-ops-admin-dev-secret";
}

export function validatePassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "admin";
  return isSafeEqual(password, expected);
}

export async function createSession(password: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, buildSessionValue(password, getAuthSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "admin";

  if (!session) {
    return false;
  }

  return isValidSessionValue(session, expectedPassword, getAuthSecret());
}

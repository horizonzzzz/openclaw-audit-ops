import { createHmac, timingSafeEqual } from "node:crypto";

export function signValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function buildSessionValue(password: string, secret: string): string {
  return `${password}.${signValue(password, secret)}`;
}

export function isSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidSessionValue(session: string, password: string, secret: string): boolean {
  return isSafeEqual(session, buildSessionValue(password, secret));
}

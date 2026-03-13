import { describe, expect, test } from "vitest";
import {
  buildSessionValue,
  isSafeEqual,
  isValidSessionValue
} from "../src/lib/server/auth-core";

describe("auth core helpers", () => {
  test("returns false instead of throwing when compared strings have different lengths", () => {
    expect(isSafeEqual("admin", "a")).toBe(false);
  });

  test("validates a signed session value and rejects a forged one", () => {
    const secret = "test-secret";
    const password = "admin";
    const valid = buildSessionValue(password, secret);

    expect(isValidSessionValue(valid, password, secret)).toBe(true);
    expect(isValidSessionValue("forged.session", password, secret)).toBe(false);
  });
});

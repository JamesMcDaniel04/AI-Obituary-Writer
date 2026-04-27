import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

afterEach(() => {
  resetRateLimit();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const options = { limit: 3, windowMs: 1000 };

    expect(checkRateLimit("a", options).ok).toBe(true);
    expect(checkRateLimit("a", options).ok).toBe(true);
    expect(checkRateLimit("a", options).ok).toBe(true);
    expect(checkRateLimit("a", options).ok).toBe(false);
  });

  it("isolates buckets by key", () => {
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit("a", options).ok).toBe(true);
    expect(checkRateLimit("b", options).ok).toBe(true);
    expect(checkRateLimit("a", options).ok).toBe(false);
    expect(checkRateLimit("b", options).ok).toBe(false);
  });

  it("resets after the window passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T12:00:00Z"));
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit("a", options).ok).toBe(true);
    expect(checkRateLimit("a", options).ok).toBe(false);

    vi.setSystemTime(new Date("2026-04-27T12:00:01.500Z"));
    expect(checkRateLimit("a", options).ok).toBe(true);
  });
});

import { PacingService } from "./pacing.service";

describe("PacingService", () => {
  const svc = new PacingService();

  it("caps posts below spam thresholds even on aggressive", () => {
    // Aggressive IG is 3/day — never unlimited, no matter what config asks.
    expect(svc.remainingPostsToday("INSTAGRAM", "aggressive", 0, 999)).toBe(3);
  });

  it("respects the lower of config cap and platform ceiling", () => {
    expect(svc.remainingPostsToday("X", "aggressive", 0, 4)).toBe(4); // config < ceiling(12)
    expect(svc.remainingPostsToday("X", "gentle", 0, 999)).toBe(3); // ceiling < config
  });

  it("never returns negative remaining", () => {
    expect(svc.remainingPostsToday("INSTAGRAM", "balanced", 10, 2)).toBe(0);
  });

  it("enforces a minimum gap between posts", () => {
    expect(svc.minGapMinutes("aggressive")).toBeGreaterThanOrEqual(60);
    expect(svc.minGapMinutes("gentle")).toBeGreaterThan(svc.minGapMinutes("aggressive"));
  });

  it("detects quiet hours including windows that wrap midnight", () => {
    expect(svc.isQuietHour(2, 23, 6)).toBe(true); // 2am inside 23→6
    expect(svc.isQuietHour(23, 23, 6)).toBe(true);
    expect(svc.isQuietHour(12, 23, 6)).toBe(false);
    expect(svc.isQuietHour(4, 1, 5)).toBe(true); // non-wrapping
  });

  it("prefers observed audience peaks over defaults", () => {
    expect(svc.bestHours("INSTAGRAM", [6, 15])).toEqual([6, 15]);
    expect(svc.bestHours("INSTAGRAM")).toContain(18);
  });

  it("humanizes the posting minute away from round numbers", () => {
    const m = svc.humanizeMinute(42);
    expect(m).toBeGreaterThanOrEqual(3);
    expect(m).toBeLessThanOrEqual(57);
  });
});

import { Injectable } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";

export type Intensity = "gentle" | "balanced" | "aggressive";

/**
 * Safe per-platform daily action ceilings. These are deliberately BELOW the
 * thresholds that trip spam/automation detection — the goal is fast organic
 * growth that never risks the account, not raw volume. "aggressive" is still
 * within human-plausible ranges.
 *
 * Values are posts/day. Replies and follows have their own, higher ceilings
 * because responding is low-risk; initiating is what gets flagged.
 */
const POST_CEILING: Record<Intensity, Partial<Record<SocialPlatform, number>>> = {
  gentle: { INSTAGRAM: 1, FACEBOOK: 1, TIKTOK: 1, X: 3, LINKEDIN: 1, YOUTUBE: 1, PINTEREST: 3, THREADS: 2 },
  balanced: { INSTAGRAM: 2, FACEBOOK: 2, TIKTOK: 2, X: 6, LINKEDIN: 1, YOUTUBE: 1, PINTEREST: 8, THREADS: 4 },
  aggressive: { INSTAGRAM: 3, FACEBOOK: 3, TIKTOK: 3, X: 12, LINKEDIN: 2, YOUTUBE: 2, PINTEREST: 15, THREADS: 6 },
};

/** Minimum minutes between two posts on the same account (avoids bursts). */
const MIN_GAP_MINUTES: Record<Intensity, number> = {
  gentle: 240,
  balanced: 150,
  aggressive: 90,
};

@Injectable()
export class PacingService {
  postCeiling(platform: SocialPlatform, intensity: Intensity): number {
    return POST_CEILING[intensity][platform] ?? 1;
  }

  minGapMinutes(intensity: Intensity): number {
    return MIN_GAP_MINUTES[intensity];
  }

  /**
   * How many more posts may go out on this account today, given what has
   * already been scheduled/published and the config cap.
   */
  remainingPostsToday(
    platform: SocialPlatform,
    intensity: Intensity,
    alreadyToday: number,
    configMaxPerDay: number,
  ): number {
    const ceiling = Math.min(this.postCeiling(platform, intensity), configMaxPerDay);
    return Math.max(0, ceiling - alreadyToday);
  }

  /**
   * Human-like jitter so posts never land at an exact round time (a classic
   * bot tell). Returns the target minute offset within the active hour.
   */
  humanizeMinute(seed: number): number {
    // Deterministic-but-scattered minute in [3, 57].
    return 3 + (Math.abs(Math.sin(seed) * 10000) % 54 | 0);
  }

  /**
   * Best hours (local) to post per platform, refined by the account's own
   * audience-active data when available (passed in as observedPeakHours).
   */
  bestHours(platform: SocialPlatform, observedPeakHours?: number[]): number[] {
    if (observedPeakHours?.length) return observedPeakHours;
    const defaults: Partial<Record<SocialPlatform, number[]>> = {
      INSTAGRAM: [12, 18, 21],
      FACEBOOK: [9, 13, 20],
      TIKTOK: [7, 19, 22],
      X: [8, 12, 17],
      LINKEDIN: [8, 12, 17],
      YOUTUBE: [15, 20],
      PINTEREST: [14, 21],
      THREADS: [11, 18, 21],
    };
    return defaults[platform] ?? [12, 18];
  }

  /** True when `hour` is inside the org's quiet window (no posting). */
  isQuietHour(hour: number, quietStart: number, quietEnd: number): boolean {
    return quietStart <= quietEnd
      ? hour >= quietStart && hour < quietEnd
      : hour >= quietStart || hour < quietEnd; // wraps midnight
  }
}

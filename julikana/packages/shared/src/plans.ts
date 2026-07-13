import { PlanTier } from "./enums";

export interface PlanLimits {
  seats: number;
  socialAccounts: number;
  aiTextGenerationsPerMonth: number;
  aiImagesPerMonth: number;
  aiVideosPerMonth: number;
  scheduledPostsPerMonth: number;
  workflows: number;
  leads: number;
  priceUsdPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.STARTER]: {
    seats: 2,
    socialAccounts: 3,
    aiTextGenerationsPerMonth: 300,
    aiImagesPerMonth: 60,
    aiVideosPerMonth: 5,
    scheduledPostsPerMonth: 60,
    workflows: 3,
    leads: 1_000,
    priceUsdPerMonth: 29,
  },
  [PlanTier.PROFESSIONAL]: {
    seats: 5,
    socialAccounts: 8,
    aiTextGenerationsPerMonth: 2_000,
    aiImagesPerMonth: 400,
    aiVideosPerMonth: 30,
    scheduledPostsPerMonth: 400,
    workflows: 15,
    leads: 20_000,
    priceUsdPerMonth: 99,
  },
  [PlanTier.BUSINESS]: {
    seats: 15,
    socialAccounts: 20,
    aiTextGenerationsPerMonth: 10_000,
    aiImagesPerMonth: 2_000,
    aiVideosPerMonth: 120,
    scheduledPostsPerMonth: 2_000,
    workflows: 50,
    leads: 200_000,
    priceUsdPerMonth: 299,
  },
  [PlanTier.ENTERPRISE]: {
    seats: Number.MAX_SAFE_INTEGER,
    socialAccounts: Number.MAX_SAFE_INTEGER,
    aiTextGenerationsPerMonth: Number.MAX_SAFE_INTEGER,
    aiImagesPerMonth: Number.MAX_SAFE_INTEGER,
    aiVideosPerMonth: Number.MAX_SAFE_INTEGER,
    scheduledPostsPerMonth: Number.MAX_SAFE_INTEGER,
    workflows: Number.MAX_SAFE_INTEGER,
    leads: Number.MAX_SAFE_INTEGER,
    priceUsdPerMonth: 0, // custom pricing
  },
};

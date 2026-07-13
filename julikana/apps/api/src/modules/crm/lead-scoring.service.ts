import { Injectable } from "@nestjs/common";
import { FunnelStage } from "@prisma/client";

export interface ScoringSignals {
  hasEmail: boolean;
  hasPhone: boolean;
  messageCount: number;
  repliedWithin24h: boolean;
  mentionedBudget: boolean;
  requestedAppointment: boolean;
  stage: FunnelStage;
  daysSinceLastActivity: number;
}

const STAGE_BONUS: Record<FunnelStage, number> = {
  NEW_LEAD: 0,
  CONTACTED: 5,
  INTERESTED: 15,
  QUALIFIED: 25,
  APPOINTMENT: 35,
  PROPOSAL_SENT: 40,
  NEGOTIATION: 45,
  WON: 50,
  LOST: 0,
};

/**
 * Deterministic base score (0–100). The LeadQualifier agent may adjust it
 * ±15 based on conversation sentiment, but this keeps scores explainable.
 */
@Injectable()
export class LeadScoringService {
  score(signals: ScoringSignals): number {
    let score = 0;
    if (signals.hasEmail) score += 10;
    if (signals.hasPhone) score += 10;
    score += Math.min(signals.messageCount * 2, 20);
    if (signals.repliedWithin24h) score += 10;
    if (signals.mentionedBudget) score += 15;
    if (signals.requestedAppointment) score += 20;
    score += STAGE_BONUS[signals.stage];

    // Decay: cold leads lose up to 30 points after 30 days of silence.
    const decay = Math.min(signals.daysSinceLastActivity, 30);
    score -= decay;

    return Math.max(0, Math.min(100, score));
  }
}

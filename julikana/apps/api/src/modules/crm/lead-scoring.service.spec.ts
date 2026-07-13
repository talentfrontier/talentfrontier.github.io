import { LeadScoringService } from "./lead-scoring.service";

describe("LeadScoringService", () => {
  const svc = new LeadScoringService();
  const base = {
    hasEmail: false,
    hasPhone: false,
    messageCount: 0,
    repliedWithin24h: false,
    mentionedBudget: false,
    requestedAppointment: false,
    stage: "NEW_LEAD" as const,
    daysSinceLastActivity: 0,
  };

  it("scores an empty lead at 0", () => {
    expect(svc.score(base)).toBe(0);
  });

  it("rewards contact info and engagement", () => {
    expect(
      svc.score({ ...base, hasEmail: true, hasPhone: true, messageCount: 5 }),
    ).toBe(30);
  });

  it("caps message bonus at 20", () => {
    expect(svc.score({ ...base, messageCount: 100 })).toBe(20);
  });

  it("never exceeds 100", () => {
    expect(
      svc.score({
        ...base,
        hasEmail: true,
        hasPhone: true,
        messageCount: 50,
        repliedWithin24h: true,
        mentionedBudget: true,
        requestedAppointment: true,
        stage: "NEGOTIATION",
      }),
    ).toBe(100);
  });

  it("decays with inactivity but never below 0", () => {
    expect(svc.score({ ...base, hasEmail: true, daysSinceLastActivity: 45 })).toBe(0);
    expect(
      svc.score({ ...base, stage: "QUALIFIED", daysSinceLastActivity: 10 }),
    ).toBe(15);
  });
});

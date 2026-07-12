import { SocialMediaManagerAgent } from "./social-media-manager.agent";

describe("SocialMediaManagerAgent.nextSlot", () => {
  const agent = new SocialMediaManagerAgent(null as never);

  it("schedules at the platform's best hour, same day when it is far enough out", () => {
    const now = new Date("2026-07-12T07:00:00");
    const slot = agent.nextSlot("LINKEDIN", now); // best hour 9, 2h away
    expect(slot.getHours()).toBe(9);
    expect(slot.getDate()).toBe(12);
  });

  it("rolls to the next day when the best hour is too close or past", () => {
    const now = new Date("2026-07-12T08:30:00");
    const slot = agent.nextSlot("LINKEDIN", now); // 9am is only 30min away
    expect(slot.getHours()).toBe(9);
    expect(slot.getDate()).toBe(13);
  });

  it("never schedules less than an hour out", () => {
    const now = new Date("2026-07-12T17:30:00");
    const slot = agent.nextSlot("INSTAGRAM", now); // best hour 18
    expect(slot.getTime() - now.getTime()).toBeGreaterThanOrEqual(3_600_000);
  });

  it("defaults unknown platforms to noon", () => {
    const now = new Date("2026-07-12T08:00:00");
    expect(agent.nextSlot("MESSENGER", now).getHours()).toBe(12);
  });
});

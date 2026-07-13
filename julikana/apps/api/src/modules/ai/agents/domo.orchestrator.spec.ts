import { DomoOrchestrator } from "./domo.orchestrator";

describe("DomoOrchestrator.heuristicPlan", () => {
  // Only the pure fallback planner is exercised here; dependencies unused.
  const domo = new DomoOrchestrator(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it("routes promotion requests to content + social agents", () => {
    const plan = domo.heuristicPlan("Promote my new laptop");
    const agents = plan.tasks.map((t) => t.agent);
    expect(agents).toContain("CONTENT_CREATOR");
    expect(agents).toContain("SOCIAL_MEDIA_MANAGER");
  });

  it("adds video creator for video-ish requests", () => {
    const plan = domo.heuristicPlan("Make a TikTok video about our restaurant");
    expect(plan.tasks.map((t) => t.agent)).toContain("VIDEO_CREATOR");
  });

  it("routes analytics requests to the analytics agent", () => {
    const plan = domo.heuristicPlan("Give me a performance report");
    expect(plan.tasks.map((t) => t.agent)).toContain("ANALYTICS");
  });

  it("never returns an empty plan", () => {
    expect(domo.heuristicPlan("hello").tasks.length).toBeGreaterThan(0);
  });
});

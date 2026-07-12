import { FunnelService } from "./funnel.service";

describe("FunnelService.isValidTransition", () => {
  const svc = new FunnelService(null as never);

  it("allows forward moves", () => {
    expect(svc.isValidTransition("NEW_LEAD", "CONTACTED")).toBe(true);
    expect(svc.isValidTransition("NEW_LEAD", "QUALIFIED")).toBe(true);
    expect(svc.isValidTransition("NEGOTIATION", "WON")).toBe(true);
  });

  it("allows LOST from any non-terminal stage", () => {
    expect(svc.isValidTransition("NEW_LEAD", "LOST")).toBe(true);
    expect(svc.isValidTransition("PROPOSAL_SENT", "LOST")).toBe(true);
  });

  it("allows exactly one step back", () => {
    expect(svc.isValidTransition("QUALIFIED", "INTERESTED")).toBe(true);
    expect(svc.isValidTransition("QUALIFIED", "CONTACTED")).toBe(false);
  });

  it("treats WON and LOST as terminal", () => {
    expect(svc.isValidTransition("WON", "LOST")).toBe(false);
    expect(svc.isValidTransition("LOST", "NEW_LEAD")).toBe(false);
  });

  it("rejects self-transitions", () => {
    expect(svc.isValidTransition("CONTACTED", "CONTACTED")).toBe(false);
  });
});

import { VideoGenerationService } from "./video.providers";

describe("VideoGenerationService", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to Veo when only the Gemini key is set", () => {
    delete process.env.RUNWAY_API_KEY;
    delete process.env.HIGGSFIELD_API_KEY;
    delete process.env.PIKA_API_KEY;
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    const svc = new VideoGenerationService();
    expect(svc.pick().name).toBe("veo");
  });

  it("honors an explicit provider request", () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    process.env.RUNWAY_API_KEY = "runway-key";
    const svc = new VideoGenerationService();
    expect(svc.pick("runway").name).toBe("runway");
  });

  it("throws when no provider is configured", () => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.RUNWAY_API_KEY;
    delete process.env.HIGGSFIELD_API_KEY;
    delete process.env.PIKA_API_KEY;
    const svc = new VideoGenerationService();
    expect(() => svc.pick()).toThrow(/No video provider configured/);
  });

  it("exposes Veo as needing an authed download (proxied, key never leaks)", () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    const svc = new VideoGenerationService();
    expect(svc.byName("veo")?.needsAuthedDownload).toBe(true);
    expect(svc.byName("runway")?.needsAuthedDownload).toBeFalsy();
  });
});

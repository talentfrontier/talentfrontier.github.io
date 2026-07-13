import { MemoryService } from "./memory.service";

describe("MemoryService.localeInstruction", () => {
  it("defaults to English", () => {
    expect(MemoryService.localeInstruction("en")).toMatch(/English/);
    expect(MemoryService.localeInstruction()).toMatch(/English/);
  });

  it("gives Sheng / Nairobi Gen-Z guidance for sheng", () => {
    const out = MemoryService.localeInstruction("sheng", { emojiLevel: "high" });
    expect(out).toMatch(/Sheng/);
    expect(out).toMatch(/Nairobi/);
    expect(out).toMatch(/high/); // emoji energy threaded through
  });

  it("uses Kiswahili for sw", () => {
    expect(MemoryService.localeInstruction("sw")).toMatch(/Kiswahili/);
  });

  it("mixes Swahili + light Sheng for sw-sheng", () => {
    expect(MemoryService.localeInstruction("sw-sheng")).toMatch(/Kiswahili/);
  });
});

describe("MemoryService.systemPrompt", () => {
  it("embeds the locale instruction so agents inherit the voice", () => {
    const prompt = MemoryService.systemPrompt(
      {
        organizationId: "o1",
        name: "Mama Mboga Deliveries",
        knowledgeSnippets: [],
        locale: "sheng",
      },
      "content creator",
    );
    expect(prompt).toMatch(/Domo/);
    expect(prompt).toMatch(/Sheng/);
  });
});

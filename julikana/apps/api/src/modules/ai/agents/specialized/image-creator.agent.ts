import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { ImageGenerationService } from "../../providers/image.providers";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class ImageCreatorAgent implements JulikanaAgent {
  readonly kind = AgentKind.IMAGE_CREATOR;
  readonly description =
    "Generates product images, ads, posters, banners and social graphics.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly images: ImageGenerationService,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    // Turn the marketing brief into a strong visual prompt first.
    const prompt = await this.llm.complete({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "art director") +
            "\nWrite ONE image-generation prompt (max 80 words) for this brief. " +
            "Professional advertising photography/design language. Output only the prompt.",
        },
        { role: "user", content: input.instruction },
      ],
      maxTokens: 200,
      temperature: 0.8,
    });

    const result = await this.images.generate(prompt, {
      size: (input.params?.size as string) ?? "1024x1024",
      provider: input.params?.provider as string,
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        organizationId: memory.organizationId,
        kind: "IMAGE",
        url: result.url,
        storageKey: `generated/${Date.now()}.png`,
        mimeType: "image/png",
        generator: result.provider,
        prompt,
      },
    });
    return {
      summary: `Generated image with ${result.provider}`,
      output: { mediaAssetId: asset.id, url: result.url, prompt },
    };
  }
}

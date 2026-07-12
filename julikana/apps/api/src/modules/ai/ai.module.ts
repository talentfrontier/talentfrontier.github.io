import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiController } from "./ai.controller";
import { MemoryService } from "./memory.service";
import { LlmRouter } from "./providers/llm.router";
import { ImageGenerationService } from "./providers/image.providers";
import { VideoGenerationService } from "./providers/video.providers";
import { SpeechService } from "./providers/speech.providers";
import { AgentRegistry } from "./agents/agent.registry";
import { DomoOrchestrator } from "./agents/domo.orchestrator";
import { AgentTaskProcessor } from "./agents/agent-task.processor";
import { ContentCreatorAgent } from "./agents/specialized/content-creator.agent";
import { CopywriterAgent } from "./agents/specialized/copywriter.agent";
import { ImageCreatorAgent } from "./agents/specialized/image-creator.agent";
import { VideoCreatorAgent } from "./agents/specialized/video-creator.agent";
import { SocialMediaManagerAgent } from "./agents/specialized/social-media-manager.agent";
import { CustomerSupportAgent } from "./agents/specialized/customer-support.agent";
import { LeadQualifierAgent } from "./agents/specialized/lead-qualifier.agent";
import { CrmManagerAgent } from "./agents/specialized/crm-manager.agent";
import { AnalyticsAgent } from "./agents/specialized/analytics.agent";
import { CampaignOptimizerAgent } from "./agents/specialized/campaign-optimizer.agent";
import { TrendResearchAgent } from "./agents/specialized/trend-research.agent";
import { SeoAgent } from "./agents/specialized/seo.agent";

const AGENTS = [
  ContentCreatorAgent,
  CopywriterAgent,
  ImageCreatorAgent,
  VideoCreatorAgent,
  SocialMediaManagerAgent,
  CustomerSupportAgent,
  LeadQualifierAgent,
  CrmManagerAgent,
  AnalyticsAgent,
  CampaignOptimizerAgent,
  TrendResearchAgent,
  SeoAgent,
];

@Module({
  imports: [CrmModule, NotificationsModule],
  controllers: [AiController],
  providers: [
    LlmRouter,
    MemoryService,
    ImageGenerationService,
    VideoGenerationService,
    SpeechService,
    AgentRegistry,
    DomoOrchestrator,
    AgentTaskProcessor,
    ...AGENTS,
  ],
  exports: [DomoOrchestrator, LlmRouter, MemoryService, ImageGenerationService, VideoGenerationService, SpeechService],
})
export class AiModule {}

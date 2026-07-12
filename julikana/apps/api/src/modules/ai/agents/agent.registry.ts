import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { JulikanaAgent } from "./agent.interface";
import { AnalyticsAgent } from "./specialized/analytics.agent";
import { CampaignOptimizerAgent } from "./specialized/campaign-optimizer.agent";
import { ContentCreatorAgent } from "./specialized/content-creator.agent";
import { CopywriterAgent } from "./specialized/copywriter.agent";
import { CrmManagerAgent } from "./specialized/crm-manager.agent";
import { CustomerSupportAgent } from "./specialized/customer-support.agent";
import { ImageCreatorAgent } from "./specialized/image-creator.agent";
import { LeadQualifierAgent } from "./specialized/lead-qualifier.agent";
import { SeoAgent } from "./specialized/seo.agent";
import { SocialMediaManagerAgent } from "./specialized/social-media-manager.agent";
import { TrendResearchAgent } from "./specialized/trend-research.agent";
import { VideoCreatorAgent } from "./specialized/video-creator.agent";

@Injectable()
export class AgentRegistry {
  private readonly agents = new Map<AgentKind, JulikanaAgent>();

  constructor(
    contentCreator: ContentCreatorAgent,
    socialMediaManager: SocialMediaManagerAgent,
    copywriter: CopywriterAgent,
    videoCreator: VideoCreatorAgent,
    imageCreator: ImageCreatorAgent,
    leadQualifier: LeadQualifierAgent,
    crmManager: CrmManagerAgent,
    customerSupport: CustomerSupportAgent,
    analytics: AnalyticsAgent,
    campaignOptimizer: CampaignOptimizerAgent,
    trendResearch: TrendResearchAgent,
    seo: SeoAgent,
  ) {
    for (const agent of [
      contentCreator,
      socialMediaManager,
      copywriter,
      videoCreator,
      imageCreator,
      leadQualifier,
      crmManager,
      customerSupport,
      analytics,
      campaignOptimizer,
      trendResearch,
      seo,
    ]) {
      this.agents.set(agent.kind, agent);
    }
  }

  get(kind: AgentKind): JulikanaAgent {
    const agent = this.agents.get(kind);
    if (!agent) throw new Error(`No agent registered for ${kind}`);
    return agent;
  }

  catalogue(): { kind: AgentKind; description: string }[] {
    return [...this.agents.values()].map(({ kind, description }) => ({ kind, description }));
  }
}

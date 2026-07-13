import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AgentKind } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { QUEUE } from "../../queues/queues.constants";
import { queueToken } from "../../queues/queues.module";
import { MemoryService } from "../memory.service";
import { LlmRouter } from "../providers/llm.router";
import { AgentRegistry } from "./agent.registry";
import { CustomerSupportAgent } from "./specialized/customer-support.agent";

interface Plan {
  understanding: string;
  tasks: { agent: AgentKind; title: string; instruction: string }[];
}

/**
 * Domo — the main agent. Understands what the user wants, breaks it into
 * tasks, and delegates each task to the right specialized agent via the
 * agent-task queue.
 */
@Injectable()
export class DomoOrchestrator {
  private readonly logger = new Logger(DomoOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouter,
    private readonly memory: MemoryService,
    private readonly registry: AgentRegistry,
    private readonly customerSupport: CustomerSupportAgent,
    private readonly events: EventEmitter2,
    @Inject(queueToken(QUEUE.AGENT_TASK)) private readonly agentQueue: Queue,
  ) {}

  /**
   * "Promote my new laptop" → plan → queued tasks for specialized agents.
   *
   * New instructions never block ongoing work: the queue runs several agents
   * concurrently, and user-initiated tasks are enqueued at a HIGHER priority
   * (1) than background autopilot work (default), so a fresh request jumps
   * ahead while whatever is already running finishes normally.
   */
  async dispatch(organizationId: string, instruction: string, priority = 1) {
    const memory = await this.memory.getMemory(organizationId, instruction);
    const plan = await this.plan(instruction, memory);

    const parent = await this.prisma.agentTask.create({
      data: {
        organizationId,
        agent: "DOMO",
        title: plan.understanding.slice(0, 140),
        input: { instruction },
        status: "RUNNING",
      },
    });

    const children = await this.prisma.$transaction(
      plan.tasks.map((t) =>
        this.prisma.agentTask.create({
          data: {
            organizationId,
            agent: t.agent,
            parentTaskId: parent.id,
            title: t.title,
            input: { instruction: t.instruction },
          },
        }),
      ),
    );
    await this.agentQueue.addBulk(
      children.map((task) => ({
        name: task.agent,
        data: { taskId: task.id },
        opts: { priority },
      })),
    );
    return { planId: parent.id, understanding: plan.understanding, tasks: children };
  }

  private async plan(instruction: string, memory: Awaited<ReturnType<MemoryService["getMemory"]>>): Promise<Plan> {
    const catalogue = this.registry
      .catalogue()
      .map((a) => `- ${a.kind}: ${a.description}`)
      .join("\n");
    try {
      return await this.llm.completeJson<Plan>({
        messages: [
          {
            role: "system",
            content:
              MemoryService.systemPrompt(memory, "marketing director planning work") +
              `\n\nAvailable specialists:\n${catalogue}\n\n` +
              `Break the user's request into 1-5 concrete tasks. Respond as JSON: ` +
              `{"understanding": string, "tasks": [{"agent": AgentKind, "title": string, "instruction": string}]}`,
          },
          { role: "user", content: instruction },
        ],
        maxTokens: 800,
        temperature: 0.3,
      });
    } catch (err) {
      this.logger.warn(`LLM planning unavailable, using heuristic plan: ${err}`);
      return this.heuristicPlan(instruction);
    }
  }

  /** Keyword fallback so the product degrades gracefully without an LLM key. */
  heuristicPlan(instruction: string): Plan {
    const lower = instruction.toLowerCase();
    const tasks: Plan["tasks"] = [];
    const add = (agent: AgentKind, title: string) =>
      tasks.push({ agent, title, instruction });

    if (/(video|reel|short|tiktok)/.test(lower)) add("VIDEO_CREATOR", "Create promotional video");
    if (/(image|photo|poster|banner|logo|graphic)/.test(lower)) add("IMAGE_CREATOR", "Create visuals");
    if (/(blog|article|seo)/.test(lower)) add("SEO", "Write SEO article");
    if (/(email|sms|whatsapp campaign)/.test(lower)) add("COPYWRITER", "Write campaign copy");
    if (/(lead|qualify)/.test(lower)) add("LEAD_QUALIFIER", "Qualify leads");
    if (/(trend|trending)/.test(lower)) add("TREND_RESEARCH", "Research trends");
    if (/(report|analytic|performance)/.test(lower)) add("ANALYTICS", "Analyze performance");
    if (!tasks.length || /(promote|post|publish|launch)/.test(lower)) {
      add("CONTENT_CREATOR", "Create social content");
      add("SOCIAL_MEDIA_MANAGER", "Schedule and publish");
    }
    return { understanding: `Marketing plan for: ${instruction}`, tasks };
  }

  /** Synchronous path used by ConversationsService for customer chats. */
  async handleCustomerMessage(organizationId: string, conversationId: string, text: string) {
    const memory = await this.memory.getMemory(organizationId, text);
    const result = await this.customerSupport.reply(memory, conversationId, text);
    return result;
  }

  /** "I own a real estate company." → structured business profile. */
  async onboardBusiness(organizationId: string, description: string) {
    let profile: { industry: string; facts: Record<string, unknown>; brandVoice: Record<string, unknown> };
    try {
      profile = await this.llm.completeJson({
        messages: [
          {
            role: "system",
            content:
              "Extract a business profile from the user's description. Respond as JSON: " +
              `{"industry": string, "facts": {"products": string[], "audience": string, "goals": string[]}, ` +
              `"brandVoice": {"tone": string, "style": string}}`,
          },
          { role: "user", content: description },
        ],
        maxTokens: 500,
        temperature: 0.2,
      });
    } catch {
      profile = {
        industry: "general",
        facts: { description },
        brandVoice: { tone: "friendly", style: "clear and concise" },
      };
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        description,
        industry: profile.industry,
        businessFacts: profile.facts as never,
        brandVoice: profile.brandVoice as never,
      },
    });
    return profile;
  }
}

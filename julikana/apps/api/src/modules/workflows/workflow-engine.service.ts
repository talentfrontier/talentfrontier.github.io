import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";
import { TriggerPayload, WorkflowDefinition } from "./workflow.types";

/**
 * Listens for domain events, matches them against enabled workflow
 * triggers, and enqueues runs. Execution happens in WorkflowProcessor.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(queueToken(QUEUE.WORKFLOW_RUN)) private readonly queue: Queue,
  ) {}

  @OnEvent("social.comment")
  async onComment(payload: TriggerPayload) {
    await this.fire("comment_keyword", payload, (config) => {
      const keyword = String(config.keyword ?? "").toLowerCase();
      const platformOk = !config.platform || config.platform === payload.platform;
      return platformOk && !!keyword && (payload.text ?? "").toLowerCase().includes(keyword);
    });
  }

  @OnEvent("conversation.message")
  async onMessage(payload: TriggerPayload) {
    await this.fire("new_message", payload, () => true);
  }

  @OnEvent("lead.created")
  async onLead(payload: TriggerPayload) {
    await this.fire("new_lead", payload, () => true);
  }

  @OnEvent("lead.stage_changed")
  async onStage(payload: TriggerPayload & { stage?: string }) {
    await this.fire("stage_changed", payload, (config) => !config.stage || config.stage === payload.stage);
  }

  private async fire(
    triggerType: string,
    payload: TriggerPayload,
    matches: (config: Record<string, unknown>) => boolean,
  ) {
    if (!payload.organizationId) return;
    const workflows = await this.prisma.workflow.findMany({
      where: { organizationId: payload.organizationId, enabled: true },
    });
    for (const workflow of workflows) {
      const def = workflow.definition as unknown as WorkflowDefinition;
      if (def?.trigger?.type !== triggerType) continue;
      if (!matches(def.trigger.config ?? {})) continue;
      const run = await this.prisma.workflowRun.create({
        data: { workflowId: workflow.id, triggerPayload: payload as never },
      });
      await this.queue.add("run", { runId: run.id });
      this.logger.log(`Workflow "${workflow.name}" triggered by ${triggerType}`);
    }
  }
}

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";

import { PrismaService } from "../../prisma/prisma.service";
import { ConversationsService } from "../conversations/conversations.service";
import { CrmService } from "../crm/crm.service";
import { FunnelService } from "../crm/funnel.service";
import { NotificationsService } from "../notifications/notifications.service";
import { QUEUE } from "../queues/queues.constants";
import { REDIS_CONNECTION, queueToken } from "../queues/queues.module";
import { Queue } from "bullmq";
import {
  executionOrder,
  TriggerPayload,
  WorkflowDefinition,
  WorkflowNode,
} from "./workflow.types";

/** Executes a workflow run node-by-node, logging each step. */
@Injectable()
export class WorkflowProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmService,
    private readonly funnel: FunnelService,
    private readonly conversations: ConversationsService,
    private readonly notifications: NotificationsService,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
    @Inject(queueToken(QUEUE.AGENT_TASK)) private readonly agentQueue: Queue,
  ) {}

  onModuleInit() {
    this.worker = new Worker(QUEUE.WORKFLOW_RUN, (job) => this.execute(job), {
      connection: this.connection,
      concurrency: 5,
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async execute(job: Job<{ runId: string }>) {
    const run = await this.prisma.workflowRun.findUniqueOrThrow({
      where: { id: job.data.runId },
      include: { workflow: true },
    });
    const def = run.workflow.definition as unknown as WorkflowDefinition;
    const payload = (run.triggerPayload ?? {}) as TriggerPayload;
    const organizationId = run.workflow.organizationId;
    const steps: { nodeId: string; type: string; result: string }[] = [];

    try {
      for (const node of executionOrder(def)) {
        const result = await this.runNode(organizationId, node, payload);
        steps.push({ nodeId: node.id, type: node.type, result });
      }
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", steps: steps as never, finishedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          steps: steps as never,
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private async runNode(
    organizationId: string,
    node: WorkflowNode,
    payload: TriggerPayload,
  ): Promise<string> {
    const text = (node.config.text as string) ?? "";
    switch (node.type) {
      case "add_to_crm": {
        const lead = await this.crm.create(organizationId, {
          name: (payload.authorName as string) ?? "Workflow lead",
          source: (node.config.source as string) ?? "workflow",
          platform: payload.platform as never,
        });
        payload.leadId = lead.id;
        return `lead:${lead.id}`;
      }
      case "move_stage": {
        if (!payload.leadId) return "skipped: no lead";
        await this.funnel.moveLead(payload.leadId, node.config.stage as never, {
          byAgent: true,
          reason: "workflow",
        });
        return `moved to ${node.config.stage}`;
      }
      case "schedule_follow_up": {
        if (!payload.leadId) return "skipped: no lead";
        const afterHours = Number(node.config.afterHours ?? 24);
        await this.crm.addFollowUp(
          payload.leadId,
          new Date(Date.now() + afterHours * 3_600_000),
          (node.config.note as string) ?? "Workflow follow-up",
        );
        return `follow-up in ${afterHours}h`;
      }
      case "send_dm":
      case "reply_comment":
      case "send_whatsapp": {
        // Outbound platform sends go through the conversation pipeline so
        // they are recorded and rate-limited like any other message.
        if (payload.conversationId) {
          await this.conversations.addMessage(payload.conversationId, "DOMO", text);
          return "sent via conversation";
        }
        return "skipped: no conversation";
      }
      case "notify_team": {
        await this.notifications.notifyOrg(organizationId, {
          type: "new_lead",
          title: "Workflow alert",
          body: (node.config.message as string) ?? "Workflow fired",
        });
        return "team notified";
      }
      case "run_agent": {
        const task = await this.prisma.agentTask.create({
          data: {
            organizationId,
            agent: (node.config.agent as never) ?? "CONTENT_CREATOR",
            title: `Workflow: ${node.config.instruction ?? "task"}`,
            input: { instruction: node.config.instruction ?? "" },
          },
        });
        await this.agentQueue.add(task.agent, { taskId: task.id });
        return `agent task ${task.id}`;
      }
      case "delay": {
        // Long delays should re-enqueue with BullMQ delay; short inline pause:
        await new Promise((r) => setTimeout(r, Math.min(Number(node.config.ms ?? 0), 5_000)));
        return "delayed";
      }
      default:
        return `unknown node type ${node.type}`;
    }
  }
}

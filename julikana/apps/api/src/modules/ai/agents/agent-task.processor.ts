import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConnectionOptions, Job, Worker } from "bullmq";

import { PrismaService } from "../../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { QUEUE } from "../../queues/queues.constants";
import { REDIS_CONNECTION } from "../../queues/queues.module";
import { MemoryService } from "../memory.service";
import { AgentRegistry } from "./agent.registry";

/** Executes queued agent tasks and keeps AgentTask rows / the UI in sync. */
@Injectable()
export class AgentTaskProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentTaskProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AgentRegistry,
    private readonly memory: MemoryService,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
  ) {}

  onModuleInit() {
    this.worker = new Worker(QUEUE.AGENT_TASK, (job) => this.process(job), {
      connection: this.connection,
      concurrency: 5,
    });
    this.worker.on("failed", (job, err) =>
      this.logger.error(`Agent task ${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<{ taskId: string }>) {
    const task = await this.prisma.agentTask.update({
      where: { id: job.data.taskId },
      data: { status: "RUNNING", progress: 10 },
    });
    this.emit(task.organizationId, task);

    try {
      const agent = this.registry.get(task.agent);
      const memory = await this.memory.getMemory(
        task.organizationId,
        (task.input as { instruction?: string })?.instruction,
      );
      const result = await agent.run(memory, {
        instruction: (task.input as { instruction: string }).instruction,
        params: task.input as Record<string, unknown>,
        taskId: task.id,
      });

      const done = await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          progress: 100,
          output: result as never,
          finishedAt: new Date(),
        },
      });
      this.emit(task.organizationId, done);
      await this.maybeCompleteParent(task.parentTaskId);
      await this.notifications.notifyOrg(task.organizationId, {
        type: "task_done",
        title: "Domo finished a task",
        body: result.summary.slice(0, 140),
        data: { taskId: task.id },
      });
    } catch (err) {
      const failed = await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        },
      });
      this.emit(task.organizationId, failed);
      throw err;
    }
  }

  private async maybeCompleteParent(parentTaskId: string | null) {
    if (!parentTaskId) return;
    const pending = await this.prisma.agentTask.count({
      where: { parentTaskId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (pending === 0) {
      await this.prisma.agentTask.update({
        where: { id: parentTaskId },
        data: { status: "COMPLETED", progress: 100, finishedAt: new Date() },
      });
    }
  }

  private emit(organizationId: string, task: unknown) {
    this.events.emit("agent.task.updated", { organizationId, task });
  }
}

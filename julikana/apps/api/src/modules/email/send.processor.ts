import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { REDIS_CONNECTION } from "../queues/queues.module";
import { applyComplianceFooter, mergeFields } from "./compliance.util";
import { EmailTransportService } from "./email-transport.service";

/**
 * Sends queued campaign emails at a DELIVERABILITY-SAFE rate. The worker's
 * BullMQ limiter caps throughput (default 120/hour, override with
 * EMAIL_MAX_PER_HOUR) — blasting as fast as possible is exactly what trips
 * spam filters and blacklists the domain, so we pace on purpose.
 *
 * Every send re-checks the suppression list, personalizes merge fields, and
 * appends the legally-required unsubscribe footer before dispatch.
 */
@Injectable()
export class EmailSendProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailSendProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: EmailTransportService,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
  ) {}

  onModuleInit() {
    const perHour = Number(process.env.EMAIL_MAX_PER_HOUR ?? 120);
    this.worker = new Worker(QUEUE.EMAIL_SEND, (job) => this.process(job), {
      connection: this.connection,
      concurrency: 2,
      limiter: { max: Math.max(1, perHour), duration: 3_600_000 },
    });
    this.worker.on("failed", (job, err) =>
      this.logger.warn(`Email job ${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<{ campaignId: string; contactId: string }>) {
    const { campaignId, contactId } = job.data;
    const [campaign, contact] = await Promise.all([
      this.prisma.emailCampaign.findUnique({ where: { id: campaignId } }),
      this.prisma.emailContact.findUnique({ where: { id: contactId } }),
    ]);
    if (!campaign || !contact) return;

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: campaign.organizationId },
    });

    // Re-check suppression + subscription at the moment of sending.
    const suppressed = await this.prisma.emailSuppression.findUnique({
      where: { organizationId_email: { organizationId: org.id, email: contact.email } },
    });
    if (suppressed || contact.status !== "SUBSCRIBED") {
      await this.mark(campaignId, contact.email, "SKIPPED");
      return;
    }

    const unsubscribeUrl = `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/email/unsubscribe/${contact.unsubscribeToken}`;
    const html = applyComplianceFooter(mergeFields(campaign.bodyHtml, contact), {
      unsubscribeUrl,
      sender: { name: org.emailSenderName!, address: org.emailSenderAddress! },
    });

    const result = await this.transport.send({
      to: contact.email,
      from: process.env.EMAIL_FROM ?? "hello@julikana.app",
      fromName: org.emailSenderName!,
      subject: mergeFields(campaign.subject, contact),
      html,
      // One-click unsubscribe headers (RFC 8058) — big deliverability win.
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (result.ok) {
      await this.mark(campaignId, contact.email, "SENT");
      await this.bump(campaignId, "sentCount");
    } else {
      await this.prisma.emailRecipient.updateMany({
        where: { campaignId, email: contact.email },
        data: { status: "FAILED", error: result.error?.slice(0, 300) },
      });
      await this.bump(campaignId, "failedCount");
      // A hard bounce suppresses the address so we never retry it.
      if (/bounce|invalid|does not exist|5\d\d/i.test(result.error ?? "")) {
        await this.prisma.emailSuppression.upsert({
          where: { organizationId_email: { organizationId: org.id, email: contact.email } },
          update: { reason: "bounce" },
          create: { organizationId: org.id, email: contact.email, reason: "bounce" },
        });
      }
    }
    await this.maybeComplete(campaignId);
  }

  private mark(campaignId: string, email: string, status: "SENT" | "SKIPPED" | "FAILED") {
    return this.prisma.emailRecipient.updateMany({
      where: { campaignId, email },
      data: { status, sentAt: status === "SENT" ? new Date() : undefined },
    });
  }

  private bump(campaignId: string, field: "sentCount" | "failedCount") {
    return this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { [field]: { increment: 1 } },
    });
  }

  private async maybeComplete(campaignId: string) {
    const pending = await this.prisma.emailRecipient.count({
      where: { campaignId, status: "QUEUED" },
    });
    if (pending === 0) {
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "SENT" },
      });
    }
  }
}

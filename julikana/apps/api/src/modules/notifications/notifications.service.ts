import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";

export interface NotifyPayload {
  type:
    | "new_lead"
    | "new_message"
    | "task_done"
    | "campaign_done"
    | "post_failed"
    | "api_disconnected";
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Persist a notification for every member of the org and push it live. */
  async notifyOrg(organizationId: string, payload: NotifyPayload) {
    const members = await this.prisma.membership.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    const created = await this.prisma.$transaction(
      members.map((m) =>
        this.prisma.notification.create({
          data: { userId: m.userId, ...payload, data: payload.data as never },
        }),
      ),
    );
    for (const notification of created) {
      this.events.emit("notification.created", notification);
    }
    return created.length;
  }

  list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { read: false }) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.update({
      where: { id, userId } as never,
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

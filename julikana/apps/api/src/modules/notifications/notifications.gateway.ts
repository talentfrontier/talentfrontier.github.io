import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Notification } from "@prisma/client";
import { Server, Socket } from "socket.io";

/**
 * Pushes notifications and conversation events to connected dashboards.
 * Clients connect with `auth: { token }` and join a per-user room.
 */
@WebSocketGateway({ cors: { origin: process.env.WEB_URL ?? "*" }, namespace: "/realtime" })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly jwt = new JwtService({ secret: process.env.JWT_SECRET ?? "dev-secret" });

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwt.verify(token);
      client.join(`user:${payload.sub}`);
      client.join(`org:${payload.org}`);
    } catch {
      this.logger.warn("Rejected unauthenticated socket");
      client.disconnect(true);
    }
  }

  @OnEvent("notification.created")
  onNotification(notification: Notification) {
    this.server.to(`user:${notification.userId}`).emit("notification", notification);
  }

  @OnEvent("conversation.message")
  onMessage(payload: { organizationId: string; conversationId: string; message: unknown }) {
    this.server.to(`org:${payload.organizationId}`).emit("conversation.message", payload);
  }

  @OnEvent("agent.task.updated")
  onTask(payload: { organizationId: string; task: unknown }) {
    this.server.to(`org:${payload.organizationId}`).emit("agent.task", payload.task);
  }
}

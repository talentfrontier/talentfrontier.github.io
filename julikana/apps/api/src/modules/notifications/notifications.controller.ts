import { Controller, Get, Param, Post, Query, Sse, UseGuards } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { fromEvent, map, merge, Observable } from "rxjs";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("unread") unread?: string) {
    return this.notifications.list(user.id, unread === "true");
  }

  @Post(":id/read")
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  /** Server-Sent Events alternative to the WebSocket gateway. */
  @Sse("stream")
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return merge(
      fromEvent(this.events, "notification.created"),
      fromEvent(this.events, "agent.task.updated"),
    ).pipe(map((data) => ({ data }) as MessageEvent));
  }
}

import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConversationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ConversationsService } from "./conversations.service";

class SendMessageDto {
  @IsString() body: string;
}

class InboundDto {
  @IsString() channel: string;
  @IsString() body: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() leadId?: string;
}

class StatusDto {
  @IsEnum(ConversationStatus) status: ConversationStatus;
}

@ApiTags("conversations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("status") status?: ConversationStatus) {
    return this.conversations.list(user.organizationId, status);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.conversations.get(user.organizationId, id);
  }

  /** Human agent takes over and replies manually. */
  @Post(":id/messages")
  send(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: SendMessageDto) {
    return this.conversations.addMessage(id, "HUMAN_AGENT", dto.body);
  }

  /** Webchat / testing entry point (platform webhooks land in SocialModule). */
  @Post("inbound")
  inbound(@CurrentUser() user: AuthUser, @Body() dto: InboundDto) {
    return this.conversations.handleInbound(user.organizationId, dto);
  }

  @Post(":id/status")
  setStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: StatusDto) {
    return this.conversations.setStatus(user.organizationId, id, dto.status);
  }
}

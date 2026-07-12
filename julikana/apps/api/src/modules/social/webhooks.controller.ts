import { Body, Controller, Get, Logger, Param, Post, Query } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { ConversationsService } from "../conversations/conversations.service";

/**
 * Inbound platform webhooks (Meta verification handshake + message events).
 * Public by necessity; Meta signs payloads with X-Hub-Signature-256 which
 * should be verified against META_APP_SECRET in production.
 */
@ApiExcludeController()
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  /** Meta webhook verification handshake. */
  @Get("meta")
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ) {
    if (mode === "subscribe" && token === process.env.META_APP_SECRET) return challenge;
    return "forbidden";
  }

  @Post("meta")
  async metaEvent(@Body() payload: any) {
    for (const entry of payload.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        if (!messaging.message?.text) continue;
        const account = await this.prisma.socialAccount.findFirst({
          where: { externalId: String(entry.id) },
        });
        if (!account) continue;
        const thread = `${messaging.sender.id}:${entry.id}`;
        const existing = await this.prisma.conversation.findFirst({
          where: { externalThreadId: thread },
        });
        await this.conversations.handleInbound(account.organizationId, {
          conversationId: existing?.id,
          channel: account.platform.toLowerCase(),
          socialAccountId: account.id,
          externalThreadId: thread,
          body: messaging.message.text,
        });
      }
    }
    return { received: true };
  }

  /** Generic webhook for platforms that POST simple message payloads. */
  @Post(":platform")
  generic(@Param("platform") platform: string, @Body() payload: unknown) {
    this.logger.log(`Webhook from ${platform}: ${JSON.stringify(payload).slice(0, 200)}`);
    return { received: true };
  }
}

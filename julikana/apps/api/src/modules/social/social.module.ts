import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdapterRegistry } from "./adapters/adapter.registry";
import { PublishProcessor } from "./publish.processor";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [NotificationsModule, ConversationsModule],
  controllers: [SocialController, WebhooksController],
  providers: [SocialService, AdapterRegistry, PublishProcessor],
  exports: [SocialService],
})
export class SocialModule {}

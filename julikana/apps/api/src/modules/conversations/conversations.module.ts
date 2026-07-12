import { Module, forwardRef } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { CrmModule } from "../crm/crm.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [NotificationsModule, CrmModule, forwardRef(() => AiModule)],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

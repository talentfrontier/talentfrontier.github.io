import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { CrmModule } from "../crm/crm.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WorkflowEngineService } from "./workflow-engine.service";
import { WorkflowProcessor } from "./workflow.processor";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
  imports: [CrmModule, ConversationsModule, NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEngineService, WorkflowProcessor],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}

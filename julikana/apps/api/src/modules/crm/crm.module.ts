import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";
import { FunnelService } from "./funnel.service";
import { LeadScoringService } from "./lead-scoring.service";

@Module({
  imports: [NotificationsModule],
  controllers: [CrmController],
  providers: [CrmService, LeadScoringService, FunnelService],
  exports: [CrmService, LeadScoringService, FunnelService],
})
export class CrmModule {}

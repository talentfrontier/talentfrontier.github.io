import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { EmailCampaignsService } from "./campaigns.service";
import { ContactsService } from "./contacts.service";
import { EmailController } from "./email.controller";
import { EmailTransportService } from "./email-transport.service";
import { EmailSendProcessor } from "./send.processor";

@Module({
  imports: [AiModule],
  controllers: [EmailController],
  providers: [ContactsService, EmailCampaignsService, EmailTransportService, EmailSendProcessor],
  exports: [ContactsService, EmailCampaignsService],
})
export class EmailModule {}

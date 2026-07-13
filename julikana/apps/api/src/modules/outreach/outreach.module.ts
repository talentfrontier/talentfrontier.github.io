import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { OutreachController } from "./outreach.controller";
import { OutreachService } from "./outreach.service";

@Module({
  imports: [AiModule],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService],
})
export class OutreachModule {}

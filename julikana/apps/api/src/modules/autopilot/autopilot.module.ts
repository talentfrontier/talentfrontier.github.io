import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AutopilotController } from "./autopilot.controller";
import { AutopilotService } from "./autopilot.service";
import { OptimizerService } from "./optimizer.service";
import { PacingService } from "./pacing.service";

@Module({
  imports: [AiModule],
  controllers: [AutopilotController],
  providers: [AutopilotService, OptimizerService, PacingService],
  exports: [AutopilotService, PacingService],
})
export class AutopilotModule {}

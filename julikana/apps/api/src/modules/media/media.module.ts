import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { MediaController } from "./media.controller";
import { MediaGenerationProcessor } from "./media-generation.processor";
import { StorageService } from "./storage.service";

@Module({
  // AiModule exports VideoGenerationService (provider selection + polling).
  imports: [AiModule],
  controllers: [MediaController],
  providers: [StorageService, MediaGenerationProcessor],
  exports: [StorageService],
})
export class MediaModule {}

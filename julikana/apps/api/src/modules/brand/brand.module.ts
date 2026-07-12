import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { BrandController } from "./brand.controller";
import { BrandService } from "./brand.service";
import { IngestProcessor } from "./ingest.processor";

@Module({
  imports: [MediaModule],
  controllers: [BrandController],
  providers: [BrandService, IngestProcessor],
  exports: [BrandService],
})
export class BrandModule {}

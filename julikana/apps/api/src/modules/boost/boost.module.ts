import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { BoostController } from "./boost.controller";
import { BoostService } from "./boost.service";

@Module({
  imports: [PaymentsModule],
  controllers: [BoostController],
  providers: [BoostService],
  exports: [BoostService],
})
export class BoostModule {}

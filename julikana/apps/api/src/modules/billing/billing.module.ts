import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { StripeService } from "./stripe.service";
import { UsageService } from "./usage.service";

@Module({
  controllers: [BillingController],
  providers: [StripeService, UsageService],
  exports: [UsageService],
})
export class BillingModule {}

import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentMethodsService } from "./payment-methods.service";
import { MpesaService } from "./mpesa.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentMethodsService, MpesaService],
  exports: [PaymentMethodsService, MpesaService],
})
export class PaymentsModule {}

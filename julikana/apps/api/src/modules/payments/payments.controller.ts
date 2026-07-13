import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentMethodsService } from "./payment-methods.service";

class SaveCardDto {
  @IsString() paymentMethodId: string; // Stripe token, NOT a card number
  @IsOptional() @IsBoolean() makeDefault?: boolean;
}

class MpesaDto {
  @IsString() phone: string;
  @IsOptional() @IsBoolean() makeDefault?: boolean;
}

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly methods: PaymentMethodsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("methods")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.methods.list(user.organizationId);
  }

  @Post("cards/setup-intent")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Start adding a card — card is entered directly into Stripe, not us" })
  setupIntent(@CurrentUser() user: AuthUser) {
    return this.methods.createCardSetupIntent(user.organizationId);
  }

  @Post("cards")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  saveCard(@CurrentUser() user: AuthUser, @Body() dto: SaveCardDto) {
    return this.methods.saveCardFromSetupIntent(
      user.organizationId,
      dto.paymentMethodId,
      dto.makeDefault ?? false,
    );
  }

  @Post("mpesa")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  addMpesa(@CurrentUser() user: AuthUser, @Body() dto: MpesaDto) {
    return this.methods.addMpesa(user.organizationId, dto.phone, dto.makeDefault ?? false);
  }

  @Post("methods/:id/default")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  setDefault(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.methods.setDefault(user.organizationId, id);
  }

  @Delete("methods/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.methods.remove(user.organizationId, id);
  }

  /** Safaricom Daraja calls this after an STK push resolves. Public. */
  @Post("mpesa/callback")
  @ApiExcludeEndpoint()
  async mpesaCallback(@Body() payload: any) {
    const stk = payload?.Body?.stkCallback;
    if (stk?.ResultCode === 0) {
      await this.prisma.boostOrder.updateMany({
        where: { mpesaCheckoutId: stk.CheckoutRequestID, status: "PENDING_PAYMENT" },
        data: { status: "PAID" },
      });
    }
    return { received: true };
  }
}

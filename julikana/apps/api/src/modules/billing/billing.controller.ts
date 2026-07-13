import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { PlanTier } from "@prisma/client";
import { IsEnum } from "class-validator";
import { Request } from "express";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { StripeService } from "./stripe.service";
import { UsageService } from "./usage.service";

class CheckoutDto {
  @IsEnum(PlanTier) tier: PlanTier;
}

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(
    private readonly stripe: StripeService,
    private readonly usage: UsageService,
  ) {}

  @Post("checkout")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER")
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.stripe.createCheckoutSession(user.organizationId, dto.tier);
  }

  @Get("usage")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  currentUsage(@CurrentUser() user: AuthUser) {
    return this.usage.currentUsage(user.organizationId);
  }

  /** Stripe webhook — signature-verified, so no JWT guard. */
  @Post("webhook")
  @ApiExcludeEndpoint()
  webhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.stripe.handleWebhook(signature, req.rawBody!);
  }
}

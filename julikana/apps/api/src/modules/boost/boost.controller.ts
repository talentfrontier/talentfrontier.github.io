import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BoostService } from "./boost.service";

class CreateBoostDto {
  @IsString() socialAccountId: string;
  @IsOptional() @IsString() scheduledPostId?: string;
  @IsString() objective: string;
  @Type(() => Number) @IsInt() @Min(1) budgetCents: number;
  @IsOptional() @IsString() currency?: string;
  @Type(() => Number) @IsInt() @Min(1) durationDays: number;
  @IsOptional() @IsObject() audience?: Record<string, unknown>;
  @IsOptional() @IsString() paymentMethodId?: string;
}

@ApiTags("boost")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("boost")
export class BoostController {
  constructor(private readonly boost: BoostService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.boost.list(user.organizationId);
  }

  @Get("preview")
  @ApiOperation({ summary: "Which card/M-Pesa would pay, and is platform funding already set" })
  preview(@CurrentUser() user: AuthUser, @Query("socialAccountId") socialAccountId: string) {
    return this.boost.previewPayment(user.organizationId, socialAccountId);
  }

  @Post()
  @Roles("OWNER", "MANAGER", "MARKETING")
  @ApiOperation({ summary: "Boost a post with a budget + duration on its platform" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBoostDto) {
    return this.boost.createBoost(user.organizationId, dto);
  }
}

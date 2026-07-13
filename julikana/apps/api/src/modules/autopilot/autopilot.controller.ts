import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SocialPlatform } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AutopilotService } from "./autopilot.service";
import { OptimizerService } from "./optimizer.service";

class UpdateAutopilotDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsIn(["gentle", "balanced", "aggressive"]) intensity?: "gentle" | "balanced" | "aggressive";
  @IsOptional() @IsArray() @IsEnum(SocialPlatform, { each: true }) platforms?: SocialPlatform[];
  @IsOptional() @IsInt() @Min(1) @Max(20) maxPostsPerDay?: number;
  @IsOptional() @IsBoolean() autoBoostWinners?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursStart?: number;
  @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursEnd?: number;
}

@ApiTags("autopilot")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("autopilot")
export class AutopilotController {
  constructor(
    private readonly autopilot: AutopilotService,
    private readonly optimizer: OptimizerService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get autopilot settings" })
  config(@CurrentUser() user: AuthUser) {
    return this.autopilot.getConfig(user.organizationId);
  }

  @Patch()
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Turn Domo's unsupervised mode on/off and tune it" })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAutopilotDto) {
    return this.autopilot.updateConfig(user.organizationId, dto);
  }

  @Get("report")
  @ApiOperation({ summary: "Progress report: what Domo did and is doing" })
  report(@CurrentUser() user: AuthUser) {
    return this.autopilot.report(user.organizationId);
  }

  @Post("optimize-now")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Run the self-optimization pass immediately" })
  optimizeNow(@CurrentUser() user: AuthUser) {
    return this.optimizer.optimizeOrg(user.organizationId, false, 0);
  }
}

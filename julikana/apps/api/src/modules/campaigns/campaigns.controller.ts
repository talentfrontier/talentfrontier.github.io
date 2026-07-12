import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CampaignStatus, SocialPlatform } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CampaignsService } from "./campaigns.service";

class CreateCampaignDto {
  @IsString() name: string;
  @IsString() objective: string;
  @IsOptional() @IsInt() @Min(0) budgetCents?: number;
  @IsOptional() @IsArray() @IsEnum(SocialPlatform, { each: true }) platforms?: SocialPlatform[];
  @IsOptional() @IsObject() audience?: object;
  @IsOptional() @Type(() => Date) @IsDate() startAt?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endAt?: Date;
}

class StatusDto {
  @IsEnum(CampaignStatus) status: CampaignStatus;
}

@ApiTags("campaigns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.campaigns.list(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.get(user.organizationId, id);
  }

  @Post()
  @Roles("OWNER", "MANAGER", "MARKETING")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.organizationId, dto);
  }

  @Patch(":id/status")
  @Roles("OWNER", "MANAGER", "MARKETING")
  setStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: StatusDto) {
    return this.campaigns.setStatus(user.organizationId, id, dto.status);
  }
}

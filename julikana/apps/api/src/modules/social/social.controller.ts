import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SocialPlatform } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SocialService } from "./social.service";

class ConnectDto {
  @IsEnum(SocialPlatform) platform: SocialPlatform;
  @IsString() externalId: string;
  @IsString() displayName: string;
  @IsString() accessToken: string;
  @IsOptional() @IsString() refreshToken?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
}

class ScheduleDto {
  @IsString() contentItemId: string;
  @IsString() socialAccountId: string;
  @IsOptional() @Type(() => Date) @IsDate() scheduledFor?: Date;
}

@ApiTags("social")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("social")
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get("accounts")
  accounts(@CurrentUser() user: AuthUser) {
    return this.social.listAccounts(user.organizationId);
  }

  /**
   * Finalizes a platform OAuth flow. The web app completes the provider
   * dialog and posts the resulting token here for encrypted storage.
   */
  @Post("accounts")
  @Roles("OWNER", "MANAGER", "MARKETING")
  connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectDto) {
    return this.social.connectAccount(user.organizationId, dto);
  }

  @Delete("accounts/:id")
  @Roles("OWNER", "MANAGER")
  disconnect(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.social.disconnect(user.organizationId, id);
  }

  @Get("scheduled")
  scheduled(@CurrentUser() user: AuthUser) {
    return this.social.listScheduled(user.organizationId);
  }

  @Post("schedule")
  @Roles("OWNER", "MANAGER", "MARKETING")
  schedule(@CurrentUser() user: AuthUser, @Body() dto: ScheduleDto) {
    return this.social.schedulePost(user.organizationId, dto);
  }

  @Post("sync-followers")
  sync(@CurrentUser() user: AuthUser) {
    return this.social.syncFollowers(user.organizationId);
  }
}

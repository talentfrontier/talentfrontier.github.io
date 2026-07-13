import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrgRole } from "@prisma/client";
import { IsEmail, IsEnum, IsIn, IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { OrganizationsService } from "./organizations.service";

class UpdateOrgDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() brandVoice?: object;
  /** "en" | "sw" | "sheng" | "sw-sheng" — Domo's output language. */
  @IsOptional() @IsIn(["en", "sw", "sheng", "sw-sheng"]) locale?: string;
  @IsOptional() @IsObject() persona?: object;
  @IsOptional() @IsString() emailSenderName?: string;
  @IsOptional() @IsString() emailSenderAddress?: string;
}

class InviteDto {
  @IsEmail() email: string;
  @IsEnum(OrgRole) role: OrgRole;
}

@ApiTags("organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("organization")
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.orgs.get(user.organizationId);
  }

  @Patch()
  @Roles("OWNER", "MANAGER")
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrgDto) {
    return this.orgs.update(user.organizationId, dto);
  }

  @Post("members")
  @Roles("OWNER", "MANAGER")
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteDto) {
    return this.orgs.invite(user.organizationId, dto.email, dto.role);
  }

  @Delete("members/:userId")
  @Roles("OWNER", "MANAGER")
  remove(@CurrentUser() user: AuthUser, @Param("userId") userId: string) {
    return this.orgs.removeMember(user.organizationId, userId);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/superadmin.guard";
import { ConnectorsService } from "./connectors.service";

class UpsertConnectorDto {
  @IsString() key: string;
  @IsString() displayName: string;
  @IsString() category: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() credentials?: Record<string, string>;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

class ToggleDto {
  @IsBoolean() enabled: boolean;
}

@ApiTags("connectors")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("connectors")
export class ConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  /** Any signed-in user can see which connectors are AVAILABLE (no secrets). */
  @Get("available")
  available() {
    return this.connectors.listEnabledForOrg();
  }

  // ── Super-admin only (platform owner) ───────────────────────────

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: "Owner-only: list all connectors + credential status" })
  list() {
    return this.connectors.listForAdmin();
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: "Owner-only: add or update a connector (incl. custom apps)" })
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertConnectorDto) {
    return this.connectors.upsert(dto, user.id);
  }

  @Patch(":key/enabled")
  @UseGuards(SuperAdminGuard)
  toggle(@Param("key") key: string, @Body() dto: ToggleDto) {
    return this.connectors.setEnabled(key, dto.enabled);
  }
}

import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { KnowledgeSourceType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BrandService } from "./brand.service";

class AddSourceDto {
  @IsEnum(KnowledgeSourceType) type: KnowledgeSourceType;
  @IsString() name: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() storageKey?: string;
}

@ApiTags("brand-training")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("brand/sources")
export class BrandController {
  constructor(private readonly brand: BrandService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.brand.list(user.organizationId);
  }

  @Post()
  @Roles("OWNER", "MANAGER", "MARKETING")
  @ApiOperation({ summary: "Upload a PDF/site/price list for Domo to learn from" })
  add(@CurrentUser() user: AuthUser, @Body() dto: AddSourceDto) {
    return this.brand.addSource(user.organizationId, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.brand.remove(user.organizationId, id);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MediaKind } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "./storage.service";

class PresignDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

class RegisterAssetDto {
  @IsEnum(MediaKind) kind: MediaKind;
  @IsString() url: string;
  @IsString() storageKey: string;
  @IsString() mimeType: string;
  @IsOptional() @IsInt() sizeBytes?: number;
}

@ApiTags("media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media")
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("presign")
  @ApiOperation({ summary: "Get a direct-upload URL for images/videos/documents" })
  presign(@CurrentUser() user: AuthUser, @Body() dto: PresignDto) {
    return this.storage.createUploadTarget(user.organizationId, dto.filename, dto.contentType);
  }

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterAssetDto) {
    return this.prisma.mediaAsset.create({
      data: { ...dto, organizationId: user.organizationId, generator: "upload" },
    });
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("kind") kind?: MediaKind) {
    return this.prisma.mediaAsset.findMany({
      where: { organizationId: user.organizationId, ...(kind && { kind }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

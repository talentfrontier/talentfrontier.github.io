import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ContentStatus, ContentType } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ContentService } from "./content.service";

class UpdateContentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) hashtags?: string[];
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
}

@ApiTags("content")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() page: PaginationDto,
    @Query("type") type?: ContentType,
    @Query("status") status?: ContentStatus,
  ) {
    return this.content.list(user.organizationId, page, { type, status });
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.content.get(user.organizationId, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(user.organizationId, id, dto);
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.content.approve(user.organizationId, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.content.delete(user.organizationId, id);
  }
}

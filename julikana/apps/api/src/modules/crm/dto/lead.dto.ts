import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { FunnelStage, SocialPlatform } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateLeadDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty({ example: "facebook_comment" }) @IsString() source: string;
  @ApiPropertyOptional({ enum: SocialPlatform })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
}

export class MoveStageDto {
  @ApiProperty({ enum: FunnelStage }) @IsEnum(FunnelStage) stage: FunnelStage;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class NoteDto {
  @ApiProperty() @IsString() body: string;
}

export class FollowUpDto {
  @ApiProperty() @Type(() => Date) @IsDate() dueAt: Date;
  @ApiProperty() @IsString() note: string;
}

import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { OutreachService } from "./outreach.service";

class CreateCampaignDto {
  @IsString() name: string;
  @IsString() channel: string;
  @IsString() triggerSource: string;
  @IsString() messageTemplate: string;
  @IsOptional() @IsArray() followUpSteps?: { afterHours: number; template: string }[];
  @IsOptional() @IsInt() dailyCap?: number;
}

class AddProspectDto {
  @IsString() externalUserId: string;
  @IsOptional() @IsString() displayName?: string;
  @IsString() interactionProof: string;
}

@ApiTags("outreach")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("outreach")
export class OutreachController {
  constructor(private readonly outreach: OutreachService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.outreach.list(user.organizationId);
  }

  @Post()
  @Roles("OWNER", "MANAGER", "MARKETING", "SALES")
  @ApiOperation({ summary: "Create an opt-in/interaction-based outreach campaign" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.outreach.createCampaign(user.organizationId, dto);
  }

  @Post(":campaignId/prospects")
  @Roles("OWNER", "MANAGER", "MARKETING", "SALES")
  @ApiOperation({ summary: "Enrol someone who already interacted (proof required)" })
  addProspect(@Param("campaignId") campaignId: string, @Body() dto: AddProspectDto) {
    return this.outreach.addProspect(campaignId, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailCampaignsService } from "./campaigns.service";
import { ContactsService } from "./contacts.service";

class ImportDto {
  @IsString() @MaxLength(120) listName: string;
  @IsBoolean() consentConfirmed: boolean;
  @IsOptional() @IsString() csv?: string;
  @IsOptional() @IsArray() rows?: Record<string, unknown>[];
}

class DraftDto {
  @IsString() goal: string;
  @IsOptional() @IsString() angle?: string;
  @IsOptional() @IsString() listId?: string;
}

class CreateCampaignDto {
  @IsString() subject: string;
  @IsString() bodyHtml: string;
  @IsOptional() @IsString() preheader?: string;
  @IsOptional() @IsString() listId?: string;
}

@ApiTags("email")
@Controller("email")
export class EmailController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly campaigns: EmailCampaignsService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Lists & import ──────────────────────────────────────────────

  @Get("lists")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  lists(@CurrentUser() user: AuthUser) {
    return this.contacts.lists(user.organizationId);
  }

  @Post("lists/import")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER", "MARKETING")
  @ApiOperation({
    summary: "Upload a contact list (Excel-as-CSV or parsed rows). Requires opt-in consent.",
  })
  import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    return this.contacts.import(user.organizationId, dto);
  }

  @Get("lists/:id/contacts")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  contacts_(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.contacts.contacts(user.organizationId, id);
  }

  // ── Campaigns ───────────────────────────────────────────────────

  @Get("campaigns")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCampaigns(@CurrentUser() user: AuthUser) {
    return this.campaigns.list(user.organizationId);
  }

  @Post("campaigns")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER", "MARKETING")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.organizationId, dto);
  }

  @Post("campaigns/draft")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER", "MARKETING")
  @ApiOperation({ summary: "Have Domo write a copywriter-grade email for an opted-in list" })
  draft(@CurrentUser() user: AuthUser, @Body() dto: DraftDto) {
    return this.campaigns.draftWithDomo(user.organizationId, dto);
  }

  @Post("campaigns/:id/send")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER", "MARKETING")
  @ApiOperation({ summary: "Send to the opted-in list (throttled, footer + suppression applied)" })
  send(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.send(user.organizationId, id);
  }

  // ── Public unsubscribe (no auth — link lands here from the footer) ─

  @Get("unsubscribe/:token")
  @ApiExcludeEndpoint()
  async unsubscribe(@Param("token") token: string, @Res() res: Response) {
    const contact = await this.prisma.emailContact.findUnique({
      where: { unsubscribeToken: token },
    });
    if (contact) {
      await this.prisma.$transaction([
        this.prisma.emailContact.update({
          where: { id: contact.id },
          data: { status: "UNSUBSCRIBED" },
        }),
        this.prisma.emailSuppression.upsert({
          where: {
            organizationId_email: { organizationId: contact.organizationId, email: contact.email },
          },
          update: { reason: "unsubscribe" },
          create: {
            organizationId: contact.organizationId,
            email: contact.email,
            reason: "unsubscribe",
          },
        }),
      ]);
    }
    res
      .status(200)
      .send(
        "<html><body style='font-family:system-ui;padding:40px;text-align:center'>" +
          "<h2>You've been unsubscribed</h2><p>You won't receive any more emails from this sender.</p>" +
          "</body></html>",
      );
  }
}

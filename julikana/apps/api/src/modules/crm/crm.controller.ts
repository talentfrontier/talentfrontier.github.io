import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FunnelStage } from "@prisma/client";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CrmService } from "./crm.service";
import { CreateLeadDto, FollowUpDto, MoveStageDto, NoteDto, UpdateLeadDto } from "./dto/lead.dto";
import { FunnelService } from "./funnel.service";

@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leads")
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly funnel: FunnelService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() page: PaginationDto,
    @Query("stage") stage?: FunnelStage,
    @Query("search") search?: string,
  ) {
    return this.crm.list(user.organizationId, page, { stage, search });
  }

  @Get("funnel")
  breakdown(@CurrentUser() user: AuthUser) {
    return this.funnel.funnelBreakdown(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.crm.get(user.organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.crm.create(user.organizationId, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.crm.update(user.organizationId, id, dto);
  }

  @Post(":id/stage")
  moveStage(@Param("id") id: string, @Body() dto: MoveStageDto) {
    return this.funnel.moveLead(id, dto.stage, { reason: dto.reason });
  }

  @Post(":id/notes")
  note(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.crm.addNote(id, dto.body, user.id);
  }

  @Post(":id/follow-ups")
  followUp(@Param("id") id: string, @Body() dto: FollowUpDto) {
    return this.crm.addFollowUp(id, dto.dueAt, dto.note);
  }
}

import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";
import { IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { DomoOrchestrator } from "./agents/domo.orchestrator";
import { AgentRegistry } from "./agents/agent.registry";
import { MemoryService } from "./memory.service";

class InstructDto {
  @IsString() instruction: string;
}

class OnboardDto {
  @IsString() description: string;
}

@ApiTags("ai")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(
    private readonly domo: DomoOrchestrator,
    private readonly registry: AgentRegistry,
    private readonly memory: MemoryService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("instruct")
  @ApiOperation({ summary: 'Tell Domo what you need, e.g. "Promote my new laptop"' })
  instruct(@CurrentUser() user: AuthUser, @Body() dto: InstructDto) {
    return this.domo.dispatch(user.organizationId, dto.instruction);
  }

  @Post("onboard")
  @ApiOperation({ summary: 'Teach Domo the business: "I own a real estate company"' })
  onboard(@CurrentUser() user: AuthUser, @Body() dto: OnboardDto) {
    return this.domo.onboardBusiness(user.organizationId, dto.description);
  }

  @Get("agents")
  agents() {
    return this.registry.catalogue();
  }

  @Get("tasks")
  tasks(@CurrentUser() user: AuthUser, @Query("status") status?: TaskStatus) {
    return this.prisma.agentTask.findMany({
      where: { organizationId: user.organizationId, ...(status && { status }) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Get("suggestions")
  suggestions(@CurrentUser() user: AuthUser) {
    return this.prisma.aiSuggestion.findMany({
      where: { organizationId: user.organizationId, dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  @Post("suggestions/:id/dismiss")
  dismiss(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.prisma.aiSuggestion.update({
      where: { id, organizationId: user.organizationId } as never,
      data: { dismissed: true },
    });
  }

  @Get("memory")
  @ApiOperation({ summary: "Inspect what Domo remembers about the business" })
  getMemory(@CurrentUser() user: AuthUser, @Query("q") query?: string) {
    return this.memory.getMemory(user.organizationId, query);
  }
}

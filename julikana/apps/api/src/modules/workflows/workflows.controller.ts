import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WorkflowDefinition } from "./workflow.types";
import { WorkflowsService } from "./workflows.service";

class CreateWorkflowDto {
  @IsString() name: string;
  @IsObject() definition: WorkflowDefinition;
}

class UpdateWorkflowDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() definition?: WorkflowDefinition;
}

@ApiTags("workflows")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workflows.list(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.workflows.get(user.organizationId, id);
  }

  @Post()
  @Roles("OWNER", "MANAGER", "MARKETING")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkflowDto) {
    return this.workflows.create(user.organizationId, dto.name, dto.definition);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER", "MARKETING")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflows.update(user.organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.workflows.delete(user.organizationId, id);
  }
}

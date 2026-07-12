import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthUser) {
    return this.analytics.dashboardSummary(user.organizationId);
  }

  @Get("timeseries")
  timeSeries(@CurrentUser() user: AuthUser, @Query("days") days?: string) {
    return this.analytics.timeSeries(user.organizationId, days ? Number(days) : 30);
  }

  @Get("best-posts")
  bestPosts(@CurrentUser() user: AuthUser) {
    return this.analytics.bestPosts(user.organizationId);
  }
}

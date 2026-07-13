import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { configuration } from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { CrmModule } from "./modules/crm/crm.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { ContentModule } from "./modules/content/content.module";
import { MediaModule } from "./modules/media/media.module";
import { SocialModule } from "./modules/social/social.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { BillingModule } from "./modules/billing/billing.module";
import { BrandModule } from "./modules/brand/brand.module";
import { AiModule } from "./modules/ai/ai.module";
import { ConnectorsModule } from "./modules/connectors/connectors.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { BoostModule } from "./modules/boost/boost.module";
import { AutopilotModule } from "./modules/autopilot/autopilot.module";
import { OutreachModule } from "./modules/outreach/outreach.module";
import { QueuesModule } from "./modules/queues/queues.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    QueuesModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CrmModule,
    ConversationsModule,
    ContentModule,
    MediaModule,
    SocialModule,
    CampaignsModule,
    WorkflowsModule,
    AnalyticsModule,
    NotificationsModule,
    BillingModule,
    BrandModule,
    AiModule,
    ConnectorsModule,
    PaymentsModule,
    BoostModule,
    AutopilotModule,
    OutreachModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

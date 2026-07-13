import { AgentKind, ContentType, FunnelStage, SocialPlatform } from "./enums";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  revenue: number;
  revenueDelta: number;
  leads: number;
  leadsDelta: number;
  conversations: number;
  conversationsDelta: number;
  scheduledPosts: number;
  aiTasksRunning: number;
  aiTasksCompleted: number;
  followers: { platform: SocialPlatform; count: number; delta: number }[];
  engagementRate: number;
}

export interface AiSuggestion {
  id: string;
  kind:
    | "caption"
    | "hashtags"
    | "posting_time"
    | "audience"
    | "trend"
    | "idea";
  title: string;
  body: string;
  createdAt: string;
}

export interface AgentTaskDto {
  id: string;
  agent: AgentKind;
  title: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  createdAt: string;
}

export interface LeadDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  platform?: SocialPlatform;
  score: number;
  stage: FunnelStage;
  assignedTo?: string;
  createdAt: string;
}

export interface ContentDraft {
  type: ContentType;
  platform?: SocialPlatform;
  headline?: string;
  body: string;
  hashtags: string[];
  mediaPrompts: string[];
  callToAction?: string;
}

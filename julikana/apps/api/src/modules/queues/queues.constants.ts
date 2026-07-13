export const QUEUE = {
  PUBLISH_POST: "publish-post",
  AGENT_TASK: "agent-task",
  WORKFLOW_RUN: "workflow-run",
  KNOWLEDGE_INGEST: "knowledge-ingest",
  MEDIA_GENERATION: "media-generation",
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

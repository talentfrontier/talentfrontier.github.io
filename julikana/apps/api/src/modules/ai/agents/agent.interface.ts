import { AgentKind } from "@prisma/client";

/** Everything an agent knows about the business it works for. */
export interface OrgMemory {
  organizationId: string;
  name: string;
  industry?: string;
  description?: string;
  brandVoice?: Record<string, unknown>;
  businessFacts?: Record<string, unknown>;
  knowledgeSnippets: string[];
  /** "en" | "sw" | "sheng" | "sw-sheng" — controls Domo's output language. */
  locale?: string;
  persona?: Record<string, unknown>;
}

export interface AgentInput {
  /** Natural-language instruction, e.g. "Promote my new laptop". */
  instruction: string;
  /** Structured parameters supplied by Domo or the API caller. */
  params?: Record<string, unknown>;
  /** Task row id, when the run is tracked. */
  taskId?: string;
}

export interface AgentResult {
  summary: string;
  output: Record<string, unknown>;
}

export interface JulikanaAgent {
  readonly kind: AgentKind;
  readonly description: string;
  run(memory: OrgMemory, input: AgentInput): Promise<AgentResult>;
}

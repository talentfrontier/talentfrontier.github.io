/**
 * Workflow definitions produced by the visual drag-and-drop builder.
 *
 * Example — "When someone comments 'Price' on Facebook":
 * {
 *   trigger: { type: "comment_keyword", config: { platform: "FACEBOOK", keyword: "price" } },
 *   nodes: [
 *     { id: "a", type: "reply_comment",   config: { text: "Sent you a DM!" } },
 *     { id: "b", type: "send_dm",         config: { text: "Here is our price list…" } },
 *     { id: "c", type: "add_to_crm",      config: { source: "facebook_comment" } },
 *     { id: "d", type: "send_whatsapp",   config: { template: "price_list" } },
 *     { id: "e", type: "schedule_follow_up", config: { afterHours: 24, note: "Follow up on price enquiry" } },
 *     { id: "f", type: "notify_team",     config: { message: "New price enquiry" } }
 *   ],
 *   edges: [
 *     { from: "trigger", to: "a" }, { from: "a", to: "b" }, { from: "b", to: "c" },
 *     { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" }
 *   ]
 * }
 */

export type TriggerType =
  | "comment_keyword"
  | "new_message"
  | "new_lead"
  | "stage_changed"
  | "schedule";

export type NodeType =
  | "reply_comment"
  | "send_dm"
  | "send_whatsapp"
  | "add_to_crm"
  | "move_stage"
  | "schedule_follow_up"
  | "notify_team"
  | "run_agent"
  | "delay";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  from: string; // node id or "trigger"
  to: string;
}

export interface WorkflowDefinition {
  trigger: { type: TriggerType; config: Record<string, unknown> };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface TriggerPayload {
  organizationId: string;
  leadId?: string;
  conversationId?: string;
  platform?: string;
  text?: string;
  authorExternalId?: string;
  [key: string]: unknown;
}

/** Topological execution order starting from the trigger. */
export function executionOrder(def: WorkflowDefinition): WorkflowNode[] {
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const order: WorkflowNode[] = [];
  const visited = new Set<string>();
  const queue = def.edges.filter((e) => e.from === "trigger").map((e) => e.to);
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (node) order.push(node);
    for (const edge of def.edges.filter((e) => e.from === id)) queue.push(edge.to);
  }
  return order;
}

import { executionOrder, WorkflowDefinition } from "./workflow.types";

const def: WorkflowDefinition = {
  trigger: { type: "comment_keyword", config: { keyword: "price" } },
  nodes: [
    { id: "a", type: "reply_comment", config: {} },
    { id: "b", type: "send_dm", config: {} },
    { id: "c", type: "add_to_crm", config: {} },
    { id: "orphan", type: "notify_team", config: {} },
  ],
  edges: [
    { from: "trigger", to: "a" },
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ],
};

describe("executionOrder", () => {
  it("orders nodes from the trigger outward", () => {
    expect(executionOrder(def).map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("skips orphan nodes not reachable from the trigger", () => {
    expect(executionOrder(def).find((n) => n.id === "orphan")).toBeUndefined();
  });

  it("handles branching without duplicates", () => {
    const branched: WorkflowDefinition = {
      ...def,
      edges: [
        { from: "trigger", to: "a" },
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "c" },
      ],
    };
    const ids = executionOrder(branched).map((n) => n.id);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("terminates on cycles", () => {
    const cyclic: WorkflowDefinition = {
      ...def,
      edges: [
        { from: "trigger", to: "a" },
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    };
    expect(executionOrder(cyclic).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

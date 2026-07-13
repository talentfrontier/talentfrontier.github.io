"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";

interface Turn {
  role: "user" | "domo";
  text: string;
  tasks?: { agent: string; title: string }[];
}

const EXAMPLES = [
  "Promote my new laptop",
  "Make a TikTok video about our weekend offer",
  "Write a blog article about buying your first home",
  "Give me a performance report",
];

export default function DomoPage() {
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "domo",
      text: "Hi, I'm Domo — your marketing department. Tell me about your business or give me a job. I'll plan it, delegate to my specialist agents, and report back.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api<{
        understanding: string;
        tasks: { agent: string; title: string }[];
      }>("/ai/instruct", { method: "POST", body: JSON.stringify({ instruction: text }) });
      setTurns((t) => [
        ...t,
        { role: "domo", text: `On it. ${res.understanding}`, tasks: res.tasks },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "domo",
          text: "I planned this locally (demo mode — no API connected): I'd brief the Content Creator for platform posts, the Image Creator for visuals, and the Social Media Manager to schedule everything at your best posting times.",
          tasks: [
            { agent: "CONTENT_CREATOR", title: "Create platform-tailored posts" },
            { agent: "IMAGE_CREATOR", title: "Generate ad visuals" },
            { agent: "SOCIAL_MEDIA_MANAGER", title: "Schedule at best times" },
          ],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title="Ask Domo" />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col p-6">
        <div className="flex-1 space-y-4">
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex"}>
              <div
                className={
                  turn.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-md bg-[var(--series-1)] px-4 py-2.5 text-sm text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-ink shadow-sm ring-1 ring-[var(--ring)]"
                }
              >
                <p className="leading-relaxed">{turn.text}</p>
                {turn.tasks && (
                  <ul className="mt-2 space-y-1 border-t pt-2">
                    {turn.tasks.map((task, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-ink-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--series-2)]" />
                        <span className="font-medium">{task.agent.replaceAll("_", " ").toLowerCase()}</span>
                        — {task.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 mt-6 bg-[var(--plane)] pb-2 pt-2">
          <div className="mb-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                className="rounded-full px-3 py-1 text-xs text-ink-2 ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]"
              >
                {ex}
              </button>
            ))}
          </div>
          <Card>
            <CardBody className="flex items-end gap-2 !p-3">
              <Textarea
                rows={2}
                value={input}
                placeholder='Try: "Promote my new laptop"'
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                className="!ring-0"
              />
              <Button onClick={() => send(input)} disabled={busy}>
                {busy ? "Planning…" : "Send"}
              </Button>
            </CardBody>
          </Card>
        </div>
      </main>
    </>
  );
}

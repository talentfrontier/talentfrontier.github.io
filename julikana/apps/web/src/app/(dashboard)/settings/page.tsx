"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const PLATFORMS = [
  { name: "Facebook", connected: true },
  { name: "Instagram", connected: true },
  { name: "Messenger", connected: true },
  { name: "WhatsApp Business", connected: true },
  { name: "TikTok", connected: true },
  { name: "YouTube", connected: false },
  { name: "LinkedIn", connected: false },
  { name: "X (Twitter)", connected: false },
  { name: "Pinterest", connected: false },
  { name: "Threads", connected: false },
];

const PLANS = [
  { name: "Starter", price: "$29", note: "3 accounts · 300 AI posts/mo" },
  { name: "Professional", price: "$99", note: "8 accounts · 2,000 AI posts/mo", current: true },
  { name: "Business", price: "$299", note: "20 accounts · 10,000 AI posts/mo" },
  { name: "Enterprise", price: "Custom", note: "Unlimited · SSO · SLA" },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="grid gap-4 p-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Connected platforms" subtitle="Domo publishes and replies through these accounts" />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-lg bg-[var(--plane)] px-3 py-2.5">
                <span className="text-sm text-ink">{p.name}</span>
                {p.connected ? (
                  <Badge tone="good">connected</Badge>
                ) : (
                  <Button size="sm" variant="secondary">Connect</Button>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Brand training" subtitle="Domo learns from your documents" />
            <CardBody className="space-y-2 text-sm text-ink-2">
              <div className="flex items-center justify-between">
                <span>Price list (July).xlsx</span>
                <Badge tone="good">learned</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Company website</span>
                <Badge tone="good">learned</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>FAQ.pdf</span>
                <Badge tone="brand">ingesting…</Badge>
              </div>
              <Button variant="secondary" className="mt-2 w-full">Upload document</Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Security" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Two-factor authentication</span>
                <Badge tone="good">enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">API keys</span>
                <Button size="sm" variant="secondary">Manage</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Audit log</span>
                <Button size="sm" variant="secondary">View</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <CardHeader title="Plan" subtitle="Usage-based limits, billed monthly via Stripe" />
          <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.current
                    ? "rounded-xl p-4 ring-2 ring-[var(--series-1)]"
                    : "rounded-xl p-4 ring-1 ring-[var(--ring)]"
                }
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{plan.name}</p>
                  {plan.current && <Badge tone="brand">current</Badge>}
                </div>
                <p className="mt-1 text-xl font-semibold text-ink">
                  {plan.price}
                  {plan.price !== "Custom" && <span className="text-xs font-normal text-muted">/mo</span>}
                </p>
                <p className="mt-1 text-xs text-muted">{plan.note}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

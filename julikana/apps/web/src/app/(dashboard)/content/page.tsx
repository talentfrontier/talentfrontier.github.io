"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockContent } from "@/lib/mock-data";

const STATUS_TONE = {
  DRAFT: "neutral",
  GENERATING: "brand",
  READY: "brand",
  APPROVED: "good",
  PUBLISHED: "good",
  FAILED: "critical",
} as const;

const TYPE_ICON: Record<string, string> = {
  POST: "▤",
  CAROUSEL: "⧉",
  REEL: "▶",
  SHORT: "▶",
  TIKTOK_VIDEO: "▶",
  VIDEO: "▶",
  BLOG_ARTICLE: "✎",
  EMAIL_CAMPAIGN: "✉",
  POSTER: "◨",
};

export default function ContentPage() {
  const { data } = useData<{ items: typeof mockContent }>("/content", {
    items: mockContent,
  });
  const items = Array.isArray(data) ? data : data.items;

  return (
    <>
      <Topbar title="Content library" />
      <main className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardBody className="!pt-5">
              <div className="flex items-start justify-between">
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--plane)] text-ink-2">
                  {TYPE_ICON[item.type] ?? "▤"}
                </span>
                <Badge tone={STATUS_TONE[item.status as keyof typeof STATUS_TONE]}>
                  {item.status.toLowerCase()}
                </Badge>
              </div>
              <h3 className="mt-3 text-sm font-medium leading-snug text-ink">{item.title}</h3>
              <p className="mt-1 text-[11px] text-muted">
                {item.type.replaceAll("_", " ").toLowerCase()} · created by Domo
              </p>
            </CardBody>
          </Card>
        ))}
      </main>
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";

interface ImportResult {
  listId: string;
  imported: number;
  skippedSuppressed: number;
  invalid: number;
}

export default function EmailPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");
  const [listName, setListName] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Domo draft state
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<{ subject: string; bodyHtml: string } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setListName((n) => n || file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Parses .xlsx, .xls and .csv alike — headers become object keys.
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setRows(parsed);
    };
    reader.readAsBinaryString(file);
  }

  async function doImport() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<ImportResult>("/email/lists/import", {
        method: "POST",
        body: JSON.stringify({ listName, consentConfirmed: consent, rows }),
      });
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("consent")
          ? "Please tick the consent box — these must be people who opted in."
          : "Import failed. Connect the API, or check your file has an 'email' column.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function draftWithDomo() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ subject: string; bodyHtml: string }>("/email/campaigns/draft", {
        method: "POST",
        body: JSON.stringify({ goal, listId: result?.listId }),
      });
      setDraft(res);
    } catch {
      setDraft({
        subject: "A quick story I think you'll like…",
        bodyHtml:
          "<p>Hi {{name}},</p><p>(Demo preview — connect the API and add an AI key and Domo will write a real copywriter-grade email here, tuned to your business and market.)</p>",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title="Email marketing" />
      <main className="grid gap-4 p-6 xl:grid-cols-2">
        {/* Upload */}
        <Card>
          <CardHeader
            title="Upload your list"
            subtitle="Excel (.xlsx) or CSV with an 'email' column. Names/other columns become merge fields."
          />
          <CardBody className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFile}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {fileName || "Choose Excel / CSV file"}
            </Button>
            {rows.length > 0 && (
              <p className="text-xs text-muted">
                Read {rows.length} rows. First: {JSON.stringify(rows[0]).slice(0, 80)}…
              </p>
            )}
            <Input
              placeholder="List name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
            <label className="flex items-start gap-2 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I confirm these contacts <b>opted in</b> to receive email from this business. (Required —
                emailing purchased or scraped lists is illegal and gets your domain blacklisted.)
              </span>
            </label>
            {error && <p className="text-xs text-[var(--status-critical)]">{error}</p>}
            <Button onClick={doImport} disabled={busy || !rows.length || !listName || !consent}>
              {busy ? "Importing…" : "Import list"}
            </Button>
            {result && (
              <div className="rounded-lg bg-[var(--plane)] p-3 text-sm">
                <Badge tone="good">Imported {result.imported}</Badge>{" "}
                <span className="text-muted">
                  · {result.skippedSuppressed} suppressed · {result.invalid} invalid skipped
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Domo draft */}
        <Card>
          <CardHeader
            title="Let Domo write it"
            subtitle="Copywriter-grade email — hook, story, one CTA — in your brand voice."
          />
          <CardBody className="space-y-3">
            <Textarea
              rows={3}
              placeholder='What is this email about? e.g. "Launch our new 2-bedroom listings in Kilimani"'
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <Button onClick={draftWithDomo} disabled={busy || !goal}>
              {busy ? "Writing…" : "✦ Draft with Domo"}
            </Button>
            {draft && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted">Subject</p>
                <p className="mb-2 text-sm font-medium text-ink">{draft.subject}</p>
                <div
                  className="prose-sm max-w-none text-sm text-ink-2"
                  dangerouslySetInnerHTML={{ __html: draft.bodyHtml }}
                />
                <p className="mt-3 text-[11px] text-muted">
                  An unsubscribe link + your address are added automatically before sending, and
                  sending is throttled for deliverability.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

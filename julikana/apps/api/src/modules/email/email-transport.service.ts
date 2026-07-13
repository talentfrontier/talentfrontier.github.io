import { Injectable, Logger } from "@nestjs/common";

export interface OutgoingEmail {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

/**
 * Provider-agnostic email transport. Configure with EMAIL_PROVIDER =
 * resend | sendgrid | log (default). All are fetch-based; no SMTP client
 * dependency. The `log` provider is used when nothing is configured so the
 * app runs in demo without actually sending.
 *
 * Whatever provider is used, sender-domain authentication (SPF/DKIM/DMARC)
 * must be set up in that provider's dashboard — that, plus warm-up and low
 * complaint rates, is what lands mail in the Primary tab. There is no header
 * trick that substitutes for sender reputation.
 */
@Injectable()
export class EmailTransportService {
  private readonly logger = new Logger(EmailTransportService.name);
  private readonly provider = process.env.EMAIL_PROVIDER ?? "log";

  isConfigured(): boolean {
    if (this.provider === "resend") return !!process.env.RESEND_API_KEY;
    if (this.provider === "sendgrid") return !!process.env.SENDGRID_API_KEY;
    return true; // log provider always "works"
  }

  async send(email: OutgoingEmail): Promise<SendResult> {
    try {
      switch (this.provider) {
        case "resend":
          return await this.sendResend(email);
        case "sendgrid":
          return await this.sendSendgrid(email);
        default:
          this.logger.log(`[email:log] → ${email.to} :: ${email.subject}`);
          return { ok: true, providerId: "log" };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async sendResend(email: OutgoingEmail): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: email.fromName ? `${email.fromName} <${email.from}>` : email.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        headers: email.headers,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message ?? `Resend ${res.status}` };
    return { ok: true, providerId: data.id };
  }

  private async sendSendgrid(email: OutgoingEmail): Promise<SendResult> {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }], headers: email.headers }],
        from: { email: email.from, name: email.fromName },
        subject: email.subject,
        content: [{ type: "text/html", value: email.html }],
      }),
    });
    if (!res.ok) return { ok: false, error: `SendGrid ${res.status}: ${await res.text()}` };
    return { ok: true, providerId: res.headers.get("x-message-id") ?? undefined };
  }
}

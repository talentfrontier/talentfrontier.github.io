export interface SenderIdentity {
  name: string;
  /** Physical mailing address — legally required in bulk commercial email. */
  address: string;
}

/**
 * Appends the legally-required footer to every email: a working unsubscribe
 * link and the sender's physical address (CAN-SPAM §5; GDPR/PECR expect an
 * easy opt-out too). Sending bulk mail without these is illegal, so the send
 * pipeline refuses to dispatch a body that hasn't been through here.
 */
export function applyComplianceFooter(
  bodyHtml: string,
  opts: { unsubscribeUrl: string; sender: SenderIdentity },
): string {
  const footer = `
  <hr style="border:none;border-top:1px solid #e1e0d9;margin:32px 0 16px" />
  <p style="font-size:12px;color:#898781;line-height:1.5;font-family:system-ui,sans-serif">
    You are receiving this because you opted in with ${escapeHtml(opts.sender.name)}.<br />
    ${escapeHtml(opts.sender.address)}<br />
    <a href="${opts.unsubscribeUrl}" style="color:#898781">Unsubscribe</a>
  </p>`;
  return `${bodyHtml}\n${footer}`;
}

/** Very small merge-field substitution: {{name}}, {{company}}, … */
export function mergeFields(
  template: string,
  contact: { name?: string | null; email: string; fields?: unknown },
): string {
  const fieldObj =
    contact.fields && typeof contact.fields === "object" && !Array.isArray(contact.fields)
      ? (contact.fields as Record<string, unknown>)
      : {};
  const data: Record<string, string> = {
    name: contact.name ?? "there",
    email: contact.email,
    ...Object.fromEntries(
      Object.entries(fieldObj).map(([k, v]) => [k.toLowerCase(), String(v)]),
    ),
  };
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key: string) =>
    key.toLowerCase() in data ? data[key.toLowerCase()] : "",
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

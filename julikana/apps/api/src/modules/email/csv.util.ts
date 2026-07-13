export interface ParsedContact {
  email: string;
  name?: string;
  fields: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses uploaded contact data. Accepts CSV text (comma or semicolon
 * delimited, quoted fields supported) — the format an Excel sheet exports to
 * via "Save as CSV". The web/mobile client may also parse .xlsx locally and
 * POST rows as JSON; both land in the same `ParsedContact[]`.
 *
 * The first row is treated as headers; a column named (case-insensitively)
 * "email" is required. "name"/"first name"/"full name" maps to name; every
 * other column becomes a merge field.
 */
export function parseCsvContacts(csv: string): {
  contacts: ParsedContact[];
  invalid: string[];
} {
  const rows = splitRows(csv);
  if (!rows.length) return { contacts: [], invalid: [] };

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const emailIdx = headers.findIndex((h) => h === "email" || h === "e-mail" || h === "email address");
  const nameIdx = headers.findIndex((h) => ["name", "full name", "first name", "contact"].includes(h));
  if (emailIdx === -1) {
    throw new Error('No "email" column found in the uploaded file');
  }

  const contacts: ParsedContact[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const email = (cells[emailIdx] ?? "").trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      invalid.push(email);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);

    const fields: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (i === emailIdx || i === nameIdx || !h) return;
      const v = (cells[i] ?? "").trim();
      if (v) fields[h] = v;
    });

    contacts.push({
      email,
      name: nameIdx !== -1 ? (cells[nameIdx] ?? "").trim() || undefined : undefined,
      fields,
    });
  }
  return { contacts, invalid };
}

/** Normalizes an array of row objects (from client-side xlsx parsing). */
export function normalizeRows(
  rows: Record<string, unknown>[],
): { contacts: ParsedContact[]; invalid: string[] } {
  const contacts: ParsedContact[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const entries = Object.entries(row);
    const emailEntry = entries.find(([k]) => /^e-?mail( address)?$/i.test(k));
    const email = String(emailEntry?.[1] ?? "").trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      invalid.push(email);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);

    const nameEntry = entries.find(([k]) => /^(name|full name|first name|contact)$/i.test(k));
    const fields: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (k === emailEntry?.[0] || k === nameEntry?.[0]) continue;
      const s = String(v ?? "").trim();
      if (s) fields[k.toLowerCase()] = s;
    }
    contacts.push({
      email,
      name: nameEntry ? String(nameEntry[1] ?? "").trim() || undefined : undefined,
      fields,
    });
  }
  return { contacts, invalid };
}

/** Minimal RFC-4180-ish CSV splitter: handles quotes, commas, semicolons, CRLF. */
function splitRows(csv: string): string[][] {
  const delimiter = detectDelimiter(csv);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // handled by the \n branch
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length));
}

function detectDelimiter(csv: string): string {
  const firstLine = csv.split(/\r?\n/)[0] ?? "";
  return (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

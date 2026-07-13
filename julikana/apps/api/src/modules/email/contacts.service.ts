import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeRows, parseCsvContacts, ParsedContact } from "./csv.util";

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  lists(organizationId: string) {
    return this.prisma.emailList.findMany({
      where: { organizationId },
      include: { _count: { select: { contacts: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Import an uploaded contact list. `consentConfirmed` is mandatory — the
   * uploader must attest these people opted in, which is the legal basis for
   * emailing them. Anything already on the suppression list (past
   * unsubscribes/bounces) is skipped and never re-imported.
   */
  async import(
    organizationId: string,
    input: {
      listName: string;
      consentConfirmed: boolean;
      csv?: string;
      rows?: Record<string, unknown>[];
    },
  ) {
    if (!input.consentConfirmed) {
      throw new BadRequestException(
        "You must confirm these contacts opted in to receive email before importing.",
      );
    }
    let parsed: { contacts: ParsedContact[]; invalid: string[] };
    if (input.csv) parsed = parseCsvContacts(input.csv);
    else if (input.rows) parsed = normalizeRows(input.rows);
    else throw new BadRequestException("Provide either csv text or rows");

    if (!parsed.contacts.length) {
      throw new BadRequestException("No valid email addresses found in the file");
    }

    const list = await this.prisma.emailList.create({
      data: { organizationId, name: input.listName, consentConfirmed: true },
    });

    const suppressed = new Set(
      (
        await this.prisma.emailSuppression.findMany({
          where: { organizationId },
          select: { email: true },
        })
      ).map((s) => s.email),
    );

    let imported = 0;
    let skippedSuppressed = 0;
    for (const c of parsed.contacts) {
      if (suppressed.has(c.email)) {
        skippedSuppressed++;
        continue;
      }
      await this.prisma.emailContact.upsert({
        where: { organizationId_email: { organizationId, email: c.email } },
        update: { listId: list.id, name: c.name ?? undefined, fields: c.fields as never },
        create: {
          organizationId,
          listId: list.id,
          email: c.email,
          name: c.name,
          fields: c.fields as never,
          source: "import",
        },
      });
      imported++;
    }

    return {
      listId: list.id,
      imported,
      skippedSuppressed,
      invalid: parsed.invalid.length,
    };
  }

  contacts(organizationId: string, listId: string) {
    return this.prisma.emailContact.findMany({
      where: { organizationId, listId },
      take: 500,
      orderBy: { createdAt: "desc" },
    });
  }

  /** Manual suppression (e.g. a complaint reported out-of-band). */
  async suppress(organizationId: string, email: string, reason = "manual") {
    const lower = email.toLowerCase();
    await this.prisma.$transaction([
      this.prisma.emailSuppression.upsert({
        where: { organizationId_email: { organizationId, email: lower } },
        update: { reason },
        create: { organizationId, email: lower, reason },
      }),
      this.prisma.emailContact.updateMany({
        where: { organizationId, email: lower },
        data: { status: "UNSUBSCRIBED" },
      }),
    ]);
    return { suppressed: lower };
  }
}

import { BadRequestException, Injectable } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * PCI note: this service NEVER receives or stores a raw card number, expiry
 * or CVV. The client collects the card with Stripe Elements / SDK, which
 * returns a PaymentMethod TOKEN; we store only that token plus the safe,
 * display-only brand/last4 that Stripe echoes back. CVV is never persisted
 * by anyone — that is a hard PCI-DSS rule.
 *
 * M-Pesa needs no card at all: we store only the paying phone number.
 */
@Injectable()
export class PaymentMethodsService {
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { organizationId },
      // Only display-safe fields leave the service.
      select: {
        id: true,
        provider: true,
        label: true,
        cardBrand: true,
        cardLast4: true,
        cardExpMonth: true,
        cardExpYear: true,
        mpesaPhone: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Start adding a card: returns a Stripe SetupIntent client secret. The
   * client confirms it with the card details — which go straight to Stripe,
   * never to our servers.
   */
  async createCardSetupIntent(organizationId: string) {
    if (!this.stripe) throw new BadRequestException("Card payments not configured");
    const customerId = await this.ensureStripeCustomer(organizationId);
    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session", // lets Domo reuse it later without the user present
    });
    return { clientSecret: intent.client_secret };
  }

  /** After the client confirms the SetupIntent, persist the TOKEN only. */
  async saveCardFromSetupIntent(organizationId: string, paymentMethodId: string, makeDefault: boolean) {
    if (!this.stripe) throw new BadRequestException("Card payments not configured");
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    const card = pm.card;
    if (!card) throw new BadRequestException("Not a card payment method");

    if (makeDefault) await this.clearDefault(organizationId);
    return this.prisma.paymentMethod.create({
      data: {
        organizationId,
        provider: PaymentProvider.STRIPE,
        label: `${card.brand.toUpperCase()} •••• ${card.last4}`,
        stripePaymentMethodId: pm.id,
        stripeCustomerId: pm.customer as string,
        cardBrand: card.brand,
        cardLast4: card.last4,
        cardExpMonth: card.exp_month,
        cardExpYear: card.exp_year,
        isDefault: makeDefault,
      },
      select: { id: true, label: true, isDefault: true },
    });
  }

  async addMpesa(organizationId: string, phone: string, makeDefault: boolean) {
    const normalized = this.normalizeKenyanPhone(phone);
    if (makeDefault) await this.clearDefault(organizationId);
    return this.prisma.paymentMethod.create({
      data: {
        organizationId,
        provider: PaymentProvider.MPESA,
        label: `M-Pesa ${normalized}`,
        mpesaPhone: normalized,
        isDefault: makeDefault,
      },
      select: { id: true, label: true, isDefault: true },
    });
  }

  async setDefault(organizationId: string, id: string) {
    await this.clearDefault(organizationId);
    return this.prisma.paymentMethod.update({
      where: { id, organizationId } as never,
      data: { isDefault: true },
      select: { id: true, isDefault: true },
    });
  }

  getDefault(organizationId: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { organizationId, isDefault: true },
    });
  }

  remove(organizationId: string, id: string) {
    return this.prisma.paymentMethod.delete({ where: { id, organizationId } as never });
  }

  private clearDefault(organizationId: string) {
    return this.prisma.paymentMethod.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private async ensureStripeCustomer(organizationId: string): Promise<string> {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { organizationId, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const customer = await this.stripe!.customers.create({
      name: org.name,
      metadata: { organizationId },
    });
    return customer.id;
  }

  private normalizeKenyanPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) return `254${digits.slice(1)}`;
    if (digits.startsWith("254")) return digits;
    if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
    return digits;
  }
}

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

  constructor(private readonly prisma: PrismaService) {}

  async createCheckoutSession(organizationId: string, tier: PlanTier) {
    if (!this.stripe) throw new BadRequestException("Billing not configured");
    const priceId = process.env[`STRIPE_PRICE_${tier}`];
    if (!priceId) throw new BadRequestException(`No Stripe price for ${tier}`);

    const subscription = await this.prisma.subscription.findUniqueOrThrow({
      where: { organizationId },
    });
    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const org = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
      });
      const customer = await this.stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await this.prisma.subscription.update({
        where: { organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.WEB_URL}/settings/billing?cancelled=true`,
      metadata: { organizationId, tier },
    });
    return { url: session.url };
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    if (!this.stripe) return { ignored: true };
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.prisma.subscription.update({
          where: { organizationId: session.metadata!.organizationId },
          data: {
            tier: session.metadata!.tier as PlanTier,
            stripeSubscriptionId: session.subscription as string,
            status: "active",
          },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status,
            currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
          },
        });
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event ${event.type}`);
    }
    return { received: true };
  }
}

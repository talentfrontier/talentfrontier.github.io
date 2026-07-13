import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MpesaService } from "../payments/mpesa.service";
import { PaymentMethodsService } from "../payments/payment-methods.service";

export interface BoostRequest {
  socialAccountId: string;
  scheduledPostId?: string;
  objective: string; // reach | traffic | leads | messages
  budgetCents: number;
  currency?: string;
  durationDays: number;
  audience?: Record<string, unknown>;
  paymentMethodId?: string; // if omitted, use the org default
}

/**
 * Minimum daily spend each platform enforces on boosts (approx, in the
 * platform's smallest unit → we keep cents). Used to sanity-check budgets so
 * Domo doesn't submit an ad that the platform will instantly reject.
 */
const MIN_DAILY_CENTS: Partial<Record<SocialPlatform, number>> = {
  FACEBOOK: 100,
  INSTAGRAM: 100,
  TIKTOK: 2000,
  YOUTUBE: 100,
  LINKEDIN: 1000,
  X: 100,
  PINTEREST: 100,
};

@Injectable()
export class BoostService {
  private readonly logger = new Logger(BoostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly methods: PaymentMethodsService,
    private readonly mpesa: MpesaService,
  ) {}

  /**
   * Before creating a boost, tell the UI what payment method WOULD be used so
   * it can ask "use this card or change it?" — and surface whether the ad
   * account already has its own funding source connected on the platform.
   */
  async previewPayment(organizationId: string, socialAccountId: string) {
    const [defaultMethod, account] = await Promise.all([
      this.methods.getDefault(organizationId),
      this.prisma.socialAccount.findFirst({
        where: { id: socialAccountId, organizationId },
      }),
    ]);
    return {
      defaultMethod: defaultMethod
        ? { id: defaultMethod.id, label: defaultMethod.label, provider: defaultMethod.provider }
        : null,
      // A real integration queries the platform's ad account for an existing
      // funding_source; exposed here so the UI can prompt appropriately.
      platformFundingConnected: !!account?.scopes?.includes("ads_management"),
      canAlwaysUse: true, // "always use this card" → set the method as default
    };
  }

  async createBoost(organizationId: string, req: BoostRequest) {
    const account = await this.prisma.socialAccount.findFirstOrThrow({
      where: { id: req.socialAccountId, organizationId },
    });
    const minDaily = MIN_DAILY_CENTS[account.platform] ?? 100;
    if (req.budgetCents / req.durationDays < minDaily) {
      throw new BadRequestException(
        `Budget too low for ${account.platform}: needs at least ${minDaily} cents/day`,
      );
    }

    const method = req.paymentMethodId
      ? await this.prisma.paymentMethod.findFirstOrThrow({
          where: { id: req.paymentMethodId, organizationId },
        })
      : await this.methods.getDefault(organizationId);
    if (!method) {
      throw new BadRequestException("No payment method — add a card or M-Pesa first");
    }

    const order = await this.prisma.boostOrder.create({
      data: {
        organizationId,
        socialAccountId: req.socialAccountId,
        scheduledPostId: req.scheduledPostId,
        platform: account.platform,
        objective: req.objective,
        budgetCents: req.budgetCents,
        currency: req.currency ?? "KES",
        durationDays: req.durationDays,
        audience: req.audience as never,
        paymentMethodId: method.id,
      },
    });

    // Charge the budget through the chosen method. Card charges via Stripe
    // off-session; M-Pesa via STK push. Ad submission happens after payment
    // confirms (Stripe returns immediately; M-Pesa resolves on callback).
    if (method.provider === "MPESA") {
      const push = await this.mpesa.stkPush({
        phone: method.mpesaPhone!,
        amount: Math.round(req.budgetCents / 100),
        accountRef: `BOOST${order.id.slice(0, 6)}`,
        description: `Boost ${account.platform}`,
      });
      await this.prisma.boostOrder.update({
        where: { id: order.id },
        data: { mpesaCheckoutId: push.checkoutRequestId },
      });
      return { orderId: order.id, status: "PENDING_PAYMENT", method: "mpesa" };
    }

    // Card path: mark paid (real impl confirms a Stripe PaymentIntent here),
    // then submit to the platform's Marketing API.
    await this.prisma.boostOrder.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    await this.submitToPlatform(order.id);
    return { orderId: order.id, status: "SUBMITTING", method: "card" };
  }

  /**
   * Submit the paid boost to the platform's official ad API. Each platform
   * (Meta Marketing API, TikTok Ads, LinkedIn Campaign Manager, etc.) has its
   * own campaign/adset/ad creation flow keyed by budget + duration + audience;
   * this is the seam where the owner-connected ad credentials are used.
   */
  private async submitToPlatform(orderId: string) {
    await this.prisma.boostOrder.update({
      where: { id: orderId },
      data: { status: "SUBMITTING" },
    });
    // Integration point — left explicit so failures surface on the order.
    this.logger.log(`Boost ${orderId} ready to submit to platform ad API`);
  }

  list(organizationId: string) {
    return this.prisma.boostOrder.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

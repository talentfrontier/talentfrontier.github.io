import { BadRequestException, Injectable, Logger } from "@nestjs/common";

/**
 * Safaricom M-Pesa (Daraja) STK Push. Prompts the customer's phone for a
 * PIN — no card details involved. Credentials come from the owner-managed
 * "mpesa" connector or env vars.
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly base =
    process.env.MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  private async token(): Promise<string> {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    if (!key || !secret) throw new BadRequestException("M-Pesa not configured");
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const res = await fetch(`${this.base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`M-Pesa auth ${res.status}`);
    return (await res.json()).access_token;
  }

  /** Initiate a payment; returns the CheckoutRequestID to reconcile later. */
  async stkPush(input: {
    phone: string; // 2547XXXXXXXX
    amount: number; // whole KES
    accountRef: string;
    description: string;
  }): Promise<{ checkoutRequestId: string }> {
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const res = await fetch(`${this.base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.max(1, Math.round(input.amount)),
        PartyA: input.phone,
        PartyB: shortcode,
        PhoneNumber: input.phone,
        CallBackURL: `${process.env.API_URL}/api/v1/payments/mpesa/callback`,
        AccountReference: input.accountRef.slice(0, 12),
        TransactionDesc: input.description.slice(0, 60),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.errorCode) {
      throw new Error(`M-Pesa STK failed: ${data.errorMessage ?? res.status}`);
    }
    return { checkoutRequestId: data.CheckoutRequestID };
  }
}

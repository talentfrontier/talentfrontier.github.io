import { SocialPlatform } from "@prisma/client";
import {
  PlatformAdapter,
  PlatformComment,
  PublishInput,
  PublishResult,
} from "./platform.adapter";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphFetch(path: string, token: string, init?: RequestInit) {
  const url = `${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Meta Graph error: ${data.error?.message ?? res.status}`);
  }
  return data;
}

/**
 * Facebook Pages via the Graph API. Instagram, Messenger, WhatsApp Business
 * and Threads ride the same Graph surface with different endpoints — they
 * subclass and override just the paths.
 */
export class FacebookAdapter implements PlatformAdapter {
  readonly platform: SocialPlatform = "FACEBOOK";

  async publish(input: PublishInput): Promise<PublishResult> {
    const endpoint = input.isVideo
      ? `/${input.externalAccountId}/videos`
      : input.mediaUrls?.length
        ? `/${input.externalAccountId}/photos`
        : `/${input.externalAccountId}/feed`;
    const body = new URLSearchParams({
      ...(input.isVideo
        ? { description: input.text, file_url: input.mediaUrls![0] }
        : input.mediaUrls?.length
          ? { caption: input.text, url: input.mediaUrls[0] }
          : { message: input.text }),
    });
    const data = await graphFetch(endpoint, input.accessToken, { method: "POST", body });
    return { externalPostId: data.id ?? data.post_id };
  }

  async fetchComments(accessToken: string, postId: string): Promise<PlatformComment[]> {
    const data = await graphFetch(`/${postId}/comments?fields=id,from,message,created_time`, accessToken);
    return (data.data ?? []).map((c: any) => ({
      externalId: c.id,
      author: c.from?.name ?? "unknown",
      text: c.message,
      postId,
      createdAt: c.created_time,
    }));
  }

  async replyToComment(accessToken: string, commentId: string, text: string) {
    await graphFetch(`/${commentId}/comments`, accessToken, {
      method: "POST",
      body: new URLSearchParams({ message: text }),
    });
  }

  async likeComment(accessToken: string, commentId: string) {
    await graphFetch(`/${commentId}/likes`, accessToken, { method: "POST" });
  }

  async sendDirectMessage(accessToken: string, recipientId: string, text: string) {
    await graphFetch(`/me/messages`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
  }

  async fetchFollowerCount(accessToken: string, externalAccountId: string): Promise<number> {
    const data = await graphFetch(`/${externalAccountId}?fields=followers_count,fan_count`, accessToken);
    return data.followers_count ?? data.fan_count ?? 0;
  }
}

export class InstagramAdapter extends FacebookAdapter {
  override readonly platform: SocialPlatform = "INSTAGRAM";

  override async publish(input: PublishInput): Promise<PublishResult> {
    // IG requires a two-step container flow.
    const container = await graphFetch(`/${input.externalAccountId}/media`, input.accessToken, {
      method: "POST",
      body: new URLSearchParams({
        caption: input.text,
        ...(input.isVideo
          ? { media_type: "REELS", video_url: input.mediaUrls![0] }
          : { image_url: input.mediaUrls?.[0] ?? "" }),
      }),
    });
    const publish = await graphFetch(`/${input.externalAccountId}/media_publish`, input.accessToken, {
      method: "POST",
      body: new URLSearchParams({ creation_id: container.id }),
    });
    return { externalPostId: publish.id };
  }
}

export class ThreadsAdapter extends FacebookAdapter {
  override readonly platform: SocialPlatform = "THREADS";
}

export class MessengerAdapter extends FacebookAdapter {
  override readonly platform: SocialPlatform = "MESSENGER";
}

export class WhatsAppAdapter extends FacebookAdapter {
  override readonly platform: SocialPlatform = "WHATSAPP";

  override async sendDirectMessage(accessToken: string, recipientId: string, text: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    await graphFetch(`/${phoneNumberId}/messages`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientId,
        type: "text",
        text: { body: text },
      }),
    });
  }
}

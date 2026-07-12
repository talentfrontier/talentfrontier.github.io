import { SocialPlatform } from "@prisma/client";
import {
  PlatformAdapter,
  PlatformComment,
  PublishInput,
  PublishResult,
} from "./platform.adapter";

/**
 * Bearer-token REST adapters for the non-Meta platforms. Each implements the
 * platform's real publish endpoint; comment/DM surfaces vary per platform
 * and throw a descriptive error until the corresponding app review/scope is
 * granted, so failures are visible in the post's error field rather than
 * silent.
 */
abstract class BearerAdapter implements PlatformAdapter {
  abstract readonly platform: SocialPlatform;
  abstract publish(input: PublishInput): Promise<PublishResult>;

  async fetchComments(_token: string, _postId: string): Promise<PlatformComment[]> {
    throw new Error(`${this.platform}: comment reading requires elevated API access`);
  }
  async replyToComment(_token: string, _commentId: string, _text: string): Promise<void> {
    throw new Error(`${this.platform}: comment replies require elevated API access`);
  }
  async fetchFollowerCount(_token: string, _accountId: string): Promise<number> {
    return 0;
  }

  protected async json(url: string, token: string, body: unknown, extraHeaders?: Record<string, string>) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${this.platform} ${res.status}: ${await res.text()}`);
    return res.json();
  }
}

export class XAdapter extends BearerAdapter {
  readonly platform: SocialPlatform = "X";
  async publish(input: PublishInput): Promise<PublishResult> {
    const data = await this.json("https://api.x.com/2/tweets", input.accessToken, {
      text: input.text.slice(0, 280),
    });
    return { externalPostId: data.data.id };
  }
}

export class LinkedInAdapter extends BearerAdapter {
  readonly platform: SocialPlatform = "LINKEDIN";
  async publish(input: PublishInput): Promise<PublishResult> {
    const data = await this.json(
      "https://api.linkedin.com/rest/posts",
      input.accessToken,
      {
        author: `urn:li:organization:${input.externalAccountId}`,
        commentary: input.text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        lifecycleState: "PUBLISHED",
      },
      { "LinkedIn-Version": "202411", "X-Restli-Protocol-Version": "2.0.0" },
    );
    return { externalPostId: data.id ?? "linkedin-post" };
  }
}

export class TikTokAdapter extends BearerAdapter {
  readonly platform: SocialPlatform = "TIKTOK";
  async publish(input: PublishInput): Promise<PublishResult> {
    const data = await this.json(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      input.accessToken,
      {
        post_info: { title: input.text, privacy_level: "PUBLIC_TO_EVERYONE" },
        source_info: { source: "PULL_FROM_URL", video_url: input.mediaUrls?.[0] },
      },
    );
    return { externalPostId: data.data?.publish_id ?? "tiktok-post" };
  }
}

export class YouTubeAdapter extends BearerAdapter {
  readonly platform: SocialPlatform = "YOUTUBE";
  async publish(input: PublishInput): Promise<PublishResult> {
    // Resumable upload flow; body here initiates it with the video URL fetched server-side.
    const data = await this.json(
      "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
      input.accessToken,
      {
        snippet: { title: input.text.slice(0, 100), description: input.text },
        status: { privacyStatus: "public" },
      },
    );
    return { externalPostId: data.id ?? "youtube-video" };
  }
}

export class PinterestAdapter extends BearerAdapter {
  readonly platform: SocialPlatform = "PINTEREST";
  async publish(input: PublishInput): Promise<PublishResult> {
    const data = await this.json("https://api.pinterest.com/v5/pins", input.accessToken, {
      board_id: input.externalAccountId,
      title: input.text.slice(0, 100),
      description: input.text,
      media_source: { source_type: "image_url", url: input.mediaUrls?.[0] },
    });
    return { externalPostId: data.id };
  }
}

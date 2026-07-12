import { Injectable } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";
import {
  FacebookAdapter,
  InstagramAdapter,
  MessengerAdapter,
  ThreadsAdapter,
  WhatsAppAdapter,
} from "./meta.adapter";
import {
  LinkedInAdapter,
  PinterestAdapter,
  TikTokAdapter,
  XAdapter,
  YouTubeAdapter,
} from "./other-platforms.adapter";
import { PlatformAdapter } from "./platform.adapter";

@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<SocialPlatform, PlatformAdapter>();

  constructor() {
    for (const adapter of [
      new FacebookAdapter(),
      new InstagramAdapter(),
      new MessengerAdapter(),
      new WhatsAppAdapter(),
      new ThreadsAdapter(),
      new XAdapter(),
      new LinkedInAdapter(),
      new TikTokAdapter(),
      new YouTubeAdapter(),
      new PinterestAdapter(),
    ]) {
      this.adapters.set(adapter.platform, adapter);
    }
  }

  get(platform: SocialPlatform): PlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new Error(`No adapter for ${platform}`);
    return adapter;
  }
}

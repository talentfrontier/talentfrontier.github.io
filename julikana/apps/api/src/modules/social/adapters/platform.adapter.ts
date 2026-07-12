import { SocialPlatform } from "@prisma/client";

export interface PublishInput {
  accessToken: string;
  externalAccountId: string;
  text: string;
  mediaUrls?: string[];
  isVideo?: boolean;
}

export interface PublishResult {
  externalPostId: string;
  url?: string;
}

export interface PlatformComment {
  externalId: string;
  author: string;
  text: string;
  postId: string;
  createdAt: string;
}

/**
 * One adapter per social network. Every method maps 1:1 to a platform API
 * call; tokens are decrypted by the caller (SocialService) before use.
 */
export interface PlatformAdapter {
  readonly platform: SocialPlatform;
  publish(input: PublishInput): Promise<PublishResult>;
  fetchComments(accessToken: string, postId: string): Promise<PlatformComment[]>;
  replyToComment(accessToken: string, commentId: string, text: string): Promise<void>;
  likeComment?(accessToken: string, commentId: string): Promise<void>;
  sendDirectMessage?(accessToken: string, recipientId: string, text: string): Promise<void>;
  fetchFollowerCount(accessToken: string, externalAccountId: string): Promise<number>;
}

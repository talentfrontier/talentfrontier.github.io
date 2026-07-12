import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";
import { OAuthProfile } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? "unset",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "unset",
      callbackURL: `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/auth/google/callback`,
      scope: ["email", "profile"],
    });
  }

  validate(_at: string, _rt: string, profile: any): OAuthProfile {
    return {
      provider: "google",
      subject: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}

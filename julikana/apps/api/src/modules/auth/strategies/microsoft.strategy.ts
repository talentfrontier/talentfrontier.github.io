import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-microsoft";
import { OAuthProfile } from "../auth.service";

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, "microsoft") {
  constructor() {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID ?? "unset",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "unset",
      callbackURL: `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/auth/microsoft/callback`,
      scope: ["user.read"],
    });
  }

  validate(_at: string, _rt: string, profile: any): OAuthProfile {
    return {
      provider: "microsoft",
      subject: profile.id,
      email: profile.emails?.[0]?.value ?? profile._json?.mail,
      name: profile.displayName,
    };
  }
}

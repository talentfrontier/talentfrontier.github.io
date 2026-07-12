import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "../../../common/decorators/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? "dev-secret",
    });
  }

  validate(payload: { sub: string; email: string; org: string; role: string }): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.org,
      role: payload.role,
    };
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthUser } from "../decorators/current-user.decorator";

/**
 * Platform-owner gate. Only emails listed in SUPERADMIN_EMAILS (comma-
 * separated) may manage connectors and app-level integration credentials.
 * Regular org users — even OWNERs of their own workspace — cannot.
 *
 * This is what enforces "only I can add connectors, not the user".
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly allowlist = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user?.email || !this.allowlist.includes(user.email.toLowerCase())) {
      throw new ForbiddenException("Connector management is restricted to the platform owner");
    }
    return true;
  }
}

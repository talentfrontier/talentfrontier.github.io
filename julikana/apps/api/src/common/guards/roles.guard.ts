import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OrgRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    // OWNER can do everything a MANAGER can, etc.
    const hierarchy: OrgRole[] = ["OWNER", "MANAGER", "MARKETING", "SALES", "SUPPORT"];
    const userRank = hierarchy.indexOf(user?.role);
    return required.some((role) => userRank !== -1 && userRank <= hierarchy.indexOf(role));
  }
}

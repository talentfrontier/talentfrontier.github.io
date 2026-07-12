import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Protects a route with the Bearer JWT strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

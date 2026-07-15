import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  TwoFactorDto,
} from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register with email + create an organization" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Email/password login (returns 2FA challenge when enabled)" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.totpCode);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Exchange a refresh token for fresh tokens (stay signed in)" })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Email a password-reset token (always returns ok)" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Set a new password using an emailed token" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Start Google OAuth flow" })
  google() {}

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const tokens = await this.auth.oauthLogin(req.user);
    res.redirect(
      `${process.env.WEB_URL}/auth/callback#access=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
    );
  }

  @Get("microsoft")
  @UseGuards(AuthGuard("microsoft"))
  @ApiOperation({ summary: "Start Microsoft OAuth flow" })
  microsoft() {}

  @Get("microsoft/callback")
  @UseGuards(AuthGuard("microsoft"))
  async microsoftCallback(@Req() req: any, @Res() res: Response) {
    const tokens = await this.auth.oauthLogin(req.user);
    res.redirect(
      `${process.env.WEB_URL}/auth/callback#access=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
    );
  }

  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setup2fa(@CurrentUser() user: AuthUser) {
    return this.auth.setupTwoFactor(user.id);
  }

  @Post("2fa/enable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  enable2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorDto) {
    return this.auth.enableTwoFactor(user.id, dto.code);
  }
}

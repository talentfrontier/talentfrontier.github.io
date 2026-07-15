import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(10) password: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() organizationName: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() totpCode?: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(10) password: string;
}

export class TwoFactorDto {
  @ApiProperty() @IsString() code: string;
}

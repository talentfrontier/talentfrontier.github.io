// These strategies ship without bundled types; their surface used here is
// covered by @nestjs/passport's PassportStrategy mixin.
declare module "passport-google-oauth20" {
  export class Strategy {
    constructor(...args: unknown[]);
    name: string;
  }
}

declare module "passport-microsoft" {
  export class Strategy {
    constructor(...args: unknown[]);
    name: string;
  }
}

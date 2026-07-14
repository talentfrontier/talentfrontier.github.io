import { Global, Module } from "@nestjs/common";
import { CryptoService } from "./crypto.service";

/**
 * Global so any module can inject CryptoService (token encryption, API-key
 * hashing) without re-declaring it — prevents "can't resolve CryptoService"
 * wiring errors as new modules use it.
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}

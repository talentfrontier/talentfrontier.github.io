import { Module } from "@nestjs/common";
import { CryptoService } from "../../common/services/crypto.service";
import { ConnectorsController } from "./connectors.controller";
import { ConnectorsService } from "./connectors.service";

@Module({
  controllers: [ConnectorsController],
  providers: [ConnectorsService, CryptoService],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}

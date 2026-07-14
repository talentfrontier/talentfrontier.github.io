/**
 * Resolves the full AppModule dependency graph WITHOUT starting the server
 * (no DB/Redis connect, no listen) so missing-provider / DI wiring errors
 * surface here instead of at deploy time.
 */
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";

(async () => {
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Constructed the whole graph successfully.
    await moduleRef.close();
    console.log("✅ DI OK — all providers resolve");
    process.exit(0);
  } catch (err) {
    console.error("❌ DI FAILED:\n", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();

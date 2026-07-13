import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_URL ?? true, credentials: true });
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle("Julikana API")
    .setDescription(
      "AI-powered marketing automation platform. Domo is the orchestrating agent behind every endpoint tagged 'ai'.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  // Honor the platform-injected PORT (Koyeb/Railway/Render/Fly all set it),
  // falling back to API_PORT then 4000 for local dev.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`Julikana API on :${port} — Swagger at /docs`);
}

bootstrap();

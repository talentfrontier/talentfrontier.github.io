import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";

import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { REDIS_CONNECTION } from "../queues/queues.module";

/**
 * Ingests brand-training sources into KnowledgeChunk rows.
 * Websites are fetched and stripped to text here; binary formats (PDF /
 * Word / Excel) should be parsed with pdf-parse / mammoth / xlsx in this
 * worker — the chunking pipeline below is format-agnostic.
 */
@Injectable()
export class IngestProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
  ) {}

  onModuleInit() {
    this.worker = new Worker(QUEUE.KNOWLEDGE_INGEST, (job) => this.ingest(job), {
      connection: this.connection,
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async ingest(job: Job<{ sourceId: string }>) {
    const source = await this.prisma.knowledgeSource.update({
      where: { id: job.data.sourceId },
      data: { status: "INGESTING" },
    });
    try {
      let text = "";
      if (source.type === "WEBSITE" && source.url) {
        const res = await fetch(source.url, { headers: { "User-Agent": "JulikanaBot/1.0" } });
        text = this.htmlToText(await res.text());
      } else if (source.url) {
        const res = await fetch(source.url);
        text = await res.text();
      }
      if (!text.trim()) throw new Error("No extractable text");

      const chunks = this.chunk(text, 800);
      await this.prisma.$transaction([
        this.prisma.knowledgeChunk.deleteMany({ where: { sourceId: source.id } }),
        ...chunks.map((content, index) =>
          this.prisma.knowledgeChunk.create({
            data: { sourceId: source.id, content, metadata: { index } },
          }),
        ),
        this.prisma.knowledgeSource.update({
          where: { id: source.id },
          data: { status: "READY" },
        }),
      ]);
      this.logger.log(`Ingested ${chunks.length} chunks from "${source.name}"`);
    } catch (err) {
      await this.prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: "FAILED" },
      });
      throw err;
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Sentence-aware chunking with a soft max length. */
  private chunk(text: string, maxLen: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += sentence + " ";
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }
}

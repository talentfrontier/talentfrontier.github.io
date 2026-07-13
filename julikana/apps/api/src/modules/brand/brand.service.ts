import { Inject, Injectable } from "@nestjs/common";
import { KnowledgeSourceType } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(queueToken(QUEUE.KNOWLEDGE_INGEST)) private readonly queue: Queue,
  ) {}

  list(organizationId: string) {
    return this.prisma.knowledgeSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
  }

  /** Register an uploaded document / website for Domo to learn from. */
  async addSource(
    organizationId: string,
    input: { type: KnowledgeSourceType; name: string; url?: string; storageKey?: string },
  ) {
    const source = await this.prisma.knowledgeSource.create({
      data: { ...input, organizationId },
    });
    await this.queue.add("ingest", { sourceId: source.id });
    return source;
  }

  async remove(organizationId: string, id: string) {
    return this.prisma.knowledgeSource.delete({
      where: { id, organizationId } as never,
    });
  }
}

import { PrismaClient, FunnelStage, PlanTier } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash("demo-password-123");
  const user = await prisma.user.upsert({
    where: { email: "demo@julikana.app" },
    update: {},
    create: { email: "demo@julikana.app", name: "Demo Owner", passwordHash },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo-realty" },
    update: {},
    create: {
      name: "Demo Realty",
      slug: "demo-realty",
      industry: "Real estate",
      description: "I own a real estate company.",
      businessFacts: {
        products: ["Apartment sales", "Property management"],
        serviceArea: "Nairobi",
      },
      memberships: { create: { userId: user.id, role: "OWNER" } },
      subscription: { create: { tier: PlanTier.PROFESSIONAL, status: "active" } },
    },
  });

  const stages = Object.values(FunnelStage);
  for (let i = 0; i < 25; i++) {
    await prisma.lead.create({
      data: {
        organizationId: org.id,
        name: `Sample Lead ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        source: i % 2 ? "facebook_comment" : "whatsapp",
        score: (i * 7) % 100,
        stage: stages[i % stages.length],
        interests: ["3-bedroom", "mortgage"],
      },
    });
  }

  console.log("Seeded demo org:", org.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

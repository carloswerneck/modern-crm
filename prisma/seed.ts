import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: {},
    create: {
      name: "Administrator",
      description: "Full access to all features",
      permissions: ["*"],
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: "Sales" },
    update: {},
    create: {
      name: "Sales",
      description: "Access to leads, contacts and activities",
      permissions: [
        "leads.view",
        "leads.create",
        "leads.edit",
        "contacts.view",
        "contacts.create",
        "activities.view",
        "activities.create",
      ],
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@crm.com",
      password: hashedPassword,
      roleId: adminRole.id,
      status: true,
    },
  });

  // Create default pipeline
  const pipeline = await prisma.pipeline.upsert({
    where: { id: "default-pipeline" },
    update: {},
    create: {
      id: "default-pipeline",
      name: "Sales Pipeline",
      isDefault: true,
      rottenDays: 30,
      stages: {
        create: [
          { name: "New", code: "new", probability: 10, sortOrder: 1 },
          { name: "Contacted", code: "contacted", probability: 25, sortOrder: 2 },
          { name: "Qualified", code: "qualified", probability: 50, sortOrder: 3 },
          { name: "Proposal Sent", code: "proposal", probability: 70, sortOrder: 4 },
          { name: "Negotiation", code: "negotiation", probability: 85, sortOrder: 5 },
          { name: "Won", code: "won", probability: 100, sortOrder: 6 },
          { name: "Lost", code: "lost", probability: 0, sortOrder: 7 },
        ],
      },
    },
  });

  // Create lead sources
  const sources = ["Website", "Referral", "LinkedIn", "Cold Call", "Email Campaign", "Trade Show"];
  for (const name of sources) {
    await prisma.leadSource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create lead types
  const types = ["New Business", "Existing Business", "Upsell", "Renewal"];
  for (const name of types) {
    await prisma.leadType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create sample tags
  const tags = [
    { name: "Hot", color: "#ef4444" },
    { name: "Warm", color: "#f97316" },
    { name: "Cold", color: "#3b82f6" },
    { name: "VIP", color: "#8b5cf6" },
    { name: "Follow-up", color: "#10b981" },
  ];
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  // Create sample organizations
  const org1 = await prisma.organization.create({
    data: {
      name: "Acme Corporation",
      email: "contact@acme.com",
      phone: "+1 555-0100",
      website: "https://acme.com",
      city: "New York",
      country: "USA",
      ownerId: admin.id,
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: "TechStartup Inc",
      email: "hello@techstartup.io",
      phone: "+1 555-0200",
      website: "https://techstartup.io",
      city: "San Francisco",
      country: "USA",
      ownerId: admin.id,
    },
  });

  // Create sample persons
  const person1 = await prisma.person.create({
    data: {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@acme.com",
      phone: "+1 555-0101",
      jobTitle: "CEO",
      organizationId: org1.id,
      ownerId: admin.id,
    },
  });

  const person2 = await prisma.person.create({
    data: {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@techstartup.io",
      phone: "+1 555-0201",
      jobTitle: "CTO",
      organizationId: org2.id,
      ownerId: admin.id,
    },
  });

  // Get stages for leads
  const stages = await prisma.stage.findMany({
    where: { pipelineId: "default-pipeline" },
    orderBy: { sortOrder: "asc" },
  });

  const sources2 = await prisma.leadSource.findMany();

  // Create sample leads
  await prisma.lead.create({
    data: {
      title: "Enterprise Software License",
      description: "Looking for a full enterprise software suite",
      value: 50000,
      expectedCloseDate: new Date("2026-04-30"),
      pipelineId: "default-pipeline",
      stageId: stages[2].id,
      personId: person1.id,
      organizationId: org1.id,
      ownerId: admin.id,
      sourceId: sources2[0].id,
    },
  });

  await prisma.lead.create({
    data: {
      title: "Cloud Migration Project",
      description: "Migrate existing infrastructure to cloud",
      value: 30000,
      expectedCloseDate: new Date("2026-05-15"),
      pipelineId: "default-pipeline",
      stageId: stages[1].id,
      personId: person2.id,
      organizationId: org2.id,
      ownerId: admin.id,
      sourceId: sources2[1].id,
    },
  });

  await prisma.lead.create({
    data: {
      title: "Annual Support Contract",
      description: "Renewal of support and maintenance contract",
      value: 15000,
      expectedCloseDate: new Date("2026-03-31"),
      pipelineId: "default-pipeline",
      stageId: stages[4].id,
      personId: person1.id,
      ownerId: admin.id,
    },
  });

  // Create sample products
  await prisma.product.create({
    data: {
      name: "CRM Pro License",
      sku: "CRM-PRO-001",
      description: "Professional CRM license for up to 50 users",
      price: 999,
      quantity: 100,
    },
  });

  await prisma.product.create({
    data: {
      name: "Implementation Service",
      sku: "SVC-IMPL-001",
      description: "On-site implementation and training service",
      price: 5000,
      quantity: 999,
    },
  });

  await prisma.product.create({
    data: {
      name: "Annual Support",
      sku: "SVC-SUPP-001",
      description: "24/7 premium support package",
      price: 2400,
      quantity: 999,
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("👤 Admin user: admin@crm.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

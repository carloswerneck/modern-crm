import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Validate API key
function validateApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedKey = process.env.CRM_API_KEY;
  if (!expectedKey) return false;
  return apiKey === expectedKey;
}

// POST /api/webhook/inbound
// Receives data from N8N and creates records in the CRM
export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json(
      { success: false, error: "API key inválida ou ausente. Envie via header 'x-api-key' ou 'Authorization: Bearer <key>'" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos 'action' e 'data' são obrigatórios",
          available_actions: [
            "create_lead",
            "create_person",
            "create_organization",
            "create_activity",
            "create_product",
            "create_email",
            "update_lead",
            "update_person",
            "update_organization",
          ],
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      // ─── LEADS ──────────────────────────────────────────────
      case "create_lead": {
        const lead = await prisma.lead.create({
          data: {
            title: data.title,
            description: data.description,
            value: data.value ? parseFloat(data.value) : null,
            expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
            // Link to existing records by email/name
            ...(data.personEmail && {
              person: {
                connectOrCreate: {
                  where: { id: "temp" }, // Will use findFirst below
                  create: { firstName: data.personName || data.personEmail },
                },
              },
            }),
          },
        });

        // If personEmail provided, find or create person and link
        if (data.personEmail) {
          let person = await prisma.person.findFirst({ where: { email: data.personEmail } });
          if (!person) {
            person = await prisma.person.create({
              data: {
                firstName: data.personName || data.personEmail.split("@")[0],
                lastName: data.personLastName || null,
                email: data.personEmail,
                phone: data.personPhone || null,
              },
            });
          }
          await prisma.lead.update({
            where: { id: lead.id },
            data: { personId: person.id },
          });
        }

        // If organizationName provided, find or create org and link
        if (data.organizationName) {
          let org = await prisma.organization.findFirst({ where: { name: data.organizationName } });
          if (!org) {
            org = await prisma.organization.create({
              data: {
                name: data.organizationName,
                email: data.organizationEmail || null,
                phone: data.organizationPhone || null,
              },
            });
          }
          await prisma.lead.update({
            where: { id: lead.id },
            data: { organizationId: org.id },
          });
        }

        // Link to pipeline/stage if provided
        if (data.pipelineName) {
          const pipeline = await prisma.pipeline.findFirst({ where: { name: data.pipelineName } });
          if (pipeline) {
            const stage = data.stageName
              ? await prisma.stage.findFirst({ where: { name: data.stageName, pipelineId: pipeline.id } })
              : await prisma.stage.findFirst({ where: { pipelineId: pipeline.id }, orderBy: { sortOrder: "asc" } });
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                pipelineId: pipeline.id,
                stageId: stage?.id || null,
              },
            });
          }
        }

        // Link to source if provided
        if (data.sourceName) {
          const source = await prisma.leadSource.findFirst({ where: { name: data.sourceName } });
          if (source) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { sourceId: source.id },
            });
          }
        }

        result = await prisma.lead.findUnique({
          where: { id: lead.id },
          include: { person: true, organization: true, pipeline: true, stage: true, source: true },
        });
        break;
      }

      // ─── PERSONS ────────────────────────────────────────────
      case "create_person": {
        // Check if person already exists by email
        if (data.email) {
          const existing = await prisma.person.findFirst({ where: { email: data.email } });
          if (existing) {
            result = await prisma.person.update({
              where: { id: existing.id },
              data: {
                firstName: data.firstName || existing.firstName,
                lastName: data.lastName !== undefined ? data.lastName : existing.lastName,
                phone: data.phone !== undefined ? data.phone : existing.phone,
                jobTitle: data.jobTitle !== undefined ? data.jobTitle : existing.jobTitle,
              },
              include: { organization: true },
            });
            return NextResponse.json({
              success: true,
              action: "updated_existing_person",
              data: result,
            });
          }
        }

        result = await prisma.person.create({
          data: {
            firstName: data.firstName || data.name || "Sem nome",
            lastName: data.lastName || null,
            email: data.email || null,
            phone: data.phone || null,
            jobTitle: data.jobTitle || null,
          },
        });

        // Link to organization if provided
        if (data.organizationName) {
          let org = await prisma.organization.findFirst({ where: { name: data.organizationName } });
          if (!org) {
            org = await prisma.organization.create({ data: { name: data.organizationName } });
          }
          result = await prisma.person.update({
            where: { id: result.id },
            data: { organizationId: org.id },
            include: { organization: true },
          });
        }
        break;
      }

      // ─── ORGANIZATIONS ──────────────────────────────────────
      case "create_organization": {
        // Check if org already exists
        if (data.name) {
          const existing = await prisma.organization.findFirst({ where: { name: data.name } });
          if (existing) {
            result = await prisma.organization.update({
              where: { id: existing.id },
              data: {
                email: data.email !== undefined ? data.email : existing.email,
                phone: data.phone !== undefined ? data.phone : existing.phone,
                website: data.website !== undefined ? data.website : existing.website,
                address: data.address !== undefined ? data.address : existing.address,
                city: data.city !== undefined ? data.city : existing.city,
                state: data.state !== undefined ? data.state : existing.state,
                country: data.country !== undefined ? data.country : existing.country,
              },
            });
            return NextResponse.json({
              success: true,
              action: "updated_existing_organization",
              data: result,
            });
          }
        }

        result = await prisma.organization.create({
          data: {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            website: data.website || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            country: data.country || null,
          },
        });
        break;
      }

      // ─── ACTIVITIES ─────────────────────────────────────────
      case "create_activity": {
        const validTypes = ["CALL", "MEETING", "TASK", "NOTE", "EMAIL"];
        const actType = (data.type || "NOTE").toUpperCase();
        if (!validTypes.includes(actType)) {
          return NextResponse.json(
            { success: false, error: `Tipo inválido. Use: ${validTypes.join(", ")}` },
            { status: 400 }
          );
        }

        result = await prisma.activity.create({
          data: {
            title: data.title,
            type: actType as any,
            comment: data.comment || data.description || null,
            location: data.location || null,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
            endsAt: data.endsAt ? new Date(data.endsAt) : null,
            isDone: data.isDone || false,
          },
        });

        // Link to lead if provided
        if (data.leadId) {
          await prisma.leadActivity.create({
            data: { leadId: data.leadId, activityId: result.id },
          });
        }

        // Link to person by email
        if (data.personEmail) {
          const person = await prisma.person.findFirst({ where: { email: data.personEmail } });
          if (person) {
            await prisma.personActivity.create({
              data: { personId: person.id, activityId: result.id },
            });
          }
        }
        break;
      }

      // ─── PRODUCTS ───────────────────────────────────────────
      case "create_product": {
        result = await prisma.product.create({
          data: {
            name: data.name,
            sku: data.sku || null,
            description: data.description || null,
            price: data.price ? parseFloat(data.price) : 0,
            quantity: data.quantity ? parseInt(data.quantity) : 0,
          },
        });
        break;
      }

      // ─── EMAILS ─────────────────────────────────────────────
      case "create_email": {
        result = await prisma.email.create({
          data: {
            subject: data.subject || "(sem assunto)",
            body: data.body || "",
            from: data.from || "webhook@crm.com",
            to: Array.isArray(data.to) ? data.to : [data.to || ""],
            cc: Array.isArray(data.cc) ? data.cc : data.cc ? [data.cc] : [],
            folder: data.folder || "inbox",
            isRead: false,
          },
        });

        // Link to person by email
        if (data.from) {
          const person = await prisma.person.findFirst({ where: { email: data.from } });
          if (person) {
            await prisma.email.update({
              where: { id: result.id },
              data: { personId: person.id },
            });
          }
        }
        break;
      }

      // ─── UPDATE LEAD ────────────────────────────────────────
      case "update_lead": {
        if (!data.id) {
          return NextResponse.json(
            { success: false, error: "Campo 'id' é obrigatório para atualizar" },
            { status: 400 }
          );
        }
        result = await prisma.lead.update({
          where: { id: data.id },
          data: {
            ...(data.title && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.value !== undefined && { value: parseFloat(data.value) }),
            ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
          },
          include: { person: true, organization: true, stage: true },
        });
        break;
      }

      // ─── UPDATE PERSON ──────────────────────────────────────
      case "update_person": {
        if (!data.id && !data.email) {
          return NextResponse.json(
            { success: false, error: "Campo 'id' ou 'email' é obrigatório para atualizar" },
            { status: 400 }
          );
        }
        const person = data.id
          ? await prisma.person.findUnique({ where: { id: data.id } })
          : await prisma.person.findFirst({ where: { email: data.email } });

        if (!person) {
          return NextResponse.json(
            { success: false, error: "Pessoa não encontrada" },
            { status: 404 }
          );
        }

        result = await prisma.person.update({
          where: { id: person.id },
          data: {
            ...(data.firstName && { firstName: data.firstName }),
            ...(data.lastName !== undefined && { lastName: data.lastName }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
          },
        });
        break;
      }

      // ─── UPDATE ORGANIZATION ────────────────────────────────
      case "update_organization": {
        if (!data.id && !data.name) {
          return NextResponse.json(
            { success: false, error: "Campo 'id' ou 'name' é obrigatório para atualizar" },
            { status: 400 }
          );
        }
        const org = data.id
          ? await prisma.organization.findUnique({ where: { id: data.id } })
          : await prisma.organization.findFirst({ where: { name: data.name } });

        if (!org) {
          return NextResponse.json(
            { success: false, error: "Organização não encontrada" },
            { status: 404 }
          );
        }

        result = await prisma.organization.update({
          where: { id: org.id },
          data: {
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.website !== undefined && { website: data.website }),
            ...(data.address !== undefined && { address: data.address }),
            ...(data.city !== undefined && { city: data.city }),
            ...(data.state !== undefined && { state: data.state }),
            ...(data.country !== undefined && { country: data.country }),
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Action '${action}' não reconhecida`,
            available_actions: [
              "create_lead",
              "create_person",
              "create_organization",
              "create_activity",
              "create_product",
              "create_email",
              "update_lead",
              "update_person",
              "update_organization",
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, action, data: result });
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/webhook/inbound - Documentation
export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json(
      { success: false, error: "API key inválida" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    name: "Modern CRM - Webhook API",
    version: "1.0",
    endpoint: "POST /api/webhook/inbound",
    auth: "Header 'x-api-key' ou 'Authorization: Bearer <key>'",
    actions: {
      create_lead: {
        description: "Criar um novo lead",
        fields: {
          title: "string (obrigatório)",
          description: "string",
          value: "number",
          expectedCloseDate: "date ISO string",
          personEmail: "string - vincula a pessoa existente ou cria nova",
          personName: "string - nome da pessoa (se criar nova)",
          personLastName: "string",
          personPhone: "string",
          organizationName: "string - vincula a org existente ou cria nova",
          organizationEmail: "string",
          organizationPhone: "string",
          pipelineName: "string - nome do pipeline",
          stageName: "string - nome da etapa do pipeline",
          sourceName: "string - nome da fonte do lead",
        },
      },
      create_person: {
        description: "Criar ou atualizar pessoa (por email)",
        fields: {
          firstName: "string (obrigatório)",
          lastName: "string",
          email: "string",
          phone: "string",
          jobTitle: "string",
          organizationName: "string - vincula a org existente ou cria nova",
        },
      },
      create_organization: {
        description: "Criar ou atualizar organização (por nome)",
        fields: {
          name: "string (obrigatório)",
          email: "string",
          phone: "string",
          website: "string",
          address: "string",
          city: "string",
          state: "string",
          country: "string",
        },
      },
      create_activity: {
        description: "Criar atividade",
        fields: {
          title: "string (obrigatório)",
          type: "CALL | MEETING | TASK | NOTE | EMAIL",
          comment: "string",
          location: "string",
          scheduledAt: "date ISO string",
          endsAt: "date ISO string",
          isDone: "boolean",
          leadId: "string - ID do lead para vincular",
          personEmail: "string - email da pessoa para vincular",
        },
      },
      create_product: {
        description: "Criar produto",
        fields: {
          name: "string (obrigatório)",
          sku: "string",
          description: "string",
          price: "number",
          quantity: "number",
        },
      },
      create_email: {
        description: "Registrar email no CRM",
        fields: {
          subject: "string",
          body: "string",
          from: "string",
          to: "string | string[]",
          cc: "string | string[]",
          folder: "string (inbox, sent, etc)",
        },
      },
      update_lead: {
        description: "Atualizar lead existente",
        fields: { id: "string (obrigatório)", title: "string", description: "string", value: "number" },
      },
      update_person: {
        description: "Atualizar pessoa (por id ou email)",
        fields: { id: "string", email: "string", firstName: "string", lastName: "string", phone: "string" },
      },
      update_organization: {
        description: "Atualizar organização (por id ou nome)",
        fields: { id: "string", name: "string", email: "string", phone: "string", website: "string" },
      },
    },
    examples: {
      create_lead_from_form: {
        action: "create_lead",
        data: {
          title: "Lead do site",
          value: 5000,
          personEmail: "cliente@email.com",
          personName: "João",
          personLastName: "Silva",
          personPhone: "(11) 99999-9999",
          organizationName: "Empresa XYZ",
          sourceName: "Website",
        },
      },
      create_person_from_n8n: {
        action: "create_person",
        data: {
          firstName: "Maria",
          lastName: "Santos",
          email: "maria@empresa.com",
          phone: "(21) 98888-8888",
          jobTitle: "Diretora",
          organizationName: "Tech Corp",
        },
      },
    },
  });
}

"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const leadSchema = z.object({
  title: z.string().min(1, "Titulo e obrigatorio"),
  description: z.string().optional(),
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  personId: z.string().optional(),
  organizationId: z.string().optional(),
  sourceId: z.string().optional(),
  typeId: z.string().optional(),
  ownerId: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Stage {
  id: string;
  name: string;
  pipelineId: string;
  sortOrder: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface LeadSource {
  id: string;
  name: string;
}

interface LeadType {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [types, setTypes] = useState<LeadType[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  const selectedPipelineId = watch("pipelineId");

  const stages =
    pipelines.find((p) => p.id === selectedPipelineId)?.stages ?? [];

  // Load reference data and lead data
  useEffect(() => {
    async function loadData() {
      try {
        const [
          leadRes,
          pipelinesRes,
          personsRes,
          orgsRes,
          sourcesRes,
          typesRes,
          usersRes,
        ] = await Promise.all([
          fetch(`/api/leads/${id}`),
          fetch("/api/settings/pipelines"),
          fetch("/api/contacts/persons"),
          fetch("/api/contacts/organizations"),
          fetch("/api/settings/lead-sources"),
          fetch("/api/settings/lead-types"),
          fetch("/api/settings/users"),
        ]);

        if (!leadRes.ok) {
          toast({ title: "Lead nao encontrado", variant: "destructive" });
          router.push("/leads");
          return;
        }

        const [lead, pipelinesData, personsData, orgsData, sourcesData, typesData, usersData] =
          await Promise.all([
            leadRes.json(),
            pipelinesRes.json(),
            personsRes.json(),
            orgsRes.json(),
            sourcesRes.json(),
            typesRes.json(),
            usersRes.json(),
          ]);

        setPipelines(pipelinesData);
        setPersons(personsData);
        setOrganizations(orgsData);
        setSources(sourcesData);
        setTypes(typesData);
        setUsers(usersData);

        // Format date for input[type=date]
        const closeDate = lead.expectedCloseDate
          ? new Date(lead.expectedCloseDate).toISOString().split("T")[0]
          : "";

        reset({
          title: lead.title || "",
          description: lead.description || "",
          value: lead.value != null ? String(lead.value) : "",
          expectedCloseDate: closeDate,
          pipelineId: lead.pipelineId || "",
          stageId: lead.stageId || "",
          personId: lead.personId || "",
          organizationId: lead.organizationId || "",
          sourceId: lead.sourceId || "",
          typeId: lead.typeId || "",
          ownerId: lead.ownerId || "",
        });
      } catch {
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data: LeadFormData) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        value: data.value ? parseFloat(data.value) : null,
        expectedCloseDate: data.expectedCloseDate || null,
        pipelineId: data.pipelineId || null,
        stageId: data.stageId || null,
        personId: data.personId || null,
        organizationId: data.organizationId || null,
        sourceId: data.sourceId || null,
        typeId: data.typeId || null,
        ownerId: data.ownerId || null,
      }),
    });

    if (res.ok) {
      toast({ title: "Lead atualizado com sucesso!" });
      router.push(`/leads/${id}`);
    } else {
      toast({ title: "Erro ao atualizar lead", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/leads/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Lead</h1>
          <p className="text-muted-foreground">
            Atualize as informacoes do lead
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                placeholder="Ex: Proposta de software para Acme"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descreva o lead..."
                rows={3}
                {...register("description")}
              />
            </div>

            {/* Value + Expected Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register("value")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">
                  Previsao de Fechamento
                </Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  {...register("expectedCloseDate")}
                />
              </div>
            </div>

            {/* Pipeline + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pipelineId">Pipeline</Label>
                <select
                  id="pipelineId"
                  className={selectClass}
                  {...register("pipelineId", {
                    onChange: () => {
                      setValue("stageId", "");
                    },
                  })}
                >
                  <option value="">Selecione...</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stageId">Etapa</Label>
                <select
                  id="stageId"
                  className={selectClass}
                  disabled={!selectedPipelineId}
                  {...register("stageId")}
                >
                  <option value="">Selecione...</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Person + Organization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personId">Contato</Label>
                <select
                  id="personId"
                  className={selectClass}
                  {...register("personId")}
                >
                  <option value="">Selecione...</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName}
                      {p.lastName ? ` ${p.lastName}` : ""}
                      {p.email ? ` (${p.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organizacao</Label>
                <select
                  id="organizationId"
                  className={selectClass}
                  {...register("organizationId")}
                >
                  <option value="">Selecione...</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceId">Fonte</Label>
                <select
                  id="sourceId"
                  className={selectClass}
                  {...register("sourceId")}
                >
                  <option value="">Selecione...</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeId">Tipo</Label>
                <select
                  id="typeId"
                  className={selectClass}
                  {...register("typeId")}
                >
                  <option value="">Selecione...</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <Label htmlFor="ownerId">Responsavel</Label>
              <select
                id="ownerId"
                className={selectClass}
                {...register("ownerId")}
              >
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
              <Link href={`/leads/${id}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Tag, Target, Zap, GitBranch, UserSquare } from "lucide-react";

const settingsGroups = [
  {
    title: "Usuários & Acesso",
    items: [
      { href: "/settings/users", label: "Usuários", description: "Gerencie os usuários do sistema", icon: Users },
      { href: "/settings/roles", label: "Cargos", description: "Configure permissões de acesso", icon: Shield },
      { href: "/settings/groups", label: "Grupos", description: "Organize usuários em grupos", icon: UserSquare },
    ],
  },
  {
    title: "Pipeline & Leads",
    items: [
      { href: "/settings/pipelines", label: "Pipelines", description: "Configure etapas do funil de vendas", icon: GitBranch },
      { href: "/settings/lead-sources", label: "Fontes de Lead", description: "De onde vêm seus leads", icon: Target },
      { href: "/settings/lead-types", label: "Tipos de Lead", description: "Categorias de leads", icon: Target },
    ],
  },
  {
    title: "Organização",
    items: [
      { href: "/settings/tags", label: "Tags", description: "Etiquetas para organizar registros", icon: Tag },
      { href: "/settings/webhooks", label: "Webhooks", description: "Integrações com sistemas externos", icon: Zap },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-base">{item.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{item.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

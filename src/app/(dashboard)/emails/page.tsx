import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function EmailsPage() {
  const emails = await prisma.email.findMany({
    where: { parentId: null },
    include: { person: true, lead: true, _count: { select: { replies: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-mails</h1>
          <p className="text-muted-foreground">Comunicações vinculadas ao CRM</p>
        </div>
        <Link href="/emails/new">
          <Button><Plus className="mr-2 h-4 w-4" />Novo E-mail</Button>
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {emails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum e-mail encontrado</p>
                <p className="text-sm mt-1">Vincule e-mails a leads e contatos para rastreamento</p>
              </div>
            ) : (
              emails.map((email) => (
                <Link key={email.id} href={`/emails/${email.id}`}>
                  <div className={`flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors ${!email.isRead ? "bg-blue-50/30" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium"}`}>{email.subject}</p>
                        {!email.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        De: {email.from}
                        {email.person && ` • ${email.person.firstName} ${email.person.lastName || ""}`}
                        {email.lead && ` • ${email.lead.title}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{formatDate(email.createdAt)}</p>
                      {email._count.replies > 0 && (
                        <Badge variant="secondary" className="text-xs mt-1">{email._count.replies} resp.</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

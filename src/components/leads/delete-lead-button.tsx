"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DeleteLeadButtonProps {
  leadId: string;
  leadTitle: string;
  /** "button" mostra o texto "Excluir"; "icon" mostra só a lixeira. */
  variant?: "button" | "icon";
  /** Redireciona após excluir (ex.: "/leads" na página de detalhe). */
  redirectTo?: string;
  /** Chamado após excluir com sucesso (ex.: para remover o card do Kanban). */
  onDeleted?: (leadId: string) => void;
  className?: string;
}

export default function DeleteLeadButton({
  leadId,
  leadTitle,
  variant = "button",
  redirectTo,
  onDeleted,
  className,
}: DeleteLeadButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    // O botão pode estar dentro de um <Link> (card do Kanban)
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Excluir o lead "${leadTitle}"? Esta ação não pode ser desfeita.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Lead excluído" });
      onDeleted?.(leadId);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      toast({ title: "Erro ao excluir lead", variant: "destructive" });
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Excluir lead"
        aria-label="Excluir lead"
        disabled={loading}
        onClick={handleDelete}
        className={className ?? "h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-600"}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleDelete}
      className={className ?? "text-red-600 hover:bg-red-50 hover:text-red-700"}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      Excluir
    </Button>
  );
}

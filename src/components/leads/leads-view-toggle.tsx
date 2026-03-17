"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadsViewToggle({ view }: { view: "kanban" | "lista" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(v: "kanban" | "lista") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
      <Button
        variant={view === "kanban" ? "default" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setView("kanban")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Pipeline
      </Button>
      <Button
        variant={view === "lista" ? "default" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setView("lista")}
      >
        <List className="h-3.5 w-3.5" />
        Lista
      </Button>
    </div>
  );
}

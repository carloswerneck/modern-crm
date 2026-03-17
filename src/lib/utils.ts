import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined, fmt = "dd/MM/yyyy") {
  if (!date) return "-";
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatDateRelative(date: Date | string | null | undefined) {
  if (!date) return "-";
  return formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: ptBR,
  });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export const activityTypeLabels: Record<string, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  TASK: "Tarefa",
  NOTE: "Nota",
  EMAIL: "E-mail",
};

export const activityTypeColors: Record<string, string> = {
  CALL: "bg-blue-100 text-blue-700",
  MEETING: "bg-purple-100 text-purple-700",
  TASK: "bg-amber-100 text-amber-700",
  NOTE: "bg-gray-100 text-gray-700",
  EMAIL: "bg-green-100 text-green-700",
};

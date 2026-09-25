import type { Metadata } from "next";
import DocsClient from "./docs-client";

export const metadata: Metadata = {
  title: "API Reference · Modern CRM",
  description: "Documentação da API do Modern CRM: endpoints internos e webhook de integração.",
};

export default function DocsPage() {
  return <DocsClient />;
}

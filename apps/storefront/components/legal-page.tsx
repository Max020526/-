"use client";

import { AlertTriangle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { LegalDocument } from "@/lib/legal-content";

export function LegalPage({ document }: { document: LegalDocument }) {
  const { locale } = useLocale();
  return <main className="legal-page"><header><p className="section-kicker">NEXORA STUDIO / LEGAL</p><h1>{document.title[locale]}</h1><div className="legal-warning"><AlertTriangle/><strong>{document.summary[locale]}</strong></div></header><section className="legal-sections">{document.sections.map((section) => <article key={section.title.it}><h2>{section.title[locale]}</h2><p>{section.body[locale]}</p></article>)}</section><p className="legal-version">DRAFT · PHASE 1 · 01/08/2026</p></main>;
}

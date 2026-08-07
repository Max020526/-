import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
import { normalizeLocale } from "@/lib/i18n";
import { legalDocuments } from "@/lib/legal-content";

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((legal) => ({ legal }));
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ legal: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { legal } = await params; const document = legalDocuments[legal]; if (!document) return {};
  const locale = normalizeLocale((await searchParams).lang);
  return { title: document.title[locale], description: document.summary[locale], robots: { index: false, follow: true }, alternates: { canonical: `/${legal}?lang=${locale}` } };
}

export default async function LegalRoute({ params }: { params: Promise<{ legal: string }> }) {
  const { legal } = await params; const document = legalDocuments[legal]; if (!document) notFound();
  return <LegalPage document={document}/>;
}

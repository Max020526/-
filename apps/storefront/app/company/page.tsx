import type { Metadata } from "next";
import { CompanyInformation } from "@/components/company-information";

export const metadata: Metadata = {
  title: "Informazioni societarie",
  description: "Dati societari e contatti di VICTOR S.R.L., venditore del sito NEXORA STUDIO.",
};

export default function CompanyPage() {
  return <CompanyInformation/>;
}

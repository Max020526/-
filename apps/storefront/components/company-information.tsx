"use client";

import { BadgeCheck, Building2, FileCheck2, Mail, MapPin } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

const facts = [
  ["Ragione sociale", "Company name", "公司名称", "VICTOR S.R.L."],
  ["Forma giuridica", "Legal form", "公司形式", "Società a responsabilità limitata (S.R.L.)"],
  ["C.F. e P. IVA", "Tax and VAT number", "税号及增值税号", "08788801218"],
  ["REA", "REA", "经济行政编号", "NA-984973"],
  ["Registro Imprese", "Company register", "企业登记处", "Camera di Commercio di Napoli"],
  ["Capitale sociale", "Share capital", "注册资本", "€10.000,00"],
];

export function CompanyInformation() {
  const { locale } = useLocale(); const index = locale === "it" ? 0 : locale === "en" ? 1 : 2;
  const copy = locale === "it" ? { title: "Informazioni societarie", intro: "I prodotti presentati sul sito NEXORA STUDIO sono venduti dalla società italiana VICTOR S.R.L.", seller: "Venditore", form: "Società a responsabilità limitata", address: "Sede legale", pec: "PEC", service: "Servizio clienti", records: "Dati del Registro Imprese", source: "Fonte: archivio ufficiale del Registro Imprese, Camera di Commercio di Napoli; documento disponibile estratto il 22 agosto 2025.", scope: "Ambito delle informazioni", privacy: "Questa pagina mostra soltanto i dati societari pubblici necessari a identificare il venditore. Dati personali non necessari di soci e amministratori non vengono pubblicati." } : locale === "en" ? { title: "Company information", intro: "Products shown on the NEXORA STUDIO site are sold by the Italian company VICTOR S.R.L.", seller: "Seller", form: "Italian limited liability company", address: "Registered office", pec: "Certified email (PEC)", service: "Customer service", records: "Company register data", source: "Source: official Company Register archive, Naples Chamber of Commerce; available extract dated 22 August 2025.", scope: "Information scope", privacy: "This page shows only public company data needed to identify the seller. Unnecessary personal data of shareholders and directors is not published." } : { title: "经营主体信息", intro: "NEXORA STUDIO 顾客网站所展示及销售的商品，由意大利注册公司 VICTOR S.R.L. 负责经营。", seller: "销售公司", form: "意大利有限责任公司", address: "注册地址", pec: "法定电子邮箱", service: "顾客服务", records: "工商登记资料", source: "资料依据：Camera di Commercio di Napoli，Registro Imprese 官方档案；现有提取文件日期为 2025 年 8 月 22 日。", scope: "信息公开范围", privacy: "本页仅展示顾客确认销售主体所需的企业公开信息，不公开不必要的股东或管理人员个人资料。" };
  return <main className="company-page"><section className="company-hero"><div><p className="section-kicker">LEGAL & COMPANY INFORMATION</p><h1>{copy.title}</h1><p>{copy.intro}</p></div><BadgeCheck aria-hidden="true" /></section><section className="company-grid"><article className="company-card company-card-wide"><Building2/><div><span>{copy.seller}</span><strong>VICTOR S.R.L.</strong><p>{copy.form}</p></div></article><article className="company-card"><MapPin/><div><span>{copy.address}</span><strong>Via Don Luigi Sturzo 78</strong><p>80128 Napoli (NA), Italia</p></div></article><article className="company-card"><Mail/><div><span>{copy.pec}</span><strong><a href="mailto:victorchensrl@pec.it">victorchensrl@pec.it</a></strong><p>{copy.service}: <a href="mailto:xrx020526@gmail.com">xrx020526@gmail.com</a></p></div></article></section><section className="company-record"><div className="company-record-head"><FileCheck2/><div><p className="section-kicker">REGISTRO IMPRESE</p><h2>{copy.records}</h2></div></div><dl>{facts.map((item) => <div key={item[3]}><dt>{item[index]}</dt><dd>{item[3]}</dd></div>)}</dl><p className="company-source">{copy.source}</p></section><section className="company-privacy-note"><strong>{copy.scope}</strong><p>{copy.privacy}</p></section></main>;
}

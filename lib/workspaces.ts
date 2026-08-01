import type { LucideIcon } from "lucide-react";
import { Boxes, Building2, Calculator, CircleDollarSign, ClipboardCheck, ExternalLink, PackageCheck, RotateCcw, Settings, ShoppingBag, Store, Truck, Users } from "lucide-react";

export const RETAIL_STOREFRONT_URL = "https://nexora-studio-shop.xrx020526.chatgpt.site";
export type FrontendProduct = { id: "warehouse-pos" | "internal-admin" | "retail-storefront" | "b2b-portal"; eyebrow: string; title: string; description: string; scope: string; href?: string; external?: boolean; status: "active" | "optional"; tone: "mint" | "blue" | "amber" | "slate"; icon: LucideIcon };
export const FRONTEND_PRODUCTS: FrontendProduct[] = [
  { id: "warehouse-pos", eyebrow: "WAREHOUSE & POS PWA", title: "仓库与门店作业", description: "员工在一个移动端完成快速入库、货单收货、履约拣货、门店销售和库存查询。", scope: "P01 入库 · P04 履约 · P08 POS", href: "/warehouse", status: "active", tone: "mint", icon: PackageCheck },
  { id: "internal-admin", eyebrow: "INTERNAL ADMIN", title: "内部经营管理", description: "老板和管理员统一管理商品、订单、采购、财务、经营分析与系统设置。", scope: "P02 商品 · P03 订单 · P05 采购 · P06 财务 · P07 老板 · P09 系统", href: "/admin", status: "active", tone: "blue", icon: Boxes },
  { id: "retail-storefront", eyebrow: "RETAIL STOREFRONT", title: "零售顾客网站", description: "独立面向顾客的品牌商城，只读取管理端已经审核发布的商品和可售库存。", scope: "C01 独立顾客端", href: RETAIL_STOREFRONT_URL, external: true, status: "active", tone: "amber", icon: ExternalLink },
  { id: "b2b-portal", eyebrow: "B2B PORTAL · OPTIONAL", title: "批发客户门户", description: "预留批发客户询价、下单和账期功能；V1.0 暂不启用。", scope: "C02 后续按业务量启用", status: "optional", tone: "slate", icon: Building2 },
];

export type WorkspaceDefinition = { code: string; title: string; owner: "warehouse" | "admin" | "customer"; description: string; href?: string; status: "available" | "planned" | "external"; icon: LucideIcon };
export const WORKSPACES: WorkspaceDefinition[] = [
  { code: "P01", title: "入库作业", owner: "warehouse", description: "快速入库与 OCR/货单收货，共用统一记录和库存流水。", href: "/warehouse", status: "available", icon: PackageCheck },
  { code: "P02", title: "商品运营", owner: "admin", description: "商品资料、图片、价格、分类、发布检查与上下架。", href: "/admin/products", status: "available", icon: Boxes },
  { code: "P03", title: "订单与客服", owner: "admin", description: "零售订单、售后、退货退款与客户沟通。", href: "/admin/orders", status: "available", icon: ShoppingBag },
  { code: "P04", title: "仓库履约", owner: "warehouse", description: "拣货、复核、打包、出库和异常处理。", href: "/warehouse/fulfillment", status: "available", icon: Truck },
  { code: "P05", title: "采购管理", owner: "admin", description: "采购单、供应商、到货计划与采购成本。", href: "/admin/purchasing", status: "planned", icon: ClipboardCheck },
  { code: "P06", title: "财务对账", owner: "admin", description: "收付款、退款、采购应付与渠道对账。", href: "/admin/finance", status: "planned", icon: CircleDollarSign },
  { code: "P07", title: "老板经营", owner: "admin", description: "核心指标、库存风险、销售趋势和待办事项。", href: "/admin", status: "available", icon: Calculator },
  { code: "P08", title: "门店 POS", owner: "warehouse", description: "门店开单、收款、退货和实时扣减库存。", href: "/warehouse/pos", status: "planned", icon: Store },
  { code: "P09", title: "系统管理", owner: "admin", description: "颜色、分类、供应商、员工、权限和操作日志。", href: "/settings/colors", status: "available", icon: Settings },
  { code: "C01", title: "零售顾客端", owner: "customer", description: "商品浏览、购物车、结账、订单和退货申请。", href: RETAIL_STOREFRONT_URL, status: "external", icon: Users },
  { code: "C02", title: "批发客户门户", owner: "customer", description: "未来启用批发价、起订量、询价和账期。", status: "planned", icon: RotateCcw },
];
export const warehouseWorkspaces = WORKSPACES.filter((item) => item.owner === "warehouse");
export const adminWorkspaces = WORKSPACES.filter((item) => item.owner === "admin");

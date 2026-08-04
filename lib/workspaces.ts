import type { LucideIcon } from "lucide-react";
import { Boxes, Calculator, CircleDollarSign, ClipboardCheck, ExternalLink, PackageCheck, Settings, ShoppingBag, Store, Truck, Users } from "lucide-react";

export const RETAIL_STOREFRONT_URL = "https://nexora-studio-shop.xrx020526.chatgpt.site";
export type FrontendProduct = { id: "warehouse-pos" | "internal-admin" | "retail-storefront"; title: string; href: string; external?: boolean; tone: "mint" | "blue" | "amber"; icon: LucideIcon };
export const FRONTEND_PRODUCTS: FrontendProduct[] = [
  { id: "warehouse-pos", title: "仓库", href: "/warehouse", tone: "mint", icon: PackageCheck },
  { id: "internal-admin", title: "管理", href: "/admin", tone: "blue", icon: Boxes },
  { id: "retail-storefront", title: "商城", href: RETAIL_STOREFRONT_URL, external: true, tone: "amber", icon: ExternalLink },
];

export type WorkspaceDefinition = { code: string; title: string; owner: "warehouse" | "admin" | "customer"; description: string; href?: string; status: "available" | "planned" | "external"; icon: LucideIcon };
export const WORKSPACES: WorkspaceDefinition[] = [
  { code: "P01", title: "入库作业", owner: "warehouse", description: "快速入库与 OCR/货单收货，共用统一记录和库存流水。", href: "/warehouse", status: "available", icon: PackageCheck },
  { code: "P02", title: "商品运营", owner: "admin", description: "商品资料、图片、价格、分类、发布检查与上下架。", href: "/admin/products", status: "available", icon: Boxes },
  { code: "P03", title: "订单与客服", owner: "admin", description: "零售订单、售后、退货退款与客户沟通。", href: "/admin/orders", status: "available", icon: ShoppingBag },
  { code: "P04", title: "仓库履约", owner: "warehouse", description: "拣货、复核、打包、出库和异常处理。", href: "/warehouse/fulfillment", status: "available", icon: Truck },
  { code: "P05", title: "采购管理", owner: "admin", description: "采购单、供应商、到货计划、部分收货与采购成本。", href: "/admin/purchasing", status: "available", icon: ClipboardCheck },
  { code: "P06", title: "财务对账", owner: "admin", description: "收付款、退款、费用、采购应付与可追溯经营分录。", href: "/admin/finance", status: "available", icon: CircleDollarSign },
  { code: "P07", title: "老板经营", owner: "admin", description: "统一口径的销售、毛利、经营净额、库存价值与风险。", href: "/admin/business", status: "available", icon: Calculator },
  { code: "P08", title: "门店 POS", owner: "warehouse", description: "门店开班、销售、多方式收款、实时扣库存与现金交班。", href: "/warehouse/pos", status: "available", icon: Store },
  { code: "P09", title: "系统管理", owner: "admin", description: "颜色、分类、供应商、员工、权限和操作日志。", href: "/settings/colors", status: "available", icon: Settings },
  { code: "C01", title: "零售顾客端", owner: "customer", description: "商品浏览、购物车、结账、订单和退货申请。", href: RETAIL_STOREFRONT_URL, status: "external", icon: Users },
];
export const warehouseWorkspaces = WORKSPACES.filter((item) => item.owner === "warehouse");
export const adminWorkspaces = WORKSPACES.filter((item) => item.owner === "admin");

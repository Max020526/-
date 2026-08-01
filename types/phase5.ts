export type PurchaseOrderItem = {
  id: string;
  variant_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
  tax_rate: number;
  line_total: number;
  product_variants?: { sku: string; products?: { name_zh: string | null; style_no: string } | null } | null;
};
export type PurchaseOrder = {
  id: string;
  purchase_order_no: string;
  status: string;
  supplier_reference: string | null;
  currency: string;
  expected_delivery_date: string | null;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  suppliers?: { name: string } | null;
  warehouses?: { name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
};

export type FinancialEntry = {
  id: string;
  source_type: string;
  source_id: string;
  source_no: string | null;
  entry_type: string;
  direction: "inflow" | "outflow";
  amount: number;
  tax_amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
};

export type Expense = {
  id: string;
  expense_no: string;
  category: string;
  status: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  expense_date: string;
  description: string;
};

export type BusinessMetrics = {
  from: string;
  to: string;
  timezone: string;
  generated_at: string;
  sales: number;
  refunds: number;
  net_sales: number;
  expenses: number;
  purchase_payments: number;
  operating_net: number;
  cogs: number;
  gross_profit: number;
  gross_margin_rate: number;
  order_count: number;
  average_order_value: number;
  inventory_cost_value: number;
  inventory_retail_value: number;
  low_stock_count: number;
  trend: Array<{ date: string; inflow: number; outflow: number; net: number }>;
};

export type PosSession = {
  id: string;
  session_no: string;
  warehouse_id: string;
  status: string;
  opening_cash: number;
  cash_sales: number;
  non_cash_sales: number;
  cash_in: number;
  cash_out: number;
  opened_at: string;
};

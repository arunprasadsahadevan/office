export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

// ─── Service ──────────────────────────────────────────────────────────────────
export interface Service {
  id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  category: 'wash_fold' | 'dry_clean' | 'iron_only' | 'special_care';
  base_price: string | number;
  turnaround_hours: number;
  is_active: boolean;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  preferred_locale: string;
  customer_type: 'retail' | 'corporate';
  credit_terms_days: number | null;
  created_at: string;
}

// ─── Order & item ─────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string;
  order_number: string;
  status: OrderStatus;
  promised_at: string | null;
  fulfillment_type: FulfillmentType;
  subscription_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  tenant_id: string;
  qr_code: string | null;
  garment_type: string | null;
  service_id: string | null;
  special_instructions: string | null;
  pre_existing_condition: {
    stain?: boolean;
    tear?: boolean;
    missing_button?: boolean;
    faded?: boolean;
    photo_urls?: string[];
  } | null;
  status: string;
  unit_price: string | number | null;
  created_at: string;
}
export type UserRole =
  | 'super_admin'
  | 'tenant_owner'
  | 'branch_manager'
  | 'cashier'
  | 'accountant'
  | 'driver';

export type OrderStatus =
  | 'received'
  | 'sorting'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'qc'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'knet' | 'visa_mc' | 'wallet' | 'credit_account';
export type FulfillmentType = 'walk_in' | 'pickup_delivery';
export type InvoiceStatus = 'unpaid' | 'paid' | 'partial' | 'overdue' | 'void';
export type SubscriptionStatus = 'active' | 'past_due' | 'paused' | 'cancelled';
export type PlatformSubStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  cr_number: string | null;
  default_locale: string;
  base_currency: string;
  logo_url: string | null;
  brand_primary_color: string | null;
  status: TenantStatus;
  trial_ends_at: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  area: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  branch_id: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  preferred_locale: string;
  created_at: string;
}

export interface PlatformPlan {
  id: string;
  name: string;
  price_kwd: string;
  max_branches: number | null;
  max_orders_per_month: number | null;
  max_users: number | null;
  features: Record<string, boolean>;
}

export interface PlatformSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: PlatformSubStatus;
  current_period_end: string | null;
  payment_method: string | null;
  created_at: string;
}

// ─── Phase 2: Inventory ───────────────────────────────────────────────────────

export type InventoryUnit = 'pcs' | 'kg' | 'litre' | 'box' | 'roll';
export type InventoryTxnType = 'restock' | 'usage' | 'adjustment' | 'waste';
export type EquipmentType = 'washer' | 'dryer' | 'ironer' | 'dry_clean' | 'other';

export interface InventoryItem {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  name: string;
  unit: InventoryUnit;
  current_qty: number;
  reorder_threshold: number;
  cost_per_unit: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  item_id: string;
  txn_type: InventoryTxnType;
  qty_delta: number;
  note: string | null;
  reference_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface Equipment {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  eq_type: EquipmentType;
  model: string | null;
  serial_number: string | null;
  purchased_at: string | null;
  next_service: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  tenant_id: string;
  equipment_id: string;
  serviced_at: string;
  description: string | null;
  cost: number;
  next_service: string | null;
  actor_id: string | null;
  created_at: string;
}

// ─── Phase 2: Accounting ──────────────────────────────────────────────────────

export type AccountType = 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';

export interface ChartOfAccount {
  id: string;
  tenant_id: string;
  code: string;
  name_en: string;
  name_ar: string;
  account_type: AccountType;
  parent_id: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  account_id: string | null;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface CashReconciliation {
  id: string;
  tenant_id: string;
  branch_id: string;
  reconciliation_date: string;
  shift: 'day' | 'night';
  expected_cash: number;
  counted_cash: number;
  variance: number;
  note: string | null;
  reconciled_by: string | null;
  created_at: string;
}

// ─── Phase 2: P&L ────────────────────────────────────────────────────────────

export interface BranchPnl {
  branch_id: string;
  branch_name: string;
  revenue: number;
  expenses: number;
  gross_profit: number;
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardKpis {
  ordersToday: number;
  revenueToday: number;
  pendingPickups: number;
  slaAtRisk: number;
  lowStockItems: number;
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  profile: UserProfile;
  tenant: Tenant | null;
}

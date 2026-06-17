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
  // Phase 5 additions
  express_price: string | number | null;
  express_turnaround_hours: number | null;
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
  item_id: string | null;
  is_express: boolean;
  express_surcharge: number;
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
  tax_rate: number;
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

// ─── Phase 3: Delivery ───────────────────────────────────────────────────────

export type DeliveryRunStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type DeliveryStopStatus = 'pending' | 'arrived' | 'completed' | 'failed';
export type DeliveryStopType = 'pickup' | 'dropoff';

export interface DeliveryRun {
  id: string;
  tenant_id: string;
  branch_id: string;
  driver_id: string | null;
  run_date: string;
  status: DeliveryRunStatus;
  notes: string | null;
  created_at: string;
}

export interface DeliveryStop {
  id: string;
  tenant_id: string;
  run_id: string;
  order_id: string;
  sequence: number;
  address: string | null;
  stop_type: DeliveryStopType;
  status: DeliveryStopStatus;
  completed_at: string | null;
  driver_note: string | null;
  created_at: string;
}

// ─── Phase 3: Customer Subscriptions ─────────────────────────────────────────

export interface CustomerSubscriptionPlan {
  id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  price: number;
  included_kg: number | null;
  included_items: number | null;
  perks: Record<string, unknown> | null;
  plan_type: SubscriptionPlanType;
  credit_amount: number | null;
  credit_validity_days: number | null;
  bonus_items: number | null;
  bonus_items_pct: number | null;
  allowed_category_ids: string[] | null;
  rollover_enabled: boolean;
  rollover_cap: number | null;
  overage_price_per_item: number | null;
  overage_price_per_kg: number | null;
  cancellation_policy: CancellationPolicy;
  cancellation_fee: number;
  description_en: string | null;
  description_ar: string | null;
  is_active: boolean;
}

export interface CustomerSubscription {
  id: string;
  tenant_id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  used_kg: number;
  used_items: number;
  payment_method: 'tokenized_card' | 'knet_manual_renewal' | null;
  tap_token_id: string | null;
  created_at: string;
  // Phase 6 additions
  bonus_items_remaining: number;
  wallet_credit_balance: number;
  paused_at: string | null;
  pause_until: string | null;
  cancellation_reason: string | null;
  rollover_items: number;
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

// ─── Phase 5: Garment Catalog ─────────────────────────────────────────────────

export interface GarmentCategory {
  id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface GarmentItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  photo_url: string | null;
  default_service_id: string | null;
  allowed_service_categories: string[] | null;
  is_subscription_eligible: boolean;
  special_handling: Record<string, boolean> | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  category?: Pick<GarmentCategory, 'id' | 'name_en' | 'name_ar' | 'icon'>;
}

// ─── Phase 6: Enhanced Subscriptions + Wallet ─────────────────────────────────

export type SubscriptionPlanType = 'credit' | 'item_bundle' | 'weight';
export type CancellationPolicy =
  | 'full_refund' | 'pro_rata' | 'no_refund' | 'credit_conversion' | 'cancellation_fee';

export interface CustomerWallet {
  id: string;
  tenant_id: string;
  customer_id: string;
  balance: number;
  updated_at: string;
}

export interface CustomerWalletTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  wallet_id: string;
  txn_type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string | null;
  reference_type: 'invoice' | 'subscription' | 'manual' | 'credit_note' | 'refund' | null;
  actor_id: string | null;
  created_at: string;
}

export interface SubscriptionCancellationRequest {
  id: string;
  tenant_id: string;
  subscription_id: string;
  requested_by: string | null;
  reason: string | null;
  refund_amount: number;
  refund_method: 'cash' | 'knet' | 'wallet_credit' | 'none' | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Phase 7: Credit Notes & Payment Allocations ──────────────────────────────

export interface CreditNote {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_id: string | null;
  amount: number;
  reason: string;
  status: 'open' | 'applied' | 'voided';
  applied_to_invoice_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaymentAllocation {
  id: string;
  tenant_id: string;
  payment_id: string;
  invoice_id: string;
  amount_allocated: number;
  created_at: string;
}

// ─── Phase 4: API Keys ───────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  profile: UserProfile;
  tenant: Tenant | null;
}

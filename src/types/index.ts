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

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardKpis {
  ordersToday: number;
  revenueToday: number;
  pendingPickups: number;
  slaAtRisk: number;
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  profile: UserProfile;
  tenant: Tenant | null;
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import {
  sendTextMessage,
  sendTemplateMessage,
  normalisePhone,
} from '@/lib/whatsapp/client';

const WHATSAPP_ENABLED = Boolean(
  process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
);

// ─── Log helper ───────────────────────────────────────────────────────────────

async function logNotification(
  tenantId: string,
  customerId: string | null,
  orderId: string | null,
  template: string,
  recipient: string,
  status: 'sent' | 'failed',
  providerId?: string,
) {
  const supabase = await createClient();
  await supabase.from('notifications_log').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    order_id: orderId,
    channel: 'whatsapp',
    template,
    recipient,
    status,
    provider_id: providerId ?? null,
  });
}

// ─── Order ready notification ─────────────────────────────────────────────────

/**
 * Sends a bilingual "order ready" WhatsApp message to the customer.
 * Production deployments should replace the text message with a pre-approved
 * template called "order_ready" submitted to Meta Business Manager.
 */
export async function notifyOrderReady(
  orderId: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, tenant_id, customer:customers(full_name,phone,preferred_locale)')
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!order) return { error: 'Order not found' };

  type CustomerRow = { full_name: string; phone: string; preferred_locale: string };
  const rawCust = order.customer as unknown;
  const customer: CustomerRow | null = Array.isArray(rawCust) ? rawCust[0] ?? null : rawCust as CustomerRow | null;
  if (!customer?.phone) return { error: 'Customer has no phone number' };

  const to = normalisePhone(customer.phone);
  const locale = customer.preferred_locale ?? 'en';
  const tenantName = user.tenant.name;

  // Bilingual message body
  const messageBody =
    locale === 'ar'
      ? `مرحباً ${customer.full_name}،\n\nطلبك رقم *${order.order_number}* جاهز للاستلام في ${tenantName}.\n\nشكراً لك! 🙏`
      : `Hi ${customer.full_name},\n\nYour order *${order.order_number}* is ready for collection at ${tenantName}.\n\nThank you! 🙏`;

  if (!WHATSAPP_ENABLED) {
    console.log('[WhatsApp disabled] Would send order-ready to', to, ':', messageBody);
    await logNotification(user.tenant.id, null, orderId, 'order_ready', to, 'sent', 'disabled');
    return { error: null };
  }

  try {
    const result = await sendTextMessage(to, messageBody);
    await logNotification(
      user.tenant.id,
      null,
      orderId,
      'order_ready',
      to,
      'sent',
      result.messages[0]?.id,
    );
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logNotification(user.tenant.id, null, orderId, 'order_ready', to, 'failed');
    console.error('WhatsApp send error:', msg);
    return { error: msg };
  }
}

// ─── Payment link notification ────────────────────────────────────────────────

/**
 * Sends a payment link via WhatsApp (primarily for KNET subscription renewals).
 * Production: use a "payment_link" pre-approved template.
 */
export async function notifyPaymentLink(
  orderId: string,
  paymentUrl: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, tenant_id, customer:customers(full_name,phone,preferred_locale)')
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!order) return { error: 'Order not found' };

  type CustomerRow = { full_name: string; phone: string; preferred_locale: string };
  const rawCust2 = order.customer as unknown;
  const customer: CustomerRow | null = Array.isArray(rawCust2) ? rawCust2[0] ?? null : rawCust2 as CustomerRow | null;
  if (!customer?.phone) return { error: 'Customer has no phone number' };

  const to = normalisePhone(customer.phone);
  const locale = customer.preferred_locale ?? 'en';

  const messageBody =
    locale === 'ar'
      ? `مرحباً ${customer.full_name}،\n\nرابط الدفع لطلبك رقم *${order.order_number}*:\n${paymentUrl}\n\nالرابط صالح لمدة 24 ساعة.`
      : `Hi ${customer.full_name},\n\nPayment link for order *${order.order_number}*:\n${paymentUrl}\n\nLink valid for 24 hours.`;

  if (!WHATSAPP_ENABLED) {
    console.log('[WhatsApp disabled] Would send payment link to', to);
    return { error: null };
  }

  try {
    const result = await sendTextMessage(to, messageBody);
    await logNotification(
      user.tenant.id,
      null,
      orderId,
      'payment_link',
      to,
      'sent',
      result.messages[0]?.id,
    );
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logNotification(user.tenant.id, null, orderId, 'payment_link', to, 'failed');
    return { error: msg };
  }
}

// ─── Delivery ETA notification ────────────────────────────────────────────────

export async function notifyDeliveryEta(
  orderId: string,
  etaMinutes: number,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, tenant_id, customer:customers(full_name,phone,preferred_locale)')
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!order) return { error: 'Order not found' };

  type CustomerRow = { full_name: string; phone: string; preferred_locale: string };
  const rawCust3 = order.customer as unknown;
  const customer: CustomerRow | null = Array.isArray(rawCust3) ? rawCust3[0] ?? null : rawCust3 as CustomerRow | null;
  if (!customer?.phone) return { error: 'Customer has no phone number' };

  const to = normalisePhone(customer.phone);
  const locale = customer.preferred_locale ?? 'en';

  const messageBody =
    locale === 'ar'
      ? `مرحباً ${customer.full_name}،\n\nطلبك رقم *${order.order_number}* في الطريق إليك.\nالوقت المتوقع للوصول: *${etaMinutes} دقيقة*.`
      : `Hi ${customer.full_name},\n\nYour order *${order.order_number}* is on its way.\nEstimated arrival: *${etaMinutes} minutes*.`;

  if (!WHATSAPP_ENABLED) {
    console.log('[WhatsApp disabled] Would send ETA to', to);
    return { error: null };
  }

  try {
    const result = await sendTextMessage(to, messageBody);
    await logNotification(
      user.tenant.id,
      null,
      orderId,
      'delivery_eta',
      to,
      'sent',
      result.messages[0]?.id,
    );
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logNotification(user.tenant.id, null, orderId, 'delivery_eta', to, 'failed');
    return { error: msg };
  }
}

// ─── Subscription renewal reminder ───────────────────────────────────────────

export async function notifySubscriptionRenewal(
  customerId: string,
  planName: string,
  paymentUrl: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, full_name, phone, preferred_locale')
    .eq('id', customerId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!customer?.phone) return { error: 'Customer not found or has no phone' };

  const to = normalisePhone(customer.phone);
  const locale = customer.preferred_locale ?? 'en';

  const messageBody =
    locale === 'ar'
      ? `مرحباً ${customer.full_name}،\n\nاشتراكك في خطة *${planName}* تجديد مستحق.\nيرجى الدفع عبر الرابط:\n${paymentUrl}`
      : `Hi ${customer.full_name},\n\nYour *${planName}* subscription renewal is due.\nPay here:\n${paymentUrl}`;

  if (!WHATSAPP_ENABLED) {
    console.log('[WhatsApp disabled] Would send renewal reminder to', to);
    return { error: null };
  }

  try {
    const result = await sendTextMessage(to, messageBody);
    await logNotification(
      user.tenant.id,
      customerId,
      null,
      'subscription_renewal',
      to,
      'sent',
      result.messages[0]?.id,
    );
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logNotification(user.tenant.id, customerId, null, 'subscription_renewal', to, 'failed');
    return { error: msg };
  }
}

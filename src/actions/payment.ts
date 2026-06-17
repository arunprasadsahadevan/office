'use server';

import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const InitiateSchema = z.object({
  planId: z.string().uuid(),
  locale: z.string().min(2).max(5),
});

interface InitiateResult {
  redirectUrl?: string;
  error?: string;
}

/**
 * Creates a Tap Payments hosted-checkout session for a platform plan upgrade.
 * The user is redirected to Tap; card data never touches LaundryOS servers.
 *
 * TAP_SECRET_KEY must be set in environment variables before this can process
 * real payments. Until then it returns an error explaining what to configure.
 */
export async function initiatePlatformUpgrade(
  input: z.infer<typeof InitiateSchema>,
): Promise<InitiateResult> {
  const parsed = InitiateSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input.' };

  const { planId, locale } = parsed.data;

  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated.' };

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('platform_plans')
    .select('id, name, price_kwd')
    .eq('id', planId)
    .single();

  if (!plan) return { error: 'Plan not found.' };

  const tapSecretKey = process.env.TAP_SECRET_KEY;

  if (!tapSecretKey) {
    return {
      error:
        'Payment gateway not configured. Add TAP_SECRET_KEY to your environment variables, ' +
        'then re-deploy to enable real payments.',
    };
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost:3000';
  const protocol = appDomain.startsWith('localhost') ? 'http' : 'https';
  const successUrl = `${protocol}://${appDomain}/${locale}/payment/upgrade/success?plan=${planId}`;
  const cancelUrl = `${protocol}://${appDomain}/${locale}/settings/billing`;

  // POST to Tap Payments Charges API to create a redirect-based charge.
  // Full API reference: https://developers.tap.company/reference/create-a-charge
  const body = {
    amount: Number(plan.price_kwd),
    currency: 'KWD',
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: `LaundryOS ${plan.name} plan — monthly`,
    metadata: {
      tenant_id: user.tenant.id,
      plan_id: planId,
    },
    reference: {
      transaction: `PLAT-${user.tenant.id.slice(0, 8)}-${planId.slice(0, 8)}`,
      order: `SUB-${Date.now()}`,
    },
    receipt: { email: true, sms: false },
    customer: {
      first_name: user.profile.full_name?.split(' ')[0] ?? 'Owner',
      last_name: user.profile.full_name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
    },
    source: { id: 'src_all' },
    post: {
      url: `${protocol}://${appDomain}/api/webhooks/tap`,
    },
    redirect: { url: successUrl },
    cancel: cancelUrl,
  };

  const res = await fetch('https://api.tap.company/v2/charges', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tapSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[payment] Tap charge creation failed:', errText);
    return { error: 'Payment gateway error. Please try again or contact support.' };
  }

  const charge = await res.json() as { transaction?: { url?: string } };
  const redirectUrl = charge?.transaction?.url;

  if (!redirectUrl) {
    return { error: 'Payment gateway returned no redirect URL. Please try again.' };
  }

  return { redirectUrl };
}

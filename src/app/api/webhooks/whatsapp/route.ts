import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * WhatsApp Cloud API webhook endpoint.
 * Register this URL in the Meta App Dashboard:
 *   POST /api/webhooks/whatsapp  (for incoming messages / status updates)
 *   GET  /api/webhooks/whatsapp  (for webhook verification challenge)
 *
 * Set WHATSAPP_VERIFY_TOKEN to match the token configured in Meta App Dashboard.
 */

// ─── GET: webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// ─── POST: incoming messages and status updates ────────────────────────────────

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  let body: WhatsAppWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      // Update delivery status for outbound messages
      for (const statusUpdate of value.statuses ?? []) {
        const newStatus = statusUpdate.status === 'delivered'
          ? 'delivered'
          : statusUpdate.status === 'read'
          ? 'read'
          : statusUpdate.status === 'failed'
          ? 'failed'
          : null;

        if (newStatus) {
          await supabase
            .from('notifications_log')
            .update({ status: newStatus })
            .eq('provider_id', statusUpdate.id);
        }
      }
    }
  }

  // Always respond 200 within 20s to acknowledge receipt
  return NextResponse.json({ ok: true });
}

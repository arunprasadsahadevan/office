/**
 * WhatsApp Cloud API client.
 * Endpoint: POST https://graph.facebook.com/v22.0/{phone_number_id}/messages
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Auth: Bearer token via WHATSAPP_ACCESS_TOKEN env var (server-only).
 * Phone numbers must be in E.164 format without the leading "+":
 *   Kuwait +965 XXXX XXXX → "965XXXXXXXX"
 */

const GRAPH_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Types matching the Cloud API response ────────────────────────────────────

export interface WhatsAppSendResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WhatsAppErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: { messaging_product: string; details: string };
    fbtrace_id: string;
  };
}

// ─── Template component types ─────────────────────────────────────────────────

export interface TemplateTextParameter {
  type: 'text';
  text: string;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: TemplateTextParameter[];
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

function getCredentials() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set',
    );
  }

  return { phoneNumberId, accessToken };
}

async function post(
  phoneNumberId: string,
  accessToken: string,
  body: object,
): Promise<WhatsAppSendResponse> {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as WhatsAppSendResponse | WhatsAppErrorResponse;

  if (!res.ok) {
    const err = data as WhatsAppErrorResponse;
    throw new Error(
      `WhatsApp API error ${err.error?.code}: ${err.error?.message}`,
    );
  }

  return data as WhatsAppSendResponse;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a plain text message (valid only within a 24-hour customer-initiated window).
 * For business-initiated messages outside that window, use sendTemplateMessage.
 */
export async function sendTextMessage(
  to: string,
  body: string,
): Promise<WhatsAppSendResponse> {
  const { phoneNumberId, accessToken } = getCredentials();

  return post(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  });
}

/**
 * Send a pre-approved template message.
 * Templates must be created and approved in Meta Business Manager before use.
 * Language code examples: "en" (English), "ar" (Arabic).
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: 'en' | 'ar' | string,
  components?: TemplateComponent[],
): Promise<WhatsAppSendResponse> {
  const { phoneNumberId, accessToken } = getCredentials();

  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };

  if (components?.length) {
    template.components = components;
  }

  return post(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template,
  });
}

/**
 * Normalise a phone number to E.164 digits-only for the Cloud API.
 * Strips leading "+", spaces, and dashes.
 * e.g. "+965 9999 8888" → "96599998888"
 */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}

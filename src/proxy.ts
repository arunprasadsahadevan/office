import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'laundryos.com';

// Extract subdomain slug from hostname (e.g. "acme.laundryos.com" → "acme")
function extractTenantSlug(host: string): string | null {
  const bare = host.split(':')[0]; // strip port
  if (!bare.endsWith(`.${APP_DOMAIN}`)) return null;
  const slug = bare.slice(0, -(APP_DOMAIN.length + 1));
  return slug && !slug.includes('.') ? slug : null;
}

// Paths that skip next-intl locale routing (public + API)
function bypassIntl(pathname: string): boolean {
  return pathname.startsWith('/track/') || pathname.startsWith('/api/');
}

async function refreshSupabaseSession(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request: req });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  // Detect subdomain and inject x-tenant-slug header
  const host = request.headers.get('host') ?? request.nextUrl.hostname;
  const slug = extractTenantSlug(host);

  let req = request;
  if (slug) {
    const headers = new Headers(request.headers);
    headers.set('x-tenant-slug', slug);
    req = new NextRequest(request.url, {
      headers,
      method: request.method,
      body: request.body ?? undefined,
    });
  }

  // /track/ and /api/ skip next-intl but still refresh the Supabase session
  if (bypassIntl(request.nextUrl.pathname)) {
    return refreshSupabaseSession(req);
  }

  // 1. Refresh Supabase auth session so it doesn't expire mid-session.
  let supabaseResponse = NextResponse.next({ request: req });

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]),
            );
          },
        },
      },
    );

    // Refreshes the session token if needed — do not remove.
    await supabase.auth.getUser();
  }

  // 2. next-intl locale routing.
  const intlMiddleware = createMiddleware(routing);
  const intlResponse = intlMiddleware(req);

  // Propagate any Supabase-refreshed cookies into the intl response.
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    // Run on all paths except static assets, images, and favicons.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'laundryos.com';

function extractTenantSlug(host: string): string | null {
  const bare = host.split(':')[0];
  if (!bare.endsWith(`.${APP_DOMAIN}`)) return null;
  const slug = bare.slice(0, -(APP_DOMAIN.length + 1));
  return slug && !slug.includes('.') ? slug : null;
}

function bypassIntl(pathname: string): boolean {
  return pathname.startsWith('/track/') || pathname.startsWith('/api/');
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? request.nextUrl.hostname;
  const slug = extractTenantSlug(host);

  let req = request;
  if (slug) {
    const headers = new Headers(request.headers);
    headers.set('x-tenant-slug', slug);
    req = new NextRequest(request.url, { headers, method: request.method });
  }

  if (bypassIntl(request.nextUrl.pathname)) {
    return NextResponse.next({ request: req });
  }

  // Refresh Supabase auth session so cookies stay alive across page loads.
  let supabaseResponse = NextResponse.next({ request: req });

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
              cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
              supabaseResponse = NextResponse.next({ request: req });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options as Parameters<typeof supabaseResponse.cookies.set>[2],
                ),
              );
            },
          },
        },
      );
      await supabase.auth.getUser();
    } catch {
      // Don't block the request if session refresh fails.
    }
  }

  // Apply next-intl locale routing (redirect / prefix as needed).
  const intlMiddleware = createMiddleware(routing);
  const intlResponse = await intlMiddleware(req);

  if (!intlResponse) return supabaseResponse;

  // Carry any refreshed Supabase cookies into the intl response.
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    intlResponse.cookies.set(
      name,
      value,
      options as Parameters<typeof intlResponse.cookies.set>[2],
    );
  });

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

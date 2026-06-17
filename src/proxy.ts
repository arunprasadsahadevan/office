import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'laundryos.com';

function extractTenantSlug(host: string): string | null {
  const bare = host.split(':')[0];
  if (!bare.endsWith(`.${APP_DOMAIN}`)) return null;
  const slug = bare.slice(0, -(APP_DOMAIN.length + 1));
  return slug && !slug.includes('.') ? slug : null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? request.nextUrl.hostname;
  const slug = extractTenantSlug(host);

  if (slug) {
    const headers = new Headers(request.headers);
    headers.set('x-tenant-slug', slug);
    request = new NextRequest(request.url, { headers, method: request.method });
  }

  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/track/')
  ) {
    return NextResponse.next({ request });
  }

  let response = intlMiddleware(request);

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        },
      );
      await supabase.auth.getUser();
    } catch {
      // Don't block the request if session refresh fails.
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

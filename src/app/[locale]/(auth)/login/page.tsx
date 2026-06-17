import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from '@/components/auth/LoginForm';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('login') };
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (user) redirect(`/${locale}/dashboard`);

  return <LoginForm locale={locale as Locale} />;
}

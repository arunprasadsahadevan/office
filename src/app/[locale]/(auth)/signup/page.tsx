import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import SignupForm from '@/components/auth/SignupForm';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('login') };
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (user) redirect(`/${locale}/dashboard`);

  return <SignupForm locale={locale as Locale} />;
}

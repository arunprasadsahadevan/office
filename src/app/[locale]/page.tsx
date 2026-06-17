import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

interface Props {
  params: Promise<{ locale: string }>;
}


export default async function LocaleRootPage({ params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  } else {
    redirect(`/${locale}/login`);
  }
}

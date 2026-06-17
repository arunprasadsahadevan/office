import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  );
}

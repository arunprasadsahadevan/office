'use client';

import { useRouter } from 'next/navigation';
import ReconciliationForm from '@/components/accounting/ReconciliationForm';
import type { Branch } from '@/types';

export default function ReconciliationFormWrapper({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  return <ReconciliationForm branches={branches} onSaved={() => router.refresh()} />;
}

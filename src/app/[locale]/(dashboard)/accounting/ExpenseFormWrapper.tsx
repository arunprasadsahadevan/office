'use client';

import { useRouter } from 'next/navigation';
import ExpenseForm from '@/components/accounting/ExpenseForm';
import type { Branch, ChartOfAccount } from '@/types';

interface Props {
  branches: Branch[];
  accounts: ChartOfAccount[];
}

export default function ExpenseFormWrapper({ branches, accounts }: Props) {
  const router = useRouter();
  return (
    <ExpenseForm
      branches={branches}
      accounts={accounts}
      onSaved={() => router.refresh()}
    />
  );
}

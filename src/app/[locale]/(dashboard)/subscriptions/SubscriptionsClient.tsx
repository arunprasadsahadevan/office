'use client';

import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlanCard from '@/components/subscriptions/PlanCard';
import CreatePlanDialog from '@/components/subscriptions/CreatePlanDialog';
import EnrollDialog from '@/components/subscriptions/EnrollDialog';
import { useRouter } from 'next/navigation';
import type { CustomerSubscriptionPlan, CustomerSubscription, Customer } from '@/types';

interface Props {
  plans: CustomerSubscriptionPlan[];
  customers: Customer[];
  subscriptions: CustomerSubscription[];
  currency: string;
  locale: string;
}

export default function SubscriptionsClient({ plans, customers, currency, locale }: Props) {
  const router = useRouter();
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
        <Button
          startIcon={<PersonAddIcon />}
          variant="outlined"
          onClick={() => setEnrollOpen(true)}
          disabled={plans.length === 0}
        >
          Enroll Customer
        </Button>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setCreatePlanOpen(true)}
        >
          New Plan
        </Button>
      </Stack>

      {plans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="body2">
            No subscription plans yet. Create your first plan to start offering bundles to customers.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {plans.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <PlanCard plan={plan} currency={currency} locale={locale} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreatePlanDialog
        open={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        onSaved={() => {
          setCreatePlanOpen(false);
          router.refresh();
        }}
      />
      <EnrollDialog
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={() => {
          setEnrollOpen(false);
          router.refresh();
        }}
        plans={plans}
        customers={customers}
      />
    </Box>
  );
}

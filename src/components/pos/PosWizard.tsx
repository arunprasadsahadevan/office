'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CustomerStep from './CustomerStep';
import ItemStep from './ItemStep';
import ReviewStep from './ReviewStep';
import type { Customer, GarmentCategory, GarmentItem, Service } from '@/types';

export interface GarmentDraft {
  id: string;
  item_id: string | null;
  garment_type: string;
  category_name_en: string;
  service_id: string;
  service_name_en: string;
  service_name_ar: string;
  unit_price: number;
  is_express: boolean;
  express_surcharge: number;
  special_instructions: string;
  condition: {
    stain: boolean;
    tear: boolean;
    missing_button: boolean;
    faded: boolean;
    photo_urls: string[];
  };
}

interface Props {
  services: Service[];
  categories: GarmentCategory[];
  items: GarmentItem[];
  branchId: string;
}

const STEPS = ['customer', 'items', 'review'] as const;

export default function PosWizard({ services, categories, items, branchId }: Props) {
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [garments, setGarments] = useState<GarmentDraft[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  const stepIcons = [<PersonSearchIcon key="p" />, <CheckroomIcon key="c" />, <ReceiptIcon key="r" />];
  const stepLabels =
    locale === 'ar'
      ? ['العميل', 'القطع', 'المراجعة']
      : ['Customer', 'Items', 'Review'];

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleCustomerSelected(c: Customer) {
    setCustomer(c);
    setStep(1);
  }

  function handleItemsConfirmed(g: GarmentDraft[]) {
    setGarments(g);
    setStep(2);
  }

  function handleOrderCreated(orderId: string, invoiceId: string) {
    setCreatedOrderId(orderId);
    setCreatedInvoiceId(invoiceId);
    setStep(3);
  }

  function handleNewOrder() {
    setCustomer(null);
    setGarments([]);
    setCreatedOrderId(null);
    setCreatedInvoiceId(null);
    setStep(0);
  }

  return (
    <Box>
      {step < 3 && (
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((_, i) => (
            <Step key={i} completed={i < step}>
              <StepLabel StepIconProps={{ icon: stepIcons[i] }}>
                {stepLabels[i]}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {step === 0 && (
        <CustomerStep onSelect={handleCustomerSelected} />
      )}

      {step === 1 && customer && (
        <ItemStep
          customer={customer}
          services={services}
          categories={categories}
          items={items}
          initial={garments}
          onConfirm={handleItemsConfirmed}
          onBack={handleBack}
        />
      )}

      {step === 2 && customer && (
        <ReviewStep
          customer={customer}
          garments={garments}
          branchId={branchId}
          onBack={handleBack}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {step === 3 && createdOrderId && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="success" sx={{ mb: 3, justifyContent: 'center' }}>
            {locale === 'ar' ? 'تم إنشاء الطلب بنجاح!' : 'Order created successfully!'}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              href={`/api/receipt/${createdOrderId}`}
              target="_blank"
            >
              {locale === 'ar' ? 'طباعة الإيصال' : 'Print Receipt'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              href={`/${locale}/orders/${createdOrderId}`}
            >
              {locale === 'ar' ? 'عرض الطلب' : 'View Order'}
            </Button>
            <Button variant="text" size="large" onClick={handleNewOrder}>
              {locale === 'ar' ? 'طلب جديد' : 'New Order'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

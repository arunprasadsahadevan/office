import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { listGarmentCategories, listGarmentItems } from '@/actions/items';
import { listServices } from '@/actions/services';
import ItemsSettingsClient from './ItemsSettingsClient';

export const metadata: Metadata = { title: 'Items Master' };

export default async function ItemsSettingsPage() {
  const [categories, items, services] = await Promise.all([
    listGarmentCategories(),
    listGarmentItems(),
    listServices(),
  ]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Items Master
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage garment categories and items for touch-screen POS entry.
      </Typography>
      <ItemsSettingsClient
        initialCategories={categories}
        initialItems={items}
        services={services}
      />
    </Box>
  );
}

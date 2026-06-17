import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LaundryOS',
  description: 'Multi-tenant laundry management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

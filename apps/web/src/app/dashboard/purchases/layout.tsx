import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Purchases',
  description:
    'View your purchased strategies, playbooks, and store items. Download receipts and manage your TradeMind content library.',
};

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

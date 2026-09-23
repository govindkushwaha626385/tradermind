import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trade Executions',
  description:
    'Full log of all broker-synced trade fills and executions with segment filtering, CSV export, and P&L tracking.',
};

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

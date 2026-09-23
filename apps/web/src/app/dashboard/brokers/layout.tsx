import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broker Connections',
  description:
    'Connect and manage accounts across Zerodha, Dhan, Angel One, Upstox, Groww, Delta Exchange, and import trade CSV files.',
};

export default function BrokersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

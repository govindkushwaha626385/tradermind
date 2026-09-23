import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CSV Import Wizard',
  description:
    'Import trade books and order history CSV files from Zerodha Kite, Upstox Pro, Angel One, Groww, Fyers, Sahi, and Lemonn.',
};

export default function BrokerImportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

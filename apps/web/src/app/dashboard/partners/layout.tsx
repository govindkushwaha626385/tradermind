import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Program',
  description:
    'Join the TradeMind partner program. Earn commissions by referring traders and track your referral earnings in real time.',
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

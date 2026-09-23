import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics & Performance',
  description:
    'Deep performance analytics: MFE/MAE analysis, win rate, profit factor, drawdown curve, and Indian tax summaries.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

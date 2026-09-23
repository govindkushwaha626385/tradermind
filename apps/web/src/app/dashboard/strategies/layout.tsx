import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategy Performance',
  description:
    'Evaluate win rates, expectancy, average risk-to-reward, and net P&L across all your tagged trading strategies.',
};

export default function StrategiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

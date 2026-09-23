import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Calculators',
  description:
    '18 precision calculators: Position sizing, risk-to-reward, F&O margins, ATR stops, Kelly Criterion, and options payoff simulator.',
};

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

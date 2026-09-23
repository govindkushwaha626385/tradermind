import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trader Leaderboard',
  description:
    'Benchmark your discipline score, win rate, and risk management against verified traders in the TradeMind community.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

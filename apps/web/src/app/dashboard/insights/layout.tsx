import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Behavioral Insights',
  description:
    'Psychology diagnostics: FOMO vs. Revenge trading correlation, hold-time bias analysis, and emotion-driven P&L breakdown.',
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

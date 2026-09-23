import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Checklists',
  description:
    'Pre-market and pre-trade checklists to enforce discipline. Build consistent habits and reduce emotional trading decisions.',
};

export default function ChecklistsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

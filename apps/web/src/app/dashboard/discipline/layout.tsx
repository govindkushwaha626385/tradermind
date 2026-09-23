import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discipline & Rules',
  description:
    'Monitor your trader discipline score, rule compliance rate, tilt streaks, and trading psychology habits.',
};

export default function DisciplineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

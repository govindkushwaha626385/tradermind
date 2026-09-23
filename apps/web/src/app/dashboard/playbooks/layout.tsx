import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playbooks & Setups',
  description:
    'Document setups, define entry triggers, stop loss strategies, and target criteria for repeatable trading playbooks.',
};

export default function PlaybooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

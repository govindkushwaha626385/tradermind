import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Journal',
  description:
    'Psychology and trade review journal with emotional tagging, mistake tracking, strategy alignment, and notes.',
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

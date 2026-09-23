import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Trading Assistant',
  description:
    'Chat with your AI trading coach. Query journal history, uncover psychological leaks, and formulate data-backed rules.',
};

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

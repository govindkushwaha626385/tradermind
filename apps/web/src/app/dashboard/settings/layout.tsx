import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description:
    'Manage your profile, broker API credentials, notification channels, security, and subscription billing.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

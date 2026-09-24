// ──────────────────────────────────────────────
// TradeMind — Mobile Bottom Navigation Bar
//
// Sticky bottom nav for mobile/tablet (hidden on lg+).
// 5 primary tabs + "More" drawer for the rest.
// Safe-area aware (iOS home indicator).
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  BarChart3,
  MoreHorizontal,
  X,
  Brain,
  ClipboardCheck,
  Trophy,
  Calculator,
  Settings,
  Plug,
  Sparkles,
  BookMarked,
  ListChecks,
  ShoppingBag,
  PackageCheck,
  Handshake,
  Target,
  Shield,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY_TABS = [
  { label: 'Home',      href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Journal',   href: '/dashboard/journal',   icon: BookOpen },
  { label: 'Trades',    href: '/dashboard/trades',    icon: TrendingUp },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'More',      href: null,                   icon: MoreHorizontal },
];

const MORE_ITEMS = [
  { label: 'AI Copilot',  href: '/dashboard/ai-assistant', icon: Sparkles },
  { label: 'Prop Firm',   href: '/dashboard/prop-firm',    icon: Award },
  { label: 'Strategies',  href: '/dashboard/strategies',   icon: Target },
  { label: 'Discipline',  href: '/dashboard/discipline',   icon: ClipboardCheck },
  { label: 'Leaderboard', href: '/dashboard/leaderboard',  icon: Trophy },
  { label: 'Calculators', href: '/dashboard/calculators',  icon: Calculator },
  { label: 'Insights',    href: '/dashboard/insights',     icon: Brain },
  { label: 'Playbooks',   href: '/dashboard/playbooks',    icon: BookMarked },
  { label: 'Checklists',  href: '/dashboard/checklists',   icon: ListChecks },
  { label: 'Brokers',     href: '/dashboard/brokers',      icon: Plug },
  { label: 'Store',       href: '/dashboard/store',        icon: ShoppingBag },
  { label: 'Purchases',   href: '/dashboard/purchases',    icon: PackageCheck },
  { label: 'Partners',    href: '/dashboard/partners',     icon: Handshake },
  { label: 'Settings',    href: '/dashboard/settings',     icon: Settings },
];

interface BottomNavBarProps {
  userRole?: string | null;
}

export function BottomNavBar({ userRole }: BottomNavBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 lg:hidden',
          'transition-transform duration-300 ease-out',
          moreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        )}
      >
        <div className="mx-3 mb-2 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">All Sections</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {MORE_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                </Link>
              );
            })}

            {userRole === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all',
                  pathname.startsWith('/admin')
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-500/10',
                )}
              >
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-medium">Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
          'glass border-t border-gray-200/50 dark:border-gray-800/50',
          'pb-[env(safe-area-inset-bottom)]',
        )}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center h-14">
          {PRIMARY_TABS.map((tab) => {
            const active = tab.href ? isActive(tab.href) : moreOpen;

            if (tab.href === null) {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-full',
                    'text-xs font-medium transition-colors',
                    moreOpen
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-label="More menu"
                  aria-expanded={moreOpen}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px]">{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 h-full',
                  'text-xs font-medium transition-colors relative',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={tab.label}
              >
                {active && (
                  <span className="absolute top-1.5 w-4 h-0.5 rounded-full bg-primary" />
                )}
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

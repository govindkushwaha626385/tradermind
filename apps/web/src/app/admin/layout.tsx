// ──────────────────────────────────────────────
// TradeMind — Admin Layout (Upgraded)
//
// - Verifies session token (redirects to /login)
// - Shared sidebar for all /admin/** pages
// - Mobile hamburger + slide-in drawer
// - Admin user info in sidebar footer
// - Role-check is enforced at the API level
// ──────────────────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutGrid,
  Users,
  CreditCard,
  History,
  BookOpen,
  LineChart,
  Building2,
  Receipt,
  RefreshCw,
  Percent,
  LogOut,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  ShoppingBag,
  Star,
  Trophy,
  TrendingUp,
  Handshake,
  Megaphone,
  Zap,
  Trash2,
  Target,
  Cpu,
  Sparkles,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api, getAccessToken } from '@/lib/api';
import { AdminBroadcastModal } from '@/components/admin/AdminBroadcastModal';
import { toast } from '@/components/Toast';

const ADMIN_NAV = [
  { label: 'Dashboard',      href: '/admin',               icon: LayoutGrid },
  { label: 'News & Macro',   href: '/admin/news',          icon: Newspaper },
  { label: 'AI Engine',      href: '/admin/ai',            icon: Sparkles },
  { label: 'Partners',       href: '/admin/partners',      icon: Handshake },
  { label: 'Billing',        href: '/admin/billing',       icon: TrendingUp },
  { label: 'Leaderboard',    href: '/admin/leaderboard',   icon: Trophy },
  { label: 'Strategies',     href: '/admin/strategies',    icon: Target },
  { label: 'Store Products', href: '/admin/store',         icon: ShoppingBag },
  { label: 'Reviews',        href: '/admin/reviews',       icon: Star },
  { label: 'Users',          href: '/admin/users',         icon: Users },
  { label: 'Plans',          href: '/admin/plans',         icon: CreditCard },
  { label: 'Subscriptions',  href: '/admin/subscriptions', icon: History },
  { label: 'Journal',        href: '/admin/journal',       icon: BookOpen },
  { label: 'Executions',     href: '/admin/executions',    icon: LineChart },
  { label: 'Brokers',        href: '/admin/brokers',       icon: Building2 },
  { label: 'Invoices',       href: '/admin/invoices',      icon: Receipt },
  { label: 'Worker Queue',   href: '/admin/jobs',          icon: Cpu },
  { label: 'Sync Logs',      href: '/admin/sync-logs',     icon: RefreshCw },
  { label: 'Audit Logs',     href: '/admin/audit-logs',    icon: Shield },
  { label: 'Tax Rates',      href: '/admin/tax-rates',     icon: Percent },
];

function getInitials(name?: string | null): string {
  if (!name) return 'A';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized]     = useState(false);
  const [mobileSidebarOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName]       = useState<string | null>(null);
  const [adminEmail, setAdminEmail]     = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pingingDb, setPingingDb]       = useState(false);
  const [dbLatencyMs, setDbLatencyMs]   = useState<number | null>(null);
  const [flushingCache, setFlushingCache] = useState(false);

  const handlePingDb = async () => {
    setPingingDb(true);
    try {
      const res = await api.adminPingDb();
      if (res.success && res.data) {
        setDbLatencyMs(res.data.latencyMs);
        toast.success(`Database Pong: ${res.data.latencyMs}ms (${res.data.status})`);
      } else {
        toast.error('Database ping failed');
      }
    } catch {
      toast.error('Database connection timed out');
    } finally {
      setPingingDb(false);
    }
  };

  const handleFlushCache = async () => {
    setFlushingCache(true);
    try {
      const res = await api.adminFlushCache();
      if (res.success) {
        toast.success('Purged all L1 in-memory and L2 Redis cache keys across cluster');
      } else {
        toast.error('Failed to flush cache');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to flush cache');
    } finally {
      setFlushingCache(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // Verify admin privileges
    api.getProfile().then((res) => {
      if (res.success) {
        const p = res.data as any;
        if (p.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        setAdminName(p.name ?? null);
        setAdminEmail(p.email ?? null);
        setAuthorized(true);
      } else {
        router.push('/login');
      }
    }).catch(() => {
      router.push('/login');
    });
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const currentItem = ADMIN_NAV.find((item) => isActive(item.href));
  const initials    = getInitials(adminName);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border/50 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Admin Panel</div>
          <div className="text-[11px] text-muted-foreground leading-tight">TradeMind</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden',
                active
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 sidebar-active-bar'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 space-y-1 shrink-0">
        {/* Admin user info */}
        {adminName && (
          <div className="px-3 py-2 rounded-xl flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{adminName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{adminEmail}</div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 uppercase tracking-wider flex-shrink-0">
              ADMIN
            </span>
          </div>
        )}

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-full"
        >
          <ExternalLink className="w-4 h-4" />
          Back to App
        </Link>
        <button
          onClick={() => {
            api.logout();
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 flex">

      {/* ── Mobile overlay ───────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ─────────── */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-60 glass border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col transition-transform duration-300 lg:hidden',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Close btn */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Desktop Sidebar ───────────────── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 glass border-r border-gray-200/50 dark:border-gray-800/50 fixed top-0 left-0 h-full z-40">
        <SidebarContent />
      </aside>

      {/* ── Main Content ─────────────────── */}
      <div className="flex-1 lg:ml-56 xl:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 glass border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground"
              aria-label="Open admin sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Admin breadcrumb">
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
              {currentItem && currentItem.href !== '/admin' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-foreground font-medium">{currentItem.label}</span>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Ribbon */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBroadcastOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
              title="Site-wide Announcements & Maintenance Mode"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Broadcast</span>
            </button>

            <button
              onClick={handlePingDb}
              disabled={pingingDb}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
              title="Measure database connection latency"
            >
              <Zap className={cn('w-3.5 h-3.5 text-emerald-500', pingingDb && 'animate-pulse')} />
              <span>{pingingDb ? '...' : dbLatencyMs !== null ? `${dbLatencyMs}ms` : 'Ping DB'}</span>
            </button>

            <button
              onClick={handleFlushCache}
              disabled={flushingCache}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
              title="Purge all L1 in-memory and L2 Redis cache keys"
            >
              <Trash2 className={cn('w-3.5 h-3.5', flushingCache && 'animate-spin')} />
              <span className="hidden md:inline">Flush Cache</span>
            </button>

            {/* Admin badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
              <Shield className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 hidden xs:inline">Admin Mode</span>
            </div>
          </div>
        </header>

        {/* Global Broadcast & Emergency Maintenance Modal */}
        <AdminBroadcastModal
          isOpen={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
        />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

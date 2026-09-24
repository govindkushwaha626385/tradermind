// ──────────────────────────────────────────────
// TradeMind — Dashboard Layout v2
//
// Features:
// - Grouped sidebar with section headers (MAIN / ANALYSIS / TOOLS / ACCOUNT)
// - Mini-mode (64px collapsed, 240px expanded) with smooth animation
// - Sidebar footer: user avatar + plan badge + role chip
// - Topbar: breadcrumb | search hint | admin badge + theme + notifications + avatar
// - Impersonation banner
// - Mobile: full-screen slide-in sidebar + bottom nav
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Brain,
  Settings,
  Plug,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  BookMarked,
  ClipboardCheck,
  ListChecks,
  Moon,
  Sun,
  Shield,
  ChevronRight as ChevronRightCrumb,
  Sparkles,
  ShoppingBag,
  PackageCheck,
  Calculator,
  Target,
  Trophy,
  Handshake,
  Search,
  Bell,
  Zap,
  Command,
  Flag,
  Play,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api, setAccessToken } from '@/lib/api';
import { NotificationPanel } from '@/components/NotificationPanel';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { BottomNavBar } from '@/components/BottomNavBar';
import { QuickTradeCapture } from '@/components/QuickTradeCapture';
import { QuickCommandPalette } from '@/components/QuickCommandPalette';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { AccountPortfolioSelector } from '@/components/dashboard/AccountPortfolioSelector';
import { QuickSyncButton } from '@/components/QuickSyncButton';
import { TiltProtectionModal } from '@/components/discipline/TiltProtectionModal';
import { BehavioralInterventionBanner } from '@/components/discipline/BehavioralInterventionBanner';
import { GlobalMarketTicker } from '@/components/dashboard/GlobalMarketTicker';
import { PlatformTourModal } from '@/components/education/PlatformTourModal';
import { EodReviewModal } from '@/components/discipline/EodReviewModal';
import { HelpCircle } from 'lucide-react';

// ── Sidebar nav groups ─────────────────────────────────────────────

const SIDEBAR_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',   href: '/dashboard',             icon: LayoutDashboard },
      { label: 'AI Copilot',  href: '/dashboard/ai-assistant', icon: Sparkles },
    ],
  },
  {
    label: 'Trading',
    items: [
      { label: 'Journal',     href: '/dashboard/journal',     icon: BookOpen },
      { label: 'Trades',      href: '/dashboard/trades',      icon: TrendingUp },
      { label: 'Prop Firm',   href: '/dashboard/prop-firm',   icon: Award },
      { label: 'Replay',      href: '/dashboard/replay',      icon: Play },
      { label: 'Strategies',  href: '/dashboard/strategies',  icon: Target },
      { label: 'Checklists',  href: '/dashboard/checklists',  icon: ListChecks },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Analytics',   href: '/dashboard/analytics',   icon: BarChart3 },
      { label: 'Discipline',  href: '/dashboard/discipline',  icon: ClipboardCheck },
      { label: 'Insights',    href: '/dashboard/insights',    icon: Brain },
      { label: 'Goals',       href: '/dashboard/goals',       icon: Flag },
      { label: 'Playbooks',   href: '/dashboard/playbooks',   icon: BookMarked },
      { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Calculators', href: '/dashboard/calculators', icon: Calculator },
      { label: 'Brokers',     href: '/dashboard/brokers',     icon: Plug },
      { label: 'Store',       href: '/dashboard/store',       icon: ShoppingBag },
      { label: 'Purchases',   href: '/dashboard/purchases',   icon: PackageCheck },
      { label: 'Partners',    href: '/dashboard/partners',    icon: Handshake },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings',    href: '/dashboard/settings',    icon: Settings },
    ],
  },
];

// Flat list for breadcrumb lookup
const ALL_ITEMS = SIDEBAR_GROUPS.flatMap((g) => g.items);

/** Returns up to 2 initials from a name string. */
function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Plan badge colour mapping */
function planBadgeClass(plan: string | null): string {
  if (!plan) return 'badge-neutral';
  const p = plan.toLowerCase();
  if (p.includes('pro') || p.includes('elite')) return 'badge-gold';
  if (p.includes('free') || p.includes('trial')) return 'badge-neutral';
  return 'badge-brand';
}

// ── Nav item shared between desktop & mobile ───────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={cn(
        'relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden group/item',
        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-3 py-2.5',
        isActive
          ? 'bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-text))] font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover-bg))]',
      )}
    >
      {/* Left active bar */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-[20%] h-[60%] w-0.5 rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          'flex-shrink-0 transition-transform duration-200',
          collapsed ? 'w-5 h-5' : 'w-4 h-4',
          isActive ? 'text-[hsl(var(--sidebar-item-active-text))]' : '',
          !isActive && 'group-hover/item:scale-110',
        )}
      />
      {!collapsed && <span className="truncate leading-none">{label}</span>}

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-popover border border-border rounded-lg shadow-card-lg whitespace-nowrap z-50 opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity duration-150">
          {label}
        </span>
      )}
    </Link>
  );
}

// ── Sidebar inner content ──────────────────────────────────────────

function SidebarContent({
  pathname,
  collapsed,
  userRole,
  userName,
  userEmail,
  userPlan,
  onClose,
  onLogout,
}: {
  pathname: string;
  collapsed?: boolean;
  userRole: string | null;
  userName: string | null;
  userEmail: string | null;
  userPlan: string | null;
  onClose?: () => void;
  onLogout: () => void;
}) {
  const initials = getInitials(userName);

  return (
    <>
      {/* Navigation groups */}
      <nav
        className="flex-1 py-3 overflow-y-auto scrollbar-thin"
        aria-label="Main navigation"
      >
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Section label (hidden in collapsed mode) */}
            {!collapsed && (
              <p className="sidebar-section-label">{group.label}</p>
            )}
            {collapsed && <div className="my-1 mx-2 h-px bg-border/50" />}

            <div className={cn('space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    {...item}
                    isActive={isActive}
                    collapsed={collapsed}
                    onClick={onClose}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin link */}
        {userRole === 'ADMIN' && (
          <div className={cn('mt-2', collapsed ? 'px-1' : 'px-2')}>
            <Link
              href="/admin"
              title={collapsed ? 'Admin Console' : undefined}
              onClick={onClose}
              className={cn(
                'relative flex items-center rounded-xl text-sm font-semibold transition-all duration-150 border overflow-hidden group/item',
                collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-3 py-2.5',
                pathname.startsWith('/admin')
                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                  : 'text-destructive border-destructive/20 hover:bg-destructive/10',
              )}
            >
              <Shield className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span>Admin Console</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-popover border border-border rounded-lg shadow-card-lg whitespace-nowrap z-50 opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity duration-150">
                  Admin Console
                </span>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Footer: user info + sign out */}
      <div className="border-t border-border/50 shrink-0">
        {!collapsed && userName && (
          <div className="px-3 py-3 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground truncate leading-tight">
                {userName}
              </div>
              <div className="text-[0.625rem] text-muted-foreground truncate leading-tight mt-0.5">
                {userEmail}
              </div>
            </div>
            {userPlan && (
              <span className={cn('badge flex-shrink-0', planBadgeClass(userPlan))}>
                {userPlan.toUpperCase().slice(0, 5)}
              </span>
            )}
          </div>
        )}

        <div className={cn('space-y-0.5 pb-2', collapsed ? 'px-1' : 'px-2')}>
          <button
            onClick={onLogout}
            className={cn(
              'flex items-center rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover-bg))] transition-all duration-150 w-full group/item relative',
              collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-3 py-2.5',
            )}
            aria-label="Sign out"
          >
            <LogOut className={cn('flex-shrink-0 group-hover/item:scale-110 transition-transform', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!collapsed && <span>Sign Out</span>}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-popover border border-border rounded-lg shadow-card-lg whitespace-nowrap z-50 opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity duration-150">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Layout ────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // User profile state
  const [userName, setUserName]   = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPlan, setUserPlan]   = useState<string | null>(null);
  const [userRole, setUserRole]   = useState<string | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tiltModalOpen, setTiltModalOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut & '?' tour shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowTour(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const handleOpenTour = () => setShowTour(true);
    window.addEventListener('open-platform-tour', handleOpenTour);
    return () => window.removeEventListener('open-platform-tour', handleOpenTour);
  }, []);

  const [eodReviewOpen, setEodReviewOpen] = useState(false);

  useEffect(() => {
    const handleOpenEod = () => setEodReviewOpen(true);
    window.addEventListener('open-eod-review', handleOpenEod);
    return () => window.removeEventListener('open-eod-review', handleOpenEod);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const impStr = sessionStorage.getItem('trademind_impersonated_user');
      if (impStr) {
        try { setImpersonatedUser(JSON.parse(impStr)); } catch {}
      }
    }
  }, []);

  // ── Dark mode ─────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('trademind_theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('trademind_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── Load user profile ─────────────────────────────────────────────
  useEffect(() => {
    api.getProfile().then((res) => {
      if (res.success) {
        const p = res.data as any;
        setUserName(p.name ?? null);
        setUserEmail(p.email ?? null);
        setUserPlan(p.plan?.name ?? p.subscription?.planSlug ?? null);
        setUserRole(p.role ?? null);
      }
    }).catch((err: any) => {
      if (err?.status === 401) {
        router.push('/login');
      }
    });
  }, [router]);

  // ── Load onboarding status ────────────────────────────────────────
  useEffect(() => {
    api.getOnboardingStatus().then((res) => {
      if (res.success) {
        const status = res.data as any;
        const isComplete = status?.isComplete ?? status?.completed ?? false;
        if (!isComplete) setShowOnboarding(true);
      }
    }).catch(() => {});
  }, []);

  const handleOnboardingComplete = useCallback(() => setShowOnboarding(false), []);

  const handleLogout = useCallback(async () => {
    try { await api.logout(); } catch {}
    sessionStorage.removeItem('trademind_access_token');
    window.location.href = '/login';
  }, []);

  // Breadcrumb
  const breadcrumb = ALL_ITEMS.find((item) =>
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href),
  );

  const initials = getInitials(userName);

  const SIDEBAR_W     = sidebarCollapsed ? 64  : 240;
  const SIDEBAR_W_CLS = sidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Mobile overlay ──────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Onboarding Wizard ───────────────────── */}
      <OnboardingWizard isOpen={showOnboarding} onComplete={handleOnboardingComplete} />

      {/* ── Desktop Sidebar ─────────────────────── */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300 ease-spring',
          'hidden lg:flex',
          SIDEBAR_W_CLS,
          'border-r border-border/60',
          'bg-[hsl(var(--sidebar-bg))]',
        )}
        aria-label="Sidebar navigation"
      >
        {/* Sidebar header — logo + collapse toggle */}
        <div className="h-14 flex items-center justify-between shrink-0 border-b border-border/50 px-3">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0 group/logo">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-brand group-hover/logo:scale-105 transition-transform duration-200">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-sm tracking-tight font-display truncate">
                TradeMind
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <ChevronLeft className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        <SidebarContent
          pathname={pathname}
          collapsed={sidebarCollapsed}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          userPlan={userPlan}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile Sidebar ──────────────────────── */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col transition-transform duration-300 ease-spring lg:hidden',
          'border-r border-border/60 bg-[hsl(var(--sidebar-bg))]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Mobile navigation"
      >
        <div className="h-14 flex items-center justify-between shrink-0 border-b border-border/50 px-3">
          <Link
            href="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-brand">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight font-display">TradeMind</span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SidebarContent
          pathname={pathname}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          userPlan={userPlan}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Main Content area ───────────────────── */}
      <div
        className={cn(
          'transition-all duration-300 ease-spring min-h-screen flex flex-col',
          'lg:ml-60',
          sidebarCollapsed && 'lg:ml-16',
        )}
      >
        {/* ── Top Bar ─────────────────────────── */}
        <header className="h-14 glass border-b border-border/50 flex items-center justify-between px-4 sm:px-5 sticky top-0 z-30 shrink-0">
          {/* Left: hamburger (mobile) + breadcrumb (desktop) */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <nav className="hidden lg:flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Dashboard
              </Link>
              {breadcrumb && breadcrumb.href !== '/dashboard' && (
                <>
                  <ChevronRightCrumb className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-foreground font-semibold">{breadcrumb.label}</span>
                </>
              )}
            </nav>

            {/* Mobile: page title */}
            <span className="lg:hidden text-sm font-semibold text-foreground">
              {breadcrumb?.label ?? 'Dashboard'}
            </span>
          </div>

          {/* Center: Search hint (desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-muted-foreground text-xs transition-colors group cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Search trades, journal…</span>
              <span className="flex items-center gap-0.5 flex-shrink-0 text-[0.625rem] font-medium bg-background border border-border rounded px-1 py-0.5">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Admin badge */}
            {userRole === 'ADMIN' && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/15 transition-colors"
                title="Admin Console"
              >
                <Shield className="w-3 h-3" />
                Admin
              </Link>
            )}

            {/* One-Click Quick Broker Sync */}
            <QuickSyncButton />

            {/* Multi-Account Portfolio Scope Switcher */}
            <AccountPortfolioSelector />

            {/* Global Currency Switcher */}
            <CurrencySwitcher />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Notifications */}
            <NotificationPanel onUnreadChange={setHasUnread} />

            {/* Platform Tour & Academy */}
            <button
              onClick={() => setShowTour(true)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Platform Tour & Learning Academy"
              aria-label="Platform Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* User avatar → settings */}
            <Link
              href="/dashboard/settings"
              title={userName ?? 'Settings'}
              aria-label="User settings"
              className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity select-none shadow-sm flex-shrink-0"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* ── Global Market Session Tape ──── */}
        <GlobalMarketTicker />

        {/* ── Real-Time Behavioral Risk Intervention Banner & Audio Chime ──── */}
        <BehavioralInterventionBanner />

        {/* ── Impersonation Warning Banner ──── */}
        {impersonatedUser && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-medium sticky top-14 z-30 shrink-0">
            <div className="flex items-center gap-2">
              <span>👁️</span>
              <span>
                Viewing as{' '}
                <strong>{impersonatedUser.name || impersonatedUser.email}</strong>{' '}
                ({impersonatedUser.role ?? 'USER'}) — Admin Impersonation Active
              </span>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('trademind_impersonation_token');
                sessionStorage.removeItem('trademind_impersonated_user');
                window.location.href = '/admin/users';
              }}
              className="px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-white text-xs font-bold transition-colors ml-4 shrink-0"
            >
              Exit
            </button>
          </div>
        )}

        {/* ── Page content ─────────────────── */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 pb-24 lg:pb-8 max-w-[1600px] w-full mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ─────────── */}
      <BottomNavBar userRole={userRole} />

      {/* ── Mobile Quick Trade Capture FAB ────── */}
      <QuickTradeCapture />

      {/* ── Quick Command Palette (Cmd+K / Ctrl+K) ── */}
      <QuickCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        userRole={userRole}
        onTriggerTilt={() => setTiltModalOpen(true)}
      />

      {/* ── Psychological Tilt Shield Modal ── */}
      <TiltProtectionModal
        isOpen={tiltModalOpen}
        onClose={() => setTiltModalOpen(false)}
      />

      {/* ── Interactive Platform Tour & Academy Modal ── */}
      <PlatformTourModal
        isOpen={showTour}
        onClose={() => setShowTour(false)}
      />

      {/* ── End-of-Day (EOD) Guided Wrap-Up Ritual Modal ── */}
      <EodReviewModal
        isOpen={eodReviewOpen}
        onClose={() => setEodReviewOpen(false)}
      />
    </div>
  );
}

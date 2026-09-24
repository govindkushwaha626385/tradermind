// ──────────────────────────────────────────────
// TradeMind — Quick Command Palette (Cmd+K / Ctrl+K)
// Fast navigation, instant actions & workflow shortcuts
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  BarChart3,
  Brain,
  Target,
  Sparkles,
  Calculator,
  Plug,
  Settings,
  Shield,
  Clock,
  PlayCircle,
  Trophy,
  ShoppingBag,
  ListChecks,
  X,
  ArrowRight,
  Flame,
  ShieldAlert,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet,
  Calendar,
  Award,
  Coins,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/hooks/useCurrency';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  icon: any;
  href?: string;
  action?: () => void;
  shortcut?: string;
  badge?: string;
}

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string | null;
  onTriggerTilt?: () => void;
}

export function QuickCommandPalette({ isOpen, onClose, userRole, onTriggerTilt }: QuickCommandPaletteProps) {
  const router = useRouter();
  const { setCurrency, currency } = useCurrency();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      { id: 'nav-dash', title: 'Dashboard Home', category: 'Navigation', icon: LayoutDashboard, href: '/dashboard', shortcut: 'D' },
      { id: 'nav-journal', title: 'Trading Journal & Logs', category: 'Navigation', icon: BookOpen, href: '/dashboard/journal', shortcut: 'J' },
      { id: 'nav-trades', title: 'Executions & Order Blotter', category: 'Navigation', icon: TrendingUp, href: '/dashboard/trades', shortcut: 'T' },
      { id: 'nav-prop-firm', title: 'Prop Firm Challenges (FTMO, FundedNext, Apex)', category: 'Navigation', icon: Award, href: '/dashboard/prop-firm', badge: 'Challenges' },
      { id: 'nav-replay', title: 'Visual Trade Replay Studio & Live Chart', category: 'Navigation', icon: PlayCircle, href: '/dashboard/replay', shortcut: 'R', badge: 'TradingView' },
      { id: 'nav-analytics', title: 'Performance Analytics & MFE/MAE', category: 'Navigation', icon: BarChart3, href: '/dashboard/analytics', shortcut: 'A' },
      { id: 'nav-goals', title: 'Trader Goals & Targets', category: 'Navigation', icon: Target, href: '/dashboard/goals' },
      { id: 'nav-ai', title: 'AI Copilot & Chart Vision', category: 'Navigation', icon: Brain, href: '/dashboard/ai-assistant', badge: 'AI' },
      { id: 'nav-playbooks', title: 'Setup Playbooks', category: 'Navigation', icon: Flame, href: '/dashboard/playbooks' },
      { id: 'nav-discipline', title: 'Discipline & Rulebook Studio', category: 'Navigation', icon: ListChecks, href: '/dashboard/checklists', shortcut: 'K' },
      { id: 'nav-calculators', title: '18 Pro Calculators (FX/Crypto Pip, Greeks)', category: 'Navigation', icon: Calculator, href: '/dashboard/calculators', shortcut: 'C' },
      { id: 'nav-leaderboard', title: 'Trader Leaderboard', category: 'Navigation', icon: Trophy, href: '/dashboard/leaderboard' },
      { id: 'nav-brokers', title: 'Broker Connections (Zerodha, Dhan, etc.)', category: 'Navigation', icon: Plug, href: '/dashboard/brokers', shortcut: 'B' },
      { id: 'nav-settings', title: 'Preferences & Currency Settings', category: 'Navigation', icon: Settings, href: '/dashboard/settings' },

      // Quick Actions
      {
        id: 'act-shortcuts',
        title: 'Keyboard Shortcuts Cheat Sheet (Power-User Hotkeys)',
        category: 'Actions',
        icon: Keyboard,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts'));
        },
        badge: 'Hotkeys',
        shortcut: '?',
      },
      {
        id: 'act-sync-now',
        title: 'Instant Broker Sync (Groww, Zerodha, Dhan, Angel One)',
        category: 'Actions',
        icon: RefreshCw,
        action: async () => {
          onClose();
          toast.info('Starting broker trade sync...');
          try {
            const list = await api.getBrokers();
            const connList = (list as any)?.data ?? [];
            if (connList.length > 0) {
              const active = connList.find((c: any) => c.status === 'ACTIVE') || connList[0];
              await api.syncBroker(active.id);
              toast.success(`Synced trades with ${active.label || active.brokerId}`);
              window.dispatchEvent(new CustomEvent('broker-synced'));
            } else {
              toast.warning('No active broker connected yet. Redirecting to Broker Hub...');
              router.push('/dashboard/brokers');
            }
          } catch (e: any) {
            toast.error(e?.message || 'Sync failed');
          }
        },
        badge: 'Sync',
        shortcut: 'Cmd+S',
      },
      {
        id: 'act-start-tour',
        title: 'Launch Interactive Platform Tour & Learning Guide',
        category: 'Actions',
        icon: HelpCircle,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-platform-tour'));
        },
        badge: 'Academy',
        shortcut: 'Shift+T',
      },
      {
        id: 'act-eod-review',
        title: 'End-of-Day (EOD) Guided Wrap-Up Ritual & Blueprint',
        category: 'Actions',
        icon: Sparkles,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-eod-review'));
        },
        badge: 'Ritual',
        shortcut: 'E',
      },
      {
        id: 'act-premarket',
        title: 'Launch Pre-Market Execution Routine Checklist',
        category: 'Actions',
        icon: Clock,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-premarket-routine'));
        },
        badge: 'Routine',
        shortcut: 'P',
      },
      {
        id: 'act-position-calc',
        title: 'Instant Position Sizing & Risk Calculator',
        category: 'Actions',
        icon: Calculator,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-position-calculator'));
        },
        badge: 'Risk',
        shortcut: 'SIZE',
      },
      { id: 'act-import', title: 'Import Broker CSV (Tradebook / Orders)', category: 'Actions', icon: Plug, href: '/dashboard/brokers', badge: 'CSV' },
      { id: 'act-new-trade', title: 'Log a Manual Trade Execution', category: 'Actions', icon: TrendingUp, href: '/dashboard/trades' },
      { id: 'act-store', title: 'Browse Store & Playbooks', category: 'Actions', icon: ShoppingBag, href: '/dashboard/purchases' },
      {
        id: 'act-tilt',
        title: 'Psychological Tilt Circuit Breaker (Cool-Off & Box Breathing)',
        category: 'Actions',
        icon: ShieldAlert,
        action: () => {
          onClose();
          onTriggerTilt?.();
        },
        badge: 'Shield',
      },

      // Tools & Currency
      {
        id: 'tool-calendar',
        title: 'P&L Calendar Heatmap & Day Drilldown',
        category: 'Tools',
        icon: Calendar,
        href: '/dashboard/analytics?tab=calendar',
        badge: 'Heatmap',
      },
      {
        id: 'tool-tax',
        title: 'Tax Report & Statutory Charges (STT, GST, SEBI)',
        category: 'Tools',
        icon: FileSpreadsheet,
        href: '/dashboard/analytics?tab=tax',
        badge: 'Tax P&L',
      },
      {
        id: 'cur-inr',
        title: `Switch Display Currency to INR (₹) ${currency === 'INR' ? '• Active' : ''}`,
        category: 'Tools',
        icon: Coins,
        action: () => {
          setCurrency('INR');
          toast.success('Display currency switched to INR (₹)');
          onClose();
        },
      },
      {
        id: 'cur-usd',
        title: `Switch Display Currency to USD ($) ${currency === 'USD' ? '• Active' : ''}`,
        category: 'Tools',
        icon: Coins,
        action: () => {
          setCurrency('USD');
          toast.success('Display currency switched to USD ($)');
          onClose();
        },
      },
      {
        id: 'cur-usdt',
        title: `Switch Display Currency to USDT (₮) ${currency === 'USDT' ? '• Active' : ''}`,
        category: 'Tools',
        icon: Coins,
        action: () => {
          setCurrency('USDT');
          toast.success('Display currency switched to USDT (₮)');
          onClose();
        },
      },
    ];

    if (userRole === 'ADMIN') {
      list.push({
        id: 'nav-admin',
        title: 'Admin Governance Console',
        category: 'Navigation',
        icon: Shield,
        href: '/admin',
        badge: 'Admin',
      });
    }

    return list;
  }, [userRole]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page, or action..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-96 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all select-none',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-primary/10 text-primary border border-primary/20',
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-mono',
                          isSelected ? 'bg-white/20 text-white' : 'bg-muted border border-border text-muted-foreground',
                        )}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={cn(
                        'w-3.5 h-3.5 transition-transform',
                        isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-0',
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-semibold text-primary">TradeMind Pro</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Institutional Keyboard Shortcuts Cheat Sheet Modal
// Fast power-user navigation, workflow shortcuts, and execution triggers
// Accessible via pressing '?' or clicking the shortcuts badge
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Keyboard,
  Search,
  Zap,
  Navigation,
  Sparkles,
  Command,
  BookOpen,
  LineChart,
  Calculator,
  TrendingUp,
  BarChart3,
  Plug,
  ShieldAlert,
  Sun,
  Moon,
  HelpCircle,
  Compass,
  Flame,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions & Rituals' | 'System & Overlays';
  icon: any;
  href?: string;
}

const SHORTCUT_ITEMS: ShortcutItem[] = [
  // Navigation
  { keys: ['J'], description: 'Jump to Trading Journal & Logs', category: 'Navigation', icon: BookOpen, href: '/dashboard/journal' },
  { keys: ['R'], description: 'Open Visual Trade Replay & Live Chart', category: 'Navigation', icon: LineChart, href: '/dashboard/replay' },
  { keys: ['C'], description: 'Open 18 Pro Financial Calculators', category: 'Navigation', icon: Calculator, href: '/dashboard/calculators' },
  { keys: ['T'], description: 'Open Order Executions & Blotter', category: 'Navigation', icon: TrendingUp, href: '/dashboard/trades' },
  { keys: ['A'], description: 'Open Performance Analytics & Heatmaps', category: 'Navigation', icon: BarChart3, href: '/dashboard/analytics' },
  { keys: ['D'], description: 'Jump to Dashboard Overview', category: 'Navigation', icon: Navigation, href: '/dashboard' },
  { keys: ['B'], description: 'Open Multi-Broker Hub & Sync', category: 'Navigation', icon: Plug, href: '/dashboard/brokers' },
  { keys: ['M'], description: 'Jump to Trader Progression Roadmap', category: 'Navigation', icon: Compass, href: '/dashboard/roadmap' },
  { keys: ['K'], description: 'Open Checklist & Rulebook Studio', category: 'Navigation', icon: Zap, href: '/dashboard/checklists' },

  // Actions & Rituals
  { keys: ['7'], description: 'The 7 Golden Rules Execution Protocol', category: 'Actions & Rituals', icon: Flame },
  { keys: ['N'], description: 'Toggle Global Macro News & Economic Calendar', category: 'Actions & Rituals', icon: Newspaper },
  { keys: ['⌘', 'K'], description: 'Open Universal Command Palette', category: 'Actions & Rituals', icon: Command },
  { keys: ['P'], description: 'Launch Pre-Market Morning Routine', category: 'Actions & Rituals', icon: Sun },
  { keys: ['E'], description: 'Launch Post-Market EOD Wrap-Up', category: 'Actions & Rituals', icon: Moon },
  { keys: ['S'], description: 'Trigger Quick Broker Trade Sync', category: 'Actions & Rituals', icon: Zap },
  { keys: ['⌘', 'B'], description: 'Trigger Behavioral Tilt Protection', category: 'Actions & Rituals', icon: ShieldAlert },

  // System & Overlays
  { keys: ['?'], description: 'Open Keyboard Shortcuts Cheat Sheet', category: 'System & Overlays', icon: Keyboard },
  { keys: ['Shift', 'T'], description: 'Launch Interactive Platform Tour', category: 'System & Overlays', icon: HelpCircle },
  { keys: ['Esc'], description: 'Close Active Modal / Dropdown / Tooltip', category: 'System & Overlays', icon: X },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [query, setQuery] = useState('');

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = SHORTCUT_ITEMS.filter((item) =>
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.keys.some((k) => k.toLowerCase().includes(query.toLowerCase())) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const categories = ['Navigation', 'Actions & Rituals', 'System & Overlays'] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-6 animate-bounce-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">
                Institutional power-user hotkeys for lightning-fast trading workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts (e.g. Journal, Replay, Sync, Command)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        {/* Shortcuts List Categorized */}
        <div className="space-y-6">
          {categories.map((cat) => {
            const group = filtered.filter((i) => i.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {cat}
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {group.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/60 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-background border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">
                            {item.description}
                          </span>
                        </div>

                        {/* Keycap Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, kIdx) => (
                            <kbd
                              key={kIdx}
                              className="px-2 py-1 rounded-lg bg-background border border-border/80 shadow-sm text-xs font-mono font-bold text-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No shortcuts found for "{query}".
            </p>
          )}
        </div>

        {/* Footer Pro-Tip */}
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">?</kbd> anywhere in the dashboard to toggle this menu.</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-primary hover:underline"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

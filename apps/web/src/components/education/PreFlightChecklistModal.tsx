// ──────────────────────────────────────────────
// TradeMind — Pre-Flight Institutional Execution Checklist
// Interactive pre-market risk governance checklist for active traders.
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Printer,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';

interface PreFlightChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckItem {
  id: string;
  category: 'MACRO' | 'TECHNICAL' | 'RISK' | 'PSYCHOLOGY';
  title: string;
  description: string;
}

const CHECKLIST_ITEMS: CheckItem[] = [
  {
    id: 'macro_news',
    category: 'MACRO',
    title: 'High-Impact Economic Calendar Checked',
    description: 'Confirmed no FOMC, CPI, RBI rate decision, or high-impact red-folder event within 15 mins of planned entry.',
  },
  {
    id: 'token_health',
    category: 'MACRO',
    title: 'Broker Access Token Active & Tested',
    description: 'Pre-market broker auth is valid with zero expiration warnings (Zerodha 6 AM refreshed, Dhan/Angel tokens verified).',
  },
  {
    id: 'htf_liquidity',
    category: 'TECHNICAL',
    title: 'Higher-Timeframe Directional Bias & Liquidity Sweep',
    description: '1H / 4H key liquidity pools identified (Asia high/low, prior day high/low, or major Fair Value Gap tapped).',
  },
  {
    id: 'mss_confirmed',
    category: 'TECHNICAL',
    title: 'Lower-Timeframe Market Structure Shift (MSS)',
    description: 'Displacement candle with clean body close confirmed on 1m/5m timeframe. No blind breakout guessing.',
  },
  {
    id: 'fixed_risk',
    category: 'RISK',
    title: 'Fixed Risk Size Enforced (≤ 1.0% Equity)',
    description: 'Lot / share quantity calculated strictly off Stop Loss distance. Zero sizing based on account size or optimism.',
  },
  {
    id: 'invalidation_anchored',
    category: 'RISK',
    title: 'Hard Invalidation Anchored Before Entry',
    description: 'Stop-loss order entered with broker simultaneously with entry. No mental stops under any circumstance.',
  },
  {
    id: 'tilt_reset',
    category: 'PSYCHOLOGY',
    title: 'Zero Tilt & Revenge Impulses',
    description: 'Heart rate steady. Completely detached from yesterday’s P&L. Ready to take 3 consecutive losses without emotional deviation.',
  },
  {
    id: 'max_daily_loss',
    category: 'PSYCHOLOGY',
    title: 'Daily Loss Limit & Kill Switch Acknowledged',
    description: 'Hard agreement to close screens immediately if 3R daily drawdown threshold is breached.',
  },
];

export function PreFlightChecklistModal({ isOpen, onClose }: PreFlightChecklistModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedIds(next);
  };

  const progressPercent = Math.round((checkedIds.size / CHECKLIST_ITEMS.length) * 100);
  const isAllReady = checkedIds.size === CHECKLIST_ITEMS.length;

  const handleReset = () => {
    setCheckedIds(new Set());
    toast.info('Checklist cleared for next session');
  };

  const handleCopy = () => {
    const text = CHECKLIST_ITEMS.map(
      (c) => `[${checkedIds.has(c.id) ? 'X' : ' '}] ${c.title} — ${c.description}`,
    ).join('\n');
    navigator.clipboard.writeText(`TradeMind Pre-Flight Risk Checklist (${new Date().toLocaleDateString()}):\n\n${text}`);
    setCopied(true);
    toast.success('Checklist copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border/80 bg-card/95 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border/60 flex items-start justify-between gap-4 bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Pre-Flight Execution Checklist
                </h3>
                <p className="text-xs text-muted-foreground">
                  Institutional 8-point gatekeeper before risking real market capital.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-accent/20 border-b border-border/40 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Pre-Market Clearance</span>
              <span className={cn('font-mono font-bold', isAllReady ? 'text-emerald-500' : 'text-primary')}>
                {checkedIds.size} / {CHECKLIST_ITEMS.length} Verified ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isAllReady ? 'bg-emerald-500' : 'bg-primary',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-all cursor-pointer shrink-0"
            title="Reset All"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Checklist Body */}
        <div className="p-6 overflow-y-auto space-y-3 divide-y divide-border/30 scrollbar-thin">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checkedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  'pt-3 first:pt-0 flex items-start gap-3.5 p-3 rounded-2xl cursor-pointer transition-all',
                  isChecked
                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                    : 'hover:bg-accent/40 border border-transparent',
                )}
              >
                <button
                  type="button"
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0',
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-border bg-background hover:border-primary',
                  )}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-bold transition-colors',
                        isChecked ? 'text-emerald-400 line-through opacity-80' : 'text-foreground',
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Routine'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              {isAllReady ? 'Clear for Market Open 🚀' : 'Done Checking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

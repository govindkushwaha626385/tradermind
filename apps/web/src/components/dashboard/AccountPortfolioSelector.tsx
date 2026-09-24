// ──────────────────────────────────────────────
// TradeMind — Multi-Account & Portfolio Scope Selector (v2.0)
//
// Institutional multi-broker portfolio filtering:
// - All Connected Accounts (Unified Balance & PnL)
// - Individual Broker Sub-Accounts (Zerodha, Dhan, Binance, Prop Firms)
// - Seamless instant filter dispatching to Dashboard & Journal
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  ChevronDown,
  Check,
  Plus,
  Plug,
  Layers,
  Radio,
  Building2,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export interface BrokerAccountItem {
  id: string;
  brokerId: string;
  label?: string;
  brokerClientId?: string;
  status: string;
}

export function AccountPortfolioSelector({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [brokers, setBrokers] = useState<BrokerAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read persisted account filter if any
    const saved = sessionStorage.getItem('trademind_active_account_id');
    if (saved) setSelectedAccountId(saved);

    // Fetch user's connected brokers
    api.getBrokers().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setBrokers(res.data as BrokerAccountItem[]);
      }
    }).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    sessionStorage.setItem('trademind_active_account_id', id);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent('account-filter-changed', {
        detail: { accountId: id },
      })
    );
  };

  const activeBroker = brokers.find((b) => b.id === selectedAccountId);
  const activeLabel = selectedAccountId === 'ALL'
    ? 'All Accounts'
    : (activeBroker?.label || activeBroker?.brokerClientId || activeBroker?.brokerId || 'Account');

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-xs font-semibold text-foreground transition-all duration-150 cursor-pointer shadow-sm"
        title="Switch Portfolio Scope"
      >
        <Briefcase className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="hidden md:inline max-w-[110px] truncate">{activeLabel}</span>
        <span className="md:hidden text-[10px] font-bold">
          {selectedAccountId === 'ALL' ? 'Unified' : activeLabel.slice(0, 4)}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-border bg-popover shadow-xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-primary" />
              Portfolio Scope
            </span>
            <span className="text-[9px] text-primary font-mono font-semibold">
              {brokers.length} Connected
            </span>
          </div>

          <div className="mt-1 space-y-0.5 max-h-56 overflow-y-auto">
            {/* Unified Master Portfolio */}
            <button
              onClick={() => handleSelectAccount('ALL')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                selectedAccountId === 'ALL'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <span className="block font-bold leading-none">All Accounts</span>
                  <span className="text-[10px] text-muted-foreground">Unified Portfolio Blotter</span>
                </div>
              </div>
              {selectedAccountId === 'ALL' && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>

            {/* Individual Brokers */}
            {brokers.map((b) => {
              const active = b.id === selectedAccountId;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectAccount(b.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                    active
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0 border border-border/60">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-bold leading-none truncate">
                        {b.label || b.brokerId.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate block">
                        {b.brokerClientId || b.brokerId}
                      </span>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-1 border-t border-border/40">
            <Link
              href="/dashboard/brokers"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Plug className="w-3 h-3" />
              Manage & Connect Brokers
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

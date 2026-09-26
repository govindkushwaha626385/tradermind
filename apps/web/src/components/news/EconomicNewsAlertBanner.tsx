// ──────────────────────────────────────────────
// TradeMind — High-Impact Economic News Alert Ribbon
//
// Automatically warns traders of high-impact releases (CPI, FOMC, NFP)
// in the current trading session to prevent prop-firm breach & slippage.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, X, Clock, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export function EconomicNewsAlertBanner() {
  const [upcomingEvent, setUpcomingEvent] = useState<{
    event: string;
    currency: string;
    time: string;
    impact: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.getEconomicCalendar()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const highImpact = res.data.find((e) => e.isHighImpact);
          if (highImpact) {
            setUpcomingEvent(highImpact);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!upcomingEvent || dismissed) return null;

  const eventTime = new Date(upcomingEvent.time);
  const timeStr = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-background to-card p-3 sm:p-4 flex items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider font-mono text-amber-400">
              Macro Volatility Risk
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
              {upcomingEvent.impact}
            </span>
          </div>
          <p className="text-foreground/90 font-medium">
            <strong>{upcomingEvent.event}</strong> ({upcomingEvent.currency}) at {timeStr}. Manage active exposure and review prop firm news lockout constraints.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/dashboard/news"
          className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline text-xs"
        >
          <span>Live News Feed</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          title="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

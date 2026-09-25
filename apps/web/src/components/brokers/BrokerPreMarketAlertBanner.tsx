// ──────────────────────────────────────────────
// TradeMind — Pre-Market Broker Token Health Alert Banner
//
// Automatically audits broker session tokens:
// - Daily 6:00 AM IST Zerodha token expiration
// - Expirations within 120 minutes of market open
// - Push toast notification + persistent action banner
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

export interface BrokerConnectionHealth {
  id: string;
  brokerId: string;
  brokerName: string;
  label: string;
  status: 'HEALTHY' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR';
  tokenExpiresAt: string | null;
  minutesRemaining: number | null;
  requiresDailyRelogin: boolean;
  reconnectUrl: string;
  actionMessage: string;
}

export interface UserBrokerHealthReport {
  allHealthy: boolean;
  hasExpiringOrExpired: boolean;
  criticalAlert: string | null;
  marketContext: {
    isPreMarketWindow: boolean;
    marketName: 'NSE/BSE' | 'US' | 'Crypto' | 'Global';
    marketOpenTime: string;
    minutesToOpen: number | null;
  };
  connections: BrokerConnectionHealth[];
}

export function BrokerPreMarketAlertBanner() {
  const [report, setReport] = useState<UserBrokerHealthReport | null>(null);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getBrokerHealthCheck();
      if (res && (res as any).success && (res as any).data) {
        const data = (res as any).data as UserBrokerHealthReport;
        setReport(data);

        // If there are expiring or expired tokens and not snoozed, fire a push toast
        const snoozed = sessionStorage.getItem('trademind_broker_health_snoozed');
        const snoozedTime = snoozed ? parseInt(snoozed, 10) : 0;
        const now = Date.now();

        if (data.hasExpiringOrExpired && (!snoozedTime || now > snoozedTime)) {
          // Toast user once per session window
          const toastFired = sessionStorage.getItem('trademind_broker_toast_fired');
          if (!toastFired) {
            sessionStorage.setItem('trademind_broker_toast_fired', 'true');
            if (data.marketContext.isPreMarketWindow) {
              toast.error(data.criticalAlert || 'Pre-Market Alert: Broker session expired. Reconnect before 9:15 AM!');
            } else {
              toast.warning(data.criticalAlert || 'Broker session token expired. Sync is paused.');
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Broker Health Check Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check snoozed state from sessionStorage
    const snoozed = sessionStorage.getItem('trademind_broker_health_snoozed');
    if (snoozed) {
      const parsed = parseInt(snoozed, 10);
      if (Date.now() < parsed) {
        setDismissedUntil(parsed);
      }
    }

    checkHealth();

    // Check again every 5 minutes in background
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSnooze = (minutes = 15) => {
    const expireTime = Date.now() + minutes * 60 * 1000;
    sessionStorage.setItem('trademind_broker_health_snoozed', expireTime.toString());
    setDismissedUntil(expireTime);
  };

  if (!report || !report.hasExpiringOrExpired) {
    return null;
  }

  // If currently snoozed
  if (dismissedUntil && Date.now() < dismissedUntil) {
    return null;
  }

  const urgentConns = report.connections.filter(
    (c) => c.status === 'EXPIRED' || c.status === 'EXPIRING_SOON' || c.status === 'ERROR'
  );

  if (urgentConns.length === 0) return null;

  const isPreMarket = report.marketContext.isPreMarketWindow;

  return (
    <div className={cn(
      'relative z-25 border-b transition-all duration-300 backdrop-blur-md',
      isPreMarket
        ? 'bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-zinc-950/90 border-rose-500/40 text-rose-100 shadow-lg shadow-rose-950/30'
        : 'bg-gradient-to-r from-amber-950/80 via-zinc-900/90 to-zinc-950 border-amber-500/30 text-amber-100'
    )}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left side: Alert badge & message */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={cn(
            'p-1.5 rounded-lg shrink-0 mt-0.5',
            isPreMarket ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
          )}>
            <ShieldAlert className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border',
                isPreMarket
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              )}>
                {isPreMarket ? '🚨 Pre-Market Session Alert' : '⚠️ Broker Token Invalidation'}
              </span>

              {report.marketContext.minutesToOpen !== null && report.marketContext.minutesToOpen > 0 && (
                <span className="text-[11px] font-mono text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Market opens in <strong>{report.marketContext.minutesToOpen}m</strong> ({report.marketContext.marketOpenTime})
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-200 mt-1 leading-snug">
              {report.criticalAlert || 'Broker access tokens have expired. Re-authenticate to ensure automated execution sync when markets open.'}
            </p>

            {/* Micro badges for affected brokers */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {urgentConns.map((conn) => (
                <div
                  key={conn.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/80 border border-zinc-700/80 text-[11px]"
                >
                  <span className="font-semibold text-white">{conn.brokerName}</span>
                  <span className={cn(
                    'text-[10px] font-mono px-1.5 py-0.2 rounded',
                    conn.status === 'EXPIRED'
                      ? 'bg-rose-500/20 text-rose-400 font-bold'
                      : conn.status === 'EXPIRING_SOON'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-400'
                  )}>
                    {conn.status === 'EXPIRED'
                      ? 'Session Expired'
                      : conn.minutesRemaining != null
                        ? `Expires in ${conn.minutesRemaining}m`
                        : 'Action Required'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Link
            href="/dashboard/brokers"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer',
              isPreMarket
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 hover:scale-102'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Re-authenticate Now</span>
          </Link>

          <button
            type="button"
            onClick={() => handleSnooze(15)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
            title="Snooze warning for 15 minutes"
          >
            Snooze 15m
          </button>

          <button
            type="button"
            onClick={() => handleSnooze(60)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Dismiss for 1 hour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

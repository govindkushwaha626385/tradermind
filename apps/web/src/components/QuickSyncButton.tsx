'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function QuickSyncButton({ className }: { className?: string }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [tooltip, setTooltip] = useState<string>('Sync Connected Brokers');

  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatus('idle');
    setTooltip('Syncing live broker data...');

    try {
      // 1. Fetch user's active broker connections
      const res = await api.getBrokers();
      const connections = (res.data || []) as any[];
      const activeConns = connections.filter((c: any) => c.status === 'ACTIVE' || c.isActive);

      if (activeConns.length === 0) {
        setTooltip('No active broker connected');
        setStatus('idle');
        setSyncing(false);
        return;
      }

      let totalImported = 0;
      let totalTrades = 0;

      // 2. Sync all active connections
      for (const conn of activeConns) {
        try {
          const syncRes = await api.syncBroker(conn.id);
          const syncData = syncRes?.data as any;
          if (syncRes.success && syncData) {
            totalImported += syncData.executionsImported || 0;
            totalTrades += syncData.tradesCreated || 0;
          }
        } catch (e) {
          console.warn(`[Sync] Failed to sync broker ${conn.brokerId}:`, e);
        }
      }

      setStatus('success');
      setTooltip(
        totalImported > 0
          ? `Synced ${totalImported} fills (${totalTrades} trades)`
          : 'Sync complete (All up to date)',
      );

      // 3. Dispatch global event so all open views update automatically
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('broker-synced', { detail: { totalImported, totalTrades } }));
      }

      setTimeout(() => {
        setStatus('idle');
        setTooltip('Sync Connected Brokers');
      }, 4000);
    } catch (err) {
      console.error('Failed to quick sync brokers:', err);
      setStatus('error');
      setTooltip('Sync failed. Please check broker token.');
      setTimeout(() => {
        setStatus('idle');
        setTooltip('Sync Connected Brokers');
      }, 4000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSyncAll}
      disabled={syncing}
      className={cn(
        'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm select-none',
        syncing
          ? 'bg-primary/10 border-primary/30 text-primary cursor-wait'
          : status === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : status === 'error'
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          : 'bg-muted/60 hover:bg-muted border-border/50 text-muted-foreground hover:text-foreground',
        className,
      )}
      title={tooltip}
      aria-label="Quick Sync All Brokers"
    >
      <RefreshCw
        className={cn(
          'w-3.5 h-3.5',
          syncing && 'animate-spin text-primary',
          status === 'success' && 'text-emerald-400',
        )}
      />
      <span className="hidden sm:inline font-mono text-[11px]">
        {syncing ? 'Syncing…' : status === 'success' ? 'Synced' : 'Sync'}
      </span>
      {status === 'success' && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background animate-ping" />
      )}
    </button>
  );
}

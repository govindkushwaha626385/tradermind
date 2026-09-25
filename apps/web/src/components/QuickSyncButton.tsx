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
      // Execute parallel server-side synchronization across all active broker connections
      const syncRes = await api.syncAllBrokers();

      if (syncRes.success && syncRes.data) {
        const { totalConnections, successfulSyncs, totalImportedCount, totalTradesCreated } = syncRes.data;

        if (totalConnections === 0) {
          setTooltip('No active broker connected');
          setStatus('idle');
          setSyncing(false);
          return;
        }

        setStatus('success');
        setTooltip(
          totalImportedCount > 0
            ? `Synced ${totalImportedCount} fills (${totalTradesCreated} trades)`
            : `Sync complete (${successfulSyncs}/${totalConnections} active brokers)`,
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('broker-synced', {
              detail: { totalImported: totalImportedCount, totalTrades: totalTradesCreated },
            }),
          );
        }
      } else {
        throw new Error((syncRes as any).error?.message || 'Sync failed');
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

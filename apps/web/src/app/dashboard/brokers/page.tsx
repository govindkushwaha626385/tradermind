// ──────────────────────────────────────────────
// TradeMind — Brokers Page
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plug,
  PlugZap,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Wallet,
  Handshake,
  FileUp,
  FileSpreadsheet,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { CsvImportModal } from '@/components/brokers/CsvImportModal';

interface BrokerConnection {
  id: string;
  brokerId: string;
  label: string;
  authType: string;
  status: string;
  lastSyncedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BrokerFund {
  id: string;
  brokerConnectionId: string;
  brokerId: string;
  brokerLabel: string;
  availableCash: number;
  usedMargin: number;
  totalCollateral: number;
  payinAmount: number;
  payoutAmount: number;
  currency: string;
  updatedAt: string;
}

interface ConnectFormState {
  authCode: string;
  apiKey: string;
  apiSecret: string;
  clientId: string;
  password: string;
  totpSeed: string;
  label: string;
}

const BROKER_META: Record<string, { name: string; symbol: string; color: string; authType: string; requires: string[] }> = {
  zerodha:        { name: 'Zerodha Kite',    symbol: 'Z', color: 'from-blue-600 to-blue-700',    authType: 'OAuth 2.0 & Token', requires: ['authCode', 'apiKey'] },
  dhan:           { name: 'Dhan HQ',         symbol: 'D', color: 'from-violet-600 to-violet-700', authType: 'API Access Token', requires: ['apiKey', 'clientId'] },
  angelone:       { name: 'Angel One',       symbol: 'A', color: 'from-red-600 to-red-700',       authType: 'SmartAPI + TOTP',   requires: ['apiKey', 'clientId', 'password', 'totpSeed'] },
  upstox:         { name: 'Upstox',          symbol: 'U', color: 'from-green-600 to-green-700',   authType: 'OAuth 2.0 & Token', requires: ['authCode', 'apiKey'] },
  groww:          { name: 'Groww',           symbol: 'G', color: 'from-emerald-600 to-emerald-700',authType: 'API & CSV Import',  requires: ['apiKey', 'apiSecret'] },
  sahi:           { name: 'Sahi',            symbol: 'S', color: 'from-orange-600 to-orange-700', authType: 'CSV Import',        requires: [] },
  lemonn:         { name: 'Lemonn',          symbol: 'L', color: 'from-yellow-600 to-yellow-700', authType: 'CSV Import',        requires: [] },
  delta_exchange: { name: 'Delta Exchange',  symbol: 'Δ', color: 'from-cyan-600 to-cyan-700',    authType: 'API Key & Secret',  requires: ['apiKey', 'apiSecret'] },
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:       'text-success bg-success/10',
  EXPIRED:      'text-warning bg-warning/10',
  DISCONNECTED: 'text-muted-foreground bg-muted',
  ERROR:        'text-destructive bg-destructive/10',
};

const INITIAL_FORM: ConnectFormState = {
  authCode: '', apiKey: '', apiSecret: '',
  clientId: '', password: '', totpSeed: '', label: '',
};

/** Skeleton placeholder for a broker card */
function BrokerCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

export default function BrokersPage() {
  const [connections, setConnections]   = useState<BrokerConnection[]>([]);
  const [funds, setFunds]               = useState<BrokerFund[]>([]);
  const [loading, setLoading]           = useState(true);
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [form, setForm]                 = useState<ConnectFormState>(INITIAL_FORM);
  const [connecting, setConnecting]     = useState(false);
  const [connectError, setConnectError] = useState('');
  const [showSecrets, setShowSecrets]   = useState(false);
  const [syncStatus, setSyncStatus]     = useState<string | null>(null);

  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen]           = useState(false);
  const [confirmConnectionId, setConfirmConnectionId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading]     = useState(false);
  const [syncingAll, setSyncingAll]             = useState(false);
  const [csvImportOpen, setCsvImportOpen]       = useState(false);

  useEffect(() => {
    document.title = 'Broker Connections — TradeMind';
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    setLoading(true);
    try {
      const [brokersRes, fundsRes] = await Promise.all([
        api.getBrokers(),
        api.getBrokerFunds().catch(() => ({ success: false, data: [] })),
      ]);
      if (brokersRes.success) setConnections((brokersRes.data as BrokerConnection[]) ?? []);
      if (fundsRes.success) setFunds((fundsRes.data as BrokerFund[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
      toast.error('Failed to load broker connections');
    } finally {
      setLoading(false);
    }
  }

  const handleSyncAll = async () => {
    const activeConns = connections.filter((c) => c.status === 'ACTIVE' || c.isActive);
    if (activeConns.length === 0) {
      toast.info('No active broker connections to sync');
      return;
    }
    setSyncingAll(true);
    try {
      await Promise.all(activeConns.map((c) => api.syncBroker(c.id).catch((err) => err)));
      toast.success(`Sync finished for ${activeConns.length} broker${activeConns.length > 1 ? 's' : ''}`);
      await fetchBrokers();
    } catch {
      toast.error('One or more broker syncs failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const brokerStatusMap = new Map(connections.map((c) => [c.brokerId, c]));

  const allBrokers = Object.entries(BROKER_META).map(([id, meta]) => {
    const conn = brokerStatusMap.get(id);
    return {
      id,
      ...meta,
      connectionId: conn?.id ?? null,
      status: conn?.status ?? 'DISCONNECTED',
      lastSynced: conn?.lastSyncedAt ?? null,
      isActive: conn?.isActive ?? false,
    };
  });

  const openConnectModal = (brokerId: string) => {
    setConnectModal(brokerId);
    setForm(INITIAL_FORM);
    setConnectError('');
    setShowSecrets(false);
  };

  const handleConnect = async (brokerId: string) => {
    setConnecting(true);
    setConnectError('');
    try {
      const payload: Record<string, unknown> = { brokerId };
      if (form.authCode)  payload.authCode  = form.authCode;
      if (form.apiKey)    payload.apiKey    = form.apiKey;
      if (form.apiSecret) payload.apiSecret = form.apiSecret;
      if (form.clientId)  payload.clientId  = form.clientId;
      if (form.password)  payload.password  = form.password;
      if (form.totpSeed)  payload.totpSeed  = form.totpSeed;
      if (form.label)     payload.label     = form.label;

      await api.connectBroker(payload);
      setConnectModal(null);
      toast.success(`${BROKER_META[brokerId]?.name ?? 'Broker'} connected successfully`);
      await fetchBrokers();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('broker-synced'));
      }
    } catch (err: any) {
      setConnectError(err.message ?? 'Failed to connect broker');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncStatus(connectionId);
    try {
      const res = await api.syncBroker(connectionId);
      toast.success('Sync completed successfully');
      await fetchBrokers();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('broker-synced', { detail: (res as any)?.data }));
      }
    } catch (err) {
      console.error('Failed to sync:', err);
      toast.error('Sync failed. Please try again.');
    } finally {
      setSyncStatus(null);
    }
  };

  /** Opens the non-blocking ConfirmDialog instead of window.confirm() */
  const requestDisconnect = (connectionId: string) => {
    setConfirmConnectionId(connectionId);
    setConfirmOpen(true);
  };

  const handleDisconnectConfirmed = async () => {
    if (!confirmConnectionId) return;
    setConfirmLoading(true);
    try {
      await api.disconnectBroker(confirmConnectionId);
      toast.success('Broker disconnected');
      await fetchBrokers();
    } catch (err) {
      console.error('Failed to disconnect:', err);
      toast.error('Failed to disconnect broker');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmConnectionId(null);
    }
  };

  const selectedBroker = connectModal ? BROKER_META[connectModal] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Broker Connections"
        description="Connect your trading accounts to enable automatic trade sync"
        icon={Plug}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {connections.some((c) => c.status === 'ACTIVE' || c.isActive) && (
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                title="Sync trades from all connected brokers"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', syncingAll && 'animate-spin')} />
                {syncingAll ? 'Syncing All...' : 'Sync All Brokers'}
              </button>
            )}
            <Link
              href="/dashboard/brokers/import"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all"
              title="Open Full Multi-Broker CSV Import Wizard"
            >
              <FileUp className="w-3.5 h-3.5" />
              Import Wizard
            </Link>
            <button
              onClick={() => setCsvImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input hover:bg-accent text-xs font-medium transition-colors"
              title="Quick CSV Upload Modal"
            >
              Quick Modal
            </button>
            <button
              onClick={fetchBrokers}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground disabled:opacity-50 transition-colors"
              aria-label="Refresh broker connections"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        connections={connections}
        onImportComplete={() => fetchBrokers()}
      />

      {/* Live Account Balances */}
      {!loading && funds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Wallet className="w-4 h-4 text-primary" />
            Live Broker Balances &amp; Margins
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funds.map((fund) => (
              <div key={fund.id} className="glass-card rounded-2xl p-4 border border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm capitalize">{fund.brokerId}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {fund.updatedAt ? new Date(fund.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Available Cash</span>
                    <span className="font-semibold text-success">{formatCurrency(fund.availableCash)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Used Margin</span>
                    <span className="font-medium">{formatCurrency(fund.usedMargin)}</span>
                  </div>
                  {fund.totalCollateral > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Collateral</span>
                      <span className="font-medium">{formatCurrency(fund.totalCollateral)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broker Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <BrokerCardSkeleton key={i} />)
          : allBrokers.map((broker) => (
              <div
                key={broker.id}
                className={cn(
                  'glass-card rounded-2xl p-5 transition-all duration-200',
                  broker.status === 'ACTIVE' && 'ring-1 ring-success/30 shadow-sm',
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm',
                        broker.color,
                      )}
                    >
                      {broker.symbol}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{broker.name}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {broker.authType}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded font-medium',
                    STATUS_COLORS[broker.status] ?? 'text-muted-foreground bg-muted',
                  )}>
                    {broker.status}
                  </span>
                </div>

                {broker.lastSynced && (
                  <div className="text-xs text-muted-foreground mb-4">
                    Last synced: {new Date(broker.lastSynced).toLocaleString()}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {broker.status === 'DISCONNECTED' && (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => openConnectModal(broker.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Plug className="w-4 h-4" />
                        Connect
                      </button>
                      <button
                        onClick={() => setCsvImportOpen(true)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-accent text-xs font-semibold hover:bg-accent/80 transition-colors border border-border text-foreground"
                        title={`Import ${broker.name} CSV`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        CSV
                      </button>
                    </div>
                  )}
                  {broker.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleSync(broker.connectionId!)}
                        disabled={syncStatus === broker.connectionId}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
                        aria-label={`Sync ${broker.name}`}
                      >
                        {syncStatus === broker.connectionId
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RefreshCw className="w-4 h-4" />}
                        Sync
                      </button>
                      <button
                        onClick={() => requestDisconnect(broker.connectionId!)}
                        className="p-2 rounded-xl border border-border hover:bg-destructive/10 hover:border-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title="Disconnect"
                        aria-label={`Disconnect ${broker.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {broker.status === 'EXPIRED' && (
                    <button
                      onClick={() => openConnectModal(broker.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* ── Partner Brokers Banner ───────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900 border border-emerald-500/20 p-5 sm:p-6 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Handshake className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Partner Accounts & Exclusive Perks
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Need a high-performance trading account?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Open a demat account with Zerodha, Dhan, Fyers, Angel One, Upstox, or Delta Exchange via TradeMind partner links to unlock zero delivery brokerage and auto-sync privileges.
          </p>
        </div>
        <Link
          href="/dashboard/partners"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all"
        >
          <span>Explore Partner Deals</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Connect Modal ─────────────────────── */}
      {connectModal && selectedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setConnectModal(null)}
          />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 space-y-5 z-10 animate-bounce-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold', selectedBroker.color)}>
                  {selectedBroker.symbol}
                </div>
                <div>
                  <h2 className="font-semibold">Connect {selectedBroker.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedBroker.authType}</p>
                </div>
              </div>
              <button
                onClick={() => setConnectModal(null)}
                className="p-1.5 rounded-lg hover:bg-accent"
                aria-label="Close connect dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CSV Helper Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border text-xs">
              <span className="text-muted-foreground">Don't have API keys?</span>
              <button
                type="button"
                onClick={() => {
                  setConnectModal(null);
                  setCsvImportOpen(true);
                }}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                1-Click CSV Import (No API needed)
              </button>
            </div>

            {connectError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-2.5" role="alert">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{connectError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConnectModal(null);
                    setCsvImportOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-destructive/20 hover:bg-destructive/30 font-semibold text-destructive transition-colors text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Use 1-Click CSV Import Instead (Instant)
                </button>
              </div>
            )}

            <div className="space-y-3">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Connection Label (optional)</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder={`My ${selectedBroker.name}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Auth Code (OAuth) */}
              {selectedBroker.requires.includes('authCode') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Authorization Code
                    {connectModal === 'zerodha' && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (<button onClick={() => window.open('https://kite.zerodha.com/connect/login', '_blank')} className="text-primary hover:underline inline-flex items-center gap-0.5">
                          Get from Zerodha <ExternalLink className="w-3 h-3" />
                        </button>)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.authCode}
                    onChange={(e) => setForm({ ...form, authCode: e.target.value })}
                    placeholder="Paste the OAuth code from broker"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* API Key / Access Token */}
              {selectedBroker.requires.includes('apiKey') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {connectModal === 'groww' && 'Access Token (or API Key)'}
                    {connectModal === 'dhan' && 'Dhan Access Token'}
                    {connectModal === 'angelone' && 'SmartAPI Key'}
                    {connectModal === 'zerodha' && 'Kite API Key (or Access Token)'}
                    {connectModal === 'upstox' && 'Upstox API Key (or Access Token)'}
                    {connectModal === 'delta_exchange' && 'Delta API Key'}
                    {!['groww', 'dhan', 'angelone', 'zerodha', 'upstox', 'delta_exchange'].includes(connectModal ?? '') && 'API Key'}
                    {connectModal === 'groww' && (
                      <span className="text-xs text-primary font-normal ml-2">
                        ← Choose <b>Generate Access Token</b> on Groww
                      </span>
                    )}
                    {connectModal === 'dhan' && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (Generate from web.dhan.co → DhanHQ API)
                      </span>
                    )}
                    {connectModal === 'angelone' && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (from smartapi.angelbroking.com)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder={
                        connectModal === 'groww'
                          ? 'Paste your Groww Access Token here'
                          : connectModal === 'dhan'
                          ? 'Paste your Dhan Access Token'
                          : connectModal === 'angelone'
                          ? 'Enter SmartAPI Key'
                          : 'Enter your API key or Access Token'
                      }
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* API Secret */}
              {selectedBroker.requires.includes('apiSecret') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    API Secret
                    {connectModal === 'groww' && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Leave blank if you pasted the Access Token above)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.apiSecret}
                      onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                      placeholder={
                        connectModal === 'groww'
                          ? 'Optional — not needed if Access Token is provided'
                          : 'Enter your API secret'
                      }
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Client ID */}
              {selectedBroker.requires.includes('clientId') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {connectModal === 'dhan' ? 'Dhan Client ID' : connectModal === 'angelone' ? 'Angel One Client ID' : 'Client ID'}
                  </label>
                  <input
                    type="text"
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    placeholder={
                      connectModal === 'dhan'
                        ? 'e.g. 1000000000'
                        : connectModal === 'angelone'
                        ? 'e.g. A123456'
                        : 'Enter your client ID'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Password / PIN */}
              {selectedBroker.requires.includes('password') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {connectModal === 'angelone' ? 'Client PIN / Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your trading PIN or password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TOTP Seed */}
              {selectedBroker.requires.includes('totpSeed') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    TOTP Secret Key
                    <span className="text-xs text-muted-foreground ml-2">
                      (Base32 key from SmartAPI TOTP setup)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.totpSeed}
                      onChange={(e) => setForm({ ...form, totpSeed: e.target.value })}
                      placeholder="e.g. JBSWY3DPEHPK3PXP"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password */}
              {selectedBroker.requires.includes('password') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your broker password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TOTP Seed */}
              {selectedBroker.requires.includes('totpSeed') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">TOTP Seed (Base32)</label>
                  <div className="relative">
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={form.totpSeed}
                      onChange={(e) => setForm({ ...form, totpSeed: e.target.value })}
                      placeholder="Base32 encoded TOTP seed"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleConnect(connectModal)}
              disabled={connecting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {connecting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <PlugZap className="w-4 h-4" />}
              {connecting ? 'Connecting...' : `Connect ${selectedBroker.name}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Disconnect Confirm Dialog ─────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Disconnect Broker"
        description="Are you sure you want to disconnect this broker? Your historical trade data will be preserved. You can reconnect at any time."
        confirmLabel="Disconnect"
        danger
        loading={confirmLoading}
        onConfirm={handleDisconnectConfirmed}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmConnectionId(null);
        }}
      />
    </div>
  );
}

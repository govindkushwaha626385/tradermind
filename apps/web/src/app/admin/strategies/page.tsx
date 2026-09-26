// ──────────────────────────────────────────────
// TradeMind — Admin Trading Strategies & Playbooks Governance
//
// Allows administrators to:
// - Inspect all user strategies, playbooks, entry/exit criteria
// - Review real-time performance (Win Rate, Total PnL, R-Multiple)
// - Toggle active/disabled status to moderate public/shared strategies
// - Delete empty or abusive strategy records safely
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trash2,
  Eye,
  Power,
  PowerOff,
  X,
  Target,
  Clock,
  BookOpen,
  DollarSign,
  PieChart,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AdminStrategyItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  name: string;
  description: string | null;
  marketType: string;
  timeframe: string | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  tags: string[];
  winCount: number;
  lossCount: number;
  totalTrades: number;
  totalPnl: number;
  avgRMultiple: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminStrategiesPage() {
  const [strategies, setStrategies] = useState<AdminStrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Action States
  const [selectedStrategy, setSelectedStrategy] = useState<AdminStrategyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminStrategyItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Strategies Governance — TradeMind | Admin';
  }, []);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminStrategies({
        search: search.trim() || undefined,
        marketType: marketFilter || undefined,
      });
      if (res.success && res.data) {
        setStrategies((res.data.strategies as unknown as AdminStrategyItem[]) ?? []);
      }
    } catch (err) {
      console.error('Failed to load strategies:', err);
      toast.error('Failed to load trading strategies');
    } finally {
      setLoading(false);
    }
  }, [search, marketFilter]);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const filteredStrategies = useMemo(() => {
    return strategies.filter((strat) => {
      if (statusFilter === 'active' && !strat.isActive) return false;
      if (statusFilter === 'inactive' && strat.isActive) return false;
      return true;
    });
  }, [strategies, statusFilter]);

  const metrics = useMemo(() => {
    let totalWinTrades = 0;
    let totalTrades = 0;
    let totalPnl = 0;
    let activeCount = 0;

    for (const s of strategies) {
      if (s.isActive) activeCount++;
      totalWinTrades += s.winCount || 0;
      totalTrades += s.totalTrades || 0;
      totalPnl += Number(s.totalPnl || 0);
    }

    const overallWinRate = totalTrades > 0 ? (totalWinTrades / totalTrades) * 100 : 0;

    return {
      totalStrategies: strategies.length,
      activeCount,
      overallWinRate: overallWinRate.toFixed(1),
      totalPnl,
    };
  }, [strategies]);

  const handleToggleStatus = async (strat: AdminStrategyItem) => {
    setTogglingId(strat.id);
    try {
      const res = await api.adminToggleStrategy(strat.id);
      if (res.success && res.data) {
        const nextActive = res.data.isActive;
        toast.success(`Strategy "${strat.name}" is now ${nextActive ? 'ACTIVE' : 'INACTIVE'}`);
        setStrategies((prev) =>
          prev.map((s) => (s.id === strat.id ? { ...s, isActive: nextActive } : s))
        );
        if (selectedStrategy?.id === strat.id) {
          setSelectedStrategy({ ...selectedStrategy, isActive: nextActive });
        }
      } else {
        toast.error('Failed to update strategy status');
      }
    } catch {
      toast.error('Failed to update strategy status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteStrategy = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.adminDeleteStrategy(deleteTarget.id);
      if (res.success) {
        toast.success(`Deleted strategy "${deleteTarget.name}"`);
        setStrategies((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        if (selectedStrategy?.id === deleteTarget.id) setSelectedStrategy(null);
      } else {
        toast.error((res as any).error?.message || 'Failed to delete strategy');
      }
    } catch {
      toast.error('Failed to delete strategy');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExportCsv = () => {
    if (strategies.length === 0) {
      toast.error('No strategies available to export');
      return;
    }
    downloadCsv('trademind-admin-strategies', strategies, [
      { header: 'Strategy Name', accessor: (s) => s.name },
      { header: 'Trader Name', accessor: (s) => s.userName },
      { header: 'Trader Email', accessor: (s) => s.userEmail },
      { header: 'Market Type', accessor: (s) => s.marketType },
      { header: 'Timeframe', accessor: (s) => s.timeframe ?? 'N/A' },
      {
        header: 'Win Rate (%)',
        accessor: (s) =>
          s.totalTrades > 0 ? ((s.winCount / s.totalTrades) * 100).toFixed(1) : '0.0',
      },
      { header: 'Total Trades', accessor: (s) => s.totalTrades },
      { header: 'Net P&L', accessor: (s) => s.totalPnl },
      { header: 'Avg R-Multiple', accessor: (s) => s.avgRMultiple ?? '' },
      { header: 'Active Status', accessor: (s) => (s.isActive ? 'Active' : 'Disabled') },
      { header: 'Created At', accessor: (s) => s.createdAt },
    ]);
    toast.success(`Exported ${strategies.length} strategies to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Trading Strategies & Playbooks Governance"
        description="Inspect user trading strategies, verify playbook rules, and manage platform strategy visibility"
        icon={Target}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={loading || strategies.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 hover:bg-accent text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              title="Export all strategies to RFC-4180 CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchStrategies}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Strategies</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {metrics.totalStrategies}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Created by traders</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Playbooks</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
            {metrics.activeCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Enabled for live tracking</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Aggregate Win Rate</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-500 mt-1">
            {metrics.overallWinRate}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across all execution links</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Strategy PnL</span>
            <DollarSign className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            ₹{metrics.totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Net realized value</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by strategy name, user, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Markets</option>
          <option value="EQUITY">Equity</option>
          <option value="FNO">Futures &amp; Options</option>
          <option value="CRYPTO">Crypto</option>
          <option value="FOREX">Forex</option>
          <option value="COMMODITY">Commodity</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={8} cols={7} />
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Target}
            title={search || marketFilter || statusFilter ? 'No strategies match your filter' : 'No strategies recorded'}
            description={
              search || marketFilter || statusFilter
                ? 'Try clearing your search query or filters to view all trading strategies.'
                : 'User trading strategies and playbooks will appear here as traders create them.'
            }
            action={
              search || marketFilter || statusFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setMarketFilter('');
                      setStatusFilter('');
                    },
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-accent/20">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Strategy &amp; Market</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Timeframe</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Trades (W/L)</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Win Rate</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Total PnL</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStrategies.map((strat) => {
                  const winRate =
                    strat.totalTrades > 0
                      ? ((strat.winCount / strat.totalTrades) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={strat.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-foreground">{strat.userName || 'Anonymous'}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">{strat.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-xs text-foreground">{strat.name}</div>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium mt-0.5">
                          {strat.marketType || 'EQUITY'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {strat.timeframe || 'Intraday'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-mono">
                        <span className="text-emerald-500 font-bold">{strat.winCount}W</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-rose-500 font-bold">{strat.lossCount}L</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono font-bold text-foreground">
                        {winRate}%
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono font-bold">
                        <span className={strat.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          ₹{strat.totalPnl?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            strat.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border',
                          )}
                        >
                          {strat.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedStrategy(strat)}
                            className="p-1.5 rounded-lg border border-input hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Inspect Playbook Rules"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(strat)}
                            disabled={togglingId === strat.id}
                            className={cn(
                              'p-1.5 rounded-lg border transition-colors cursor-pointer',
                              strat.isActive
                                ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10',
                            )}
                            title={strat.isActive ? 'Deactivate Strategy' : 'Activate Strategy'}
                          >
                            {strat.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(strat)}
                            className="p-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                            title="Delete Strategy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Playbook Rules Inspection Modal */}
      {selectedStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Strategy Playbook Inspection
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created by {selectedStrategy.userName} ({selectedStrategy.userEmail})
                </p>
              </div>
              <button
                onClick={() => setSelectedStrategy(null)}
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-accent/30 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase font-sans">Strategy Name</div>
                <div className="font-bold text-foreground text-sm mt-0.5">{selectedStrategy.name}</div>
                {selectedStrategy.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedStrategy.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Market &amp; Timeframe</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedStrategy.marketType} • {selectedStrategy.timeframe || 'Any'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Average R-Multiple</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedStrategy.avgRMultiple ? `${selectedStrategy.avgRMultiple.toFixed(2)}R` : 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
                  Entry Rules &amp; Triggers
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-foreground whitespace-pre-wrap font-mono text-[11px]">
                  {selectedStrategy.entryCriteria || 'No entry criteria documented'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1">
                  Exit Rules &amp; Invalidation
                </div>
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-foreground whitespace-pre-wrap font-mono text-[11px]">
                  {selectedStrategy.exitCriteria || 'No exit criteria documented'}
                </div>
              </div>

              {selectedStrategy.tags && selectedStrategy.tags.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStrategy.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium text-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-accent/20 border-t border-border/50 flex justify-end">
              <button
                onClick={() => setSelectedStrategy(null)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Strategy Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Trading Strategy"
        description={
          deleteTarget
            ? `Are you sure you want to permanently delete the strategy "${deleteTarget.name}" created by ${deleteTarget.userEmail}? This will remove the playbook rules and unlink all associated trades.`
            : ''
        }
        confirmLabel="Delete Strategy"
        danger={true}
        loading={deleting}
        onConfirm={handleDeleteStrategy}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

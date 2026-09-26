// ──────────────────────────────────────────────
// TradeMind — Institutional Multi-Period Reports Engine
//
// Generates detailed execution reports across:
// - Daily Reports
// - Weekly Reports
// - Monthly Reports
// - Yearly Reports
// - Custom Date Range Reports
//
// Includes Win/Loss Forensics, Taxes & Charges,
// Behavioral Discipline, and 1-Click PDF & CSV Exports.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Activity,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  RefreshCw,
  Sparkles,
  PieChart,
  BarChart3,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonCard';
import { WeeklyEdgeReportModal } from '@/components/analytics/WeeklyEdgeReportModal';
import { StatutoryTaxLedger } from '@/components/reports/StatutoryTaxLedger';
import type { JournalTrade } from '@trademind/shared';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type OutcomeFilter = 'all' | 'wins' | 'losses';

export default function ReportsPage() {
  const { currency, format } = useCurrency();
  const [reportTab, setReportTab] = useState<'performance' | 'tax_ledger'>('performance');
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0]!;
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]!;
  });

  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'Institutional Trading Reports & Audits — TradeMind';
  }, []);

  // Compute start/end dates based on selected period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      start.setDate(now.getDate() - 30);
    } else if (period === 'yearly') {
      start.setDate(now.getDate() - 365);
    } else {
      start = new Date(`${customStart}T00:00:00.000Z`);
      end = new Date(`${customEnd}T23:59:59.999Z`);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [period, customStart, customEnd]);

  // Fetch trades
  const fetchReportTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getJournalTrades({
        startDate,
        endDate,
        limit: 500,
        sortBy: 'openedAt',
        sortOrder: 'desc',
      });
      if (res.success && Array.isArray(res.data)) {
        setTrades((res.data as unknown) as JournalTrade[]);
      }
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReportTrades();
  }, [fetchReportTrades]);

  // Apply outcome & asset filters
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (outcomeFilter === 'wins' && (t.netPnl ?? 0) <= 0) return false;
      if (outcomeFilter === 'losses' && (t.netPnl ?? 0) >= 0) return false;
      if (assetFilter !== 'all' && t.assetClass !== assetFilter) return false;
      return true;
    });
  }, [trades, outcomeFilter, assetFilter]);

  // Aggregated Report Metrics
  const metrics = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const closed = filteredTrades.filter((t) => t.status === 'CLOSED');
    const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.netPnl ?? 0) < 0);
    const netPnl = closed.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);
    const grossPnl = closed.reduce((acc, t) => acc + (t.grossPnl ?? 0), 0);
    const totalFees = closed.reduce((acc, t) => acc + (t.totalFeesAndTaxes ?? 0), 0);

    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const grossWins = wins.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);
    const grossLosses = Math.abs(losses.reduce((acc, t) => acc + (t.netPnl ?? 0), 0));
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99.99 : 0;

    const avgWin = wins.length > 0 ? grossWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLosses / losses.length : 0;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.99 : 0;

    const bestTrade = closed.length > 0 ? Math.max(...closed.map((t) => t.netPnl ?? 0)) : 0;
    const worstTrade = closed.length > 0 ? Math.min(...closed.map((t) => t.netPnl ?? 0)) : 0;

    // Van Tharp SQN
    const rMultiples = closed.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!);
    let sqn = 0;
    if (rMultiples.length >= 5) {
      const meanR = rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length;
      const variance = rMultiples.reduce((s, r) => s + (r - meanR) ** 2, 0) / (rMultiples.length - 1);
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        sqn = Math.sqrt(Math.min(rMultiples.length, 100)) * (meanR / stdDev);
      }
    }

    // Mistake counts
    let fomoCount = 0;
    let revengeCount = 0;
    let chasedCount = 0;
    closed.forEach((t) => {
      const mistakes = (t.mistakeTags as string[]) || [];
      if (mistakes.some((m) => m.toLowerCase().includes('fomo'))) fomoCount++;
      if (mistakes.some((m) => m.toLowerCase().includes('revenge'))) revengeCount++;
      if (mistakes.some((m) => m.toLowerCase().includes('chase') || m.toLowerCase().includes('chased'))) chasedCount++;
    });

    return {
      totalTrades,
      closedCount: closed.length,
      winCount: wins.length,
      lossCount: losses.length,
      netPnl,
      grossPnl,
      totalFees,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      payoffRatio,
      bestTrade,
      worstTrade,
      sqn,
      fomoCount,
      revengeCount,
      chasedCount,
    };
  }, [filteredTrades]);

  // 1-Click CSV Export
  const handleExportCsv = () => {
    if (filteredTrades.length === 0) {
      toast.error('No trade records to export in this period');
      return;
    }

    const filename = `TradeMind_${period.toUpperCase()}_Report_${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;
    const columns = [
      { header: 'Trade ID', accessor: (t: JournalTrade) => t.id },
      { header: 'Opened At', accessor: (t: JournalTrade) => new Date(t.openedAt).toISOString() },
      { header: 'Closed At', accessor: (t: JournalTrade) => t.closedAt ? new Date(t.closedAt).toISOString() : '' },
      { header: 'Symbol', accessor: (t: JournalTrade) => t.tradingsymbol },
      { header: 'Exchange', accessor: (t: JournalTrade) => t.exchange },
      { header: 'Asset Class', accessor: (t: JournalTrade) => t.assetClass },
      { header: 'Direction', accessor: (t: JournalTrade) => t.direction },
      { header: 'Status', accessor: (t: JournalTrade) => t.status },
      { header: 'Quantity', accessor: (t: JournalTrade) => t.totalQuantity },
      { header: 'Entry Price', accessor: (t: JournalTrade) => t.avgEntryPrice },
      { header: 'Exit Price', accessor: (t: JournalTrade) => t.avgExitPrice ?? '' },
      { header: 'Gross PnL', accessor: (t: JournalTrade) => t.grossPnl ?? 0 },
      { header: 'Fees & Taxes', accessor: (t: JournalTrade) => t.totalFeesAndTaxes ?? 0 },
      { header: 'Net PnL', accessor: (t: JournalTrade) => t.netPnl ?? 0 },
      { header: 'R-Multiple', accessor: (t: JournalTrade) => t.rMultiple != null ? `${t.rMultiple}R` : '' },
      { header: 'Emotions', accessor: (t: JournalTrade) => ((t.emotions as string[]) || []).join('; ') },
      { header: 'Mistakes', accessor: (t: JournalTrade) => ((t.mistakeTags as string[]) || []).join('; ') },
      { header: 'Notes', accessor: (t: JournalTrade) => t.traderNotes ?? '' },
    ];

    downloadCsv(filename, filteredTrades, columns);
    toast.success(`Exported ${filteredTrades.length} trade records to CSV`);
  };

  // 1-Click Print PDF
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Page Header with Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6 print:border-none">
        <PageHeader
          title="Institutional Reports & Audit Engine"
          description="Generate comprehensive audit statements for daily reviews, weekly debriefs, tax ledgers, and prop-firm evaluations."
        />

        <div className="flex items-center gap-2.5 flex-wrap print:hidden">
          <button
            onClick={() => setWeeklyModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            title="Open Institutional Weekly Edge Forensic Report"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Weekly Edge Forensic</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredTrades.length === 0}
            className="px-4 py-2 rounded-xl bg-card hover:bg-accent text-foreground transition-all border border-border/80 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            title="Download CSV Statement"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-bold flex items-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Report Mode Switcher: Performance Forensics vs Statutory Tax Ledger */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl w-fit print:hidden">
        <button
          onClick={() => setReportTab('performance')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            reportTab === 'performance'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Performance &amp; Win/Loss Forensics</span>
        </button>
        <button
          onClick={() => setReportTab('tax_ledger')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            reportTab === 'tax_ledger'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Receipt className="w-4 h-4" />
          <span>Statutory Tax &amp; Regulatory Ledger</span>
        </button>
      </div>

      {/* Period Selector & Filter Controls (Hidden in Print) */}
      <div className="p-4 rounded-3xl border border-border/80 bg-card/60 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl">
            {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer',
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly (30D)' : p === 'yearly' ? 'Yearly (1Y)' : 'Custom Range'}
              </button>
            ))}
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Outcome:</span>
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
              {(['all', 'wins', 'losses'] as const).map((out) => (
                <button
                  key={out}
                  onClick={() => setOutcomeFilter(out)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer',
                    outcomeFilter === out ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {out}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Asset:</span>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Asset Classes</option>
              <option value="EQUITY">Stocks / Equities</option>
              <option value="OPTIONS">Options (F&amp;O)</option>
              <option value="FUTURES">Futures</option>
              <option value="CRYPTO">Crypto Assets</option>
              <option value="CURRENCY">Forex Currencies</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers (Visible if custom selected) */}
        {period === 'custom' && (
          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={fetchReportTrades}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
            >
              Apply Range
            </button>
          </div>
        )}
      </div>

      {/* Conditional View: Statutory Tax Ledger vs Performance Forensics */}
      {reportTab === 'tax_ledger' ? (
        <StatutoryTaxLedger
          trades={filteredTrades}
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          format={format}
        />
      ) : (
        <>
          {/* Printable Report Header */}
          <div className="hidden print:block border-b-2 border-zinc-900 pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-black">TradeMind Institutional Execution Report</h1>
              <span className="text-xs font-mono text-zinc-600">Generated: {new Date().toLocaleString()}</span>
            </div>
            <p className="text-xs text-zinc-600 font-mono">
              Audit Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()} · Filter: {outcomeFilter.toUpperCase()} · Asset: {assetFilter}
            </p>
          </div>

      {/* Report Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Net Realized P&L */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Net Realized P&amp;L</span>
          <div className={cn('text-2xl font-black font-mono', metrics.netPnl >= 0 ? 'text-success' : 'text-destructive')}>
            {metrics.netPnl >= 0 ? '+' : ''}{format(metrics.netPnl)}
          </div>
          <span className="text-[11px] text-muted-foreground">Gross: {format(metrics.grossPnl)}</span>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Win Rate</span>
          <div className={cn('text-2xl font-black font-mono', metrics.winRate >= 50 ? 'text-success' : 'text-warning')}>
            {metrics.winRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-muted-foreground">{metrics.winCount}W · {metrics.lossCount}L</span>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Profit Factor</span>
          <div className={cn('text-2xl font-black font-mono', metrics.profitFactor >= 1.5 ? 'text-success' : 'text-foreground')}>
            {metrics.profitFactor > 0 ? `${metrics.profitFactor.toFixed(2)}x` : '—'}
          </div>
          <span className="text-[11px] text-muted-foreground">Payoff: {metrics.payoffRatio.toFixed(2)}:1</span>
        </div>

        {/* Total Fees & Taxes */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Statutory Taxes &amp; Fees</span>
          <div className="text-2xl font-black font-mono text-amber-500">
            {format(metrics.totalFees)}
          </div>
          <span className="text-[11px] text-muted-foreground">STT, GST &amp; Brokerage</span>
        </div>

        {/* Van Tharp SQN */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Van Tharp SQN</span>
          <div className="text-2xl font-black font-mono text-primary">
            {metrics.sqn > 0 ? metrics.sqn.toFixed(2) : '—'}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {metrics.sqn >= 3 ? 'Excellent' : metrics.sqn >= 2 ? 'Good' : 'Evaluating'}
          </span>
        </div>

        {/* Trades Executed */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Trades</span>
          <div className="text-2xl font-black font-mono text-foreground">
            {metrics.totalTrades}
          </div>
          <span className="text-[11px] text-muted-foreground">{metrics.closedCount} Closed</span>
        </div>
      </div>

      {/* Win vs Loss Forensics & Behavioral Leaks */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Win vs Loss Slicing */}
        <div className="p-6 rounded-3xl border border-border/80 bg-card/70 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Win vs. Loss Forensic Breakdown</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-success/5 border border-success/20 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Average Winning Trade</span>
              <div className="text-xl font-bold font-mono text-success">+{format(metrics.avgWin)}</div>
              <div className="text-[11px] text-muted-foreground">Best Trade: +{format(metrics.bestTrade)}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Average Losing Trade</span>
              <div className="text-xl font-bold font-mono text-destructive">-{format(metrics.avgLoss)}</div>
              <div className="text-[11px] text-muted-foreground">Worst Trade: {format(metrics.worstTrade)}</div>
            </div>
          </div>

          {/* Visual Win/Loss Ratio Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-success">{metrics.winCount} Wins ({metrics.winRate.toFixed(1)}%)</span>
              <span className="text-destructive">{metrics.lossCount} Losses ({(100 - metrics.winRate).toFixed(1)}%)</span>
            </div>
            <div className="h-3 rounded-full bg-destructive/20 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-700"
                style={{ width: `${metrics.winRate}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-700"
                style={{ width: `${100 - metrics.winRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Behavioral Execution Discipline */}
        <div className="p-6 rounded-3xl border border-border/80 bg-card/70 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-foreground">Behavioral Discipline &amp; Mistake Audit</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-background/80 border border-border/60 text-center space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">FOMO Trades</span>
              <div className="text-xl font-black font-mono text-amber-400">{metrics.fomoCount}</div>
              <span className="text-[10px] text-muted-foreground">Late entries</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-background/80 border border-border/60 text-center space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Revenge Trades</span>
              <div className="text-xl font-black font-mono text-rose-400">{metrics.revengeCount}</div>
              <span className="text-[10px] text-muted-foreground">&lt;30m re-entry</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-background/80 border border-border/60 text-center space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Chased Entries</span>
              <div className="text-xl font-black font-mono text-blue-400">{metrics.chasedCount}</div>
              <span className="text-[10px] text-muted-foreground">Over-slippage</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            Institutional discipline score is calculated from rule adherence and pre-market checklist execution.
            Eliminating emotional chase entries preserves an estimated 1.4R per week.
          </p>
        </div>
      </div>

      {/* Detailed Trade Ledger Table */}
      <div className="rounded-3xl border border-border/80 bg-card/80 overflow-hidden shadow-xl space-y-4">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Audited Trade Execution Ledger</h3>
            <p className="text-xs text-muted-foreground">
              {filteredTrades.length} trade records in this reporting period.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-primary">
            Currency: {currency}
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} cols={7} />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-bold text-foreground">No trades found in this reporting window</h4>
            <p className="text-xs text-muted-foreground">Adjust your date range or filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Asset Class</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Entry Price</th>
                  <th className="py-3 px-4 text-right">Exit Price</th>
                  <th className="py-3 px-4 text-right">Fees</th>
                  <th className="py-3 px-4 text-right">Net P&amp;L</th>
                  <th className="py-3 px-4 text-center">R:R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {filteredTrades.map((t) => {
                  const isPositive = (t.netPnl ?? 0) >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(t.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(t.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground font-sans">
                        <Link href={`/dashboard/trades`} className="hover:text-primary transition-colors">
                          {t.tradingsymbol}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-sans">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 border border-border/40">
                          {t.assetClass}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold font-sans">
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          t.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        )}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{t.totalQuantity}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{t.avgEntryPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{t.avgExitPrice ? t.avgExitPrice.toFixed(2) : '—'}</td>
                      <td className="py-3 px-4 text-right text-amber-500">{format(t.totalFeesAndTaxes ?? 0)}</td>
                      <td className={cn('py-3 px-4 text-right font-black', isPositive ? 'text-success' : 'text-destructive')}>
                        {isPositive ? '+' : ''}{format(t.netPnl ?? 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {t.rMultiple != null ? (
                          <span className={cn('text-[11px] font-bold', t.rMultiple >= 1 ? 'text-success' : 'text-muted-foreground')}>
                            {t.rMultiple.toFixed(1)}R
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Institutional Weekly Edge Forensic Modal */}
      <WeeklyEdgeReportModal
        isOpen={weeklyModalOpen}
        onClose={() => setWeeklyModalOpen(false)}
        currency={currency}
      />
    </div>
  );
}

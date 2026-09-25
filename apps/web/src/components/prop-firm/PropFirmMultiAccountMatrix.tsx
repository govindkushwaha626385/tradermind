// ──────────────────────────────────────────────
// TradeMind — Prop Firm Multi-Account Scaling Matrix
//
// Institutional-grade matrix for multi-account prop traders
// (e.g. 3x FTMO $100K + 2x Apex $50K + 1x Topstep $150K).
//
// Features:
// - Aggregated Buying Power & Capital Allocation
// - Consolidated Daily Loss Buffer & Nearest Breach Bottleneck
// - High-Water Mark Trailing Drawdown Matrix (Static vs Trailing)
// - Real-Time Pass / Breach Multi-Account Stress Test Simulator
// - Copy-Trading Contract / Lot Size Allocation Multiplier
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Flame,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  Scale,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PropFirmAccount {
  id: string;
  firmName: string;
  accountName: string;
  accountSize: number;
  currency: string;
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Instant';
  startingBalance: number;
  currentBalance: number;
  highWaterMark: number;
  dailyLossLimitPct: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
  minTradingDays: number;
  tradingDaysCompleted: number;
  todayPnl: number;
  weekendHoldingAllowed: boolean;
  newsTradingAllowed: boolean;
  drawdownType?: 'STATIC' | 'TRAILING';
  notes?: string;
  createdAt: string;
}

interface PropFirmMultiAccountMatrixProps {
  accounts: PropFirmAccount[];
  onSelectAccount?: (id: string) => void;
  onRefresh?: () => void;
}

export function PropFirmMultiAccountMatrix({
  accounts,
  onSelectAccount,
  onRefresh,
}: PropFirmMultiAccountMatrixProps) {
  const [filterPhase, setFilterPhase] = useState<'ALL' | 'FUNDED' | 'EVAL'>('ALL');
  const [simRiskMode, setSimRiskMode] = useState<'DOLLARS' | 'R_MULTIPLE' | 'PERCENT'>('DOLLARS');
  const [simulatedShock, setSimulatedShock] = useState<string>('1500');
  const [simBaseR, setSimBaseR] = useState<string>('500');

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (filterPhase === 'FUNDED') return a.phase === 'Funded' || a.phase === 'Instant';
      if (filterPhase === 'EVAL') return a.phase === 'Phase 1' || a.phase === 'Phase 2';
      return true;
    });
  }, [accounts, filterPhase]);

  // Comprehensive Multi-Account Metrics Computation
  const portfolioMetrics = useMemo(() => {
    let totalAllocation = 0;
    let totalCurrentBalance = 0;
    let totalStartingBalance = 0;
    let totalTodayPnl = 0;
    let totalNetPnl = 0;

    let consolidatedDailyLimit = 0;
    let consolidatedDailyLossUsed = 0;
    let consolidatedDailyBuffer = 0;

    let consolidatedDrawdownBuffer = 0;

    interface AccountRiskRow {
      account: PropFirmAccount;
      isTrailing: boolean;
      curSymbol: string;
      netPnl: number;
      netPnlPct: number;
      drawdownAbs: number;
      lossFloor: number;
      drawdownBuffer: number;
      drawdownUsedPct: number;
      dailyLimitAbs: number;
      dailyLossUsed: number;
      dailyBuffer: number;
      dailyUsedPct: number;
      distanceFromHwm: number;
      hwmTrailingFloor: number;
      suggestedCopyRatio: number;
      riskStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
      statusBadge: string;
      statusColor: string;
    }

    const rows: AccountRiskRow[] = filteredAccounts.map((a) => {
      const curSymbol =
        a.currency === 'USD' ? '$' :
        a.currency === 'EUR' ? '€' :
        a.currency === 'GBP' ? '£' :
        a.currency === 'USDT' ? '₮' : '₹';

      const isTrailing =
        a.drawdownType === 'TRAILING' ||
        a.notes?.toUpperCase().includes('TRAILING') ||
        a.firmName.toUpperCase().includes('APEX') ||
        a.firmName.toUpperCase().includes('TOPSTEP') ||
        a.dailyLossLimitPct === 0;

      const netPnl = a.currentBalance - a.startingBalance;
      const netPnlPct = a.startingBalance > 0 ? (netPnl / a.startingBalance) * 100 : 0;
      const drawdownAbs = (a.accountSize * a.maxDrawdownPct) / 100;

      // Static Floor vs Trailing High Water Mark Floor
      const staticLossLevel = a.startingBalance - drawdownAbs;
      const trailingLossLevel = Math.max(staticLossLevel, a.highWaterMark - drawdownAbs);
      const lossFloor = isTrailing ? trailingLossLevel : staticLossLevel;
      const drawdownBuffer = Math.max(0, a.currentBalance - lossFloor);
      const drawdownUsedPct = drawdownAbs > 0
        ? Math.min(100, Math.max(0, ((drawdownAbs - drawdownBuffer) / drawdownAbs) * 100))
        : 0;

      // Daily Limit
      const dailyLimitAbs = (a.accountSize * a.dailyLossLimitPct) / 100;
      const dailyLossUsed = a.todayPnl < 0 ? Math.abs(a.todayPnl) : 0;
      const dailyBuffer = dailyLimitAbs > 0 ? Math.max(0, dailyLimitAbs - dailyLossUsed) : Infinity;
      const dailyUsedPct = dailyLimitAbs > 0 ? Math.min(100, (dailyLossUsed / dailyLimitAbs) * 100) : 0;

      const distanceFromHwm = Math.max(0, a.highWaterMark - a.currentBalance);
      const hwmTrailingFloor = isTrailing ? trailingLossLevel : staticLossLevel;

      // Base copy ratio: relative to $100K standard baseline
      const suggestedCopyRatio = Math.max(0.25, Math.round((a.accountSize / 100000) * 100) / 100);

      // Determine Risk Status
      let riskStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED' = 'SAFE';
      let statusBadge = 'Nominal Buffer';
      let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

      if (a.currentBalance <= lossFloor || (dailyLimitAbs > 0 && dailyLossUsed >= dailyLimitAbs)) {
        riskStatus = 'BREACHED';
        statusBadge = 'RULE BREACHED';
        statusColor = 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse';
      } else if (
        drawdownBuffer < drawdownAbs * 0.25 ||
        (dailyLimitAbs > 0 && dailyBuffer < dailyLimitAbs * 0.2)
      ) {
        riskStatus = 'CRITICAL';
        statusBadge = 'Critical Buffer (<25%)';
        statusColor = 'text-red-400 bg-red-500/10 border-red-500/30';
      } else if (
        drawdownBuffer < drawdownAbs * 0.5 ||
        (dailyLimitAbs > 0 && dailyBuffer < dailyLimitAbs * 0.5)
      ) {
        riskStatus = 'WARNING';
        statusBadge = 'Elevated Risk';
        statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      }

      // Sum portfolio totals
      totalAllocation += a.accountSize;
      totalCurrentBalance += a.currentBalance;
      totalStartingBalance += a.startingBalance;
      totalTodayPnl += a.todayPnl;
      totalNetPnl += netPnl;

      if (dailyLimitAbs > 0) {
        consolidatedDailyLimit += dailyLimitAbs;
        consolidatedDailyLossUsed += dailyLossUsed;
        consolidatedDailyBuffer += dailyBuffer;
      }
      consolidatedDrawdownBuffer += drawdownBuffer;

      return {
        account: a,
        isTrailing,
        curSymbol,
        netPnl,
        netPnlPct,
        drawdownAbs,
        lossFloor,
        drawdownBuffer,
        drawdownUsedPct,
        dailyLimitAbs,
        dailyLossUsed,
        dailyBuffer,
        dailyUsedPct,
        distanceFromHwm,
        hwmTrailingFloor,
        suggestedCopyRatio,
        riskStatus,
        statusBadge,
        statusColor,
      };
    });

    // Sort to identify the most vulnerable bottleneck account
    const bottleneckAccount = [...rows].sort((a, b) => a.drawdownBuffer - b.drawdownBuffer)[0];

    return {
      totalAllocation,
      totalCurrentBalance,
      totalStartingBalance,
      totalTodayPnl,
      totalNetPnl,
      totalNetPnlPct: totalStartingBalance > 0 ? (totalNetPnl / totalStartingBalance) * 100 : 0,
      consolidatedDailyLimit,
      consolidatedDailyLossUsed,
      consolidatedDailyBuffer,
      consolidatedDrawdownBuffer,
      bottleneckAccount,
      rows,
    };
  }, [filteredAccounts]);

  // Pass / Breach Simulation Calculation
  const simulationResults = useMemo(() => {
    const shockValue = parseFloat(simulatedShock) || 0;
    const baseRValue = parseFloat(simBaseR) || 500;

    let breachedCount = 0;
    let criticalCount = 0;
    let safeCount = 0;

    const simulatedRows = portfolioMetrics.rows.map((row) => {
      let simulatedAccountLoss = 0;

      if (simRiskMode === 'DOLLARS') {
        // Shock is proportional to account size vs total allocation
        const weight = portfolioMetrics.totalAllocation > 0
          ? row.account.accountSize / portfolioMetrics.totalAllocation
          : 1 / portfolioMetrics.rows.length;
        simulatedAccountLoss = shockValue * weight;
      } else if (simRiskMode === 'R_MULTIPLE') {
        // Shock is R-multiple * account copy ratio * base R
        simulatedAccountLoss = shockValue * (baseRValue * row.suggestedCopyRatio);
      } else {
        // Percent of account size
        simulatedAccountLoss = (row.account.accountSize * shockValue) / 100;
      }

      const postSimBalance = row.account.currentBalance - simulatedAccountLoss;
      const postDailyBuffer = row.dailyLimitAbs > 0
        ? Math.max(0, row.dailyBuffer - simulatedAccountLoss)
        : Infinity;
      const postDrawdownBuffer = Math.max(0, row.drawdownBuffer - simulatedAccountLoss);

      const dailyBreached = row.dailyLimitAbs > 0 && simulatedAccountLoss > row.dailyBuffer;
      const totalBreached = simulatedAccountLoss >= row.drawdownBuffer;
      const isBreached = dailyBreached || totalBreached;

      const isCritical =
        !isBreached &&
        (postDrawdownBuffer < row.drawdownAbs * 0.25 ||
          (row.dailyLimitAbs > 0 && postDailyBuffer < row.dailyLimitAbs * 0.25));

      if (isBreached) {
        breachedCount++;
      } else if (isCritical) {
        criticalCount++;
      } else {
        safeCount++;
      }

      return {
        ...row,
        simulatedLoss: simulatedAccountLoss,
        postSimBalance,
        postDailyBuffer,
        postDrawdownBuffer,
        dailyBreached,
        totalBreached,
        isBreached,
        isCritical,
      };
    });

    return {
      breachedCount,
      criticalCount,
      safeCount,
      simulatedRows,
    };
  }, [portfolioMetrics, simRiskMode, simulatedShock, simBaseR]);

  return (
    <div className="space-y-6">
      {/* ── Top Portfolio Executive Stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Buying Power */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-950 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Total Prop Allocation
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px]">
              {filteredAccounts.length} Active Accounts
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
              ${portfolioMetrics.totalAllocation.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span>Current Equity:</span>
              <strong className="text-zinc-200 font-mono">
                ${portfolioMetrics.totalCurrentBalance.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Portfolio Net P&L */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Net Portfolio P&L
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                portfolioMetrics.totalTodayPnl >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              )}
            >
              Today: {portfolioMetrics.totalTodayPnl >= 0 ? '+' : ''}${portfolioMetrics.totalTodayPnl.toLocaleString()}
            </span>
          </div>
          <div className="mt-3">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-extrabold font-mono tracking-tight flex items-baseline gap-2',
                portfolioMetrics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              <span>{portfolioMetrics.totalNetPnl >= 0 ? '+' : ''}${portfolioMetrics.totalNetPnl.toLocaleString()}</span>
              <span className="text-xs font-semibold">
                ({portfolioMetrics.totalNetPnlPct >= 0 ? '+' : ''}{portfolioMetrics.totalNetPnlPct.toFixed(2)}%)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">Across all connected funded & eval accounts</p>
          </div>
        </div>

        {/* Combined Daily Loss Buffer */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-950 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              Combined Daily Buffer
            </span>
            <span className="text-[10px] text-zinc-400">Total Safety Cushion</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300 tracking-tight">
              ${portfolioMetrics.consolidatedDailyBuffer.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Max daily allowance: <strong className="text-zinc-200 font-mono">${portfolioMetrics.consolidatedDailyLimit.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Nearest Breach Bottleneck */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/30 via-zinc-900/60 to-zinc-950 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-300 font-medium">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Tightest Bottleneck
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
              First to Breach
            </span>
          </div>
          <div className="mt-3">
            {portfolioMetrics.bottleneckAccount ? (
              <>
                <div className="text-lg font-bold text-white truncate">
                  {portfolioMetrics.bottleneckAccount.account.firmName} — {portfolioMetrics.bottleneckAccount.account.accountName}
                </div>
                <div className="text-xs text-rose-300 font-mono mt-1 flex items-center gap-1.5">
                  <span>Remaining Buffer:</span>
                  <strong className="text-rose-400 font-extrabold text-sm">
                    {portfolioMetrics.bottleneckAccount.curSymbol}
                    {portfolioMetrics.bottleneckAccount.drawdownBuffer.toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-zinc-400">
                    ({portfolioMetrics.bottleneckAccount.isTrailing ? 'Trailing' : 'Static'})
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-400">No active accounts</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Real-Time Pass / Breach Multi-Account Stress Test Simulator ── */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Account Pass / Breach Stress Simulator</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-semibold">
                Simultaneous Copier Impact
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Simulate an adverse market move or correlated drawdown across all master & slave copier accounts.
            </p>
          </div>

          {/* Simulator Mode & Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl p-1 bg-zinc-900 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setSimRiskMode('DOLLARS')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-all',
                  simRiskMode === 'DOLLARS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Total Shock ($)
              </button>
              <button
                type="button"
                onClick={() => setSimRiskMode('R_MULTIPLE')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-all',
                  simRiskMode === 'R_MULTIPLE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                R-Multiple (-R)
              </button>
              <button
                type="button"
                onClick={() => setSimRiskMode('PERCENT')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-all',
                  simRiskMode === 'PERCENT'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Account Drop (%)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  value={simulatedShock}
                  onChange={(e) => setSimulatedShock(e.target.value)}
                  className="w-28 pl-3 pr-8 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  {simRiskMode === 'DOLLARS' ? '$' : simRiskMode === 'R_MULTIPLE' ? 'R' : '%'}
                </span>
              </div>

              {simRiskMode === 'R_MULTIPLE' && (
                <div className="relative">
                  <input
                    type="number"
                    value={simBaseR}
                    onChange={(e) => setSimBaseR(e.target.value)}
                    className="w-24 pl-3 pr-7 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="500"
                    title="Base 1R Risk in Dollars"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">$/R</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simulation Outcome Summary Alert */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Safe Accounts Remaining</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
              {simulationResults.safeCount} / {filteredAccounts.length}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Critical Threshold Warning</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-sm">
              {simulationResults.criticalCount} Accounts
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Failed / Breached Accounts</span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-mono font-bold text-sm',
                simulationResults.breachedCount > 0
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse'
                  : 'bg-zinc-800 text-zinc-400'
              )}
            >
              {simulationResults.breachedCount} Breached
            </span>
          </div>
        </div>

        {/* Dynamic Simulation Verdict */}
        {simulationResults.breachedCount > 0 ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-white text-sm block">
                CATASTROPHIC COPIER RISK DETECTED
              </strong>
              <span>
                A correlated loss of{' '}
                <strong className="font-mono text-white">
                  {simRiskMode === 'DOLLARS' ? `$${simulatedShock}` : simRiskMode === 'R_MULTIPLE' ? `${simulatedShock}R` : `${simulatedShock}%`}
                </strong>{' '}
                will immediately breach <strong className="text-white">{simulationResults.breachedCount} account(s)</strong>!
                Adjust your copier multipliers or disconnect tight trailing-drawdown accounts before entering high-volatility sessions.
              </span>
            </div>
          </div>
        ) : simulationResults.criticalCount > 0 ? (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-white text-sm block">ELEVATED DRAWDOWN WARNING</strong>
              <span>
                All accounts survive this shock, but <strong className="text-white">{simulationResults.criticalCount} account(s)</strong> will drop into critical buffer (&lt;25% remaining). Reduce position sizing on smaller evaluation accounts to maintain long-term survival.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-white text-sm block">100% PORTFOLIO RESILIENCE</strong>
              <span>
                All {filteredAccounts.length} accounts safely absorb this loss scenario. Daily limits and trailing high-water mark drawdown guardrails remain intact across your entire funded portfolio.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── High-Water Mark Trailing vs Static Scaling Matrix Table ───── */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 overflow-hidden shadow-xl">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Prop Firm Scaling Matrix & Copier Allocation</h3>
              <p className="text-xs text-zinc-400">
                Synchronized view of trailing floors, daily buffers, and suggested contract sizing ratios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl p-1 bg-zinc-900 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterPhase('ALL')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  filterPhase === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                All ({accounts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterPhase('FUNDED')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  filterPhase === 'FUNDED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Funded
              </button>
              <button
                type="button"
                onClick={() => setFilterPhase('EVAL')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  filterPhase === 'EVAL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Challenges
              </button>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Refresh Matrix"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/70 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Account & Firm</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4">Size & Equity</th>
                <th className="py-3 px-4">Drawdown Model</th>
                <th className="py-3 px-4">High Water Mark</th>
                <th className="py-3 px-4">Loss Floor</th>
                <th className="py-3 px-4">Drawdown Buffer</th>
                <th className="py-3 px-4">Daily Buffer</th>
                <th className="py-3 px-4">Copier Ratio</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {simulationResults.simulatedRows.map((item) => (
                <tr
                  key={item.account.id}
                  className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectAccount?.(item.account.id)}
                >
                  {/* Account Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {item.account.firmName}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                      {item.account.accountName}
                    </div>
                  </td>

                  {/* Phase */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                        item.account.phase === 'Funded' || item.account.phase === 'Instant'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      )}
                    >
                      {item.account.phase}
                    </span>
                  </td>

                  {/* Size & Balance */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-zinc-200 font-semibold">
                      {item.curSymbol}{item.account.currentBalance.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Size: {item.curSymbol}{item.account.accountSize.toLocaleString()}
                    </div>
                  </td>

                  {/* Drawdown Type */}
                  <td className="py-3.5 px-4 font-mono">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold',
                        item.isTrailing
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-800 text-zinc-300'
                      )}
                    >
                      {item.isTrailing ? 'TRAILING HWM' : 'STATIC FLOOR'}
                    </span>
                  </td>

                  {/* High Water Mark */}
                  <td className="py-3.5 px-4 font-mono text-zinc-300">
                    <div>{item.curSymbol}{item.account.highWaterMark.toLocaleString()}</div>
                    {item.distanceFromHwm > 0 && (
                      <div className="text-[10px] text-zinc-500">
                        -{item.curSymbol}{item.distanceFromHwm.toLocaleString()} from peak
                      </div>
                    )}
                  </td>

                  {/* Loss Floor */}
                  <td className="py-3.5 px-4 font-mono text-rose-300 font-semibold">
                    {item.curSymbol}{item.lossFloor.toLocaleString()}
                  </td>

                  {/* Drawdown Buffer */}
                  <td className="py-3.5 px-4 font-mono">
                    <div
                      className={cn(
                        'font-bold',
                        item.isBreached
                          ? 'text-rose-400'
                          : item.isCritical
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      )}
                    >
                      {item.curSymbol}{item.drawdownBuffer.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {item.drawdownUsedPct.toFixed(0)}% used
                    </div>
                  </td>

                  {/* Daily Buffer */}
                  <td className="py-3.5 px-4 font-mono">
                    {item.dailyLimitAbs === 0 ? (
                      <span className="text-zinc-500 text-[10px]">Trailing Only</span>
                    ) : (
                      <>
                        <div
                          className={cn(
                            'font-bold',
                            item.dailyBuffer < item.dailyLimitAbs * 0.25
                              ? 'text-amber-400'
                              : 'text-zinc-200'
                          )}
                        >
                          {item.curSymbol}{item.dailyBuffer.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Lim: {item.curSymbol}{item.dailyLimitAbs.toLocaleString()}
                        </div>
                      </>
                    )}
                  </td>

                  {/* Suggested Copier Ratio */}
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 font-bold">
                      {item.suggestedCopyRatio}x
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border',
                        item.isBreached
                          ? 'text-rose-400 bg-rose-500/15 border-rose-500/40'
                          : item.statusColor
                      )}
                    >
                      {item.isBreached ? 'BREACH HAZARD' : item.statusBadge}
                    </span>
                  </td>

                  {/* Select */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount?.(item.account.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <span>Focus</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Guidance */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>TradeMind Prop Engine Tip:</strong> For trailing accounts (Apex, Topstep), drawdown locks at starting balance + buffer once profit target is reached. Keep risk below 0.75% of your lowest buffer account.
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Matrix active on {filteredAccounts.length} accounts
          </div>
        </div>
      </div>
    </div>
  );
}

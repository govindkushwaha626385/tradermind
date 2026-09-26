// ──────────────────────────────────────────────
// TradeMind — Trading Strategies Management & Performance
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Sliders,
  ChevronRight,
  X,
  Loader2,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  FlaskConical,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type {
  TradingStrategy,
  StrategyPerformance,
  StrategyMarketType,
  StrategyTimeframe,
} from '@trademind/shared';

const MARKET_TYPES: { label: string; value: StrategyMarketType | 'ALL'; color: string }[] = [
  { label: 'All Markets', value: 'ALL', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { label: 'Equity', value: 'EQUITY', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { label: 'Options', value: 'OPTIONS', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { label: 'Futures', value: 'FUTURES', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { label: 'Crypto', value: 'CRYPTO', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { label: 'Commodity', value: 'COMMODITY', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
];

const TIMEFRAMES: { label: string; value: StrategyTimeframe }[] = [
  { label: 'Scalping', value: 'SCALPING' },
  { label: 'Intraday', value: 'INTRADAY' },
  { label: 'Swing', value: 'SWING' },
  { label: 'Positional', value: 'POSITIONAL' },
  { label: 'Long Term', value: 'LONG_TERM' },
];

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<StrategyMarketType | 'ALL'>('ALL');
  const [activeOnly, setActiveOnly] = useState(false);

  // Modals & Panels
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [performanceStrategyId, setPerformanceStrategyId] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<StrategyPerformance | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Delete dialog
  const [deletingStrategy, setDeletingStrategy] = useState<TradingStrategy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // AI Strategy Builder modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedStrategy, setAiGeneratedStrategy] = useState<{
    name: string;
    description: string;
    marketType: StrategyMarketType;
    timeframe: StrategyTimeframe;
    entryCriteria: string;
    exitCriteria: string;
    riskRewardRatio: number;
    maxLossPerTrade: number;
    maxDailyLoss: number;
    tags: string[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    marketType: 'EQUITY' as StrategyMarketType,
    timeframe: 'INTRADAY' as StrategyTimeframe,
    entryCriteria: '',
    exitCriteria: '',
    riskRewardRatio: 2,
    maxLossPerTrade: 1,
    maxDailyLoss: 3,
    tags: '',
    isActive: true,
  });

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getStrategies();
      if (res.success && Array.isArray(res.data)) {
        setStrategies(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch strategies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Trading Strategies — TradeMind';
    fetchStrategies();
  }, [fetchStrategies]);

  // Load performance breakdown
  const handleOpenPerformance = async (strategy: TradingStrategy) => {
    setPerformanceStrategyId(strategy.id);
    setLoadingPerformance(true);
    try {
      const res = await api.getStrategyPerformance(strategy.id);
      if (res.success) {
        setPerformanceData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load strategy performance');
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStrategy(null);
    setFormData({
      name: '',
      description: '',
      marketType: 'EQUITY',
      timeframe: 'INTRADAY',
      entryCriteria: '',
      exitCriteria: '',
      riskRewardRatio: 2,
      maxLossPerTrade: 1,
      maxDailyLoss: 3,
      tags: '',
      isActive: true,
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (strat: TradingStrategy) => {
    setEditingStrategy(strat);
    setFormData({
      name: strat.name,
      description: strat.description || '',
      marketType: strat.marketType,
      timeframe: (strat.timeframe as StrategyTimeframe) || 'INTRADAY',
      entryCriteria: strat.entryCriteria || '',
      exitCriteria: strat.exitCriteria || '',
      riskRewardRatio: (strat.riskRules as any)?.riskRewardRatio ?? 2,
      maxLossPerTrade: (strat.riskRules as any)?.maxLossPerTrade ?? 1,
      maxDailyLoss: (strat.riskRules as any)?.maxDailyLoss ?? 3,
      tags: (strat.tags || []).join(', '),
      isActive: strat.isActive,
    });
    setCreateModalOpen(true);
  };

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Strategy name is required');
      return;
    }

    try {
      setActionLoading(true);
      const payload: Partial<TradingStrategy> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        marketType: formData.marketType,
        timeframe: formData.timeframe,
        entryCriteria: formData.entryCriteria.trim() || null,
        exitCriteria: formData.exitCriteria.trim() || null,
        riskRules: {
          riskRewardRatio: Number(formData.riskRewardRatio),
          maxLossPerTrade: Number(formData.maxLossPerTrade),
          maxDailyLoss: Number(formData.maxDailyLoss),
        },
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        isActive: formData.isActive,
      };

      if (editingStrategy) {
        const res = await api.updateStrategy(editingStrategy.id, payload);
        if (res.success) {
          toast.success('Strategy updated successfully');
          setCreateModalOpen(false);
          fetchStrategies();
        }
      } else {
        const res = await api.createStrategy(payload);
        if (res.success) {
          toast.success('Strategy created successfully');
          setCreateModalOpen(false);
          fetchStrategies();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save strategy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStrategy) return;
    try {
      setActionLoading(true);
      const res = await api.deleteStrategy(deletingStrategy.id);
      if (res.success) {
        toast.success(res.data.message || 'Strategy deleted');
        setDeletingStrategy(null);
        fetchStrategies();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete strategy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAiStrategy = async (promptToUse?: string) => {
    const text = (promptToUse || aiPrompt).trim();
    if (!text) {
      toast.error('Please enter a description for your strategy idea');
      return;
    }

    setAiGenerating(true);
    setAiGeneratedStrategy(null);
    try {
      const res = await api.generateAiStrategy(text);
      if (res.success && res.data) {
        setAiGeneratedStrategy(res.data);
        toast.success('Strategy synthesized by AI!');
      } else {
        toast.error((res as any)?.error?.message || 'Failed to synthesize strategy');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI strategy generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiStrategyToForm = () => {
    if (!aiGeneratedStrategy) return;
    setFormData({
      name: aiGeneratedStrategy.name,
      description: aiGeneratedStrategy.description,
      marketType: aiGeneratedStrategy.marketType,
      timeframe: aiGeneratedStrategy.timeframe,
      entryCriteria: aiGeneratedStrategy.entryCriteria,
      exitCriteria: aiGeneratedStrategy.exitCriteria,
      riskRewardRatio: aiGeneratedStrategy.riskRewardRatio,
      maxLossPerTrade: aiGeneratedStrategy.maxLossPerTrade,
      maxDailyLoss: aiGeneratedStrategy.maxDailyLoss,
      tags: Array.isArray(aiGeneratedStrategy.tags) ? aiGeneratedStrategy.tags.join(', ') : '',
      isActive: true,
    });
    setEditingStrategy(null);
    setAiModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleSaveAiStrategyDirectly = async () => {
    if (!aiGeneratedStrategy) return;
    try {
      setActionLoading(true);
      const payload = {
        name: aiGeneratedStrategy.name,
        description: aiGeneratedStrategy.description,
        marketType: aiGeneratedStrategy.marketType,
        timeframe: aiGeneratedStrategy.timeframe,
        entryCriteria: aiGeneratedStrategy.entryCriteria,
        exitCriteria: aiGeneratedStrategy.exitCriteria,
        riskRules: {
          riskRewardRatio: aiGeneratedStrategy.riskRewardRatio,
          maxLossPerTradePercent: aiGeneratedStrategy.maxLossPerTrade,
          maxDailyLossPercent: aiGeneratedStrategy.maxDailyLoss,
        },
        tags: Array.isArray(aiGeneratedStrategy.tags) ? aiGeneratedStrategy.tags : [],
        isActive: true,
      };
      const res = await api.createStrategy(payload);
      if (res.success) {
        toast.success(`Strategy "${aiGeneratedStrategy.name}" created!`);
        setAiModalOpen(false);
        setAiGeneratedStrategy(null);
        setAiPrompt('');
        fetchStrategies();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create strategy');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    return strategies.filter((s) => {
      if (activeOnly && !s.isActive) return false;
      if (selectedMarket !== 'ALL' && s.marketType !== selectedMarket) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = s.description?.toLowerCase().includes(q);
        const matchTags = s.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }, [strategies, activeOnly, selectedMarket, search]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalCount = strategies.length;
    let totalPnl = 0;
    let best: TradingStrategy | null = null;
    let topWinRate: TradingStrategy | null = null;

    for (const s of strategies) {
      totalPnl += s.totalPnl || 0;
      if (!best || (s.totalPnl || 0) > (best.totalPnl || 0)) {
        best = s;
      }
      const winRate = s.totalTrades > 0 ? (s.winCount / s.totalTrades) * 100 : 0;
      const currentTopRate =
        topWinRate && topWinRate.totalTrades > 0
          ? (topWinRate.winCount / topWinRate.totalTrades) * 100
          : 0;

      if (s.totalTrades >= 3 && winRate > currentTopRate) {
        topWinRate = s;
      }
    }

    return {
      totalCount,
      totalPnl,
      bestName: best ? best.name : '—',
      bestPnl: best ? best.totalPnl : 0,
      hasBest: Boolean(best),
      topRateName: topWinRate ? topWinRate.name : '—',
      topRatePercent:
        topWinRate && topWinRate.totalTrades > 0
          ? ((topWinRate.winCount / topWinRate.totalTrades) * 100).toFixed(1)
          : null,
      topRateCounts: topWinRate ? `${topWinRate.winCount}/${topWinRate.totalTrades} W` : '',
    };
  }, [strategies]);

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600/20 to-emerald-500/20 border border-brand-500/30 text-brand-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Trading Strategies
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  Live Edge
                </span>
              </h1>
              <p className="text-sm text-zinc-400">
                Define rules, track setups in journal trades, and measure your real mathematical edge.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/backtesting"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium transition-all group shadow-sm"
          >
            <FlaskConical className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Backtesting Studio</span>
          </Link>

          <button
            onClick={() => {
              setAiGeneratedStrategy(null);
              setAiModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-medium shadow-lg shadow-purple-600/25 transition-all group"
          >
            <Sparkles className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform" />
            <span>AI Strategy Builder</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-medium shadow-lg shadow-brand-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Strategy</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Total Strategies</span>
            <Layers className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{kpis.totalCount}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {strategies.filter((s) => s.isActive).length} active setups
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Combined P&L</span>
            {kpis.totalPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div
            className={cn(
              'text-2xl font-bold',
              kpis.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {formatCurrency(kpis.totalPnl)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">From all strategy-tagged trades</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Top Performing</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {kpis.bestName}
          </div>
          <div className="text-xs text-emerald-400 mt-1">
            {kpis.hasBest ? `${formatCurrency(kpis.bestPnl)} profit` : 'No trades logged'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Highest Win Rate</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {kpis.topRateName}
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {kpis.topRatePercent
              ? `${kpis.topRatePercent}% (${kpis.topRateCounts})`
              : 'Min 3 trades required'}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search strategy name, notes, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Markets and Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {MARKET_TYPES.map((m) => (
              <button
                key={m.value}
                onClick={() => setSelectedMarket(m.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap',
                  selectedMarket === m.value
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer ml-auto pl-2 border-l border-zinc-800">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-0"
            />
            <span>Active only</span>
          </label>
        </div>
      </div>

      {/* ── Strategy Grid ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : filteredStrategies.length === 0 ? (
        <EmptyState
          icon={Target}
          title={search ? 'No matching strategies found' : 'No strategies added yet'}
          description={
            search
              ? 'Try modifying your search or clearing the market filters.'
              : 'Add your primary setups (e.g. ORB, Trend Pullback, Mean Reversion) to track your edge per trade.'
          }
          action={
            search
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearch('');
                    setSelectedMarket('ALL');
                  },
                }
              : {
                  label: 'Create First Strategy',
                  onClick: handleOpenCreate,
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStrategies.map((strat) => {
            const winRate =
              strat.totalTrades > 0
                ? Number(((strat.winCount / strat.totalTrades) * 100).toFixed(1))
                : 0;

            const marketStyle =
              MARKET_TYPES.find((m) => m.value === strat.marketType)?.color ||
              'bg-zinc-800 text-zinc-400 border-zinc-700';

            return (
              <div
                key={strat.id}
                className={cn(
                  'rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 group relative',
                  strat.isActive
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80 shadow-md'
                    : 'bg-zinc-950/40 border-zinc-900 opacity-60 hover:opacity-80',
                )}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border',
                            marketStyle,
                          )}
                        >
                          {strat.marketType}
                        </span>
                        {strat.timeframe && (
                          <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {strat.timeframe}
                          </span>
                        )}
                        {!strat.isActive && (
                          <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                        {strat.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(strat)}
                        title="Edit strategy"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingStrategy(strat)}
                        title="Delete strategy"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {strat.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {strat.description}
                    </p>
                  )}

                  {/* Metrics Box */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/60 mb-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Win Rate</span>
                      <span
                        className={cn(
                          'font-bold',
                          winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300',
                        )}
                      >
                        {winRate}%{' '}
                        <span className="text-[10px] text-zinc-500 font-normal">
                          ({strat.winCount}W - {strat.lossCount}L)
                        </span>
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          winRate >= 60
                            ? 'bg-emerald-500'
                            : winRate >= 40
                            ? 'bg-brand-500'
                            : 'bg-amber-500',
                        )}
                        style={{ width: `${Math.min(winRate, 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-900 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Net P&L</span>
                        <span
                          className={cn(
                            'font-bold',
                            strat.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {formatCurrency(strat.totalPnl)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Avg R-Multiple</span>
                        <span className="font-semibold text-zinc-200">
                          {strat.avgRMultiple ? `${strat.avgRMultiple}R` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {strat.tags && strat.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {strat.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleOpenPerformance(strat)}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>Performance</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
                  </button>

                  <Link
                    href={`/dashboard/backtesting?strategy=${encodeURIComponent(strat.name)}`}
                    className="py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium text-indigo-300 flex items-center justify-center gap-1.5 transition-all border border-indigo-500/20 shrink-0"
                    title="Forward-test this setup in the bar-by-bar simulator"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Backtest</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Performance Breakdown Drawer / Modal ───────────── */}
      {performanceStrategyId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setPerformanceStrategyId(null);
                setPerformanceData(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingPerformance || !performanceData ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <p className="text-sm text-zinc-400">Loading strategy analytics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase font-semibold text-brand-400 tracking-wider">
                    Strategy Analytics
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    {performanceData.strategyName}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Detailed mathematical edge computed over {performanceData.totalTrades} journaled
                    trades.
                  </p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block uppercase">Win Rate</span>
                    <span className="text-lg font-bold text-white">
                      {performanceData.winRate}%
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {performanceData.winCount}W / {performanceData.lossCount}L
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block uppercase">Net Profit</span>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        performanceData.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {formatCurrency(performanceData.totalPnl)}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Fees: {formatCurrency(performanceData.totalFees)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block uppercase">Profit Factor</span>
                    <span className="text-lg font-bold text-white">
                      {performanceData.profitFactor >= 999 ? '∞' : performanceData.profitFactor}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Gross: {formatCurrency(performanceData.grossPnl)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block uppercase">Avg R-Multiple</span>
                    <span className="text-lg font-bold text-brand-400">
                      {performanceData.avgRMultiple ? `${performanceData.avgRMultiple}R` : '—'}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Avg PnL: {formatCurrency(performanceData.avgPnlPerTrade)}
                    </span>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Best Winning Trade</span>
                    <span className="font-semibold text-emerald-400 text-sm">
                      {formatCurrency(performanceData.bestTradePnl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Worst Losing Trade</span>
                    <span className="font-semibold text-red-400 text-sm">
                      {formatCurrency(performanceData.worstTradePnl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Avg Holding Duration</span>
                    <span className="font-semibold text-zinc-200 text-sm">
                      {performanceData.avgHoldingPeriodMinutes > 0
                        ? `${performanceData.avgHoldingPeriodMinutes} mins`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Recent Trades Table */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center justify-between">
                    <span>Recent Executed Trades</span>
                    <span className="text-xs font-normal text-zinc-500">
                      Showing up to 10 latest
                    </span>
                  </h4>

                  {performanceData.recentTrades.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">
                      No trades have been associated with this strategy yet. Select this strategy
                      when editing trades in your journal!
                    </p>
                  ) : (
                    <div className="border border-zinc-800 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Direction</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Net P&L</th>
                            <th className="py-2.5 px-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {performanceData.recentTrades.map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-800/40">
                              <td className="py-2 px-3 font-semibold text-white">
                                {t.tradingsymbol}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded font-bold text-[10px]',
                                    t.direction === 'LONG'
                                      ? 'text-emerald-400 bg-emerald-500/10'
                                      : 'text-red-400 bg-red-500/10',
                                  )}
                                >
                                  {t.direction}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-zinc-400">{t.status}</td>
                              <td
                                className={cn(
                                  'py-2 px-3 text-right font-semibold',
                                  t.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                                )}
                              >
                                {formatCurrency(t.netPnl)}
                              </td>
                              <td className="py-2 px-3 text-right text-zinc-500">
                                {formatDate(t.openedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setPerformanceStrategyId(null);
                      setPerformanceData(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create / Edit Strategy Modal ───────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              {editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              Establish clear entry rules, risk guidelines, and asset specialization.
            </p>

            <form onSubmit={handleSaveStrategy} className="space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Strategy Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15-Min ORB Breakout, VWAP Reversal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              {/* Classification: Market Type & Timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Market Type</label>
                  <select
                    value={formData.marketType}
                    onChange={(e) =>
                      setFormData({ ...formData, marketType: e.target.value as StrategyMarketType })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-brand-500/50"
                  >
                    {MARKET_TYPES.filter((m) => m.value !== 'ALL').map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Timeframe</label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) =>
                      setFormData({ ...formData, timeframe: e.target.value as StrategyTimeframe })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-brand-500/50"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Overview / Thesis</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe the core concept behind this strategy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              {/* Entry Criteria */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Entry Criteria (Rules to trigger a trade)
                </label>
                <textarea
                  rows={3}
                  placeholder="1. High relative volume (RVOL > 2.0)&#10;2. Clean breakout of pre-market high with 5m candle close&#10;3. Market breadth in agreement (Nifty/BankNifty trending)"
                  value={formData.entryCriteria}
                  onChange={(e) => setFormData({ ...formData, entryCriteria: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              {/* Exit Criteria */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Exit & Take-Profit Criteria
                </label>
                <textarea
                  rows={2}
                  placeholder="Target 1 at 1:2 R:R (book 50%), trail stop behind previous 5m swing low."
                  value={formData.exitCriteria}
                  onChange={(e) => setFormData({ ...formData, exitCriteria: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              {/* Risk Guidelines */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
                <span className="text-zinc-400 font-semibold block text-[11px] uppercase tracking-wider">
                  Risk Management Parameters
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Target R:R</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={formData.riskRewardRatio}
                      onChange={(e) =>
                        setFormData({ ...formData, riskRewardRatio: parseFloat(e.target.value) || 2 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Max Risk / Trade (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.maxLossPerTrade}
                      onChange={(e) =>
                        setFormData({ ...formData, maxLossPerTrade: parseFloat(e.target.value) || 1 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Max Daily Loss (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.maxDailyLoss}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDailyLoss: parseFloat(e.target.value) || 3 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tags & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="breakout, momentum, morning"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2.5 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-brand-500 focus:ring-0"
                    />
                    <span className="font-medium">Active Strategy</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingStrategy ? 'Update Strategy' : 'Create Strategy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI Strategy Builder Modal ───────────────────────── */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setAiModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Institutional Strategy Architect
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  AI Plain-English Strategy Builder
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Describe your setup in natural language or click a preset. TradeMind AI will structure your rules, risk parameters, and execution checklist.
                </p>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Quick Institutional Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'BankNifty 5-min EMA Scalper',
                    text: '5-minute Bank Nifty options scalp: Enter when 9 EMA crosses above 21 EMA above VWAP with RSI > 60. Stop loss 25 points, target 50 points (1:2 R:R). Max 1% risk per trade.',
                  },
                  {
                    label: 'Nifty 15-min CPR Breakout',
                    text: '15-minute Nifty breakout: Enter when candle closes beyond Daily CPR with volume > 1.5x average. Stop at Central Pivot, target Daily R1 or 1:2.5 risk-reward.',
                  },
                  {
                    label: 'Stock Swing Momentum',
                    text: 'Daily swing trade in high-beta equity: Enter 20-day high breakout with heavy institutional volume. Stop at 20-day EMA, target 2:1 risk-reward or 8% trailing stop.',
                  },
                  {
                    label: 'Delta Neutral Options Strangle',
                    text: 'BankNifty options selling: Sell 15-delta OTM Call and Put on Tuesday morning. Stop loss when any leg expands by 50% premium. Target 60% theta decay.',
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAiPrompt(preset.text);
                      handleGenerateAiStrategy(preset.text);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/30 border border-zinc-700/60 text-zinc-300 transition-all text-left"
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Your Strategy Idea (Plain English)
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your entry signals, indicators (EMA, RSI, VWAP), stop loss, target, risk percentage, and preferred market..."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all resize-none"
              />
            </div>

            <button
              type="button"
              onClick={() => handleGenerateAiStrategy()}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Strategy Edge with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize Strategy with AI</span>
                </>
              )}
            </button>

            {/* Generated Strategy Preview Card */}
            {aiGeneratedStrategy && (
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-purple-500/30 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {aiGeneratedStrategy.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {aiGeneratedStrategy.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {aiGeneratedStrategy.marketType}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {aiGeneratedStrategy.timeframe}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 text-center">
                  <div>
                    <div className="text-[11px] text-zinc-500">Risk:Reward</div>
                    <div className="text-sm font-bold text-emerald-400">1 : {aiGeneratedStrategy.riskRewardRatio}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500">Risk / Trade</div>
                    <div className="text-sm font-bold text-amber-400">{aiGeneratedStrategy.maxLossPerTrade}%</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500">Daily Max Loss</div>
                    <div className="text-sm font-bold text-rose-400">{aiGeneratedStrategy.maxDailyLoss}%</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-300">Entry Rules:</span>
                    <pre className="text-zinc-400 font-sans whitespace-pre-wrap mt-1 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                      {aiGeneratedStrategy.entryCriteria}
                    </pre>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-300">Exit &amp; Stop Rules:</span>
                    <pre className="text-zinc-400 font-sans whitespace-pre-wrap mt-1 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                      {aiGeneratedStrategy.exitCriteria}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={handleApplyAiStrategyToForm}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
                  >
                    Edit in Form
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAiStrategyDirectly}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save to Strategies</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Delete Dialog ──────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deletingStrategy)}
        title="Delete Strategy"
        description={`Are you sure you want to delete "${deletingStrategy?.name}"? If there are already logged journal trades linked to this strategy, it will be safely deactivated to preserve your historical analytics.`}
        confirmLabel="Confirm Delete"
        danger
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingStrategy(null)}
      />
    </div>
  );
}

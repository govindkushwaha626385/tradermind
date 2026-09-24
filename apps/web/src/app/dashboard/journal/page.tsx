// ──────────────────────────────────────────────
// TradeMind — Journal Page (Enhanced)
//
// Integrates discipline engine: checklists, trade plans,
// trade ratings, mistake tagging, and self-reflection.
// Features pagination controls, SkeletonCard loading, EmptyState.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Brain,
  ClipboardCheck,
  Target,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  PlayCircle,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Volume2,
  Maximize2,
  List,
  Calendar as CalendarIcon,
  BarChart2,
  Scale,
  ArrowLeftRight,
  Filter,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { EMOTION_EMOJIS, EMOTION_LABELS, MISTAKE_TAGS, MISTAKE_LABELS } from '@trademind/shared';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { TradeAutopsy } from '@/components/ai/TradeAutopsy';
import { VoiceDictation } from '@/components/ai/VoiceDictation';
import { MarketSessionStatus } from '@/components/dashboard/MarketSessionStatus';
import { CalendarHeatmap } from '@/components/analytics/CalendarHeatmap';
import { TradeCandleModal } from '@/components/chart/TradeCandleModal';
import { TradeComparisonModal } from '@/components/chart/TradeComparisonModal';

interface TradeJournalEntry {
  id: string;
  symbol?: string;
  tradingsymbol?: string;
  direction: string;
  status: string;
  netPnl: number;
  entryPrice?: number;
  avgEntryPrice?: number;
  exitPrice?: number;
  avgExitPrice?: number;
  qty?: number;
  totalQuantity?: number;
  openedAt: string;
  closedAt?: string;
  emotions?: string[];
  mistakeTags?: string[];
  tradeType: string;
  ruleComplianceScore?: number;
  strategyId?: string;
  strategyName?: string;
  currency?: string;
  // Advanced metrics
  rMultiple?: number | null;
  maxFavorableExcursion?: number | null;
  maxAdverseExcursion?: number | null;
  holdingPeriodMinutes?: number | null;
  screenshotUrls?: string[] | null;
  audioNoteUrl?: string | null;
  traderNotes?: string | null;
}

export default function JournalPage() {
  const { currencySymbol, format } = useCurrency();
  const [trades, setTrades] = useState<TradeJournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [strategies, setStrategies] = useState<import('@trademind/shared').TradingStrategy[]>([]);
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [journalModal, setJournalModal] = useState<TradeJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [batchAutofilling, setBatchAutofilling] = useState(false);
  const [suggestedSetup, setSuggestedSetup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedChartTrade, setSelectedChartTrade] = useState<TradeJournalEntry | null>(null);

  // Multi-dimensional filters state
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN'>('ALL');
  const [emotionFilter, setEmotionFilter] = useState<string>('ALL');
  const [mistakeFilter, setMistakeFilter] = useState<string>('ALL');
  const [showExtendedFilters, setShowExtendedFilters] = useState<boolean>(false);

  // Trade Comparison Studio state
  const [compareTradeA, setCompareTradeA] = useState<TradeJournalEntry | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const limit = 20;

  useEffect(() => {
    document.title = 'Trade Journal — TradeMind';
    // Fetch available user strategies for selector and filtering
    api.getStrategies().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setStrategies(res.data);
      }
    }).catch((err) => {
      console.warn('Could not load user strategies:', err);
    });
  }, []);

  const fetchTrades = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await api.getJournalTrades({
        page: targetPage,
        limit,
        status: filter !== 'ALL' ? filter : undefined,
        strategyId: strategyFilter !== 'ALL' ? strategyFilter : undefined,
        sortBy: 'openedAt',
        sortOrder: 'desc',
      });
      if (res.success) {
        const data = (res as any).data ?? [];
        setTrades(data);
        setPage((res as any).page ?? targetPage);
        setTotalPages((res as any).totalPages ?? 1);
        setTotalTrades((res as any).total ?? data.length);
      }
    } catch (err) {
      console.error('Failed to fetch journal trades:', err);
      toast.error('Failed to load journal trades');
    } finally {
      setLoading(false);
    }
  }, [filter, strategyFilter]);

  useEffect(() => {
    fetchTrades(page);
  }, [fetchTrades, page]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      fetchTrades(1);
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [fetchTrades]);

  // Journal form state
  const [formStrategyId, setFormStrategyId] = useState<string>('');
  const [formEmotions, setFormEmotions] = useState<string[]>([]);
  const [formMistakes, setFormMistakes] = useState<string[]>([]);
  const [formReflection, setFormReflection] = useState('');
  const [formExecutionRating, setFormExecutionRating] = useState(0);
  const [formPlanRating, setFormPlanRating] = useState(0);
  const [formPsychologyRating, setFormPsychologyRating] = useState(0);
  const [formFollowedPlan, setFormFollowedPlan] = useState<boolean | null>(null);
  const [formLesson, setFormLesson] = useState('');

  // Plan form state
  const [planEntry, setPlanEntry] = useState('');
  const [planSL, setPlanSL] = useState('');
  const [planTP, setPlanTP] = useState('');
  const [planRisk, setPlanRisk] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Screenshot & Audio uploads
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [formScreenshots, setFormScreenshots] = useState<string[]>([]);
  const [formAudioUrl, setFormAudioUrl] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const filtered = trades.filter((t) => {
    const symbol = t.symbol || t.tradingsymbol || '';
    if (search && !symbol.toLowerCase().includes(search.toLowerCase())) return false;

    if (directionFilter !== 'ALL') {
      const isLong = t.direction === 'LONG' || t.direction === 'BUY';
      if (directionFilter === 'LONG' && !isLong) return false;
      if (directionFilter === 'SHORT' && isLong) return false;
    }

    if (outcomeFilter !== 'ALL') {
      const pnl = Number(t.netPnl ?? 0);
      if (outcomeFilter === 'WIN' && pnl <= 0) return false;
      if (outcomeFilter === 'LOSS' && pnl >= 0) return false;
      if (outcomeFilter === 'BREAKEVEN' && Math.abs(pnl) > 5) return false;
    }

    if (emotionFilter !== 'ALL') {
      const em = t.emotions || [];
      if (!em.includes(emotionFilter)) return false;
    }

    if (mistakeFilter !== 'ALL') {
      const mis = t.mistakeTags || [];
      if (!mis.includes(mistakeFilter)) return false;
    }

    return true;
  });

  const hasActiveFilters =
    search.trim() !== '' ||
    strategyFilter !== 'ALL' ||
    filter !== 'ALL' ||
    directionFilter !== 'ALL' ||
    outcomeFilter !== 'ALL' ||
    emotionFilter !== 'ALL' ||
    mistakeFilter !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setStrategyFilter('ALL');
    setFilter('ALL');
    setDirectionFilter('ALL');
    setOutcomeFilter('ALL');
    setEmotionFilter('ALL');
    setMistakeFilter('ALL');
  };

  const openJournalModal = (trade: TradeJournalEntry) => {
    setJournalModal(trade);
    setFormStrategyId(trade.strategyId || '');
    setFormEmotions(trade.emotions ?? []);
    setFormMistakes(trade.mistakeTags ?? []);
    setFormReflection(trade.traderNotes || '');
    setFormExecutionRating(0);
    setFormPlanRating(0);
    setFormPsychologyRating(0);
    setFormFollowedPlan(null);
    setFormLesson('');
    setSuggestedSetup(null);
    setFormScreenshots(trade.screenshotUrls ? [...trade.screenshotUrls] : []);
    setFormAudioUrl(trade.audioNoteUrl || '');
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingScreenshot(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const res = await api.uploadScreenshot(file);
        if (res.success && res.data?.url) {
          setFormScreenshots((prev) => [...prev, res.data.url]);
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(res.error?.message || `Failed to upload ${file.name}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Screenshot upload failed');
    } finally {
      setUploadingScreenshot(false);
      e.target.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const res = await api.uploadAudio(file);
      if (res.success && res.data?.url) {
        setFormAudioUrl(res.data.url);
        toast.success('Voice note audio uploaded');
      } else {
        toast.error(res.error?.message || 'Failed to upload audio');
      }
    } catch (err: any) {
      toast.error(err.message || 'Audio upload failed');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const toggleEmotion = (e: string) => {
    setFormEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  };

  const toggleMistake = (m: string) => {
    setFormMistakes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await api.exportJournalCsv();
      toast.success('Journal exported to CSV');
    } catch (err) {
      console.error('Failed to export journal CSV:', err);
      toast.error('Failed to export journal CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleAutofillModal = async () => {
    if (!journalModal) return;
    setAutoFilling(true);
    try {
      const res = await api.autofillJournal(journalModal.id);
      if (res.success && res.data) {
        const d = res.data;
        setFormEmotions(d.emotions ?? []);
        setFormMistakes(d.mistakeTags ?? []);
        setFormFollowedPlan(d.followedPlan);
        setFormExecutionRating(d.executionRating ?? 4);
        setFormPlanRating(d.planRating ?? 4);
        setFormPsychologyRating(d.psychologyRating ?? 4);
        setFormReflection(d.reflection ?? '');
        setFormLesson(d.lessonLearned ?? '');
        setSuggestedSetup(d.suggestedSetup ?? null);
        toast.success('✨ AI generated notes, ratings & psychological insights');
      }
    } catch (err: any) {
      console.error('Failed to autofill journal:', err);
      toast.error('Could not auto-generate journal notes');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleBatchAutofill = async () => {
    setBatchAutofilling(true);
    try {
      const res = await api.batchAutofillJournal();
      if (res.success && res.data) {
        const count = res.data.totalProcessed;
        if (count > 0) {
          toast.success(`✨ Successfully auto-journaled ${count} pending trade${count > 1 ? 's' : ''}!`);
          await fetchTrades(page);
        } else {
          toast.info('All closed trades are already journaled.');
        }
      }
    } catch (err) {
      console.error('Failed to batch autofill:', err);
      toast.error('Failed to auto-journal pending trades');
    } finally {
      setBatchAutofilling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Trade Journal"
        description="Review, annotate, and learn from every trade execution"
        icon={BookOpen}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Segmented Switcher (Table vs Calendar Heatmap) */}
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/80 shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'calendar'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar Heatmap</span>
              </button>
            </div>

            <button
              onClick={handleBatchAutofill}
              disabled={batchAutofilling || trades.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-glow disabled:opacity-50"
              title="Auto-Journal all pending trades using AI"
            >
              {batchAutofilling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              {batchAutofilling ? 'AI Journaling...' : 'AI Auto-Journal'}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-eod-review'))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all shadow-sm"
              title="Launch End-of-Day Guided Wrap-Up Ritual"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              EOD Wrap-Up
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-position-calculator'))}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-accent text-sm font-semibold transition-colors shadow-sm"
              title="Instant Position Sizing & Risk Calculator"
            >
              <Scale className="w-4 h-4 text-primary" />
              Position Sizing
            </button>
            <button
              onClick={() => {
                setCompareTradeA(trades[0] || null);
                setCompareOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-accent text-sm font-semibold transition-colors shadow-sm"
              title="Side-by-Side Trade Comparison Studio"
            >
              <ArrowLeftRight className="w-4 h-4 text-purple-400" />
              Compare Studio
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exporting || trades.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background hover:bg-accent text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              title="Export Journal to CSV"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        }
      />

      {/* Live Market Session Banner */}
      <MarketSessionStatus />

      {/* Render Calendar Heatmap Mode if selected */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4 animate-fade-in">
          <CalendarHeatmap />
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by symbol (e.g. NIFTY, AAPL, BTC)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowExtendedFilters(!showExtendedFilters)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                    showExtendedFilters || hasActiveFilters
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  title="Toggle Multi-Dimensional Filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>

                {strategies.length > 0 && (
                  <select
                    value={strategyFilter}
                    onChange={(e) => {
                      setStrategyFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">All Strategies</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.marketType})
                      </option>
                    ))}
                  </select>
                )}

                {(['ALL', 'OPEN', 'CLOSED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setPage(1);
                    }}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border',
                      filter === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Extended Faceted Filter Drawer */}
            {showExtendedFilters && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in text-xs">
                {/* Direction Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Direction
                  </label>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">All Directions</option>
                    <option value="LONG">Long / Buy</option>
                    <option value="SHORT">Short / Sell</option>
                  </select>
                </div>

                {/* Outcome Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    P&L Outcome
                  </label>
                  <select
                    value={outcomeFilter}
                    onChange={(e) => setOutcomeFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">All Outcomes</option>
                    <option value="WIN">Winners (P&L &gt; 0)</option>
                    <option value="LOSS">Losses (P&L &lt; 0)</option>
                    <option value="BREAKEVEN">Breakeven (&plusmn;0)</option>
                  </select>
                </div>

                {/* Emotion Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Emotion Logged
                  </label>
                  <select
                    value={emotionFilter}
                    onChange={(e) => setEmotionFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">All Emotions</option>
                    {Object.entries(EMOTION_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {EMOTION_EMOJIS[k as keyof typeof EMOTION_EMOJIS]} {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mistake Tag Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Mistake Tagged
                  </label>
                  <select
                    value={mistakeFilter}
                    onChange={(e) => setMistakeFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">All Mistakes</option>
                    {Object.entries(MISTAKE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Active Filter Chips Strip */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Active Filters:
                </span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                    "{search}"
                    <button onClick={() => setSearch('')} className="hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {directionFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground border border-border text-[11px] font-medium">
                    Direction: {directionFilter}
                    <button onClick={() => setDirectionFilter('ALL')} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {outcomeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground border border-border text-[11px] font-medium">
                    Outcome: {outcomeFilter}
                    <button onClick={() => setOutcomeFilter('ALL')} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {emotionFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground border border-border text-[11px] font-medium">
                    Emotion: {EMOTION_LABELS[emotionFilter as keyof typeof EMOTION_LABELS] || emotionFilter}
                    <button onClick={() => setEmotionFilter('ALL')} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {mistakeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground border border-border text-[11px] font-medium">
                    Mistake: {MISTAKE_LABELS[mistakeFilter as keyof typeof MISTAKE_LABELS] || mistakeFilter}
                    <button onClick={() => setMistakeFilter('ALL')} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-destructive hover:bg-destructive/10 transition-colors font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear All
                </button>
              </div>
            )}
          </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 shadow-card">
          <EmptyState
            icon={BookOpen}
            title={search ? 'No trades match your search' : 'No trades found'}
            description={
              search
                ? `No recorded trades found for "${search}". Try searching for another symbol.`
                : filter !== 'ALL'
                  ? `You have no ${filter.toLowerCase()} trades right now.`
                  : 'Connect your broker or import trades to start journaling and tracking your discipline score.'
            }
            action={
              search
                ? {
                    label: 'Clear Search',
                    onClick: () => setSearch(''),
                  }
                : filter !== 'ALL'
                  ? {
                      label: 'Show All Trades',
                      onClick: () => setFilter('ALL'),
                    }
                  : {
                      label: 'Connect Broker',
                      href: '/dashboard/brokers',
                    }
            }
          />
        </div>
      ) : (
        /* Trade List */
        <div className="space-y-3">
          {filtered.map((trade) => {
            const symbol = trade.symbol || trade.tradingsymbol || 'UNKNOWN';
            const entryPrice = trade.entryPrice ?? trade.avgEntryPrice ?? 0;
            const qty = trade.qty ?? trade.totalQuantity ?? 0;

            return (
              <div key={trade.id}>
                {/* Trade Card */}
                <div
                  className="glass-card rounded-2xl p-4 sm:p-5 hover:shadow-card-hover transition-all cursor-pointer group"
                  onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm',
                          trade.direction === 'LONG'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {trade.direction === 'LONG' ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground font-mono">{symbol}</span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-semibold border',
                              trade.status === 'CLOSED'
                                ? 'bg-muted text-muted-foreground border-border/50'
                                : 'bg-success/10 text-success border-success/20',
                            )}
                          >
                            {trade.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/80 text-muted-foreground font-medium">
                            {trade.tradeType || 'MANUAL'}
                          </span>
                          {trade.strategyName && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/25 flex items-center gap-1">
                              <Target className="w-3 h-3 text-purple-400" />
                              {trade.strategyName}
                            </span>
                          )}
                          {trade.ruleComplianceScore !== undefined && (
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-semibold border',
                                trade.ruleComplianceScore >= 0.7
                                  ? 'bg-success/10 text-success border-success/20'
                                  : trade.ruleComplianceScore >= 0.4
                                    ? 'bg-warning/10 text-warning border-warning/20'
                                    : 'bg-destructive/10 text-destructive border-destructive/20',
                              )}
                            >
                              {Math.round(trade.ruleComplianceScore * 100)}% compliant
                            </span>
                          )}
                          {trade.rMultiple != null && (
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-semibold border font-mono',
                                trade.rMultiple >= 1
                                  ? 'bg-success/10 text-success border-success/20'
                                  : trade.rMultiple >= 0
                                    ? 'bg-warning/10 text-warning border-warning/20'
                                    : 'bg-destructive/10 text-destructive border-destructive/20',
                              )}
                              title="R-Multiple achieved"
                            >
                              {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple.toFixed(2)}R
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(trade.openedAt, 'long')}
                          {trade.closedAt && ` — ${formatDate(trade.closedAt, 'long')}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-lg font-extrabold font-mono',
                            trade.netPnl >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {trade.netPnl >= 0 ? '+' : ''}
                          {formatCurrency(trade.netPnl)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {qty} @ {formatCurrency(entryPrice)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChartTrade(trade);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
                        title="Quick Candlestick Chart View"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Chart</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompareTradeA(trade);
                          setCompareOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold transition-colors"
                        title="Side-by-Side Trade Comparison Studio"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Compare</span>
                      </button>
                      <Link
                        href={`/dashboard/trades/${trade.id}/replay`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                        title="Visual Candlestick Replay"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Replay</span>
                      </Link>
                      {expandedTrade === trade.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Emotions / Tags */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {trade.emotions?.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/80 text-xs font-medium border border-border/40"
                      >
                        {EMOTION_EMOJIS[e] ?? '😶'} {EMOTION_LABELS[e] ?? e}
                      </span>
                    ))}
                    {trade.mistakeTags?.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20"
                      >
                        {MISTAKE_LABELS[m] ?? m.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {!trade.emotions?.length && !trade.mistakeTags?.length && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openJournalModal(trade);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          Add Journal Entry
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            openJournalModal(trade);
                            setAutoFilling(true);
                            try {
                              const res = await api.autofillJournal(trade.id);
                              if (res.success && res.data) {
                                const d = res.data;
                                setFormEmotions(d.emotions ?? []);
                                setFormMistakes(d.mistakeTags ?? []);
                                setFormFollowedPlan(d.followedPlan);
                                setFormExecutionRating(d.executionRating ?? 4);
                                setFormPlanRating(d.planRating ?? 4);
                                setFormPsychologyRating(d.psychologyRating ?? 4);
                                setFormReflection(d.reflection ?? '');
                                setFormLesson(d.lessonLearned ?? '');
                                setSuggestedSetup(d.suggestedSetup ?? null);
                                toast.success('✨ AI pre-filled your trade journal!');
                              }
                            } catch {
                              // User can still fill manually
                            } finally {
                              setAutoFilling(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-colors border border-violet-500/30 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                          Auto-Journal with AI
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Discipline Panel */}
                {expandedTrade === trade.id && (
                  <div className="mx-2 mt-1 mb-3 p-5 rounded-2xl bg-accent/30 border border-border/50 animate-fade-in space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openJournalModal(trade);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-background hover:bg-accent transition-colors border border-border/40 text-left shadow-sm"
                      >
                        <Brain className="w-5 h-5 text-violet-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold">Journal Entry</div>
                          <div className="text-xs text-muted-foreground">Emotions, Mistakes</div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPlanForm(!showPlanForm);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-background hover:bg-accent transition-colors border border-border/40 text-left shadow-sm"
                      >
                        <Target className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold">Trade Plan</div>
                          <div className="text-xs text-muted-foreground">Planned vs Actual</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border/40 text-left shadow-sm">
                        <ClipboardCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold">Rule Checklist</div>
                          <div className="text-xs text-muted-foreground">
                            {trade.ruleComplianceScore !== undefined
                              ? `${Math.round(trade.ruleComplianceScore * 100)}% Compliant`
                              : 'Pending review'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Plan Form */}
                    {showPlanForm && (
                      <div className="p-4 rounded-xl bg-background border border-border/60 shadow-sm space-y-3">
                        <h4 className="text-sm font-semibold">Trade Plan Parameters</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Target Entry</label>
                            <input
                              type="number"
                              value={planEntry}
                              onChange={(e) => setPlanEntry(e.target.value)}
                              placeholder={String(entryPrice)}
                              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Stop Loss</label>
                            <input
                              type="number"
                              value={planSL}
                              onChange={(e) => setPlanSL(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Take Profit</label>
                            <input
                              type="number"
                              value={planTP}
                              onChange={(e) => setPlanTP(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Risk Amount ({currencySymbol})</label>
                            <input
                              type="number"
                              value={planRisk}
                              onChange={(e) => setPlanRisk(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 rounded-xl bg-background border border-border/30">
                        <div className="text-xs text-muted-foreground">Hold Time</div>
                        <div className="font-semibold font-mono mt-0.5">
                          {trade.closedAt
                            ? `${Math.round((new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / 60000)} min`
                            : 'Open Position'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-background border border-border/30">
                        <div className="text-xs text-muted-foreground">R-Multiple</div>
                        <div
                          className={cn(
                            'font-semibold font-mono mt-0.5',
                            (trade.rMultiple ?? 0) >= 1 ? 'text-success' : (trade.rMultiple ?? 0) >= 0 ? 'text-warning' : 'text-destructive',
                          )}
                        >
                          {trade.rMultiple != null ? `${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R` : '—'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-background border border-border/30">
                        <div className="text-xs text-muted-foreground">Compliance Score</div>
                        <div
                          className={cn(
                            'font-bold font-mono mt-0.5',
                            (trade.ruleComplianceScore ?? 0) >= 0.7
                              ? 'text-success'
                              : (trade.ruleComplianceScore ?? 0) >= 0.4
                                ? 'text-warning'
                                : 'text-destructive',
                          )}
                        >
                          {trade.ruleComplianceScore !== undefined
                            ? `${Math.round(trade.ruleComplianceScore * 100)}%`
                            : 'Not rated'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-background border border-border/30">
                        <div className="text-xs text-muted-foreground">Reflection</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openJournalModal(trade);
                          }}
                          className="font-semibold text-primary hover:underline text-xs mt-1 block"
                        >
                          {trade.emotions?.length ? 'Edit Annotation' : '+ Add Notes'}
                        </button>
                      </div>
                    </div>

                    {/* MFE / MAE (if stored) */}
                    {(trade.maxFavorableExcursion != null || trade.maxAdverseExcursion != null) && (
                      <div className="flex items-center gap-3 px-1 pt-1 pb-2">
                        <span className="text-xs text-muted-foreground font-medium">Exit Efficiency:</span>
                        {trade.maxFavorableExcursion != null && (
                          <span className="text-xs font-semibold font-mono text-success">
                            MFE {format(trade.maxFavorableExcursion, trade.currency)}
                          </span>
                        )}
                        {trade.maxAdverseExcursion != null && (
                          <span className="text-xs font-semibold font-mono text-destructive">
                            MAE {format(trade.maxAdverseExcursion, trade.currency)}
                          </span>
                        )}
                        {trade.maxFavorableExcursion != null && trade.maxAdverseExcursion != null && trade.maxFavorableExcursion > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((trade.netPnl / trade.maxFavorableExcursion) * 100)}% of MFE captured)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Trade Chart Screenshots Gallery */}
                    {trade.screenshotUrls && trade.screenshotUrls.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Trade Chart Screenshots ({trade.screenshotUrls.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {trade.screenshotUrls.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(url);
                              }}
                              className="group relative w-28 h-20 rounded-xl overflow-hidden border border-border/60 cursor-pointer bg-accent/40 hover:border-primary transition-all shadow-sm hover:shadow-md"
                              title="Click to view full screenshot"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Trade chart screenshot ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Voice Reflection Note */}
                    {trade.audioNoteUrl && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-muted-foreground">
                          <Volume2 className="w-3.5 h-3.5 text-primary" />
                          <span>Voice Reflection Note</span>
                        </div>
                        <audio controls src={trade.audioNoteUrl} className="w-full max-w-md h-9 rounded-lg" />
                      </div>
                    )}

                    {/* AI Trade Autopsy (for closed trades) */}
                    {trade.status === 'CLOSED' && (
                      <div className="pt-2">
                        <TradeAutopsy
                          tradeId={trade.id}
                          symbol={trade.symbol || trade.tradingsymbol || 'Trade'}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 glass-card rounded-2xl">
              <div className="text-xs text-muted-foreground">
                Showing page {page} of {totalPages} ({totalTrades} total trades)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Journal Entry Modal */}
      {journalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setJournalModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl glass-card border border-border shadow-card-lg p-6 animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Brain className="w-5 h-5 text-violet-500" />
                  Journal Entry — {journalModal.symbol || journalModal.tradingsymbol}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {journalModal.direction} • {journalModal.netPnl >= 0 ? '+' : ''}{formatCurrency(journalModal.netPnl)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutofillModal}
                  disabled={autoFilling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  title="Generate ratings, reflections, and tags using AI"
                >
                  {autoFilling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  {autoFilling ? 'Generating...' : 'Auto-Fill with AI'}
                </button>
                <button
                  onClick={() => setJournalModal(null)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {suggestedSetup && (
              <div className="mb-4 px-3.5 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-2.5 text-xs text-violet-700 dark:text-violet-300 animate-fade-in">
                <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span>
                  <strong>AI Setup Pattern:</strong> {suggestedSetup}
                </span>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Strategy Selector */}
              <div className="p-3 rounded-xl bg-accent/40 border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-brand-400" />
                    Trading Strategy
                  </label>
                  <Link
                    href="/dashboard/strategies"
                    target="_blank"
                    className="text-[11px] text-brand-400 hover:underline"
                  >
                    + Manage Strategies
                  </Link>
                </div>
                <select
                  value={formStrategyId}
                  onChange={(e) => setFormStrategyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No Strategy Assigned</option>
                  {strategies.map((strat) => (
                    <option key={strat.id} value={strat.id}>
                      {strat.name} ({strat.marketType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Emotions */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  How did you feel during this trade?
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(EMOTION_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleEmotion(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                        formEmotions.includes(key)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-accent/60 text-muted-foreground hover:text-foreground border-border/40',
                      )}
                    >
                      {EMOTION_EMOJIS[key] ?? '😶'} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mistakes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Did you commit any execution errors?
                </label>
                <div className="flex flex-wrap gap-2">
                  {MISTAKE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleMistake(tag)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                        formMistakes.includes(tag)
                          ? 'bg-destructive text-destructive-foreground border-destructive'
                          : 'bg-accent/60 text-muted-foreground hover:text-foreground border-border/40',
                      )}
                    >
                      {MISTAKE_LABELS[tag] ?? tag.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Did you follow the plan? */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Did you follow your trading plan strictly?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormFollowedPlan(true)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                      formFollowedPlan === true
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-accent text-muted-foreground border-border/30',
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Yes, followed
                  </button>
                  <button
                    onClick={() => setFormFollowedPlan(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                      formFollowedPlan === false
                        ? 'bg-destructive/20 text-destructive border-destructive/30'
                        : 'bg-accent text-muted-foreground border-border/30',
                    )}
                  >
                    <AlertTriangle className="w-4 h-4" /> No, deviated
                  </button>
                </div>
              </div>

              {/* Self-Ratings */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Rate your execution quality (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormExecutionRating(n)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        formExecutionRating >= n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-accent text-muted-foreground border-border/40',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Rate your trade plan setup (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormPlanRating(n)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        formPlanRating >= n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-accent text-muted-foreground border-border/40',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Rate your psychological calmness (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormPsychologyRating(n)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-sm font-bold transition-all border',
                        formPsychologyRating >= n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-accent text-muted-foreground border-border/40',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection with Voice-to-Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Trader Reflection &amp; Context
                  </label>
                  <VoiceDictation
                    onTranscript={(spokenText) => {
                      setFormReflection((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
                    }}
                    onEmotionsDetected={(detected) => {
                      setFormEmotions((prev) => {
                        const updated = [...prev];
                        for (const em of detected) {
                          if (!updated.includes(em)) updated.push(em);
                        }
                        return updated;
                      });
                    }}
                  />
                </div>
                <textarea
                  value={formReflection}
                  onChange={(e) => setFormReflection(e.target.value)}
                  placeholder="Describe your market thesis, trigger point, emotional shifts... or use Voice Dictation"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Lesson Learned */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Core Lesson / Golden Rule
                </label>
                <input
                  type="text"
                  value={formLesson}
                  onChange={(e) => setFormLesson(e.target.value)}
                  placeholder="e.g., Don't move stop loss closer to market before 10 AM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Chart Screenshots Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Trade Chart Screenshots (Max 5MB each)
                  </label>
                  <label
                    htmlFor="screenshot-upload"
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {uploadingScreenshot ? 'Uploading...' : '+ Add Image'}
                  </label>
                  <input
                    id="screenshot-upload"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleScreenshotUpload}
                    disabled={uploadingScreenshot}
                  />
                </div>

                {formScreenshots.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 p-3 rounded-xl bg-accent/30 border border-border/40">
                    {formScreenshots.map((url, idx) => (
                      <div key={idx} className="relative group w-20 h-16 rounded-lg overflow-hidden border border-border bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                          title="Remove screenshot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <label
                    htmlFor="screenshot-upload"
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/60 hover:border-primary/50 cursor-pointer bg-accent/20 hover:bg-accent/40 transition-colors"
                  >
                    <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Click to upload chart setups (PNG, JPEG, WebP)</span>
                  </label>
                )}
              </div>

              {/* Audio Voice Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    Audio Voice Note
                  </label>
                  <label
                    htmlFor="audio-upload"
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {uploadingAudio ? 'Uploading...' : '+ Upload Audio'}
                  </label>
                  <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                  />
                </div>

                {formAudioUrl ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/30 border border-border/40">
                    <audio controls src={formAudioUrl} className="flex-1 h-8" />
                    <button
                      type="button"
                      onClick={() => setFormAudioUrl('')}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Remove audio note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formAudioUrl}
                    onChange={(e) => setFormAudioUrl(e.target.value)}
                    placeholder="Paste audio URL or click '+ Upload Audio' above"
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-border">
              <button
                onClick={() => setJournalModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!journalModal) return;
                  try {
                    await Promise.all([
                      api.updateJournalTrade(journalModal.id, {
                        strategyId: formStrategyId || null,
                        emotions: formEmotions,
                        mistakeTags: formMistakes,
                        traderNotes: formReflection,
                        screenshotUrls: formScreenshots,
                        audioNoteUrl: formAudioUrl || null,
                      }),
                      api.saveTradeRating({
                        journalTradeId: journalModal.id,
                        emotions: formEmotions,
                        mistakeTags: formMistakes,
                        reflection: formReflection,
                        lessonLearned: formLesson,
                        executionRating: formExecutionRating || undefined,
                        planRating: formPlanRating || undefined,
                        psychologyRating: formPsychologyRating || undefined,
                        followedPlan: formFollowedPlan,
                      }),
                    ]);
                    toast.success('Journal entry saved successfully');
                    setJournalModal(null);
                    await fetchTrades(page);
                  } catch (err) {
                    console.error('Failed to save journal entry:', err);
                    toast.error('Failed to save journal entry');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Trade Screenshot Full Preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 text-center">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white underline inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Open original in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Close table view wrapper if in table mode */}
      {viewMode === 'table' && null}
      </>
      )}

      {/* Quick Candlestick Chart Inspection Modal */}
      <TradeCandleModal
        isOpen={!!selectedChartTrade}
        onClose={() => setSelectedChartTrade(null)}
        trade={selectedChartTrade}
      />

      {/* Institutional Trade Comparison Studio Modal */}
      <TradeComparisonModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        tradeA={compareTradeA}
        allTrades={trades}
      />
    </div>
  );
}

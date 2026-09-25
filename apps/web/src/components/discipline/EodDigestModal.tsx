// ──────────────────────────────────────────────
// TradeMind — Automated End-of-Day (EOD) Trade Digest Modal
//
// Institutional post-market report at market close:
// - Indian Markets (3:45 PM IST)
// - US Equities (4:15 PM EST)
// - Global Crypto & Forex (00:00 UTC)
//
// Summarizes:
// - Daily Realized P&L, fees, win rate & profit factor
// - Algorithmic Discipline Score (0-100) & Grade
// - Detected behavioral mistakes (FOMO, Revenge Trading, Overleveraging)
// - AI Coach Post-Market Debrief & Tomorrow's Rule
// - 1-Click Multi-Channel Push / Email Dispatch & Scorecard Copy
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Printer,
  Calendar,
  Clock,
  AlertTriangle,
  Award,
  Zap,
  RefreshCw,
  Target,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import type { EodDigestData, MarketSession } from '@/lib/server/services/eod-digest.service';

interface EodDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSession?: MarketSession;
}

const SESSION_TABS: Array<{ id: MarketSession; label: string; flag: string; time: string }> = [
  { id: 'ALL', label: 'All Sessions', flag: '🌐', time: 'Full Today' },
  { id: 'IST', label: 'Indian Markets', flag: '🇮🇳', time: '3:45 PM IST' },
  { id: 'EST', label: 'US Equities', flag: '🇺🇸', time: '4:15 PM EST' },
  { id: 'UTC', label: 'Crypto & Forex', flag: '⚡', time: '00:00 UTC' },
];

export function EodDigestModal({
  isOpen,
  onClose,
  defaultSession = 'ALL',
}: EodDigestModalProps) {
  const [selectedSession, setSelectedSession] = useState<MarketSession>(defaultSession);
  const [digest, setDigest] = useState<EodDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDigest = useCallback(async (session: MarketSession) => {
    setLoading(true);
    try {
      const res = await api.getEodDigest(session);
      if (res?.data?.digest) {
        setDigest(res.data.digest);
      }
    } catch (err: any) {
      console.error('Failed to fetch EOD digest:', err);
      toast.error('Failed to load End-of-Day debrief');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDigest(selectedSession);
    }
  }, [isOpen, selectedSession, fetchDigest]);

  const handleTriggerDispatch = async () => {
    setDispatching(true);
    try {
      const res = await api.triggerEodDigest({
        session: selectedSession,
        channels: ['in_app', 'webhook', 'email'],
      });
      if (res?.data?.digest) {
        setDigest(res.data.digest);
        toast.success('🚀 EOD Post-Market Digest dispatched across In-App, Push & Email!');
      }
    } catch (err: any) {
      console.error('Failed to dispatch EOD digest:', err);
      toast.error(err?.message || 'Failed to dispatch digest');
    } finally {
      setDispatching(false);
    }
  };

  const handleCopyScorecard = () => {
    if (!digest) return;
    const isProfit = digest.realizedNetPnl >= 0;
    const pnlSign = isProfit ? '+' : '';
    const formattedPnl = `${pnlSign}${digest.curSymbol}${digest.realizedNetPnl.toLocaleString()}`;

    const text = `📊 TradeMind EOD Digest — ${digest.dateStr} (${digest.sessionCloseTime})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Realized Net P&L: ${formattedPnl} (Gross: ${digest.curSymbol}${digest.realizedGrossPnl.toLocaleString()})
📈 Win Rate: ${digest.winRate}% (${digest.wins}W / ${digest.losses}L / ${digest.breakevens}BE)
🛡️ Discipline Score: ${digest.disciplineScore}/100 [Grade: ${digest.disciplineGrade}]
🎯 Behavioral Leaks: ${digest.mistakesDetected.length > 0 ? digest.mistakesDetected.map((m) => `${m.name} (${m.count}x)`).join(', ') : 'Zero Violations (Flawless)'}
🧠 AI Coach Headline: "${digest.headline}"
🚀 Tomorrow's Directive: "${digest.tomorrowActionRule}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Institutional Journal Verification · https://trademind.app`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Official EOD Scorecard copied to clipboard!');
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isNetProfit = (digest?.realizedNetPnl ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass-card rounded-3xl border border-border/80 max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative my-auto space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Automated Post-Market EOD Digest
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                  Live Debrief
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>Realized session P&L, discipline grading & behavioral mistake detection</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => fetchDigest(selectedSession)}
              disabled={loading}
              title="Refresh digest data"
              className="p-2 rounded-xl border border-border/70 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market Session Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/60">
          {SESSION_TABS.map((tab) => {
            const isActive = selectedSession === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedSession(tab.id)}
                className={cn(
                  'flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer',
                  isActive
                    ? 'bg-background text-foreground shadow-sm border border-primary/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                <span>{tab.flag}</span>
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
                  {tab.time}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Compiling session executions, calculating discipline score & analyzing leaks...
            </p>
          </div>
        ) : !digest ? (
          <div className="py-16 text-center text-muted-foreground">
            No execution data found for this session.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Headline Card */}
            <div
              className={cn(
                'p-5 rounded-2xl border transition-all relative overflow-hidden',
                isNetProfit
                  ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30'
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{digest.sessionName} · Close ({digest.sessionCloseTime})</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {digest.headline}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {digest.aiExecutiveSummary}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end justify-center min-w-[180px]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Realized Net P&L
                  </span>
                  <div
                    className={cn(
                      'text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-1 font-mono',
                      isNetProfit ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {isNetProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    <span>
                      {isNetProfit ? '+' : ''}
                      {digest.curSymbol}
                      {digest.realizedNetPnl.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    Gross: {digest.curSymbol}{digest.realizedGrossPnl.toLocaleString()} · Fees: {digest.curSymbol}{digest.totalFeesAndTaxes.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Core Metrics & Discipline Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Discipline Score Gauge */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Discipline Score
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-extrabold',
                      digest.disciplineScore >= 80
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : digest.disciplineScore >= 60
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    )}
                  >
                    Grade {digest.disciplineGrade}
                  </span>
                </div>

                {/* Score Number Display */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                    {digest.disciplineScore}
                    <span className="text-lg text-muted-foreground font-normal">/100</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 px-2">
                  {digest.disciplineVerdict}
                </p>
              </div>

              {/* Execution & Win Rate Card */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 flex flex-col justify-between space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary" />
                  Execution Statistics
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Win Rate</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      {digest.winRate}%
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {digest.wins}W / {digest.losses}L / {digest.breakevens}BE
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Profit Factor</span>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      {digest.profitFactor}x
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Total: {digest.totalTrades} Trades
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Avg Win / Loss:</span>
                  <span className="font-mono font-semibold text-foreground">
                    +{digest.curSymbol}{digest.avgWin} / -{digest.curSymbol}{digest.avgLoss}
                  </span>
                </div>
              </div>

              {/* Best & Worst Trades */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 flex flex-col justify-between space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Execution Extremes
                </span>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Best Setup</span>
                      <p className="text-xs font-bold text-foreground">
                        {digest.bestTrade ? `${digest.bestTrade.symbol} (${digest.bestTrade.direction})` : 'None'}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {digest.bestTrade ? `+${digest.curSymbol}${digest.bestTrade.pnl.toLocaleString()}` : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-rose-400 font-bold uppercase">Worst Setup</span>
                      <p className="text-xs font-bold text-foreground">
                        {digest.worstTrade ? `${digest.worstTrade.symbol} (${digest.worstTrade.direction})` : 'None'}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono text-rose-400">
                      {digest.worstTrade ? `${digest.curSymbol}${digest.worstTrade.pnl.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
                  <span>Dominant Emotion:</span>
                  <span className="font-semibold text-foreground uppercase">{digest.dominantEmotion}</span>
                </div>
              </div>
            </div>

            {/* Detected Behavioral Mistakes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Detected Behavioral Mistakes ({digest.mistakesDetected.length})
                  </h4>
                </div>
                <span className="text-xs text-muted-foreground">
                  Algorithmic rule audit & leak prevention
                </span>
              </div>

              {digest.mistakesDetected.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300">
                      Zero Behavioral Violations Detected
                    </h5>
                    <p className="text-[11px] text-emerald-400/80">
                      You adhered strictly to trading plan rules, respected protective stops, and took no revenge trades.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {digest.mistakesDetected.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              m.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            )}
                          >
                            {m.severity}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {m.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({m.count} occurrence{m.count > 1 ? 's' : ''})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.behavioralDescription}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
                          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Antidote: {m.preventionAdvice}</span>
                        </div>
                      </div>

                      <div className="text-right sm:self-center flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Drawdown Leak</span>
                        <p className="text-sm font-bold font-mono text-rose-400">
                          -{digest.curSymbol}{m.impactPnl.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Coach Directive Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent border border-blue-500/30 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 flex-shrink-0 mt-0.5">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Directive for Tomorrow's Opening Bell
                </span>
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  "{digest.tomorrowActionRule}"
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Primary Leak Diagnosis: {digest.topBehavioralLeak}
                </p>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScorecard}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  <span>{copied ? 'Copied!' : 'Copy Scorecard'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border/80 hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerDispatch}
                  disabled={dispatching}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className={cn('w-4 h-4', dispatching && 'animate-spin')} />
                  <span>{dispatching ? 'Dispatching...' : 'Dispatch Push & Email Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

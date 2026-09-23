// ──────────────────────────────────────────────
// TradeMind — Trade Autopsy Component
//
// Renders the AI trade analysis result panel.
// Shows: Grade badge, score ring, execution leak,
//        strengths, and 3 actionable advice bullets.
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import {
  Brain,
  Loader2,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Star,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TradeAutopsyResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeLabel: string;
  gradeColor: string;
  executionLeak: string;
  strengths: string[];
  advice: string[];
  riskManagementScore: number;
  emotionalScore: number;
  executionScore: number;
  overallScore: number;
  provider: string;
  cached: boolean;
}

interface TradeAutopsyProps {
  tradeId: string;
  symbol: string;
  className?: string;
}

const GRADE_GRADIENTS: Record<string, string> = {
  A: 'from-emerald-500/20 via-green-500/10 to-transparent border-emerald-500/30',
  B: 'from-lime-500/20 via-green-400/10 to-transparent border-lime-500/30',
  C: 'from-amber-500/20 via-yellow-400/10 to-transparent border-amber-500/30',
  D: 'from-orange-500/20 via-orange-400/10 to-transparent border-orange-500/30',
  F: 'from-red-500/20 via-rose-400/10 to-transparent border-red-500/30',
};

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          {/* Track */}
          <circle
            cx="28" cy="28" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border/40"
          />
          {/* Progress */}
          <circle
            cx="28" cy="28" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export function TradeAutopsy({ tradeId, symbol, className }: TradeAutopsyProps) {
  const [result, setResult] = useState<TradeAutopsyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeTradeAutopsy(tradeId);
      if (res.success && res.data) {
        setResult(res.data as TradeAutopsyResult);
      } else {
        throw new Error((res as any).error?.message ?? 'Analysis failed');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to analyze trade';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Idle state ──────────────────────────────
  if (!result && !loading) {
    return (
      <button
        onClick={analyze}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 p-4 rounded-xl',
          'bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent',
          'border border-violet-500/25 hover:border-violet-500/50',
          'text-violet-400 hover:text-violet-300 font-semibold text-sm',
          'transition-all duration-200 group',
          className,
        )}
        id={`ai-analyze-btn-${tradeId}`}
      >
        <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
        Analyze with AI
        <span className="ml-auto text-[10px] text-muted-foreground font-normal bg-violet-500/10 px-2 py-0.5 rounded-full">
          Free
        </span>
      </button>
    );
  }

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <div className={cn('p-5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center', className)}>
        <Loader2 className="w-7 h-7 animate-spin text-violet-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-violet-300">Analyzing {symbol}…</p>
        <p className="text-xs text-muted-foreground mt-1">AI is reviewing execution quality, risk & psychology</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────
  if (error) {
    return (
      <div className={cn('p-4 rounded-xl border border-destructive/20 bg-destructive/5', className)}>
        <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
          <AlertTriangle className="w-4 h-4" />
          Analysis failed
        </div>
        <p className="text-xs text-muted-foreground mb-3">{error}</p>
        <button
          onClick={analyze}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }

  if (!result) return null;

  const gradeBg = GRADE_GRADIENTS[result.grade] ?? GRADE_GRADIENTS['C']!;

  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-br p-5 space-y-4 animate-fade-in',
        gradeBg,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border-2 shadow-sm"
            style={{ color: result.gradeColor, borderColor: result.gradeColor + '40', backgroundColor: result.gradeColor + '15' }}
          >
            {result.grade}
          </div>
          <div>
            <div className="font-bold text-base text-foreground">{result.gradeLabel}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Overall Score: <span className="font-semibold text-foreground">{result.overallScore}/100</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Brain className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] text-muted-foreground capitalize">
                {result.cached ? 'cached result' : `via ${result.provider}`}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={analyze}
          title="Re-analyze"
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Score Rings */}
      <div className="flex gap-3 justify-around px-2 py-1">
        <ScoreRing score={result.executionScore} label="Execution" color="#8b5cf6" />
        <ScoreRing score={result.riskManagementScore} label="Risk Mgmt" color="#3b82f6" />
        <ScoreRing score={result.emotionalScore} label="Psychology" color="#10b981" />
      </div>

      {/* Execution Leak */}
      <div className="p-3 rounded-lg bg-background/60 border border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Execution Diagnosis
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.executionLeak}</p>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Strengths
          </div>
          {result.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-foreground/90">{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Advice */}
      {result.advice.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Actionable Improvements
          </div>
          {result.advice.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50 border border-border/30">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-foreground/90 leading-snug">{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

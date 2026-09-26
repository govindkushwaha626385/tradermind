'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlayCircle,
  Sparkles,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  FileText,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { TradeReplayChart } from '@/components/chart/TradeReplayChart';
import { LightweightCandleChart } from '@/components/chart/LightweightCandleChart';
import { TradingViewLiveWidget } from '@/components/chart/TradingViewLiveWidget';
import { DualTimeframeReplayChart, type ReplayTrade, type Candle as MTFCandle } from '@/components/chart/DualTimeframeReplayChart';
import { resolveTradingViewSymbol } from '@/lib/tradingview-symbols';
import type { TradeReplayData } from '@trademind/shared';

export default function TradeReplayPage() {
  const params = useParams();
  const router = useRouter();
  const { currency } = useCurrency();
  const tradeId = params.tradeId as string;

  const [replayData, setReplayData] = useState<TradeReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'live' | 'canvas' | 'scrubber' | 'confluence'>('live');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeechBriefing = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Voice synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!replayData) return;

    window.speechSynthesis.cancel();

    const isWin = Number(replayData.realizedPnl ?? 0) > 0;
    const holdDuration = replayData.entryTime && replayData.exitTime
      ? `${Math.max(1, Math.round((new Date(replayData.exitTime).getTime() - new Date(replayData.entryTime).getTime()) / 60000))} minutes`
      : 'intraday duration';

    const narrative = `TradeMind Forensic Replay Briefing for ${replayData.symbol}. Direction: ${replayData.direction}. Entered at ${replayData.entryPrice}, exited at ${replayData.exitPrice ?? 'current market'}. Outcome: ${isWin ? 'Profitable trade' : 'Loss taken'} with realized PnL of ${Number(replayData.realizedPnl ?? 0).toFixed(2)}. Position was held for ${holdDuration}. Analyze candlestick progression and execution fills for psychological leaks and early exit tendencies.`;

    const utterance = new SpeechSynthesisUtterance(narrative);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    toast.info('Playing AI forensic audio briefing...');
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!tradeId) return;

    setLoading(true);
    setError(null);
    api.getTradeReplay(tradeId)
      .then((res) => {
        if (res.data) {
          setReplayData(res.data);
        } else {
          setError('Could not assemble replay data for this trade.');
        }
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Failed to load trade replay.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tradeId]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Link
            href="/dashboard/trades"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Trades
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4 text-indigo-400" />
            Visual Trade Replay
          </span>
        </div>

        {replayData && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setChartMode('live')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  chartMode === 'live'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Terminal</span>
              </button>
              <button
                onClick={() => setChartMode('canvas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartMode === 'canvas'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Execution Replay
              </button>
              <button
                onClick={() => setChartMode('scrubber')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartMode === 'scrubber'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Step Replay Scrubber
              </button>
              <button
                onClick={() => setChartMode('confluence')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'confluence'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Dual-MTF Confluence</span>
              </button>
            </div>

            <Link
              href={`/dashboard/ai-assistant?question=${encodeURIComponent(
                `Can you critique my execution on ${replayData.symbol} ${replayData.direction} trade? Entry: ${replayData.entryPrice}, Exit: ${replayData.exitPrice ?? 'open'}`
              )}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze with AI
            </Link>
            <button
              onClick={toggleSpeechBriefing}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                isSpeaking
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
              )}
              title="Listen to automated voice autopsy debrief"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? 'Stop Voice Debrief' : 'Voice Debrief'}</span>
            </button>
            <Link
              href="/dashboard/journal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Journal
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Reconstructing candlestick trajectory & execution markers...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-zinc-900 border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Trade Replay Unavailable</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{error}</p>
          <Link
            href="/dashboard/trades"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Back to Trades
          </Link>
        </div>
      ) : replayData ? (() => {
        const activeCurrency = (replayData as any)?.currency || (['NASDAQ', 'NYSE', 'DELTA', 'BINANCE', 'BYBIT', 'CRYPTO'].includes(replayData.exchange?.toUpperCase() ?? '') ? 'USD' : currency);
        if (chartMode === 'live') {
          const resolved = resolveTradingViewSymbol(replayData.symbol, replayData.exchange);
          return (
            <div className="w-full h-[520px] sm:h-[620px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <TradingViewLiveWidget
                symbol={resolved.cleanSymbol}
                height="100%"
                interval="5"
                allowSymbolChange={true}
                onFallbackToCanvas={() => setChartMode('canvas')}
              />
            </div>
          );
        }
        if (chartMode === 'confluence') {
          const isLong = replayData.direction === 'LONG';
          const entry = Number(replayData.entryPrice) || 100;
          const exit = Number(replayData.exitPrice) || (isLong ? entry * 1.02 : entry * 0.98);
          const mfe = replayData.mfe != null ? Number(replayData.mfe) : (isLong ? Math.max(entry, exit) * 1.025 : Math.min(entry, exit) * 0.975);
          const mae = replayData.mae != null ? Number(replayData.mae) : (isLong ? Math.min(entry, exit) * 0.985 : Math.max(entry, exit) * 1.015);
          const delta = Math.abs(exit - entry) || (entry * 0.015);

          const tradeObj: ReplayTrade = {
            id: tradeId,
            tradingsymbol: replayData.symbol,
            direction: replayData.direction,
            openedAt: replayData.entryTime,
            closedAt: replayData.exitTime || new Date().toISOString(),
            netPnl: Number(replayData.realizedPnl ?? 0),
            avgEntryPrice: entry,
            avgExitPrice: exit,
            maxFavorableExcursion: mfe,
            maxAdverseExcursion: mae,
            exchange: replayData.exchange,
            currency: activeCurrency,
          };

          const totalBars = 24;
          const ltfList: MTFCandle[] = [];
          const baseTime = new Date(replayData.entryTime || Date.now()).getTime();

          for (let i = 0; i < totalBars; i++) {
            const t = baseTime + (i * 300 * 1000);
            const progress = i / (totalBars - 1);
            let target = entry;
            if (progress < 0.4) {
              target = entry + (isLong ? delta * progress * 1.5 : -delta * progress * 1.5);
            } else if (progress < 0.7) {
              target = isLong ? mfe * 0.98 : mae * 1.02;
            } else {
              target = exit;
            }
            const noise = (Math.sin(i * 1.5) * delta * 0.12);
            const c = target + noise;
            const o = i === 0 ? entry : ltfList[i - 1].c;
            const h = Math.max(o, c) + Math.abs(noise * 0.6);
            const l = Math.min(o, c) - Math.abs(noise * 0.6);

            ltfList.push({
              t,
              o,
              h,
              l,
              c,
              isEntry: i === 0,
              isExit: i === totalBars - 1,
              label: i === 0 ? 'Execution Entry' : i === totalBars - 1 ? 'Target Exit' : undefined,
            });
          }

          return (
            <DualTimeframeReplayChart
              trade={tradeObj}
              ltfCandles={ltfList}
              currency={activeCurrency}
            />
          );
        }
        return chartMode === 'canvas' ? (
          <LightweightCandleChart data={replayData} currency={activeCurrency} />
        ) : (
          <TradeReplayChart data={replayData} currency={activeCurrency} />
        );
      })() : null}
    </div>
  );
}

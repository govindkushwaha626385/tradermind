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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { TradeReplayChart } from '@/components/chart/TradeReplayChart';
import { LightweightCandleChart } from '@/components/chart/LightweightCandleChart';
import type { TradeReplayData } from '@trademind/shared';

export default function TradeReplayPage() {
  const params = useParams();
  const router = useRouter();
  const { currency } = useCurrency();
  const tradeId = params.tradeId as string;

  const [replayData, setReplayData] = useState<TradeReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'canvas' | 'scrubber'>('canvas');

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
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setChartMode('canvas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartMode === 'canvas'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Candlestick (TradingView)
              </button>
              <button
                onClick={() => setChartMode('scrubber')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartMode === 'scrubber'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Step Replay Scrubber
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
        return chartMode === 'canvas' ? (
          <LightweightCandleChart data={replayData} currency={activeCurrency} />
        ) : (
          <TradeReplayChart data={replayData} currency={activeCurrency} />
        );
      })() : null}
    </div>
  );
}

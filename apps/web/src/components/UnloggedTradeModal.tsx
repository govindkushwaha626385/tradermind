// ──────────────────────────────────────────────
// TradeMind — Unlogged Trade Detection Modal
//
// When a trade closes and has no journal entry,
// this modal appears prompting the user to log
// their emotional state and trade details.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  X,
  TrendingUp,
  TrendingDown,
  Send,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { EMOTION_EMOJIS, EMOTION_LABELS } from '@trademind/shared';

interface UnloggedTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  netPnl: number;
  avgEntryPrice: number;
  totalQuantity: number;
  closedAt?: string;
}

const EMOTIONS_LIST = [
  'CONFIDENT', 'DISCIPLINED', 'NEUTRAL', 'HESITANT',
  'ANXIOUS', 'FOMO', 'GREEDY', 'FEAR', 'REVENGE',
] as const;

interface UnloggedTradeModalProps {
  /** If provided, the modal shows for this trade. */
  trade?: UnloggedTrade | null;
  /** Called when the user dismisses or completes the journal entry. */
  onClose?: () => void;
}

export function UnloggedTradeModal({ trade, onClose }: UnloggedTradeModalProps) {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset state when a new trade is detected
  useEffect(() => {
    if (trade) {
      setSelectedEmotions([]);
      setNotes('');
      setSubmitted(false);
    }
  }, [trade?.id]);

  if (!trade) return null;

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion],
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.saveTradeRating({
        journalTradeId: trade.id,
        emotions: selectedEmotions,
        reflection: notes,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 w-full max-w-sm text-center space-y-4 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
            <Brain className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-xl font-bold">Journal Entry Saved</h2>
          <p className="text-sm text-muted-foreground">
            Your trade data and emotions have been recorded.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              trade.direction === 'LONG' ? 'bg-success/10' : 'bg-destructive/10',
            )}>
              {trade.direction === 'LONG'
                ? <TrendingUp className={cn('w-5 h-5', 'text-success')} />
                : <TrendingDown className={cn('w-5 h-5', 'text-destructive')} />
              }
            </div>
            <div>
              <h2 className="font-semibold text-lg">Unlogged Trade Detected</h2>
              <p className="text-sm text-muted-foreground">
                {trade.symbol} · {trade.totalQuantity} @ {formatCurrency(trade.avgEntryPrice)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* P&L Display */}
        <div className={cn(
          'p-4 rounded-xl text-center',
          trade.netPnl >= 0 ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20',
        )}>
          <div className="text-xs text-muted-foreground mb-1">Net P&L</div>
          <div className={cn(
            'text-2xl font-bold',
            trade.netPnl >= 0 ? 'text-success' : 'text-destructive',
          )}>
            {trade.netPnl >= 0 ? '+' : ''}{formatCurrency(trade.netPnl)}
          </div>
          {trade.closedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              Closed {new Date(trade.closedAt).toLocaleTimeString('en-IN')}
            </div>
          )}
        </div>

        {/* Trade Type Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Trade Type</label>
          <div className="flex gap-2">
            {['MANUAL', 'ALGO'].map((type) => (
              <label key={type} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors text-sm">
                <input type="radio" name="tradeType" value={type} className="accent-primary" />
                {type === 'MANUAL' ? 'Manual' : 'Algo'}
              </label>
            ))}
          </div>
        </div>

        {/* Emotion Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">
            How were you feeling? (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS_LIST.map((emotion) => (
              <button
                key={emotion}
                onClick={() => toggleEmotion(emotion)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all border',
                  selectedEmotions.includes(emotion)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-accent/50 text-muted-foreground border-transparent hover:bg-accent',
                )}
              >
                <span>{EMOTION_EMOJIS[emotion] ?? '😶'}</span>
                <span>{EMOTION_LABELS[emotion] ?? emotion}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            What happened? (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your reasoning for entering and exiting this trade..."
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            'Saving...'
          ) : (
            <>
              <Send className="w-4 h-4" />
              Save Journal Entry
            </>
          )}
        </button>
      </div>
    </div>
  );
}

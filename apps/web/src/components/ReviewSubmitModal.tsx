'use client';

import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface ReviewSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReviewSubmitModal({ isOpen, onClose, onSubmitted }: ReviewSubmitModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [traderType, setTraderType] = useState('Nifty/BankNifty Scalper');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      // Fetch existing review if any
      api.getMyReview()
        .then((res) => {
          if (res.data) {
            setRating(res.data.rating);
            setHeadline(res.data.headline);
            setBody(res.data.body);
            if (res.data.traderType) setTraderType(res.data.traderType);
            if (res.data.displayName) setDisplayName(res.data.displayName);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || headline.length < 5) {
      setError('Please provide a descriptive headline (at least 5 characters).');
      return;
    }
    if (!body.trim() || body.length < 20) {
      setError('Please share more details in your review (at least 20 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitReview({
        rating,
        headline: headline.trim(),
        body: body.trim(),
        traderType: traderType.trim(),
        displayName: displayName.trim() || undefined,
      });

      setSuccess(true);
      onSubmitted?.();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Thank You for Your Feedback!</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Your testimonial has been submitted. Our team reviews all submissions to prevent spam before featuring them on the platform.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Trader Community
              </div>
              <h2 className="text-xl font-bold text-white">Share Your TradeMind Experience</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Help other traders understand how behavioral analytics transformed your execution.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Overall Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-zinc-600 transition-colors focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-all duration-150 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400 scale-110'
                          : 'fill-transparent text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm font-semibold text-zinc-300">
                  {rating === 5 && '5.0 — Game changer'}
                  {rating === 4 && '4.0 — Very helpful'}
                  {rating === 3 && '3.0 — Good software'}
                  {rating === 2 && '2.0 — Needs work'}
                  {rating === 1 && '1.0 — Disappointed'}
                </span>
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Headline / One-line Summary
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Cut my revenge trading by 80% in the first 2 weeks"
                maxLength={120}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Your Honest Review
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What specific problem did TradeMind solve for you? How did the automated journal, behavioral shield, or premarket plans affect your P&L?"
                rows={4}
                maxLength={1000}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <div className="text-right text-[11px] text-zinc-500 mt-1">
                {body.length} / 1000 characters
              </div>
            </div>

            {/* Trader Type & Display Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Trading Style
                </label>
                <select
                  value={traderType}
                  onChange={(e) => setTraderType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Nifty/BankNifty Scalper">Nifty/BankNifty Scalper</option>
                  <option value="Equity Intraday Trader">Equity Intraday Trader</option>
                  <option value="Options Buyer">Options Buyer</option>
                  <option value="Options Seller / Hedger">Options Seller / Hedger</option>
                  <option value="Swing / Positional Trader">Swing / Positional Trader</option>
                  <option value="Crypto Derivatives Trader">Crypto Derivatives Trader</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul M. (or leave blank)"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

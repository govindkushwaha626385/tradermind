// ──────────────────────────────────────────────
// TradeMind — Testimonials Section (Client Island)
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { Review } from '@trademind/shared';

const STATIC_TESTIMONIALS = [
  {
    id: '1',
    displayName: 'Rahul Sharma',
    traderType: 'Nifty Options Trader',
    rating: 5,
    body: 'The behavioral analytics completely transformed my trading. Seeing how my revenge trading was wiping out profitable mornings made me stop overtrading.',
  },
  {
    id: '2',
    displayName: 'Priya Patel',
    traderType: 'BankNifty Scalper',
    rating: 5,
    body: 'Automated Zerodha and Dhan sync saves me an hour every evening. The MFE/MAE analysis showed me I was consistently cutting winners too early.',
  },
  {
    id: '3',
    displayName: 'Vikram Mehta',
    traderType: 'Swing & F&O Trader',
    rating: 5,
    body: 'Accurate STT, stamp duty, and exchange turnover fee calculations make this the only journal tailored for Indian retail traders. Invaluable tool.',
  },
];

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Review[]>([]);

  useEffect(() => {
    api.getReviews({ featured: true, limit: 3 })
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTestimonials(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const items = testimonials.length > 0 ? testimonials : STATIC_TESTIMONIALS;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by{' '}
            <span className="gradient-text">Active Traders</span>
          </h2>
          <p className="text-muted-foreground">See what our users say about their experience.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, idx) => (
            <div key={t.id ?? idx} className="glass-card rounded-2xl p-6 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">&ldquo;{t.body}&rdquo;</p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {(t.displayName || 'T').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.displayName}</div>
                  <div className="text-xs text-muted-foreground">{t.traderType || 'Active Trader'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            Share your experience
          </Link>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Ubiquitous Global Macro News & Economic Calendar Drawer
//
// Accessible on every dashboard page via:
// - Header live ticker chip
// - Single-key shortcut 'N' (or Alt+N)
// - Quick Command Palette (Cmd+K)
// - Global window event: 'open-macro-drawer'
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Newspaper,
  Calendar,
  Radio,
  Wifi,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useFinnhubWebSocket } from '@/hooks/useFinnhubWebSocket';

interface NewsItem {
  id: string | number;
  category: string;
  datetime: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  image?: string;
  related?: string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

interface EconomicEvent {
  id: string;
  event: string;
  country: string;
  currency: string;
  time: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: number | string | null;
  estimate?: number | string | null;
  prev?: number | string | null;
  unit?: string;
  isHighImpact: boolean;
}

interface GlobalMacroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalMacroDrawer({ isOpen, onClose }: GlobalMacroDrawerProps) {
  const [activeTab, setActiveTab] = useState<'news' | 'calendar' | 'blackout'>('news');
  const [newsCategory, setNewsCategory] = useState<'general' | 'forex' | 'crypto'>('general');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Finnhub WebSocket connection for real-time live news push
  const handleIncomingWsNews = useCallback((incoming: any) => {
    setNewsItems((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)]);
  }, []);

  const { status: wsStatus, latencyMs, playChime } = useFinnhubWebSocket({
    enabled: isOpen,
    enableSound: soundEnabled,
    onNews: handleIncomingWsNews,
  });

  // Fetch initial news and calendar data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsRes, calRes] = await Promise.all([
        api.getMarketNews({ category: newsCategory, limit: 30 }),
        api.getEconomicCalendar(),
      ]);

      if (newsRes?.success && Array.isArray(newsRes.data)) {
        setNewsItems(newsRes.data as NewsItem[]);
      }
      if (calRes?.success && Array.isArray(calRes.data)) {
        setCalendarEvents(calRes.data as EconomicEvent[]);
      }
    } catch {
      // Quiet background failure
    } finally {
      setLoading(false);
    }
  }, [newsCategory]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered News Items
  const filteredNews = useMemo(() => {
    return newsItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.headline.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase());

      const matchesSentiment =
        sentimentFilter === 'ALL' || item.sentiment === sentimentFilter;

      return matchesSearch && matchesSentiment;
    });
  }, [newsItems, search, sentimentFilter]);

  // High Impact Calendar Events
  const highImpactEvents = useMemo(() => {
    return calendarEvents.filter((e) => e.isHighImpact || e.impact === 'HIGH');
  }, [calendarEvents]);

  // Nearest High-Impact Event for Prop Firm Blackout Status
  const nearestHighImpactEvent = useMemo(() => {
    const now = Date.now();
    const upcoming = highImpactEvents
      .map((e) => ({ ...e, eventTime: new Date(e.time).getTime() }))
      .filter((e) => e.eventTime > now - 15 * 60 * 1000) // Within 15 mins past or in future
      .sort((a, b) => a.eventTime - b.eventTime);
    return upcoming[0] || null;
  }, [highImpactEvents]);

  const isBlackoutActive = useMemo(() => {
    if (!nearestHighImpactEvent) return false;
    const now = Date.now();
    const eventTime = new Date(nearestHighImpactEvent.time).getTime();
    const diffMins = (eventTime - now) / (1000 * 60);
    // Blackout if within 5 mins before or 5 mins after
    return diffMins >= -5 && diffMins <= 5;
  }, [nearestHighImpactEvent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className={cn(
          'relative w-full max-w-xl bg-zinc-950/95 border-l border-zinc-800/90 shadow-2xl backdrop-blur-2xl flex flex-col h-full z-10',
          'transition-transform duration-300 ease-spring'
        )}
        aria-label="Global Macro Intelligence Terminal"
      >
        {/* ── Top Header ─────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0 space-y-3 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white font-display">Macro Intelligence &amp; News Wire</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Finnhub API
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Institutional real-time global news &amp; macro risk monitor</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Audio toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playChime('news');
                  toast.info(next ? 'Macro audio chimes active' : 'Macro audio muted');
                }}
                className={cn(
                  'p-1.5 rounded-lg border transition-colors cursor-pointer',
                  soundEnabled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                )}
                title={soundEnabled ? 'Mute breaking news sound' : 'Enable breaking news chime'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-bar: Status and Nav Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('news')}
                className={cn(
                  'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'news'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Radio className="w-3 h-3" />
                Live Feed
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'calendar'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Calendar className="w-3 h-3" />
                Calendar ({highImpactEvents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blackout')}
                className={cn(
                  'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'blackout'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200',
                  isBlackoutActive && 'text-rose-400'
                )}
              >
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Lockout Shield
              </button>
            </div>

            {/* Live Socket Status */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold">{wsStatus}</span>
              {latencyMs && <span className="text-zinc-500">({latencyMs}ms)</span>}
            </div>
          </div>
        </div>

        {/* ── Filter & Search Toolbar (When in News Tab) ── */}
        {activeTab === 'news' && (
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/60 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter news by asset, keyword, or source…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs gap-2 pt-1 overflow-x-auto no-scrollbar">
              {/* Categories */}
              <div className="flex items-center gap-1">
                {(['general', 'forex', 'crypto'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewsCategory(cat)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer',
                      newsCategory === cat
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sentiment pills */}
              <div className="flex items-center gap-1">
                {(['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map((sent) => (
                  <button
                    key={sent}
                    type="button"
                    onClick={() => setSentimentFilter(sent)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer',
                      sentimentFilter === sent
                        ? sent === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sent === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-zinc-800 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    {sent}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Drawer Body Content ─────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Connecting to Finnhub Macro Pipeline…</p>
            </div>
          ) : activeTab === 'news' ? (
            filteredNews.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No market news found matching your query.
              </div>
            ) : (
              filteredNews.map((item) => (
                <article
                  key={item.id}
                  className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-300">{item.source}</span>
                      <span>·</span>
                      <span>
                        {new Date(item.datetime * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>

                    {/* Sentiment Tag */}
                    {item.sentiment && (
                      <span
                        className={cn(
                          'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase',
                          item.sentiment === 'BULLISH'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.sentiment === 'BEARISH'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        )}
                      >
                        {item.sentiment}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors leading-snug">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{item.headline}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  </h3>

                  {item.summary && (
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </article>
              ))
            )
          ) : activeTab === 'calendar' ? (
            /* ── Calendar Tab ──────────────────── */
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400 flex items-center justify-between">
                <span>Displaying High &amp; Medium Impact releases</span>
                <span className="font-mono text-indigo-400 font-semibold">{calendarEvents.length} events logged</span>
              </div>

              {calendarEvents.map((evt) => {
                const eventDate = new Date(evt.time);
                const isUpcoming = eventDate.getTime() > Date.now();

                return (
                  <div
                    key={evt.id}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all space-y-2',
                      evt.isHighImpact
                        ? 'border-rose-900/40 bg-rose-950/15'
                        : 'border-zinc-800/80 bg-zinc-900/30'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{evt.currency}</span>
                        <span
                          className={cn(
                            'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                            evt.impact === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {evt.impact}
                        </span>
                        {isUpcoming && (
                          <span className="text-[10px] font-mono text-indigo-400">
                            (Upcoming)
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-zinc-400">
                        {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-zinc-200">{evt.event}</p>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/50 text-[10px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">Actual</span>
                        <span className="text-white font-bold">{evt.actual ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Forecast</span>
                        <span className="text-zinc-300">{evt.estimate ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Previous</span>
                        <span className="text-zinc-400">{evt.prev ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Prop-Firm Lockout Shield Tab ─── */
            <div className="space-y-4">
              <div
                className={cn(
                  'p-5 rounded-2xl border text-center space-y-3',
                  isBlackoutActive
                    ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                    : 'border-emerald-500/40 bg-emerald-950/15 text-emerald-300'
                )}
              >
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-zinc-900 border border-zinc-800">
                  {isBlackoutActive ? (
                    <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {isBlackoutActive ? 'Prop-Firm News Blackout Active' : 'Safe Execution Zone'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    {isBlackoutActive
                      ? 'High-impact economic release in progress. Most funded prop accounts prohibit order execution 5 minutes before and after this event.'
                      : 'No high-impact economic releases within the 5-minute blackout threshold. Market volatility is within baseline.'}
                  </p>
                </div>
              </div>

              {nearestHighImpactEvent && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Next High-Impact Event
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {nearestHighImpactEvent.event} ({nearestHighImpactEvent.currency})
                      </div>
                      <div className="text-xs text-zinc-400">
                        Scheduled at{' '}
                        {new Date(nearestHighImpactEvent.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs font-bold font-mono">
                      {nearestHighImpactEvent.impact}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                <span className="font-bold text-zinc-200 block">Prop-Firm Protection Safeguards:</span>
                <p>• Avoid opening or closing positions across FTMO, MFF, FundedNext during high-volatility prints.</p>
                <p>• Protect against unexpected broker slippage and spread widening during CPI/FOMC releases.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 shrink-0 bg-zinc-900/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
            <span>Shortcut:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-300 font-bold">
              N
            </kbd>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('w-3 h-3 inline mr-1', loading && 'animate-spin')} />
              Refresh
            </button>

            <Link
              href="/dashboard/news"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <span>Full Terminal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

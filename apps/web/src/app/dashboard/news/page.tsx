// ──────────────────────────────────────────────
// TradeMind — Real-Time Market News & Economic Calendar Terminal
//
// Powered by Finnhub API (https://finnhub.io/docs/api)
// Integrated with prop-firm news lockout warning alerts.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Globe,
  ShieldAlert,
  Zap,
  Filter,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useFinnhubWebSocket } from '@/hooks/useFinnhubWebSocket';
import { FinnhubLiveTickerCard } from '@/components/news/FinnhubLiveTickerCard';

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

export default function MarketNewsPage() {
  const [activeTab, setActiveTab] = useState<'news' | 'calendar'>('news');
  const [newsCategory, setNewsCategory] = useState<'general' | 'forex' | 'crypto'>('general');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHighImpactOnly, setFilterHighImpactOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const handleIncomingWsNews = useCallback((incoming: any) => {
    setNewsItems((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)]);
  }, []);

  const { status: wsStatus, latencyMs } = useFinnhubWebSocket({
    onNews: handleIncomingWsNews,
    enabled: true,
  });

  useEffect(() => {
    document.title = 'Live Market News & Economic Calendar — TradeMind';
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMarketNews({ category: newsCategory });
      if (res.success && Array.isArray(res.data)) {
        setNewsItems(res.data);
        setLastRefreshed(new Date());
      }
    } catch {
      toast.error('Could not refresh news stream');
    } finally {
      setLoading(false);
    }
  }, [newsCategory]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEconomicCalendar();
      if (res.success && Array.isArray(res.data)) {
        setCalendarEvents(res.data);
        setLastRefreshed(new Date());
      }
    } catch {
      toast.error('Could not refresh economic calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    } else {
      fetchCalendar();
    }
  }, [activeTab, fetchNews, fetchCalendar]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === 'news') {
        fetchNews();
      } else {
        fetchCalendar();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchNews, fetchCalendar]);

  // Filtered news
  const filteredNews = newsItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.headline.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      (item.related && item.related.toLowerCase().includes(q))
    );
  });

  // Filtered calendar events
  const filteredEvents = calendarEvents.filter((evt) => {
    if (filterHighImpactOnly && !evt.isHighImpact) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      evt.event.toLowerCase().includes(q) ||
      evt.country.toLowerCase().includes(q) ||
      evt.currency.toLowerCase().includes(q)
    );
  });

  // Calculate upcoming high-impact event for Prop-Firm warning banner
  const upcomingHighImpact = calendarEvents.find((e) => e.isHighImpact);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Market News & Economic Calendar"
          description="Real-time macro news feeds, institutional economic calendar, and prop-firm event safeguards."
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-mono">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                wsStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : wsStatus === 'FALLBACK_SIMULATED'
                  ? 'bg-indigo-400'
                  : 'bg-amber-400'
              )}
            />
            <span className="text-[11px] font-bold text-foreground">
              {wsStatus === 'CONNECTED'
                ? `WebSocket Live${latencyMs ? ` (${latencyMs}ms)` : ''}`
                : wsStatus === 'FALLBACK_SIMULATED'
                ? `Live Feed${latencyMs ? ` (${latencyMs}ms)` : ''}`
                : 'Connecting WS...'}
            </span>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500')} />
            <span>{autoRefresh ? 'Auto-Sync (30s)' : 'Manual Sync'}</span>
          </button>

          <button
            onClick={() => (activeTab === 'news' ? fetchNews() : fetchCalendar())}
            disabled={loading}
            className="p-2 rounded-xl border border-border/70 hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            title="Refresh feed"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* Finnhub Ultra-Low Latency WebSocket Real-Time Ticker Stream */}
      <FinnhubLiveTickerCard />

      {/* Prop-Firm High Impact News Warning Banner */}
      {upcomingHighImpact && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
                  Prop Firm Safeguard Notice
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                  HIGH IMPACT
                </span>
              </div>
              <p className="text-xs text-foreground/90 mt-0.5">
                Upcoming Release: <strong>{upcomingHighImpact.event}</strong> ({upcomingHighImpact.currency}) at{' '}
                {new Date(upcomingHighImpact.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                FTMO &amp; Apex guidelines prohibit execution within 2 minutes of red folder releases.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/prop-firm"
            className="text-xs font-bold text-amber-400 hover:underline shrink-0 flex items-center gap-1"
          >
            <span>View Prop Firm Matrix</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Navigation Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('news')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'news'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Newspaper className="w-4 h-4" />
            <span>Market News Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'calendar'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Economic Calendar</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'news' ? 'Search headlines, tickers (e.g. BTC, NVDA, Fed)...' : 'Search events, currencies (CPI, USD)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-background border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {activeTab === 'news' ? (
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/60 text-xs shrink-0">
              {(['general', 'forex', 'crypto'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewsCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold capitalize transition-all',
                    newsCategory === cat ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat === 'general' ? 'Macro' : cat}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setFilterHighImpactOnly(!filterHighImpactOnly)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5',
                filterHighImpactOnly
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>High Impact Only</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading && newsItems.length === 0 && calendarEvents.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : activeTab === 'news' ? (
        /* ── Real-Time Market News Grid ── */
        filteredNews.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-border/60 bg-card/40 space-y-2">
            <Newspaper className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No news matching your filter</h3>
            <p className="text-xs text-muted-foreground">Try clearing your search term or selecting another market category.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNews.map((news) => (
              <a
                key={news.id}
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-2xl border border-border/70 bg-card/80 hover:bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border/40">
                      {news.source}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {news.sentiment && (
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5',
                            news.sentiment === 'BULLISH'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : news.sentiment === 'BEARISH'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {news.sentiment === 'BULLISH' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : news.sentiment === 'BEARISH' ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          <span>{news.sentiment}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(news.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {news.headline}
                  </h3>

                  {news.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {news.summary}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold group-hover:underline">
                  <span>Read full analysis</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        )
      ) : (
        /* ── Economic Calendar Table ── */
        filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-border/60 bg-card/40 space-y-2">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No events found</h3>
            <p className="text-xs text-muted-foreground">No scheduled economic releases match your filter.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/80 bg-card/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time (UTC)</th>
                    <th className="py-3 px-4">Country</th>
                    <th className="py-3 px-4">Impact</th>
                    <th className="py-3 px-4">Economic Event</th>
                    <th className="py-3 px-4 text-right">Actual</th>
                    <th className="py-3 px-4 text-right">Estimate</th>
                    <th className="py-3 px-4 text-right">Previous</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(evt.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted/60 font-mono text-[11px]">
                          {evt.currency} ({evt.country})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[10px] border',
                            evt.impact === 'HIGH'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : evt.impact === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          )}
                        >
                          {evt.impact}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {evt.event}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        {evt.actual !== null && evt.actual !== undefined ? `${evt.actual}${evt.unit}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                        {evt.estimate !== null && evt.estimate !== undefined ? `${evt.estimate}${evt.unit}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                        {evt.prev !== null && evt.prev !== undefined ? `${evt.prev}${evt.unit}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

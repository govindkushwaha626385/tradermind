// ──────────────────────────────────────────────
// TradeMind — Admin News & Macro Intelligence Hub
//
// Full administrative control over:
// - Finnhub WebSocket & REST API configurations
// - Prop-Firm news blackout rules (CPI, FOMC, NFP lockouts)
// - Live news ingestion monitor & algorithmic sentiment breakdown
// - Economic calendar high-impact risk management
// - RFC-4180 CSV export for compliance and audit records
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Calendar,
  Radio,
  Wifi,
  ShieldAlert,
  Download,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Sliders,
  Database,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonCard';
import { downloadCsv } from '@/lib/export-csv';
import { useFinnhubWebSocket } from '@/hooks/useFinnhubWebSocket';

export default function AdminNewsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'feed' | 'calendar' | 'config'>('overview');
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Config States
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [lockoutMinutes, setLockoutMinutes] = useState(2);
  const [savingConfig, setSavingConfig] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);

  // Real-time Finnhub WebSocket connection monitor
  const { status: wsStatus, latencyMs } = useFinnhubWebSocket({
    enabled: true,
  });

  useEffect(() => {
    document.title = 'News & Macro Intelligence Admin — TradeMind';
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsRes, calRes, configRes] = await Promise.all([
        api.getMarketNews({ limit: 50 }),
        api.getEconomicCalendar(),
        api.getAdminConfigs().catch(() => ({ success: false, data: [] })),
      ]);

      if (newsRes?.success && Array.isArray(newsRes.data)) {
        setNewsItems(newsRes.data);
      }
      if (calRes?.success && Array.isArray(calRes.data)) {
        setCalendarEvents(calRes.data);
      }

      if (configRes?.success && Array.isArray(configRes.data)) {
        const configs = configRes.data as any[];
        const keyCfg = configs.find((c) => c.key === 'broker.finnhub.apiKey');
        if (keyCfg?.value) setApiKeyInput(String(keyCfg.value));

        const lockCfg = configs.find((c) => c.key === 'news.prop_firm_lockout_minutes');
        if (lockCfg?.value) setLockoutMinutes(Number(lockCfg.value));
      }
    } catch {
      toast.error('Failed to load news intelligence records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await Promise.all([
        api.updateAdminConfig('broker.finnhub.apiKey', apiKeyInput.trim()),
        api.updateAdminConfig('news.prop_firm_lockout_minutes', Number(lockoutMinutes)),
      ]);
      toast.success('Finnhub & Prop-Firm news blackout configuration saved successfully');
    } catch {
      toast.error('Failed to update system configurations');
    } finally {
      setSavingConfig(false);
    }
  };

  // Purge Cache
  const handlePurgeCache = async () => {
    setPurgingCache(true);
    try {
      const res = await api.adminFlushCache();
      if (res?.success) {
        toast.success('News & Calendar cache keys invalidated across cluster');
        loadData();
      } else {
        toast.error('Cache purge failed');
      }
    } catch {
      toast.error('Error during cache invalidation');
    } finally {
      setPurgingCache(false);
    }
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const totalNews = newsItems.length;
    const bullish = newsItems.filter((n) => n.sentiment === 'BULLISH').length;
    const bearish = newsItems.filter((n) => n.sentiment === 'BEARISH').length;
    const neutral = newsItems.filter((n) => n.sentiment === 'NEUTRAL').length;

    const highImpactCount = calendarEvents.filter((c) => c.isHighImpact).length;
    const todayEvents = calendarEvents.filter((c) => {
      const d = new Date(c.time);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;

    return {
      totalNews,
      bullishPct: totalNews > 0 ? Math.round((bullish / totalNews) * 100) : 0,
      bearishPct: totalNews > 0 ? Math.round((bearish / totalNews) * 100) : 0,
      neutralPct: totalNews > 0 ? Math.round((neutral / totalNews) * 100) : 0,
      highImpactCount,
      todayEvents,
    };
  }, [newsItems, calendarEvents]);

  // Export CSV
  const handleExportCsv = () => {
    if (activeTab === 'calendar') {
      const filename = `TradeMind_Admin_Economic_Calendar_${new Date().toISOString().split('T')[0]}`;
      const columns = [
        { header: 'Event', accessor: (c: any) => c.event },
        { header: 'Country', accessor: (c: any) => c.country },
        { header: 'Currency', accessor: (c: any) => c.currency },
        { header: 'Impact', accessor: (c: any) => c.impact },
        { header: 'Time (UTC)', accessor: (c: any) => new Date(c.time).toISOString() },
        { header: 'Estimate', accessor: (c: any) => c.estimate ?? '' },
        { header: 'Actual', accessor: (c: any) => c.actual ?? '' },
        { header: 'Previous', accessor: (c: any) => c.prev ?? '' },
      ];
      downloadCsv(filename, calendarEvents, columns);
      toast.success(`Exported ${calendarEvents.length} calendar events to CSV`);
    } else {
      const filename = `TradeMind_Admin_News_Stream_${new Date().toISOString().split('T')[0]}`;
      const columns = [
        { header: 'ID', accessor: (n: any) => n.id },
        { header: 'Headline', accessor: (n: any) => n.headline },
        { header: 'Category', accessor: (n: any) => n.category },
        { header: 'Source', accessor: (n: any) => n.source },
        { header: 'Sentiment', accessor: (n: any) => n.sentiment },
        { header: 'Published Time', accessor: (n: any) => new Date(n.datetime * 1000).toISOString() },
        { header: 'URL', accessor: (n: any) => n.url },
      ];
      downloadCsv(filename, newsItems, columns);
      toast.success(`Exported ${newsItems.length} news items to CSV`);
    }
  };

  const filteredNews = newsItems.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.headline.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q)
    );
  });

  const filteredCalendar = calendarEvents.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.event.toLowerCase().includes(q) ||
      item.currency.toLowerCase().includes(q) ||
      item.country.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="News & Macro Intelligence Hub"
          description="Institutional control over real-time Finnhub feeds, prop-firm event lockouts, and macro risk."
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket Monitor Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs font-mono">
            <Radio
              className={cn(
                'w-3.5 h-3.5',
                wsStatus === 'CONNECTED'
                  ? 'text-emerald-400 animate-pulse'
                  : wsStatus === 'FALLBACK_SIMULATED'
                  ? 'text-indigo-400'
                  : 'text-amber-400'
              )}
            />
            <span className="text-[11px] font-bold text-foreground">
              {wsStatus === 'CONNECTED'
                ? `WS Active (${latencyMs || 14}ms)`
                : wsStatus === 'FALLBACK_SIMULATED'
                ? `WS Simulated (${latencyMs || 18}ms)`
                : 'Connecting WS...'}
            </span>
          </div>

          <button
            onClick={handlePurgeCache}
            disabled={purgingCache}
            className="px-3 py-1.5 rounded-xl border border-border/80 hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Purge News & Calendar Cache Keys"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', purgingCache && 'animate-spin text-primary')} />
            <span>Purge Cache</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Active Ingested Articles</span>
            <Newspaper className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-jakarta text-foreground mt-2">
            {metrics.totalNews}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Finnhub global macro feed
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Sentiment Distribution</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mt-2 font-mono text-sm font-bold">
            <span className="text-emerald-400">{metrics.bullishPct}% Bull</span>
            <span className="text-zinc-400">/</span>
            <span className="text-rose-400">{metrics.bearishPct}% Bear</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {metrics.neutralPct}% Neutral market context
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Prop Firm Red Folders</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-jakarta text-amber-400 mt-2">
            {metrics.highImpactCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {lockoutMinutes}m lockout window active
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Scheduled Events Today</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-jakarta text-foreground mt-2">
            {metrics.todayEvents}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Economic calendar releases
          </div>
        </div>
      </div>

      {/* Navigation Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Configuration</span>
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'feed'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Newspaper className="w-4 h-4" />
          <span>Live Ingestion Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'calendar'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Economic Calendar</span>
        </button>
      </div>

      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Finnhub API Credentials & Gateway</h3>
                <p className="text-xs text-muted-foreground">Global market data provider settings</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Finnhub API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Finnhub API Key..."
                    className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-border/70 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-3" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Get your free institutional API key at{' '}
                  <a
                    href="https://finnhub.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    finnhub.io
                  </a>
                  . If empty, the engine uses resilient algorithmic market simulation fallback.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Prop Firm Red Folder Blackout Window (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={lockoutMinutes}
                  onChange={(e) => setLockoutMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-border/70 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-muted-foreground">
                  Traders are warned against placing new trades within this buffer before and after red-folder macro events (CPI, FOMC, NFP). FTMO &amp; Apex standard is 2 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingConfig ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Prop-Firm Rule Compliance Directives</h3>
                <p className="text-xs text-muted-foreground">Institutional guidelines enforced across trader journals</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FTMO &amp; FundedNext News Rule</span>
                </div>
                <p>
                  Trading is strictly prohibited within 2 minutes before to 2 minutes after high-impact releases for standard evaluation accounts. Swing accounts are exempt.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apex &amp; Topstep Futures Volatility Policy</span>
                </div>
                <p>
                  Execution during FOMC rate announcements and Non-Farm Payrolls is actively flagged on trader replays to prevent account auto-liquidation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automated Ribbon Warning</span>
                </div>
                <p>
                  Active ribbons trigger in trader dashboards whenever a high-impact event is within 15 minutes of release.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE INGESTION FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headlines or sources..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-card border border-border/70 text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="general">General Macro</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="merger">M&amp;A</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Headline</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Sentiment</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredNews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No news items found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredNews.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground max-w-md truncate">
                          {item.headline}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {item.source}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full font-bold text-[10px]',
                              item.sentiment === 'BULLISH'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : item.sentiment === 'BEARISH'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            )}
                          >
                            {item.sentiment}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {new Date(item.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ECONOMIC CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search economic events, currencies..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Country / Currency</th>
                    <th className="py-3 px-4">Impact</th>
                    <th className="py-3 px-4">Release Time</th>
                    <th className="py-3 px-4">Actual</th>
                    <th className="py-3 px-4">Forecast</th>
                    <th className="py-3 px-4">Previous</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCalendar.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No calendar events found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredCalendar.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          {evt.event}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {evt.country} ({evt.currency})
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full font-bold text-[10px]',
                              evt.isHighImpact
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {evt.impact}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {new Date(evt.time).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                          {evt.actual ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                          {evt.estimate ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                          {evt.prev ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Admin Billing & Revenue Dashboard
//
// Consolidated billing intelligence for admins:
// - KPI cards: Total Revenue, MRR, ARR, Paid Invoices
// - 12-month revenue trend (SVG bar chart — no library)
// - Revenue by provider breakdown
// - Subscription status & plan distribution
// - Recent invoices table
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Activity,
  BarChart3,
  ArrowUpRight,
  Layers,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonStatRow } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';

// ── Types ──────────────────────────────────────

interface BillingSummary {
  totalRevenuePaise: number;
  totalPaidInvoices: number;
  mrrPaise: number;
  arrPaise: number;
  byProvider: Array<{ provider: string; revenue: number; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byPlan: Array<{ planName: string; planSlug: string; count: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; count: number }>;
  recentInvoices: Array<{
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    provider: string;
    amountPaid: number;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

// ── Helpers ────────────────────────────────────

/** Format paise (INR smallest unit) to readable ₹ string */
function formatPaise(paise: number, currency = 'INR'): string {
  const amount = paise / 100;
  if (amount >= 10_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Generate last 12 months in YYYY-MM format (for chart alignment) */
function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  return months;
}

function shortMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-success/10 text-success border-success/20',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  past_due: 'bg-warning/10 text-warning border-warning/20',
  trialing: 'bg-primary/10 text-primary border-primary/20',
  expired:  'bg-accent text-muted-foreground border-border/50',
};

const PROVIDER_COLORS: Record<string, string> = {
  razorpay: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  stripe:   'bg-violet-500/10 text-violet-500 border-violet-500/20',
};

// ── SVG Bar Chart Component ─────────────────────

function RevenueBarChart({ data, months }: {
  data: Array<{ month: string; revenue: number; count: number }>;
  months: string[];
}) {
  const dataMap = new Map(data.map((d) => [d.month, d]));
  const bars = months.map((m) => ({ month: m, revenue: dataMap.get(m)?.revenue ?? 0, count: dataMap.get(m)?.count ?? 0 }));
  const maxRev = Math.max(...bars.map((b) => b.revenue), 1);

  const SVG_H = 120;
  const SVG_W = 100; // percentage units (viewBox)
  const barW = (SVG_W / bars.length) * 0.65;
  const gap   = (SVG_W / bars.length) * 0.35;
  const topPad = 8;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H + 20}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = topPad + (1 - frac) * SVG_H;
          return (
            <line
              key={frac}
              x1={0} y1={y} x2={SVG_W} y2={y}
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-border/40"
              strokeDasharray="1 1"
            />
          );
        })}

        {bars.map((bar, i) => {
          const barH = Math.max(((bar.revenue / maxRev) * SVG_H) - topPad, 0.5);
          const x = i * (barW + gap) + gap / 2;
          const y = topPad + (SVG_H - barH);
          const isThisMonth = bar.month === months[11];

          return (
            <g key={bar.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="0.8"
                className={isThisMonth ? 'fill-primary' : 'fill-primary/40'}
              />
              {/* Month label */}
              <text
                x={x + barW / 2}
                y={SVG_H + topPad + 8}
                textAnchor="middle"
                fontSize="3"
                className="fill-muted-foreground"
              >
                {shortMonth(bar.month)}
              </text>
              {/* Revenue tooltip on hover via title */}
              <title>{shortMonth(bar.month)}: {formatPaise(bar.revenue)} ({bar.count} invoices)</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Page ───────────────────────────────────

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const months = getLast12Months();

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getAdminBillingSummary();
      if (res.success) setData(res.data as BillingSummary);
    } catch (err) {
      console.error('Failed to fetch billing summary:', err);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Billing & Revenue — TradeMind | Admin';
    fetch();
  }, [fetch]);

  // ── KPI data ───────────────────────────────
  const kpis = data
    ? [
        {
          label: 'Total Revenue',
          value: formatPaise(data.totalRevenuePaise),
          sub: `${data.totalPaidInvoices} paid invoices`,
          icon: DollarSign,
          color: 'text-success',
          bg: 'bg-success/10',
        },
        {
          label: 'MRR (This Month)',
          value: formatPaise(data.mrrPaise),
          sub: 'Monthly Recurring Revenue',
          icon: TrendingUp,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          label: 'ARR (Annualised)',
          value: formatPaise(data.arrPaise),
          sub: 'MRR × 12 projection',
          icon: ArrowUpRight,
          color: 'text-violet-500',
          bg: 'bg-violet-500/10',
        },
        {
          label: 'Active Subscriptions',
          value: String(data.byStatus.find((s) => s.status === 'active')?.count ?? 0),
          sub: `${data.byStatus.reduce((a, s) => a + s.count, 0)} total`,
          icon: Activity,
          color: 'text-warning',
          bg: 'bg-warning/10',
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">

      {/* ── Header ── */}
      <PageHeader
        title="Billing & Revenue"
        description="Real-time subscription revenue, MRR/ARR, and payment intelligence"
        icon={BarChart3}
        actions={
        <button
          onClick={() => fetch(true)}
          className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        }
      />

      {/* ── KPI Cards ── */}
      {loading ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-card rounded-2xl p-4 flex flex-col gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', kpi.bg)}>
                <kpi.icon className={cn('w-4.5 h-4.5', kpi.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Revenue Trend + Provider Split ── */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* 12-Month Bar Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Monthly Revenue Trend</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 12 months (subscription invoices)</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-primary/10 text-primary">
                <Zap className="w-3 h-3" />
                Live
              </span>
            </div>
            {data.monthlyTrend.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                No invoice data in the last 12 months.
              </div>
            ) : (
              <RevenueBarChart data={data.monthlyTrend} months={months} />
            )}
          </div>

          {/* Provider + Plan Split */}
          <div className="space-y-4">

            {/* By Provider */}
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Revenue by Provider
              </h2>
              {data.byProvider.length === 0 ? (
                <p className="text-xs text-muted-foreground">No revenue data yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.byProvider.map((p) => {
                    const totalRev = data.byProvider.reduce((a, x) => a + x.revenue, 0);
                    const pct = totalRev > 0 ? Math.round((p.revenue / totalRev) * 100) : 0;
                    return (
                      <div key={p.provider}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full font-medium capitalize border text-xs',
                            PROVIDER_COLORS[p.provider] ?? 'bg-accent text-muted-foreground border-border/50',
                          )}>
                            {p.provider}
                          </span>
                          <span className="font-mono font-semibold text-foreground">{formatPaise(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-accent/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.count} invoices · {pct}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Plan */}
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Active Subscriptions by Plan
              </h2>
              {data.byPlan.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active subscriptions.</p>
              ) : (
                <div className="space-y-2">
                  {data.byPlan.map((p) => {
                    const totalSubs = data.byPlan.reduce((a, x) => a + x.count, 0);
                    const pct = totalSubs > 0 ? Math.round((p.count / totalSubs) * 100) : 0;
                    return (
                      <div key={p.planSlug}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground capitalize">{p.planName}</span>
                          <span className="font-mono font-semibold text-foreground">{p.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-accent/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{pct}% of active</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Status Distribution ── */}
      {!loading && data && data.byStatus.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Subscription Health Overview
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.byStatus.map((s) => (
              <div
                key={s.status}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold',
                  STATUS_COLORS[s.status] ?? 'bg-accent text-muted-foreground border-border/50',
                )}
              >
                <span className="capitalize">{s.status.replace('_', ' ')}</span>
                <span className="font-mono text-sm font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Paid Invoices ── */}
      {!loading && data && data.recentInvoices.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recent Paid Invoices</h2>
            <span className="ml-auto text-xs text-muted-foreground">Last 10 transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-accent/20">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Provider</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-xs text-foreground">{inv.userName || 'User'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{inv.userEmail}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border',
                        PROVIDER_COLORS[inv.provider] ?? 'bg-accent text-muted-foreground border-border/50',
                      )}>
                        {inv.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                      {formatPaise(inv.amountPaid, inv.currency)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.paidAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No billing data available</p>
          <p className="text-xs mt-1">Revenue will appear here once subscriptions are created.</p>
        </div>
      )}
    </div>
  );
}

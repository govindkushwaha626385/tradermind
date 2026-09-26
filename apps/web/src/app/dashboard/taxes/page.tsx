// ──────────────────────────────────────────────
// TradeMind — Institutional Tax & Statutory Ledger Page
//
// Multi-Jurisdiction Tax & Statutory Ledger Engine:
// - India: ICAI Guidance Note on Tax Audit, Section 43(5) Intraday Speculative vs F&O Non-Speculative, Section 44AD/44AB Audit Thresholds
// - USA: IRS Form 8949 (Short vs Long Term), Section 1256 60/40 rule on regulated futures
// - Global: Capital gains, statutory levies (STT/GST/SEC/FINRA), and deductible trading business expenses
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Scale,
  Calendar,
  Download,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  Calculator,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { StatutoryTaxLedger } from '@/components/reports/StatutoryTaxLedger';
import type { JournalTrade } from '@trademind/shared';

type TaxYearPreset = 'FY_2024_2025' | 'FY_2023_2024' | 'CY_2024' | 'CY_2023' | 'ALL' | 'CUSTOM';

export default function TaxesPage() {
  const { currency, format } = useCurrency();
  const [preset, setPreset] = useState<TaxYearPreset>('FY_2024_2025');
  const [customStart, setCustomStart] = useState<string>('2024-04-01');
  const [customEnd, setCustomEnd] = useState<string>('2025-03-31');
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Institutional Tax & Statutory Ledger — TradeMind';
  }, []);

  // Compute date range based on selected preset
  const { startDate, endDate, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';

    switch (preset) {
      case 'FY_2024_2025':
        start = new Date('2024-04-01T00:00:00.000Z');
        end = new Date('2025-03-31T23:59:59.999Z');
        label = 'Indian FY 2024-25 (AY 2025-26)';
        break;
      case 'FY_2023_2024':
        start = new Date('2023-04-01T00:00:00.000Z');
        end = new Date('2024-03-31T23:59:59.999Z');
        label = 'Indian FY 2023-24 (AY 2024-25)';
        break;
      case 'CY_2024':
        start = new Date('2024-01-01T00:00:00.000Z');
        end = new Date('2024-12-31T23:59:59.999Z');
        label = 'US / Global CY 2024';
        break;
      case 'CY_2023':
        start = new Date('2023-01-01T00:00:00.000Z');
        end = new Date('2023-12-31T23:59:59.999Z');
        label = 'US / Global CY 2023';
        break;
      case 'ALL':
        start = new Date('2020-01-01T00:00:00.000Z');
        end = new Date();
        label = 'All Historical Trades';
        break;
      case 'CUSTOM':
      default:
        start = new Date(`${customStart}T00:00:00.000Z`);
        end = new Date(`${customEnd}T23:59:59.999Z`);
        label = `Custom (${customStart} to ${customEnd})`;
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      periodLabel: label,
    };
  }, [preset, customStart, customEnd]);

  // Fetch real user trades for statutory calculation
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getJournalTrades({
        startDate: preset === 'ALL' ? undefined : startDate,
        endDate: preset === 'ALL' ? undefined : endDate,
        limit: 1000,
      });

      if (res && res.success && Array.isArray(res.data)) {
        setTrades(res.data as unknown as JournalTrade[]);
      } else {
        setTrades([]);
      }
    } catch (err) {
      console.error('Failed to load tax ledger trades:', err);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, preset]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Statutory Tax & Regulatory Ledger"
        description="Comprehensive audit-grade financial turnover, capital gains, and tax computation engine for Chartered Accountants (India) and CPAs (United States)."
        badge="Multi-Jurisdiction"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/calculators?tab=CHARGES_TAXES"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>Brokerage Calculator</span>
            </Link>
            <button
              onClick={fetchTrades}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-slate-400', loading && 'animate-spin')} />
              <span>Refresh Ledger</span>
            </button>
          </div>
        }
      />

      {/* ── Statutory Compliance Notice Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-slate-900/50 to-cyan-950/30 p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Institutional Regulatory Compliance Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Audit Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                Automatically segregates <strong>Speculative Intraday Equity (Sec 43(5))</strong> from <strong>Non-Speculative F&amp;O Derivatives</strong> turnover according to the ICAI 8th Edition Guidance Note. For US traders, computes IRS Form 8949 gain/loss and <strong>Section 1256 60/40 blended rates</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block">Current Scope</span>
              <span className="text-xs font-semibold text-slate-200">{periodLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tax Period Preset Selector ── */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Assessment / Tax Year:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'FY_2024_2025', label: 'India FY 2024-25' },
              { id: 'FY_2023_2024', label: 'India FY 2023-24' },
              { id: 'CY_2024', label: 'US CY 2024' },
              { id: 'CY_2023', label: 'US CY 2023' },
              { id: 'ALL', label: 'All-Time' },
              { id: 'CUSTOM', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id as TaxYearPreset)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  preset === p.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'CUSTOM' && (
            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Main Statutory Tax Ledger Component ── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard className="h-96" />
        </div>
      ) : (
        <StatutoryTaxLedger
          trades={trades}
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          format={format}
        />
      )}
    </div>
  );
}

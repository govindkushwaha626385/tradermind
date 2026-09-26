// ──────────────────────────────────────────────
// TradeMind — Statutory Tax & Regulatory Ledger Engine
//
// Institutional tax calculation and audit reporting across:
// - India (Income Tax Act, ICAI F&O Turnover, Sec 44AD/44AB Audit)
// - United States (IRS Form 8949, Section 1256 60/40 Rule)
// - Global / Multi-Currency Capital Gains Ledger
//
// Formatted for Chartered Accountants (CA) and CPAs with RFC-4180 CSV export.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  ShieldCheck,
  AlertTriangle,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Scale,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import type { JournalTrade } from '@trademind/shared';

type TaxJurisdiction = 'INDIA' | 'USA' | 'GLOBAL';

interface StatutoryTaxLedgerProps {
  trades: JournalTrade[];
  startDate: string;
  endDate: string;
  currency: string;
  format: (val: number) => string;
}

export function StatutoryTaxLedger({
  trades,
  startDate,
  endDate,
  currency,
  format,
}: StatutoryTaxLedgerProps) {
  const [jurisdiction, setJurisdiction] = useState<TaxJurisdiction>('INDIA');
  const [softwareExpenseDeduction, setSoftwareExpenseDeduction] = useState(4999); // e.g. TradeMind annual fee
  const [otherBusinessExpenses, setOtherBusinessExpenses] = useState(15000); // e.g. Internet, advisory

  const closedTrades = useMemo(() => {
    return trades.filter((t) => t.status === 'CLOSED');
  }, [trades]);

  // ──────────────────────────────────────────
  // 1. INDIA STATUTORY CALCULATIONS (ICAI & IT Act)
  // ──────────────────────────────────────────
  const indiaMetrics = useMemo(() => {
    let speculativePnl = 0; // Intraday Equities (Sec 43(5))
    let speculativeTurnover = 0;
    let nonSpeculativePnl = 0; // F&O (Futures & Options)
    let nonSpeculativeTurnover = 0; // ICAI Formula: Sum of absolute profit + absolute loss
    let totalFees = 0;

    closedTrades.forEach((t) => {
      const netP = t.netPnl ?? 0;
      const grossP = t.grossPnl ?? netP;
      const fees = t.totalFeesAndTaxes ?? 0;
      totalFees += fees;

      const isEquityIntraday = (t.assetClass as string) === 'EQUITY';
      const isFnO = (t.assetClass as string) === 'FNO_OPTIONS' || (t.assetClass as string) === 'FNO_FUTURES' || (t.assetClass as string) === 'OPTIONS' || (t.assetClass as string) === 'FUTURES';

      if (isEquityIntraday) {
        speculativePnl += netP;
        speculativeTurnover += Math.abs(grossP);
      } else if (isFnO) {
        nonSpeculativePnl += netP;
        // ICAI Guidance Note on Tax Audit for F&O: Absolute profit + absolute loss
        nonSpeculativeTurnover += Math.abs(grossP);
      } else {
        // Crypto / Forex / Delivery
        nonSpeculativePnl += netP;
        nonSpeculativeTurnover += Math.abs(grossP);
      }
    });

    const totalTurnover = speculativeTurnover + nonSpeculativeTurnover;
    const totalTaxableIncomeBeforeExpenses = speculativePnl + nonSpeculativePnl;
    const totalAllowableExpenses = softwareExpenseDeduction + otherBusinessExpenses;
    const netTaxableBusinessIncome = Math.max(0, totalTaxableIncomeBeforeExpenses - totalAllowableExpenses);

    // Section 44AB Tax Audit Threshold: ₹10 Crore for digital transactions (>95%)
    const auditThreshold = 100000000; // ₹10 Cr
    const auditThresholdPct = totalTurnover > 0 ? (totalTurnover / auditThreshold) * 100 : 0;
    const isAuditMandatoryByTurnover = totalTurnover >= auditThreshold;

    // Presumptive 44AD Check: If declared profit is < 6% of non-speculative turnover
    const presumptiveProfitRate = nonSpeculativeTurnover > 0 ? (nonSpeculativePnl / nonSpeculativeTurnover) * 100 : 0;
    const isBelowPresumptiveRate = nonSpeculativePnl > 0 && presumptiveProfitRate < 6.0;

    // Estimated Statutory Taxes Breakdown (standard SEBI & Indian Brokerage weights)
    const estimatedSTT = totalFees * 0.42;
    const estimatedGST = totalFees * 0.28; // 18% on brokerage & exchange fees
    const estimatedExchangeCharges = totalFees * 0.16;
    const estimatedStampDuty = totalFees * 0.06;
    const estimatedSEBI = totalFees * 0.02;
    const estimatedBrokerage = totalFees * 0.06;

    return {
      speculativePnl,
      speculativeTurnover,
      nonSpeculativePnl,
      nonSpeculativeTurnover,
      totalTurnover,
      totalFees,
      totalAllowableExpenses,
      netTaxableBusinessIncome,
      auditThreshold,
      auditThresholdPct,
      isAuditMandatoryByTurnover,
      presumptiveProfitRate,
      isBelowPresumptiveRate,
      estimatedSTT,
      estimatedGST,
      estimatedExchangeCharges,
      estimatedStampDuty,
      estimatedSEBI,
      estimatedBrokerage,
    };
  }, [closedTrades, softwareExpenseDeduction, otherBusinessExpenses]);

  // ──────────────────────────────────────────
  // 2. US STATUTORY CALCULATIONS (IRS Form 8949 & Sec 1256)
  // ──────────────────────────────────────────
  const usMetrics = useMemo(() => {
    let shortTermGains = 0;
    let longTermGains = 0;
    let section1256Gains = 0; // Broad-based index options & futures (e.g. SPX, ES, NQ)
    let totalFees = 0;

    closedTrades.forEach((t) => {
      const pnl = t.netPnl ?? 0;
      totalFees += t.totalFeesAndTaxes ?? 0;

      const sym = (t.tradingsymbol || '').toUpperCase();
      const isIndexFutureOrOption =
        sym.includes('SPX') || sym.includes('NDX') || sym.includes('ES') || sym.includes('NQ') || (t.assetClass as string) === 'FNO_FUTURES' || (t.assetClass as string) === 'FUTURES';

      if (isIndexFutureOrOption) {
        section1256Gains += pnl;
      } else {
        // Compute holding duration
        const openTime = new Date(t.openedAt).getTime();
        const closeTime = t.closedAt ? new Date(t.closedAt).getTime() : openTime;
        const daysHeld = (closeTime - openTime) / (1000 * 60 * 60 * 24);

        if (daysHeld >= 365) {
          longTermGains += pnl;
        } else {
          shortTermGains += pnl;
        }
      }
    });

    // Section 1256: 60% treated as Long-Term (max 20%), 40% as Short-Term (ordinary rate up to 37%)
    const sec1256LongTerm = section1256Gains * 0.6;
    const sec1256ShortTerm = section1256Gains * 0.4;

    const totalEffectiveLongTerm = longTermGains + sec1256LongTerm;
    const totalEffectiveShortTerm = shortTermGains + sec1256ShortTerm;

    // Approximate tax savings from Sec 1256 (blended 26.8% vs standard 37% ordinary income)
    const estimated1256TaxSavings = section1256Gains > 0 ? section1256Gains * (0.37 - 0.268) : 0;

    return {
      shortTermGains,
      longTermGains,
      section1256Gains,
      sec1256LongTerm,
      sec1256ShortTerm,
      totalEffectiveLongTerm,
      totalEffectiveShortTerm,
      estimated1256TaxSavings,
      totalFees,
    };
  }, [closedTrades]);

  // 1-Click Tax CSV Export for Accountants
  const handleExportTaxCsv = () => {
    if (closedTrades.length === 0) {
      toast.error('No closed trade records available for tax export');
      return;
    }

    if (jurisdiction === 'INDIA') {
      const filename = `TradeMind_Tax_Audit_Report_India_FY_${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;
      const columns = [
        { header: 'Trade ID', accessor: (t: JournalTrade) => t.id },
        { header: 'Date', accessor: (t: JournalTrade) => new Date(t.openedAt).toLocaleDateString() },
        { header: 'Symbol', accessor: (t: JournalTrade) => t.tradingsymbol },
        { header: 'Segment', accessor: (t: JournalTrade) => t.assetClass },
        { header: 'Income Classification', accessor: (t: JournalTrade) => t.assetClass === 'EQUITY' ? 'Speculative (Sec 43(5))' : 'Non-Speculative Business' },
        { header: 'Quantity', accessor: (t: JournalTrade) => t.totalQuantity },
        { header: 'Buy Value', accessor: (t: JournalTrade) => (t.avgEntryPrice * t.totalQuantity).toFixed(2) },
        { header: 'Sell Value', accessor: (t: JournalTrade) => ((t.avgExitPrice ?? 0) * t.totalQuantity).toFixed(2) },
        { header: 'ICAI Turnover', accessor: (t: JournalTrade) => Math.abs(t.grossPnl ?? 0).toFixed(2) },
        { header: 'Gross Profit / Loss', accessor: (t: JournalTrade) => (t.grossPnl ?? 0).toFixed(2) },
        { header: 'Taxes & Brokerage', accessor: (t: JournalTrade) => (t.totalFeesAndTaxes ?? 0).toFixed(2) },
        { header: 'Net P&L', accessor: (t: JournalTrade) => (t.netPnl ?? 0).toFixed(2) },
      ];
      downloadCsv(filename, closedTrades, columns);
      toast.success('Exported Indian CA Tax Audit statement to CSV');
    } else {
      const filename = `TradeMind_IRS_Form8949_Form6781_Tax_Report_${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;
      const columns = [
        { header: 'Description', accessor: (t: JournalTrade) => `${t.totalQuantity} shs ${t.tradingsymbol}` },
        { header: 'Date Acquired', accessor: (t: JournalTrade) => new Date(t.openedAt).toLocaleDateString() },
        { header: 'Date Sold', accessor: (t: JournalTrade) => t.closedAt ? new Date(t.closedAt).toLocaleDateString() : '' },
        { header: 'Proceeds', accessor: (t: JournalTrade) => ((t.avgExitPrice ?? 0) * t.totalQuantity).toFixed(2) },
        { header: 'Cost Basis', accessor: (t: JournalTrade) => (t.avgEntryPrice * t.totalQuantity).toFixed(2) },
        { header: 'Gain / Loss', accessor: (t: JournalTrade) => (t.netPnl ?? 0).toFixed(2) },
        { header: 'Holding Period', accessor: (t: JournalTrade) => {
          const days = (new Date(t.closedAt || t.openedAt).getTime() - new Date(t.openedAt).getTime()) / (1000 * 60 * 60 * 24);
          return days >= 365 ? 'Long-Term' : 'Short-Term';
        }},
        { header: 'IRS Form', accessor: (t: JournalTrade) => {
          const sym = (t.tradingsymbol || '').toUpperCase();
          const is1256 = sym.includes('SPX') || sym.includes('NDX') || sym.includes('ES') || sym.includes('NQ') || (t.assetClass as string) === 'FNO_FUTURES' || (t.assetClass as string) === 'FUTURES';
          return is1256 ? 'Form 6781 (Sec 1256)' : 'Form 8949 (Cap Asset)';
        }},
        { header: 'IRS Sec 1256 Treatment', accessor: (t: JournalTrade) => {
          const sym = (t.tradingsymbol || '').toUpperCase();
          return sym.includes('SPX') || sym.includes('ES') || (t.assetClass as string) === 'FNO_FUTURES' || (t.assetClass as string) === 'FUTURES' ? 'Yes (60/40)' : 'No';
        }},
      ];
      downloadCsv(filename, closedTrades, columns);
      toast.success('Exported IRS Form 8949 & Form 6781 capital gains statement to CSV');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Jurisdiction Switcher & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-border/80 bg-card/70">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Statutory Regulatory &amp; Tax Engine
            </h3>
            <p className="text-xs text-muted-foreground">
              Select your filing jurisdiction to view ICAI turnover, audit limits, or IRS Form 8949 treatments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Jurisdiction Buttons */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/80 rounded-2xl">
            <button
              onClick={() => setJurisdiction('INDIA')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                jurisdiction === 'INDIA'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              India (IT Act &amp; F&amp;O)
            </button>
            <button
              onClick={() => setJurisdiction('USA')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                jurisdiction === 'USA'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              USA (IRS 8949 &amp; 1256)
            </button>
            <button
              onClick={() => setJurisdiction('GLOBAL')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                jurisdiction === 'GLOBAL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Global Ledger
            </button>
          </div>

          <button
            onClick={handleExportTaxCsv}
            className="px-3.5 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-accent text-xs font-bold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Tax CSV</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────── */}
      {/* 1. INDIA VIEW: ICAI F&O TURNOVER & SECTION 44AD/44AB */}
      {/* ────────────────────────────────────────── */}
      {jurisdiction === 'INDIA' && (
        <div className="space-y-6">
          {/* Section 44AB Tax Audit Threshold Progress Bar */}
          <div className="p-5 rounded-3xl border border-border/80 bg-card/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn('w-5 h-5', indiaMetrics.isAuditMandatoryByTurnover ? 'text-rose-400' : 'text-emerald-400')} />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Section 44AB Tax Audit Limit Monitor (ICAI F&amp;O Formula)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Under Indian Income Tax Act, trading turnover is digital. Mandatory audit limit is ₹10.00 Crore.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-foreground">
                  ₹{(indiaMetrics.totalTurnover / 10000000).toFixed(2)} Cr / ₹10.00 Cr
                </span>
                <span className={cn('block text-[11px] font-bold', indiaMetrics.isAuditMandatoryByTurnover ? 'text-rose-400' : 'text-emerald-400')}>
                  {indiaMetrics.isAuditMandatoryByTurnover ? 'Tax Audit Mandatory' : 'Audit Not Mandatory'}
                </span>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full transition-all duration-500', indiaMetrics.isAuditMandatoryByTurnover ? 'bg-rose-500' : 'bg-primary')}
                style={{ width: `${Math.min(100, indiaMetrics.auditThresholdPct)}%` }}
              />
            </div>

            {indiaMetrics.isBelowPresumptiveRate && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Presumptive Taxation Notice (Sec 44AD):</strong> Declared profit is{' '}
                  {indiaMetrics.presumptiveProfitRate.toFixed(2)}%, which is below the 6% presumptive rate. If your total income exceeds basic exemption limits, an audit under Section 44AB may be required.
                </span>
              </div>
            )}
          </div>

          {/* India Key Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">ICAI F&amp;O Turnover</span>
              <div className="text-xl font-black font-mono text-foreground">
                ₹{indiaMetrics.nonSpeculativeTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Absolute profit + loss</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Non-Speculative F&amp;O P&amp;L</span>
              <div className={cn('text-xl font-black font-mono', indiaMetrics.nonSpeculativePnl >= 0 ? 'text-success' : 'text-destructive')}>
                {indiaMetrics.nonSpeculativePnl >= 0 ? '+' : ''}₹{indiaMetrics.nonSpeculativePnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Business Income</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Speculative Intraday P&amp;L</span>
              <div className={cn('text-xl font-black font-mono', indiaMetrics.speculativePnl >= 0 ? 'text-success' : 'text-destructive')}>
                {indiaMetrics.speculativePnl >= 0 ? '+' : ''}₹{indiaMetrics.speculativePnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Sec 43(5) Equities</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Statutory Charges Drag</span>
              <div className="text-xl font-black font-mono text-amber-500">
                ₹{indiaMetrics.totalFees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-muted-foreground">STT, GST &amp; Stamp Duty</span>
            </div>
          </div>

          {/* Statutory Charges Breakdown & Business Expense Deductions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Taxes Breakdown */}
            <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Receipt className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Statutory Regulatory Deductions (Estimated)
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Securities Transaction Tax (STT)</span>
                  <span className="font-mono font-bold text-foreground">₹{indiaMetrics.estimatedSTT.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">GST (18% on Brokerage &amp; Turnover)</span>
                  <span className="font-mono font-bold text-foreground">₹{indiaMetrics.estimatedGST.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">NSE / BSE Exchange Turnover Charges</span>
                  <span className="font-mono font-bold text-foreground">₹{indiaMetrics.estimatedExchangeCharges.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">State Stamp Duty</span>
                  <span className="font-mono font-bold text-foreground">₹{indiaMetrics.estimatedStampDuty.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">SEBI Regulatory Turnover Fee</span>
                  <span className="font-mono font-bold text-foreground">₹{indiaMetrics.estimatedSEBI.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-foreground">Total Regulatory Deductions</span>
                  <span className="font-mono font-black text-amber-500">₹{indiaMetrics.totalFees.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Business Expense Deductions Form */}
            <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Allowable F&amp;O Business Expense Deductions
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center justify-between">
                    <span>Software &amp; Trading Platform Fees (TradeMind)</span>
                    <span className="font-mono font-bold text-foreground">₹{softwareExpenseDeduction}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={softwareExpenseDeduction}
                    onChange={(e) => setSoftwareExpenseDeduction(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center justify-between">
                    <span>Advisory, Internet, Books &amp; Depreciation</span>
                    <span className="font-mono font-bold text-foreground">₹{otherBusinessExpenses}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="1000"
                    value={otherBusinessExpenses}
                    onChange={(e) => setOtherBusinessExpenses(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Net Taxable Business Income</span>
                    <span className="text-[10px] text-muted-foreground">After allowable trading deductions</span>
                  </div>
                  <span className="text-base font-black font-mono text-emerald-400">
                    ₹{indiaMetrics.netTaxableBusinessIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────── */}
      {/* 2. USA VIEW: IRS FORM 8949 & SECTION 1256 60/40 RULE */}
      {/* ────────────────────────────────────────── */}
      {jurisdiction === 'USA' && (
        <div className="space-y-6">
          {/* Section 1256 Advantage Banner */}
          <div className="p-5 rounded-3xl border border-indigo-500/30 bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  IRS Section 1256 60/40 Contract Tax Advantage
                </h4>
                <p className="text-xs text-muted-foreground">
                  Index options (SPX, NDX, RUT) and Futures (ES, NQ) are taxed as 60% Long-Term (max 20%) and 40% Short-Term, regardless of holding period.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground block">Estimated Tax Savings</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                +${usMetrics.estimated1256TaxSavings.toFixed(2)}
              </span>
            </div>
          </div>

          {/* US Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Short-Term Gains (&lt;1Y)</span>
              <div className={cn('text-xl font-black font-mono', usMetrics.shortTermGains >= 0 ? 'text-success' : 'text-destructive')}>
                {usMetrics.shortTermGains >= 0 ? '+' : ''}${usMetrics.shortTermGains.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground">Ordinary income rate</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Long-Term Gains (&gt;1Y)</span>
              <div className={cn('text-xl font-black font-mono', usMetrics.longTermGains >= 0 ? 'text-success' : 'text-destructive')}>
                {usMetrics.longTermGains >= 0 ? '+' : ''}${usMetrics.longTermGains.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground">Preferential rates (0-20%)</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Section 1256 Contracts</span>
              <div className={cn('text-xl font-black font-mono', usMetrics.section1256Gains >= 0 ? 'text-success' : 'text-destructive')}>
                {usMetrics.section1256Gains >= 0 ? '+' : ''}${usMetrics.section1256Gains.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground">60/40 blended rate</span>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Total Commissions &amp; SEC</span>
              <div className="text-xl font-black font-mono text-amber-500">
                ${usMetrics.totalFees.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground">Deductible trading costs</span>
            </div>
          </div>

          {/* Form 8949 & Form 6781 Breakdown */}
          <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              IRS Form 8949 (Equities/ETFs) &amp; Form 6781 (Sec 1256 Contracts) Summary
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 space-y-1.5">
                <span className="font-bold text-foreground block">Effective Net Short-Term Capital Gains</span>
                <span className="text-2xl font-black font-mono text-foreground">
                  ${usMetrics.totalEffectiveShortTerm.toFixed(2)}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Includes pure short-term equity gains plus 40% of Section 1256 index contracts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 space-y-1.5">
                <span className="font-bold text-foreground block">Effective Net Long-Term Capital Gains</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ${usMetrics.totalEffectiveLongTerm.toFixed(2)}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Includes holding periods &gt;1 year plus 60% of Section 1256 contracts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────── */}
      {/* 3. GLOBAL CAPITAL GAINS VIEW */}
      {/* ────────────────────────────────────────── */}
      {jurisdiction === 'GLOBAL' && (
        <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <h4 className="text-sm font-bold text-foreground">
              Standard Capital Gains &amp; Transaction Drag Ledger
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
              <span className="text-xs text-muted-foreground font-semibold block">Total Realized Gain / Loss</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {format(closedTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0))}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
              <span className="text-xs text-muted-foreground font-semibold block">Total Brokerage &amp; Fees</span>
              <span className="text-xl font-bold font-mono text-amber-500">
                {format(closedTrades.reduce((acc, t) => acc + (t.totalFeesAndTaxes ?? 0), 0))}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
              <span className="text-xs text-muted-foreground font-semibold block">Audited Trade Count</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {closedTrades.length} Closed Trades
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

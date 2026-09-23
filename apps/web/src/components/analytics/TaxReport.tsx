// ──────────────────────────────────────────────
// TradeMind — Indian Tax Report
// Section 44AB compliant: FnO + Intraday Turnover
// ITR-3 Ledger export (CSV)
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  IndianRupee,
  Receipt,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TaxReport {
  financialYear: string;
  period: { from: string; to: string };
  fnoTurnover: number;
  intradayTurnover: number;
  deliveryTurnover: number;
  totalTurnover: number;
  grossPnl: number;
  netPnl: number;
  totalCharges: number;
  chargesBreakdown: {
    stt: number;
    exchangeTurnoverFees: number;
    sebiTurnoverFees: number;
    gst: number;
    stampDuty: number;
    brokerage: number;
  };
  tradeCounts: {
    total: number;
    fno: number;
    equityIntraday: number;
    delivery: number;
  };
}

// Available financial years (last 4)
function getAvailableYears(): string[] {
  const now = new Date();
  const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => {
    const start = currentFyStart - i;
    return `${start}-${start + 1}`;
  });
}

export function TaxReport() {
  const years = getAvailableYears();
  const [selectedYear, setSelectedYear] = useState(years[0] ?? 'current');
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTaxReport({ year: selectedYear });
      if (res.success) {
        setReport(res.data as TaxReport);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load tax report');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.exportTaxReportCsv(selectedYear);
      toast.success('Tax report downloaded successfully');
    } catch (err: any) {
      toast.error(err?.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const isAuditRequired = report ? report.fnoTurnover >= 10_00_00_000 || report.intradayTurnover >= 2_00_00_000 : false;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-bold">Indian Tax Report</h2>
            <p className="text-xs text-muted-foreground">
              Section 44AB — ITR-3 Turnover Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FY Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-accent border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label="Select financial year"
          >
            {years.map((y) => (
              <option key={y} value={y}>FY {y}</option>
            ))}
          </select>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Refresh report"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || !report}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
              'hover:from-amber-400 hover:to-orange-400 shadow-sm shadow-orange-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {exporting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-accent/40 animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* Tax Audit Warning */}
          {isAuditRequired && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Tax Audit Required (Sec. 44AB): </span>
                Your turnover exceeds the mandatory audit threshold.
                Please consult a CA.
              </div>
            </div>
          )}

          {/* Period */}
          <div className="text-xs text-muted-foreground">
            FY {report.financialYear} &nbsp;·&nbsp;
            {report.period.from} to {report.period.to}
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'F&O Turnover', value: report.fnoTurnover, icon: BarChart2, color: 'text-blue-500' },
              { label: 'Intraday Turnover', value: report.intradayTurnover, icon: BarChart2, color: 'text-violet-500' },
              { label: 'Total Turnover', value: report.totalTurnover, icon: IndianRupee, color: 'text-orange-500' },
              { label: 'Gross P&L', value: report.grossPnl, icon: FileText, color: report.grossPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Net P&L', value: report.netPnl, icon: FileText, color: report.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Total Charges', value: report.totalCharges, icon: Receipt, color: 'text-muted-foreground' },
            ].map((item) => (
              <div key={item.label} className="bg-accent/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <item.icon className={cn('w-3 h-3', item.color)} />
                  {item.label}
                </div>
                <div className={cn('font-bold text-sm', item.color)}>
                  {formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </div>

          {/* Trade Counts */}
          <div className="grid grid-cols-4 gap-2 text-xs text-center">
            {[
              { label: 'Total Trades', value: report.tradeCounts.total },
              { label: 'F&O Trades', value: report.tradeCounts.fno },
              { label: 'Intraday', value: report.tradeCounts.equityIntraday },
              { label: 'Delivery', value: report.tradeCounts.delivery },
            ].map((c) => (
              <div key={c.label} className="bg-accent/30 rounded-xl p-2">
                <div className="font-bold text-sm">{c.value}</div>
                <div className="text-muted-foreground text-[10px] mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Charges Breakdown Toggle */}
          <div>
            <button
              onClick={() => setShowBreakdown((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Charges Breakdown
              {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showBreakdown && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'STT / CTT', value: report.chargesBreakdown.stt },
                  { label: 'Exchange Fees', value: report.chargesBreakdown.exchangeTurnoverFees },
                  { label: 'SEBI Fees', value: report.chargesBreakdown.sebiTurnoverFees },
                  { label: 'GST (18%)', value: report.chargesBreakdown.gst },
                  { label: 'Stamp Duty', value: report.chargesBreakdown.stampDuty },
                  { label: 'Brokerage', value: report.chargesBreakdown.brokerage },
                ].map((c) => (
                  <div key={c.label} className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-accent/30 rounded-lg">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            Charge estimates are based on standard SEBI/NSE rates. Actual values may differ by broker.
            Always consult a Chartered Accountant for filing ITR-3.
          </p>
        </>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No closed trades found for FY {selectedYear}</p>
          <p className="text-xs mt-1">Connect a broker or import trades to generate your tax report.</p>
        </div>
      )}
    </div>
  );
}

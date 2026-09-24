// ──────────────────────────────────────────────
// TradeMind — CSV Import Modal
//
// Multi-step import flow:
// Step 1: Upload CSV file & drag-drop
// Step 2: Preview detected broker + parsed rows
// Step 3: Confirm import → writes to journal_trades
// ──────────────────────────────────────────────

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Info,
  Table2,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface BrokerConnection {
  id: string;
  brokerId: string;
  label: string;
  status: string;
}

interface ParsedPreview {
  broker: string;
  totalRows: number;
  preview: Record<string, unknown>[];
  totalParsed: number;
  skippedRows: number;
  errors: string[];
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: BrokerConnection[];
  onImportComplete?: (inserted: number) => void;
}

const BROKER_DISPLAY_NAMES: Record<string, string> = {
  zerodha: 'Zerodha Kite',
  upstox: 'Upstox',
  angelone: 'Angel One',
  dhan: 'Dhan',
  fyers: 'Fyers',
  groww: 'Groww',
  binance: 'Binance Spot & Futures',
  bybit: 'Bybit Derivatives',
  ibkr: 'Interactive Brokers (IBKR)',
  metatrader: 'MetaTrader 4/5 (MT4/MT5)',
  universal: 'Universal Trade CSV',
  unknown: 'Universal / Custom CSV',
};

const SAMPLE_FORMAT_DOCS: Record<string, string> = {
  zerodha: 'Console → Reports → Tradebook → Download CSV',
  upstox: 'Reports → Trade History → Export CSV',
  angelone: 'Reports → Order Book → Download CSV',
  dhan: 'Trader Web → Trade Book → Export CSV',
  fyers: 'Account → Reports → Trade Log → Export',
  groww: 'Reports → Trade History → Export',
  binance: 'Orders → Spot/Futures Order → Trade History → Export',
  bybit: 'Orders → Derivatives Order → Trade History → Export',
  ibkr: 'Account Management → Reports → Activity → CSV Export',
  metatrader: 'Terminal → Account History → Right-click → Save as Report (CSV)',
  universal: 'Standard CSV with Symbol, Quantity, Price, Date, and Side (Buy/Sell)',
};

type Step = 'upload' | 'preview' | 'confirm' | 'success';

export function CsvImportModal({ isOpen, onClose, connections, onImportComplete }: CsvImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; broker: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a valid CSV file');
      return;
    }

    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      setCsvContent(text);

      const res = await api.importCsvPreview(text);
      if (res.success && res.data) {
        setPreview(res.data as ParsedPreview);
        setStep('preview');
      } else {
        setError(res.error?.message ?? 'Could not parse the CSV file');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to read file');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleImport = async () => {
    if (!csvContent) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.importCsv(csvContent, selectedConnectionId || undefined);
      if (res.success && res.data) {
        setImportResult({ inserted: res.data.inserted, broker: res.data.broker });
        setStep('success');
        onImportComplete?.(res.data.inserted);
        toast.success(`✅ Imported ${res.data.inserted} trades from ${BROKER_DISPLAY_NAMES[res.data.broker] ?? res.data.broker}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('broker-synced', { detail: { totalImported: res.data.inserted } }));
        }
      } else {
        setError(res.error?.message ?? 'Import failed');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error during import');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setCsvContent('');
    setFileName('');
    setPreview(null);
    setSelectedConnectionId('');
    setError(null);
    setImportResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Trades via CSV</h3>
              <p className="text-xs text-slate-400">
                Auto-detects Zerodha, Upstox, Angel One, Fyers & Groww formats
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-900">
          {(['upload', 'preview', 'confirm'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium transition-colors',
                  step === s
                    ? 'text-indigo-400'
                    : step === 'success' || ['upload', 'preview', 'confirm'].indexOf(step) > i
                    ? 'text-emerald-400'
                    : 'text-slate-500',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                    step === s
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                      : ['upload', 'preview', 'confirm'].indexOf(step) > i || step === 'success'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500',
                  )}
                >
                  {(['upload', 'preview', 'confirm'].indexOf(step) > i || step === 'success') ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="hidden sm:inline capitalize">{s}</span>
              </div>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer',
                  isDragging
                    ? 'border-indigo-400 bg-indigo-950/20 scale-[1.01]'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-900/40',
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                  <Upload className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Zerodha, Upstox, Angel One, Fyers, Groww
                  </p>
                </div>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-xl">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-300">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  How to export your CSV
                </div>
                <ul className="space-y-1">
                  {Object.entries(SAMPLE_FORMAT_DOCS).map(([broker, doc]) => (
                    <li key={broker} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-slate-500 font-mono w-20 shrink-0">{BROKER_DISPLAY_NAMES[broker] ?? broker}</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && preview && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{fileName}</p>
                  <p className="text-xs text-slate-400">
                    Detected: <span className="text-indigo-300 font-semibold">{BROKER_DISPLAY_NAMES[preview.broker] ?? preview.broker}</span>
                    {' '}· {preview.totalRows} rows · {preview.totalParsed} trades parsed
                    {preview.skippedRows > 0 && ` · ${preview.skippedRows} skipped`}
                  </p>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-800/50 bg-amber-950/20 text-xs text-amber-300 space-y-1">
                  <div className="font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Warnings
                  </div>
                  {preview.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-amber-400/80">{e}</p>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Table2 className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-300">
                    Preview (first {Math.min(10, preview.preview.length)} of {preview.totalParsed} trades)
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/80">
                      <tr>
                        {['Symbol', 'Exchange', 'Dir', 'Qty', 'Entry', 'Status', 'Net P&L'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.slice(0, 10).map((row, i) => {
                        const r = row as Record<string, unknown>;
                        const pnl = Number(r['netPnl'] ?? 0);
                        return (
                          <tr key={i} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                            <td className="px-3 py-2 font-mono font-medium text-white">{String(r['tradingsymbol'] ?? '')}</td>
                            <td className="px-3 py-2 text-slate-400">{String(r['exchange'] ?? '')}</td>
                            <td className={cn('px-3 py-2 font-medium', r['direction'] === 'LONG' ? 'text-emerald-400' : 'text-red-400')}>
                              {String(r['direction'] ?? '')}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{String(r['totalQuantity'] ?? '')}</td>
                            <td className="px-3 py-2 font-mono text-slate-300">₹{Number(r['avgEntryPrice'] ?? 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-slate-400">{String(r['status'] ?? '')}</td>
                            <td className={cn('px-3 py-2 font-mono font-semibold', pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Re-upload
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={preview.totalParsed === 0}
                  className="flex-1 py-2 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Proceed to Import ({preview.totalParsed} trades)
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* ── Step: Confirm ── */}
          {step === 'confirm' && preview && (
            <>
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40">
                <p className="text-sm font-semibold text-white mb-1">Ready to Import</p>
                <p className="text-xs text-slate-400">
                  <strong className="text-indigo-300">{preview.totalParsed} trades</strong> from{' '}
                  <strong className="text-indigo-300">{BROKER_DISPLAY_NAMES[preview.broker] ?? preview.broker}</strong> will be added to your journal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Link to Broker Connection
                </label>
                <select
                  value={selectedConnectionId}
                  onChange={(e) => setSelectedConnectionId(e.target.value)}
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">
                    ⚡ Auto-link or create {BROKER_DISPLAY_NAMES[preview.broker] ?? preview.broker} connection
                  </option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || c.brokerId} ({c.status})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Imported trades will be automatically linked to this broker in your analytics.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {loading ? 'Importing…' : `Import ${preview.totalParsed} Trades`}
                </button>
              </div>
            </>
          )}

          {/* ── Step: Success ── */}
          {step === 'success' && importResult && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Import Successful!</p>
                <p className="text-sm text-slate-400 mt-1">
                  <strong className="text-emerald-400">{importResult.inserted} trades</strong> from{' '}
                  <strong className="text-emerald-400">{BROKER_DISPLAY_NAMES[importResult.broker] ?? importResult.broker}</strong>{' '}
                  have been added to your journal.
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Import Another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

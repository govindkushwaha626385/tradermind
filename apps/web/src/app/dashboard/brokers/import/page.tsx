// ──────────────────────────────────────────────
// TradeMind — Multi-Broker CSV Import Wizard
//
// Multi-step workflow:
//   Step 1: Broker & Account Selection
//   Step 2: CSV File Upload & Parsing
//   Step 3: Trade Data Preview & Validation
//   Step 4: Import Confirmation & Journal Ingestion
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers,
  FileCheck,
  Building2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

const BROKER_TEMPLATES = [
  { id: 'zerodha', name: 'Zerodha Kite', hint: 'Kite Web -> Reports -> Tradebook -> CSV export' },
  { id: 'upstox', name: 'Upstox Pro', hint: 'Upstox -> Reports -> Trade History CSV' },
  { id: 'angelone', name: 'Angel One', hint: 'Angel One App/Web -> Order History -> Export CSV' },
  { id: 'groww', name: 'Groww', hint: 'Groww -> Profile -> Reports -> Stock/F&O Trade Book' },
  { id: 'fyers', name: 'Fyers', hint: 'Fyers Web -> My Account -> Trade Log CSV' },
  { id: 'dhan', name: 'Dhan HQ', hint: 'Dhan -> Statements -> Trade Book' },
  { id: 'sahi', name: 'Sahi', hint: 'Sahi -> Account Statements -> Trades CSV' },
  { id: 'lemonn', name: 'Lemonn', hint: 'Lemonn -> Reports -> Trade Log Export' },
];

interface ParsedPreviewRow {
  tradingsymbol: string;
  exchange: string;
  assetClass: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number;
  openedAt: string;
  grossPnl: number;
  netPnl: number;
}

export default function CsvImportWizardPage() {
  const router = useRouter();
  const { format } = useCurrency();

  // Wizard step: 1 = Broker, 2 = Upload, 3 = Preview, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Broker connections state
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState('zerodha');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [loadingBrokers, setLoadingBrokers] = useState(true);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    broker: string;
    totalRows: number;
    preview: ParsedPreviewRow[];
    totalParsed: number;
    skippedRows: number;
    errors: string[];
  } | null>(null);

  // Ingestion state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    totalRows: number;
    skippedRows: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    loadBrokerConnections();
  }, []);

  async function loadBrokerConnections() {
    setLoadingBrokers(true);
    try {
      const res = await api.getBrokers();
      if (res.success && Array.isArray(res.data)) {
        const list = res.data as any[];
        setConnections(list);
        if (list.length > 0) {
          setSelectedConnectionId(list[0].id);
          setSelectedBrokerId(list[0].brokerId ?? 'zerodha');
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingBrokers(false);
    }
  }

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Invalid file type: Please upload a comma-separated CSV file.');
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) ?? '';
      setCsvContent(text);
    };
    reader.readAsText(uploadedFile);
  };

  // Step 2 -> 3: Parse CSV Preview
  const handleAnalyzeCsv = async () => {
    if (!csvContent) {
      toast.error('Please select a CSV file first.');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await api.importCsvPreview(csvContent);
      if (res.success && res.data) {
        setPreviewData(res.data as any);
        setStep(3);
        toast.success(`CSV Analyzed: Found ${res.data.totalParsed} valid trade records.`);
      } else {
        toast.error(res.error?.message ?? 'Could not parse trades from this file.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'An unexpected error occurred while parsing the CSV.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Step 3 -> 4: Commit Ingestion
  const handleExecuteImport = async () => {
    if (!csvContent) return;

    setImporting(true);
    try {
      let connId = selectedConnectionId;

      // If user selected a broker without a connection, create one on the fly
      if (!connId) {
        const createRes = await api.connectBroker({
          brokerId: selectedBrokerId,
          authType: 'api_key',
          apiKey: 'csv_import_session',
          apiSecret: 'csv_import_session',
        });
        if (createRes.success && (createRes.data as any)?.id) {
          connId = (createRes.data as any).id;
          setSelectedConnectionId(connId);
        } else {
          // Attempt using first existing or mock connection
          const existing = connections.find((c) => c.brokerId === selectedBrokerId);
          if (existing) {
            connId = existing.id;
          } else if (connections.length > 0) {
            connId = connections[0].id;
          }
        }
      }

      const res = await api.importCsv(csvContent, connId);
      if (res.success && res.data) {
        setImportResult(res.data as any);
        setStep(4);
        toast.success(`Trades Imported: Ingested ${res.data.inserted} trades into your journal.`);
      } else {
        toast.error(res.error?.message ?? 'Failed to write trades to database.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred during import.');
    } finally {
      setImporting(false);
    }
  };

  // Preview Columns
  const previewColumns: DataTableColumn<ParsedPreviewRow>[] = [
    {
      key: 'tradingsymbol',
      label: 'Symbol',
      render: (r) => (
        <div>
          <div className="font-semibold text-foreground">{r.tradingsymbol}</div>
          <div className="text-[10px] text-muted-foreground">{r.exchange} • {r.assetClass}</div>
        </div>
      ),
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (r) => (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold',
            r.direction === 'LONG'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
          )}
        >
          {r.direction === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {r.direction}
        </span>
      ),
    },
    {
      key: 'totalQuantity',
      label: 'Qty',
      align: 'right',
      render: (r) => <span className="font-mono">{r.totalQuantity}</span>,
    },
    {
      key: 'avgEntryPrice',
      label: 'Entry',
      align: 'right',
      render: (r) => <span className="font-mono">{format(r.avgEntryPrice)}</span>,
    },
    {
      key: 'avgExitPrice',
      label: 'Exit',
      align: 'right',
      render: (r) => <span className="font-mono">{r.avgExitPrice ? format(r.avgExitPrice) : '—'}</span>,
    },
    {
      key: 'netPnl',
      label: 'Net P&L',
      align: 'right',
      render: (r) => {
        const isProfit = r.netPnl >= 0;
        return (
          <span className={cn('font-mono font-bold', isProfit ? 'text-emerald-500' : 'text-rose-500')}>
            {isProfit ? '+' : ''}{format(r.netPnl)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/brokers" className="hover:text-foreground transition-colors">
              Brokers
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">CSV Import Wizard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Broker CSV Import</h1>
          <p className="text-sm text-muted-foreground">
            Import historical trades from any Indian broker or exchange in 4 simple steps.
          </p>
        </div>

        <Link
          href="/dashboard/brokers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input text-xs font-medium hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Brokers
        </Link>
      </div>

      {/* Wizard Step Progress Indicator */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { stepNum: 1, label: 'Broker Select', icon: Building2 },
            { stepNum: 2, label: 'Upload CSV', icon: UploadCloud },
            { stepNum: 3, label: 'Verify Preview', icon: FileCheck },
            { stepNum: 4, label: 'Done', icon: CheckCircle2 },
          ].map((item) => {
            const isDone = step > item.stepNum;
            const isCurrent = step === item.stepNum;
            const Icon = item.icon;

            return (
              <div
                key={item.stepNum}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 p-2.5 rounded-xl transition-all',
                  isCurrent && 'bg-primary/10 border border-primary/20',
                  isDone && 'text-emerald-500',
                  !isCurrent && !isDone && 'text-muted-foreground opacity-60'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    isCurrent && 'bg-primary text-primary-foreground',
                    isDone && 'bg-emerald-500/20 text-emerald-500',
                    !isCurrent && !isDone && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : item.stepNum}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 1: Select Broker & Account ──────────────── */}
      {step === 1 && (
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Step 1: Select Your Broker Template</h2>
            <p className="text-xs text-muted-foreground">
              Choose the broker or platform where your CSV file was exported from. TradeMind will automatically
              map the headers and fee structures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BROKER_TEMPLATES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrokerId(b.id)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between h-28',
                  selectedBrokerId === b.id
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border/60 hover:border-border hover:bg-muted/30'
                )}
              >
                <div>
                  <div className="text-sm font-bold text-foreground">{b.name}</div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{b.hint}</p>
                </div>
                {selectedBrokerId === b.id && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {connections.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Link to Existing Broker Connection (Optional)
              </label>
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brokerName ?? c.brokerId} {c.accountName ? `(${c.accountName})` : ''} — {c.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Continue to Upload
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Upload CSV File ──────────────────────── */}
      {step === 2 && (
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Step 2: Upload CSV File</h2>
              <p className="text-xs text-muted-foreground">
                Drag and drop your trade statement CSV exported from{' '}
                <strong className="text-foreground">
                  {BROKER_TEMPLATES.find((b) => b.id === selectedBrokerId)?.name ?? selectedBrokerId}
                </strong>
                .
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Change Broker
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4',
              dragActive
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/20'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                file ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary/10 text-primary'
              )}
            >
              {file ? <FileText className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
            </div>

            {file ? (
              <div className="space-y-1">
                <div className="text-base font-bold text-foreground">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB • {csvContent.split('\n').filter(Boolean).length} rows detected
                </div>
                <div className="text-xs text-emerald-500 font-semibold pt-1">
                  Ready for TradeMind smart parsing
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Click to browse or drag and drop your CSV file here
                </div>
                <div className="text-xs text-muted-foreground">
                  Supports standard CSV trade books from Zerodha, Upstox, Angel One, Groww, Sahi, Lemonn, etc.
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-input text-xs font-medium hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <button
              onClick={handleAnalyzeCsv}
              disabled={!file || previewLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {previewLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Parsing File...
                </>
              ) : (
                <>
                  Analyze & Preview
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Verify Preview ───────────────────────── */}
      {step === 3 && previewData && (
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  Detected: {previewData.broker}
                </span>
                <span className="text-xs text-muted-foreground">
                  {previewData.totalParsed} Valid Trades Found
                </span>
              </div>
              <h2 className="text-lg font-semibold">Step 3: Verify Parsed Trades</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input text-xs font-medium hover:bg-accent transition-colors"
              >
                Re-upload
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || previewData.totalParsed === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md shadow-primary/20"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm & Ingest {previewData.totalParsed} Trades
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-center">
              <div className="text-xs text-muted-foreground">Total Rows</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{previewData.totalRows}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-xs text-emerald-400">Parsed Trades</div>
              <div className="text-lg font-bold text-emerald-500 mt-0.5">{previewData.totalParsed}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-xs text-amber-400">Skipped Rows</div>
              <div className="text-lg font-bold text-amber-500 mt-0.5">{previewData.skippedRows}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <div className="text-xs text-rose-400">Warnings/Errors</div>
              <div className="text-lg font-bold text-rose-500 mt-0.5">{previewData.errors.length}</div>
            </div>
          </div>

          {/* Error / Warning Alert if any */}
          {previewData.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-amber-500">Notice about skipped lines</div>
                <div className="text-muted-foreground line-clamp-2">
                  {previewData.errors.slice(0, 2).join(' • ')}
                </div>
              </div>
            </div>
          )}

          {/* Data Table Preview */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Previewing first {previewData.preview.length} trades:
            </div>
            <DataTable
              columns={previewColumns}
              data={previewData.preview}
              keyExtractor={(r) => `${r.tradingsymbol}-${r.openedAt}-${r.totalQuantity}`}
            />
          </div>
        </div>
      )}

      {/* ── STEP 4: Ingestion Complete ───────────────────── */}
      {step === 4 && importResult && (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-bold tracking-tight">Import Complete!</h2>
            <p className="text-sm text-muted-foreground">
              Successfully imported{' '}
              <strong className="text-emerald-400 font-bold">{importResult.inserted} trades</strong> into your
              journal with Indian taxes and charges automatically computed.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard/journal"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              Open Trading Journal
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard/trades"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-input text-sm font-semibold hover:bg-accent transition-colors"
            >
              View Executions Log
            </Link>

            <button
              onClick={() => {
                setFile(null);
                setCsvContent('');
                setPreviewData(null);
                setImportResult(null);
                setStep(1);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

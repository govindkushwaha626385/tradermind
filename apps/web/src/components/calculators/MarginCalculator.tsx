// ──────────────────────────────────────────────
// TradeMind — F&O Margin Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  Zap,
  RotateCcw,
  Copy,
  Check,
  Shield,
  Layers,
  Info,
  Scale,
  DollarSign,
} from 'lucide-react';
import { calculateMargin } from './engine/financialMath';
import { INSTRUMENT_PRESETS, getCalculatorCurrencySymbol, type Currency } from './types';

interface MarginCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function MarginCalculator({ currency, onCopySummary }: MarginCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const presetId = useId();
  const cmpId = useId();
  const lotsId = useId();
  const lotSizeId = useId();
  const spanPctId = useId();
  const exposurePctId = useId();

  const [selectedPreset, setSelectedPreset] = useState<string>('NIFTY_50');
  const [cmp, setCmp] = useState<number>(INSTRUMENT_PRESETS.NIFTY_50.defaultPrice);
  const [lots, setLots] = useState<number>(1);
  const [lotSize, setLotSize] = useState<number>(INSTRUMENT_PRESETS.NIFTY_50.lotSize);
  const [spanMarginPct, setSpanMarginPct] = useState<number>(INSTRUMENT_PRESETS.NIFTY_50.spanMarginPct || 9.0);
  const [exposureMarginPct, setExposureMarginPct] = useState<number>(INSTRUMENT_PRESETS.NIFTY_50.exposureMarginPct || 3.0);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    const p = INSTRUMENT_PRESETS[key];
    if (p) {
      setCmp(p.defaultPrice);
      setLotSize(p.lotSize);
      setSpanMarginPct(p.spanMarginPct ?? 10);
      setExposureMarginPct(p.exposureMarginPct ?? 3.5);
    }
  };

  const result = useMemo(() => {
    return calculateMargin({
      cmp,
      lots,
      lotSize,
      spanMarginPct,
      exposureMarginPct,
    });
  }, [cmp, lots, lotSize, spanMarginPct, exposureMarginPct]);

  const handleCopy = () => {
    const summary = `⚡ TradeMind F&O Margin Analysis:
• Contract: ${INSTRUMENT_PRESETS[selectedPreset]?.name || 'Custom'} (${lots} Lot${lots > 1 ? 's' : ''} = ${result.totalQuantity} Units)
• CMP: ${sym}${cmp.toLocaleString()}
• Total Notional Value: ${sym}${result.notionalValue.toLocaleString()}
• SPAN Margin: ${sym}${result.spanMargin.toLocaleString()} (${spanMarginPct}%)
• Exposure Margin: ${sym}${result.exposureMargin.toLocaleString()} (${exposureMarginPct}%)
• Total Margin Required: ${sym}${result.totalMarginRequired.toLocaleString()} (${(spanMarginPct + exposureMarginPct).toFixed(1)}%)
• Effective Leverage: ${result.effectiveLeverage}x`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    handleSelectPreset('NIFTY_50');
    setLots(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Contract & Margin Parameters
            </h3>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={presetId} className="text-xs font-medium text-muted-foreground block mb-1">
                Instrument Preset
              </label>
              <select
                id={presetId}
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(INSTRUMENT_PRESETS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.name} (Lot: {item.lotSize})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={cmpId} className="text-xs font-medium text-muted-foreground block mb-1">
                  CMP / Price ({sym})
                </label>
                <input
                  id={cmpId}
                  type="number"
                  min="0.1"
                  step="any"
                  value={cmp}
                  onChange={(e) => setCmp(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor={lotsId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Number of Lots
                </label>
                <input
                  id={lotsId}
                  type="number"
                  min="1"
                  step="1"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, Math.floor(Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor={lotSizeId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Lot Size
                </label>
                <input
                  id={lotSizeId}
                  type="number"
                  min="1"
                  value={lotSize}
                  onChange={(e) => setLotSize(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor={spanPctId} className="text-xs font-medium text-muted-foreground block mb-1">
                  SPAN %
                </label>
                <input
                  id={spanPctId}
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={spanMarginPct}
                  onChange={(e) => setSpanMarginPct(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor={exposurePctId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Exposure %
                </label>
                <input
                  id={exposurePctId}
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={exposureMarginPct}
                  onChange={(e) => setExposureMarginPct(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Margin Note
              </div>
              <p>
                Exchange SPAN margin is standardized by clearing corporations (NCL/ICCL) updated 6 times per trading day. Exposure margin is added as an exchange safety buffer.
              </p>
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Shield className="w-3.5 h-3.5" />
                Total Required Margin
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {sym}{result.totalMarginRequired.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {(spanMarginPct + exposureMarginPct).toFixed(1)}% of notional value
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Notional Contract Value
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {sym}{result.notionalValue.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {result.totalQuantity} total units
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-blue-500" />
                Effective Leverage
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {result.effectiveLeverage}x
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Buying power multiplier
              </div>
            </div>
          </div>

          {/* Detailed Margin Breakdown Table */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Component Breakdown</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Breakdown'}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">SPAN Margin ({spanMarginPct}%)</span>
                <span className="font-semibold">{sym}{result.spanMargin.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Exposure Margin ({exposureMarginPct}%)</span>
                <span className="font-semibold">{sym}{result.exposureMargin.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 font-medium">
                <span className="text-foreground">Total Cash Margin Required</span>
                <span className="text-amber-500 font-bold">{sym}{result.totalMarginRequired.toLocaleString()}</span>
              </div>
            </div>

            {/* Visual Margin Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Margin Allocation</span>
                <span>SPAN {((result.spanMargin / Math.max(1, result.totalMarginRequired)) * 100).toFixed(0)}% | Exposure {((result.exposureMargin / Math.max(1, result.totalMarginRequired)) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-muted flex">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(result.spanMargin / Math.max(1, result.totalMarginRequired)) * 100}%` }}
                />
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(result.exposureMargin / Math.max(1, result.totalMarginRequired)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Adverse Move Impact Table */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Adverse Price Move Capital Impact
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((pct) => {
                const loss = (result.notionalValue * pct) / 100;
                const marginErosion = ((loss / Math.max(1, result.totalMarginRequired)) * 100).toFixed(1);
                return (
                  <div key={pct} className="p-2.5 rounded-lg border border-border/70 bg-background/50 text-center">
                    <span className="text-[11px] text-rose-500 font-semibold block">-{pct}% Move</span>
                    <span className="text-sm font-bold text-foreground block mt-0.5">-{sym}{Math.round(loss).toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">{marginErosion}% Margin Erosion</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

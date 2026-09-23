// ──────────────────────────────────────────────
// TradeMind — Pivot Points Calculator (5 Methodologies)
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Compass,
  RotateCcw,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { calculateAllPivots, type PivotSystemResult } from './engine/pivotMath';
import type { Currency } from './types';

interface PivotPointsCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function PivotPointsCalculator({ currency, onCopySummary }: PivotPointsCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const highId = useId();
  const lowId = useId();
  const closeId = useId();
  const openId = useId();

  const [high, setHigh] = useState<number>(currency === 'INR' ? 25550 : 555);
  const [low, setLow] = useState<number>(currency === 'INR' ? 25300 : 545);
  const [close, setClose] = useState<number>(currency === 'INR' ? 25480 : 552);
  const [open, setOpen] = useState<number>(currency === 'INR' ? 25320 : 547);
  const [selectedSystem, setSelectedSystem] = useState<string>('camarilla');
  const [copied, setCopied] = useState<boolean>(false);

  const results = calculateAllPivots({ high, low, close, open });
  const activeSystem = results[selectedSystem] ?? results.classic;

  const handleCopy = () => {
    if (!activeSystem) return;
    const resList = activeSystem.resistances.map((r) => `${r.label}: ${sym}${r.price}`).join(' | ');
    const supList = activeSystem.supports.map((s) => `${s.label}: ${sym}${s.price}`).join(' | ');

    const summary = `🧭 TradeMind Pivot Levels (${activeSystem.name}):
• Pivot (PP): ${sym}${activeSystem.pivot}
• Resistances: ${resList}
• Supports: ${supList}
• Prev Bar: H ${sym}${high} | L ${sym}${low} | C ${sym}${close}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setHigh(currency === 'INR' ? 25550 : 555);
    setLow(currency === 'INR' ? 25300 : 545);
    setClose(currency === 'INR' ? 25480 : 552);
    setOpen(currency === 'INR' ? 25320 : 547);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" />
              Previous Session Data
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={highId} className="text-xs font-medium text-muted-foreground block mb-1">
                High ({sym})
              </label>
              <input
                id={highId}
                type="number"
                step="any"
                value={high}
                onChange={(e) => setHigh(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={lowId} className="text-xs font-medium text-muted-foreground block mb-1">
                Low ({sym})
              </label>
              <input
                id={lowId}
                type="number"
                step="any"
                value={low}
                onChange={(e) => setLow(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={closeId} className="text-xs font-medium text-muted-foreground block mb-1">
                Close ({sym})
              </label>
              <input
                id={closeId}
                type="number"
                step="any"
                value={close}
                onChange={(e) => setClose(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={openId} className="text-xs font-medium text-muted-foreground block mb-1">
                Open ({sym})
              </label>
              <input
                id={openId}
                type="number"
                step="any"
                value={open}
                onChange={(e) => setOpen(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>
          </div>

          {/* System Switcher */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1">Methodology</span>
            <div className="space-y-1.5">
              {[
                { id: 'camarilla', label: 'Camarilla (Best for Scalping)' },
                { id: 'classic', label: 'Classic Floor Trader' },
                { id: 'fibonacci', label: 'Fibonacci Pivots' },
                { id: 'woodie', label: 'Woodie Pivots' },
                { id: 'demark', label: 'Tom DeMark Pivots' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedSystem(m.id)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    selectedSystem === m.id
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h4 className="font-bold text-sm text-foreground">{activeSystem?.name}</h4>
                <p className="text-[11px] text-muted-foreground">{activeSystem?.description}</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Pivot Ladder */}
            <div className="space-y-2">
              {/* Resistances (descending) */}
              {activeSystem?.resistances.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-bold text-rose-500">{r.label}</span>
                    {r.description && <span className="text-[10px] text-muted-foreground">({r.description})</span>}
                  </div>
                  <span className="font-mono font-bold text-foreground">{sym}{r.price.toFixed(2)}</span>
                </div>
              ))}

              {/* Central Pivot */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs my-2">
                <span className="font-extrabold text-blue-500 tracking-wider">PIVOT POINT (PP)</span>
                <span className="font-mono font-extrabold text-base text-foreground">{sym}{activeSystem?.pivot.toFixed(2)}</span>
              </div>

              {/* Supports (descending) */}
              {activeSystem?.supports.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-emerald-500">{s.label}</span>
                    {s.description && <span className="text-[10px] text-muted-foreground">({s.description})</span>}
                  </div>
                  <span className="font-mono font-bold text-foreground">{sym}{s.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

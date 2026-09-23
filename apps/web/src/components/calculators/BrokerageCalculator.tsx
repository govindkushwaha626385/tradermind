// ──────────────────────────────────────────────
// TradeMind — Brokerage & Regulatory Charges Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Receipt,
  Copy,
  Check,
  RotateCcw,
  Percent,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { calculateBrokerage, type MarketSegment } from './engine/brokerageMath';
import type { Currency } from './types';

interface BrokerageCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function BrokerageCalculator({ currency, onCopySummary }: BrokerageCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const buyPriceId = useId();
  const sellPriceId = useId();
  const quantityId = useId();

  const [segment, setSegment] = useState<MarketSegment>('EQUITY_INTRADAY');
  const [buyPrice, setBuyPrice] = useState<number>(currency === 'INR' ? 1000 : 150);
  const [sellPrice, setSellPrice] = useState<number>(currency === 'INR' ? 1025 : 154);
  const [quantity, setQuantity] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);

  const isGlobal = currency === 'USD';

  const breakdown = calculateBrokerage({
    segment,
    buyPrice,
    sellPrice,
    quantity,
    flatBrokeragePerOrder: isGlobal ? 1.0 : 20,
    percentBrokerage: 0.03,
    isGlobalMode: isGlobal,
  });

  const handleCopy = () => {
    const summary = `🧾 TradeMind Brokerage & Tax Breakdown:
• Segment: ${segment} | Qty: ${quantity}
• Buy: ${sym}${buyPrice} | Sell: ${sym}${sellPrice}
• Gross P&L: ${breakdown.grossPnl >= 0 ? `+${sym}${breakdown.grossPnl}` : `-${sym}${Math.abs(breakdown.grossPnl)}`}
• Total Charges & Taxes: ${sym}${breakdown.totalCharges} (Brokerage: ${sym}${breakdown.brokerage}, STT: ${sym}${breakdown.sttCtt}, GST: ${sym}${breakdown.gst}, Exchange/SEBI/Stamp: ${sym}${(breakdown.exchangeCharges + breakdown.sebiCharges + breakdown.stampDuty).toFixed(2)})
• Net Realized P&L: ${breakdown.netPnl >= 0 ? `+${sym}${breakdown.netPnl}` : `-${sym}${Math.abs(breakdown.netPnl)}`}
• Break-Even Move Required: ${breakdown.pointsToBreakeven} pts/unit`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setSegment('EQUITY_INTRADAY');
    setBuyPrice(currency === 'INR' ? 1000 : 150);
    setSellPrice(currency === 'INR' ? 1025 : 154);
    setQuantity(100);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Trade Order Details
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

          {/* Segment Selector (for Indian Markets) */}
          {!isGlobal && (
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1">Market Segment</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'EQUITY_INTRADAY', label: 'Intraday Equity' },
                  { id: 'EQUITY_DELIVERY', label: 'Delivery (CNC)' },
                  { id: 'FUTURES', label: 'Futures (F&O)' },
                  { id: 'OPTIONS', label: 'Options (F&O)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSegment(s.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                      segment === s.id
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prices & Quantity */}
          <div className="space-y-3">
            <div>
              <label htmlFor={buyPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Buy Price ({sym})
              </label>
              <input
                id={buyPriceId}
                type="number"
                step="any"
                value={buyPrice}
                onChange={(e) => setBuyPrice(Math.max(0.01, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={sellPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Sell Price ({sym})
              </label>
              <input
                id={sellPriceId}
                type="number"
                step="any"
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(0.01, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={quantityId} className="text-xs font-medium text-muted-foreground block mb-1">
                Quantity (Units / Shares)
              </label>
              <input
                id={quantityId}
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>
          </div>

          {/* Break-even Tip */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Points to Break-Even:</span>
            <span className="font-bold text-foreground font-mono">
              {breakdown.pointsToBreakeven} pts / unit
            </span>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Net Realized PnL Hero */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-600/10 via-card to-violet-600/10 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Net Realized P&L
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Breakdown'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-extrabold tracking-tight ${
                breakdown.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {breakdown.netPnl >= 0 ? `+${sym}${breakdown.netPnl.toLocaleString()}` : `-${sym}${Math.abs(breakdown.netPnl).toLocaleString()}`}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                ROI: {breakdown.roiPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-card/70 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Gross P&L</span>
                <span className={`text-base font-bold ${breakdown.grossPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {breakdown.grossPnl >= 0 ? `+${sym}${breakdown.grossPnl.toLocaleString()}` : `-${sym}${Math.abs(breakdown.grossPnl).toLocaleString()}`}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/70 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Taxes & Charges</span>
                <span className="text-base font-bold text-rose-500">
                  -{sym}{breakdown.totalCharges.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Charges Ledger */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Itemized Fee Breakdown</span>
              <span className="font-mono text-foreground font-bold">Turnover: {sym}{Math.round(breakdown.turnover).toLocaleString()}</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Brokerage (Buy + Sell)</span>
                <span className="font-mono font-semibold text-foreground">{sym}{breakdown.brokerage.toFixed(2)}</span>
              </div>

              {!isGlobal && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">STT / CTT</span>
                    <span className="font-mono font-semibold text-foreground">{sym}{breakdown.sttCtt.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Exchange Txn Charges (NSE/BSE)</span>
                    <span className="font-mono font-semibold text-foreground">{sym}{breakdown.exchangeCharges.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">GST (18% on fees)</span>
                    <span className="font-mono font-semibold text-foreground">{sym}{breakdown.gst.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">SEBI Turnover Fee (₹10 / Cr)</span>
                    <span className="font-mono font-semibold text-foreground">{sym}{breakdown.sebiCharges.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Stamp Duty</span>
                    <span className="font-mono font-semibold text-foreground">{sym}{breakdown.stampDuty.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Options Strategy Payoff Calculator & Visual Diagram
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  LineChart,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import type { Currency } from './types';

export interface OptionLeg {
  id: string;
  action: 'BUY' | 'SELL';
  type: 'CALL' | 'PUT';
  strike: number;
  premium: number;
  quantity: number;
}

interface OptionsStrategyPayoffProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function OptionsStrategyPayoff({ currency, onCopySummary }: OptionsStrategyPayoffProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const spotPriceId = useId();

  const [spotPrice, setSpotPrice] = useState<number>(currency === 'INR' ? 25000 : 500);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('BULL_CALL_SPREAD');

  // Legs state
  const [legs, setLegs] = useState<OptionLeg[]>([
    { id: '1', action: 'BUY', type: 'CALL', strike: currency === 'INR' ? 25000 : 500, premium: currency === 'INR' ? 180 : 12, quantity: 1 },
    { id: '2', action: 'SELL', type: 'CALL', strike: currency === 'INR' ? 25200 : 510, premium: currency === 'INR' ? 80 : 5, quantity: 1 },
  ]);

  // Strategy Presets
  const applyStrategyPreset = (strategy: string) => {
    setSelectedStrategy(strategy);
    const S = spotPrice;
    const step = currency === 'INR' ? 100 : 5;

    if (strategy === 'LONG_CALL') {
      setLegs([{ id: '1', action: 'BUY', type: 'CALL', strike: S, premium: currency === 'INR' ? 150 : 10, quantity: 1 }]);
    } else if (strategy === 'LONG_PUT') {
      setLegs([{ id: '1', action: 'BUY', type: 'PUT', strike: S, premium: currency === 'INR' ? 140 : 9, quantity: 1 }]);
    } else if (strategy === 'BULL_CALL_SPREAD') {
      setLegs([
        { id: '1', action: 'BUY', type: 'CALL', strike: S, premium: currency === 'INR' ? 180 : 12, quantity: 1 },
        { id: '2', action: 'SELL', type: 'CALL', strike: S + step * 2, premium: currency === 'INR' ? 80 : 5, quantity: 1 },
      ]);
    } else if (strategy === 'BEAR_PUT_SPREAD') {
      setLegs([
        { id: '1', action: 'BUY', type: 'PUT', strike: S, premium: currency === 'INR' ? 170 : 11, quantity: 1 },
        { id: '2', action: 'SELL', type: 'PUT', strike: S - step * 2, premium: currency === 'INR' ? 70 : 4, quantity: 1 },
      ]);
    } else if (strategy === 'STRADDLE') {
      setLegs([
        { id: '1', action: 'BUY', type: 'CALL', strike: S, premium: currency === 'INR' ? 150 : 10, quantity: 1 },
        { id: '2', action: 'BUY', type: 'PUT', strike: S, premium: currency === 'INR' ? 140 : 9, quantity: 1 },
      ]);
    } else if (strategy === 'IRON_CONDOR') {
      setLegs([
        { id: '1', action: 'BUY', type: 'PUT', strike: S - step * 4, premium: currency === 'INR' ? 20 : 1.5, quantity: 1 },
        { id: '2', action: 'SELL', type: 'PUT', strike: S - step * 2, premium: currency === 'INR' ? 60 : 4, quantity: 1 },
        { id: '3', action: 'SELL', type: 'CALL', strike: S + step * 2, premium: currency === 'INR' ? 65 : 4.5, quantity: 1 },
        { id: '4', action: 'BUY', type: 'CALL', strike: S + step * 4, premium: currency === 'INR' ? 25 : 2, quantity: 1 },
      ]);
    }
  };

  const handleAddLeg = () => {
    const newLeg: OptionLeg = {
      id: String(Date.now()),
      action: 'BUY',
      type: 'CALL',
      strike: spotPrice,
      premium: currency === 'INR' ? 50 : 3,
      quantity: 1,
    };
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    if (legs.length > 1) {
      setLegs(legs.filter((l) => l.id !== id));
    }
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    setLegs(legs.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Payoff calculations
  const { chartPoints, maxProfit, maxLoss, netPremium, breakevens, minPrice, maxPrice } = useMemo(() => {
    if (legs.length === 0) {
      return { chartPoints: [], maxProfit: 0, maxLoss: 0, netPremium: 0, breakevens: [], minPrice: 0, maxPrice: 0 };
    }

    const strikes = legs.map((l) => l.strike);
    const lowestStrike = Math.min(...strikes, spotPrice);
    const highestStrike = Math.max(...strikes, spotPrice);
    const spread = Math.max(highestStrike - lowestStrike, spotPrice * 0.08);

    const minP = Math.max(1, Math.round(lowestStrike - spread * 1.2));
    const maxP = Math.round(highestStrike + spread * 1.2);
    const steps = 80;
    const stepSize = (maxP - minP) / steps;

    // Calculate Net Premium (positive = debit paid, negative = credit received)
    let totalDebit = 0;
    legs.forEach((l) => {
      const cost = l.premium * l.quantity;
      if (l.action === 'BUY') {
        totalDebit += cost;
      } else {
        totalDebit -= cost;
      }
    });

    const points: Array<{ price: number; pnl: number }> = [];
    let pnlValues: number[] = [];

    for (let p = minP; p <= maxP; p += stepSize) {
      let expiryPnl = 0;
      legs.forEach((l) => {
        let intrinsic = 0;
        if (l.type === 'CALL') {
          intrinsic = Math.max(0, p - l.strike);
        } else {
          intrinsic = Math.max(0, l.strike - p);
        }

        if (l.action === 'BUY') {
          expiryPnl += (intrinsic - l.premium) * l.quantity;
        } else {
          expiryPnl += (l.premium - intrinsic) * l.quantity;
        }
      });

      points.push({ price: Math.round(p), pnl: Math.round(expiryPnl * 100) / 100 });
      pnlValues.push(expiryPnl);
    }

    const maxProf = Math.max(...pnlValues);
    const maxLs = Math.min(...pnlValues);

    // Calculate Breakeven crossings
    const bes: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev && curr && ((prev.pnl <= 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl <= 0))) {
        // Linear interpolation
        const fraction = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl) || 1);
        const bePrice = prev.price + fraction * (curr.price - prev.price);
        bes.push(Math.round(bePrice * 10) / 10);
      }
    }

    return {
      chartPoints: points,
      maxProfit: maxProf,
      maxLoss: maxLs,
      netPremium: Math.round(totalDebit * 100) / 100,
      breakevens: Array.from(new Set(bes)),
      minPrice: minP,
      maxPrice: maxP,
    };
  }, [legs, spotPrice]);

  // SVG dimensions for Payoff diagram
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const yMax = Math.max(Math.abs(maxProfit), Math.abs(maxLoss), 10) * 1.15;
  const yMin = -yMax;

  const getX = (price: number) => {
    return padding.left + ((price - minPrice) / (maxPrice - minPrice || 1)) * plotWidth;
  };

  const getY = (pnl: number) => {
    return padding.top + ((yMax - pnl) / (yMax - yMin || 1)) * plotHeight;
  };

  const zeroY = getY(0);
  const spotX = getX(spotPrice);

  const polylinePoints = chartPoints
    .map((pt) => `${getX(pt.price)},${getY(pt.pnl)}`)
    .join(' ');

  const handleCopy = () => {
    const summary = `📊 TradeMind Options Strategy Payoff:
• Strategy: ${selectedStrategy}
• Net Premium: ${netPremium >= 0 ? `Debit: ${sym}${netPremium}` : `Credit: ${sym}${Math.abs(netPremium)}`}
• Max Profit: ${maxProfit > 100000 ? 'Unlimited' : `${sym}${maxProfit}`}
• Max Loss: ${maxLoss < -100000 ? 'Unlimited' : `${sym}${Math.abs(maxLoss)}`}
• Breakeven(s): ${breakevens.map((b) => `${sym}${b}`).join(', ') || 'N/A'}
• Current Spot: ${sym}${spotPrice}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  return (
    <div className="space-y-6">
      {/* ── Preset Strategy Buttons ── */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
          Strategy Templates
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'BULL_CALL_SPREAD', name: 'Bull Call Spread' },
            { id: 'BEAR_PUT_SPREAD', name: 'Bear Put Spread' },
            { id: 'LONG_CALL', name: 'Long Call' },
            { id: 'LONG_PUT', name: 'Long Put' },
            { id: 'STRADDLE', name: 'Long Straddle' },
            { id: 'IRON_CONDOR', name: 'Iron Condor' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => applyStrategyPreset(s.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                selectedStrategy === s.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Strategy Legs Editor ── */}
        <div className="lg:col-span-6 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              Strategy Legs ({legs.length})
            </h3>
            <button
              type="button"
              onClick={handleAddLeg}
              className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 flex items-center gap-1 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Leg
            </button>
          </div>

          {/* Spot Price Input */}
          <div className="flex items-center gap-3">
            <label htmlFor={spotPriceId} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Underlying Spot Price ({sym}):
            </label>
            <input
              id={spotPriceId}
              type="number"
              step="any"
              value={spotPrice}
              onChange={(e) => setSpotPrice(Math.max(1, Number(e.target.value)))}
              className="px-3 py-1.5 text-sm rounded-lg bg-background border border-input w-36"
            />
          </div>

          {/* Legs list */}
          <div className="space-y-3">
            {legs.map((leg, idx) => (
              <div
                key={leg.id}
                className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Leg #{idx + 1}</span>
                  {legs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLeg(leg.id)}
                      className="text-muted-foreground hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Action */}
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Action</span>
                    <select
                      value={leg.action}
                      onChange={(e) => handleUpdateLeg(leg.id, { action: e.target.value as any })}
                      className="w-full px-2 py-1.5 rounded bg-background border border-input"
                    >
                      <option value="BUY">BUY (+)</option>
                      <option value="SELL">SELL (-)</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Type</span>
                    <select
                      value={leg.type}
                      onChange={(e) => handleUpdateLeg(leg.id, { type: e.target.value as any })}
                      className="w-full px-2 py-1.5 rounded bg-background border border-input"
                    >
                      <option value="CALL">CALL (CE)</option>
                      <option value="PUT">PUT (PE)</option>
                    </select>
                  </div>

                  {/* Strike */}
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Strike ({sym})</span>
                    <input
                      type="number"
                      step="any"
                      value={leg.strike}
                      onChange={(e) => handleUpdateLeg(leg.id, { strike: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded bg-background border border-input"
                    />
                  </div>

                  {/* Premium */}
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Premium ({sym})</span>
                    <input
                      type="number"
                      step="any"
                      value={leg.premium}
                      onChange={(e) => handleUpdateLeg(leg.id, { premium: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 rounded bg-background border border-input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Interactive Payoff Chart & Results ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Net Premium
              </span>
              <span className={`text-sm font-bold ${netPremium > 0 ? 'text-amber-500' : 'text-blue-500'}`}>
                {netPremium > 0 ? `Debit: ${sym}${netPremium}` : `Credit: ${sym}${Math.abs(netPremium)}`}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Max Profit
              </span>
              <span className="text-sm font-bold text-emerald-500">
                {maxProfit > 90000 ? 'Unlimited' : `+${sym}${maxProfit}`}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Max Loss
              </span>
              <span className="text-sm font-bold text-rose-500">
                {maxLoss < -90000 ? 'Unlimited Risk' : `-${sym}${Math.abs(maxLoss)}`}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Breakeven(s)
              </span>
              <span className="text-xs font-bold text-foreground">
                {breakevens.length > 0 ? breakevens.map((b) => `${sym}${b}`).join(', ') : 'None'}
              </span>
            </div>
          </div>

          {/* Interactive SVG Payoff Diagram */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Expiry Payoff Curve
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="w-full overflow-hidden bg-background/50 rounded-lg p-2 border border-border/40">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto text-muted-foreground"
              >
                {/* Zero PnL reference line */}
                <line
                  x1={padding.left}
                  y1={zeroY}
                  x2={svgWidth - padding.right}
                  y2={zeroY}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeDasharray="4,4"
                  strokeWidth="1.5"
                />

                {/* Spot Price marker line */}
                <line
                  x1={spotX}
                  y1={padding.top}
                  x2={spotX}
                  y2={svgHeight - padding.bottom}
                  stroke="#3b82f6"
                  strokeOpacity={0.7}
                  strokeDasharray="3,3"
                  strokeWidth="1.5"
                />
                <text
                  x={spotX}
                  y={padding.top + 10}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#3b82f6"
                  fontWeight="bold"
                >
                  Spot {sym}{spotPrice}
                </text>

                {/* Payoff curve polyline */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={polylinePoints}
                />

                {/* Axis Labels */}
                <text
                  x={padding.left}
                  y={svgHeight - 10}
                  fontSize="10"
                  fill="currentColor"
                >
                  {sym}{minPrice}
                </text>
                <text
                  x={svgWidth - padding.right}
                  y={svgHeight - 10}
                  fontSize="10"
                  textAnchor="end"
                  fill="currentColor"
                >
                  {sym}{maxPrice}
                </text>
                <text
                  x={padding.left - 8}
                  y={zeroY + 3}
                  fontSize="10"
                  textAnchor="end"
                  fill="currentColor"
                >
                  0
                </text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-500 rounded" />
                Profit Zone (Above Zero)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-blue-500 rounded" />
                Current Underlying Spot
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-500 rounded" />
                Loss Zone (Below Zero)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

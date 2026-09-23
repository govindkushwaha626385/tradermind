// ──────────────────────────────────────────────
// TradeMind — Black-Scholes Options Greeks Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Activity,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { calculateBlackScholes, generateSpotSensitivity } from './engine/blackScholes';
import type { Currency } from './types';

interface OptionsGreeksCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function OptionsGreeksCalculator({ currency, onCopySummary }: OptionsGreeksCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const spotPriceId = useId();
  const strikePriceId = useId();
  const dteId = useId();
  const ivId = useId();
  const rateId = useId();

  // Inputs
  const [spotPrice, setSpotPrice] = useState<number>(currency === 'INR' ? 25400 : 550);
  const [strikePrice, setStrikePrice] = useState<number>(currency === 'INR' ? 25500 : 550);
  const [timeToExpiry, setTimeToExpiry] = useState<number>(7); // 7 days (weekly expiry)
  const [iv, setIv] = useState<number>(14.5); // 14.5% IV
  const [riskFreeRate, setRiskFreeRate] = useState<number>(6.5);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CALL' | 'PUT'>('CALL');

  const output = calculateBlackScholes({
    spotPrice,
    strikePrice,
    timeToExpiryDays: timeToExpiry,
    volatilityPercent: iv,
    riskFreeRatePercent: riskFreeRate,
  });

  const sensitivity = generateSpotSensitivity({
    spotPrice,
    strikePrice,
    timeToExpiryDays: timeToExpiry,
    volatilityPercent: iv,
    riskFreeRatePercent: riskFreeRate,
  });

  const currentGreek = activeTab === 'CALL' ? output.call : output.put;

  const handleCopy = () => {
    const summary = `📈 TradeMind Options Greeks (${activeTab} ${sym}${strikePrice}):
• Theoretical Price: ${sym}${currentGreek.price.toFixed(2)} (Intrinsic: ${sym}${currentGreek.intrinsicValue.toFixed(2)} | Extrinsic: ${sym}${currentGreek.extrinsicValue.toFixed(2)})
• Delta (Δ): ${currentGreek.delta.toFixed(3)}
• Gamma (Γ): ${currentGreek.gamma.toFixed(4)}
• Theta (Θ): ${currentGreek.theta.toFixed(2)}/day
• Vega (ν): ${currentGreek.vega.toFixed(2)} per 1% IV
• Rho (ρ): ${currentGreek.rho.toFixed(2)}
• Spot: ${sym}${spotPrice} | DTE: ${timeToExpiry}d | IV: ${iv}%`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setSpotPrice(currency === 'INR' ? 25400 : 550);
    setStrikePrice(currency === 'INR' ? 25500 : 550);
    setTimeToExpiry(7);
    setIv(14.5);
    setRiskFreeRate(6.5);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-500" />
              Contract & Market Parameters
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

          {/* Spot Price */}
          <div>
            <label htmlFor={spotPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
              Underlying Spot Price ({sym})
            </label>
            <input
              id={spotPriceId}
              type="number"
              step="any"
              value={spotPrice}
              onChange={(e) => setSpotPrice(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Strike Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={strikePriceId} className="text-xs font-medium text-muted-foreground">
                Strike Price ({sym})
              </label>
              <button
                type="button"
                onClick={() => setStrikePrice(spotPrice)}
                className="text-[11px] text-primary hover:underline"
              >
                Set ATM Strike
              </button>
            </div>
            <input
              id={strikePriceId}
              type="number"
              step="any"
              value={strikePrice}
              onChange={(e) => setStrikePrice(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Days to Expiry (DTE) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={dteId} className="text-xs font-medium text-muted-foreground">
                Days to Expiration (DTE)
              </label>
              <span className="text-xs font-bold text-foreground">{timeToExpiry} days</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[0.5, 1, 7, 14, 30, 45].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTimeToExpiry(d)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    timeToExpiry === d
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <input
              id={dteId}
              type="range"
              min="0.1"
              max="90"
              step="0.5"
              value={timeToExpiry}
              onChange={(e) => setTimeToExpiry(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Implied Volatility (IV %) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={ivId} className="text-xs font-medium text-muted-foreground">
                Implied Volatility (IV %)
              </label>
              <span className="text-xs font-bold text-foreground">{iv}%</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[10, 15, 20, 30, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setIv(v)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    iv === v
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
            <input
              id={ivId}
              type="range"
              min="1"
              max="150"
              step="0.5"
              value={iv}
              onChange={(e) => setIv(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Risk-Free Rate */}
          <div>
            <label htmlFor={rateId} className="text-xs font-medium text-muted-foreground block mb-1">
              Risk-Free Interest Rate (%)
            </label>
            <input
              id={rateId}
              type="number"
              step="0.1"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>
        </div>

        {/* ── Greeks & Pricing Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Call / Put Toggle Header */}
          <div className="flex items-center justify-between bg-card/60 p-2 rounded-xl border border-border">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('CALL')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'CALL'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                CALL OPTION (CE)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PUT')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'PUT'
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                PUT OPTION (PE)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Greeks'}</span>
            </button>
          </div>

          {/* Theoretical Fair Value Hero */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-violet-600/10 via-card to-blue-600/10 border border-violet-500/20 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-violet-500 block">
                  Theoretical Fair Value
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {sym}{currentGreek.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">per unit</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[11px] text-muted-foreground block">
                  Moneyness:{' '}
                  <strong className="text-foreground">
                    {spotPrice > strikePrice
                      ? activeTab === 'CALL' ? 'ITM' : 'OTM'
                      : spotPrice < strikePrice
                      ? activeTab === 'CALL' ? 'OTM' : 'ITM'
                      : 'ATM'}
                  </strong>
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Intrinsic: <span className="font-semibold text-foreground">{sym}{currentGreek.intrinsicValue.toFixed(2)}</span>
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Extrinsic / Time: <span className="font-semibold text-foreground">{sym}{currentGreek.extrinsicValue.toFixed(2)}</span>
                </span>
              </div>
            </div>

            {/* Greeks Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
              <div className="p-3 rounded-lg bg-card/70 border border-border/50 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Delta (Δ)
                </span>
                <span className={`text-base font-bold ${currentGreek.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentGreek.delta.toFixed(3)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  {(Math.abs(currentGreek.delta) * 100).toFixed(0)}% ITM prob
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/70 border border-border/50 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Gamma (Γ)
                </span>
                <span className="text-base font-bold text-foreground">
                  {currentGreek.gamma.toFixed(4)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  Δ rate of change
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/70 border border-border/50 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Theta (Θ)
                </span>
                <span className="text-base font-bold text-rose-500">
                  {currentGreek.theta.toFixed(2)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  decay / calendar day
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/70 border border-border/50 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Vega (ν)
                </span>
                <span className="text-base font-bold text-blue-500">
                  {currentGreek.vega.toFixed(2)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  per 1% IV shift
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/70 border border-border/50 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Rho (ρ)
                </span>
                <span className="text-base font-bold text-foreground">
                  {currentGreek.rho.toFixed(2)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  per 1% rate shift
                </span>
              </div>
            </div>
          </div>

          {/* Price Sensitivity Table */}
          <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Underlying Spot Price Sensitivity Simulator
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-2 px-2">Spot Move</th>
                    <th className="py-2 px-2">New Spot</th>
                    <th className="py-2 px-2">Simulated Price</th>
                    <th className="py-2 px-2">P&L vs Current</th>
                    <th className="py-2 px-2">Delta (Δ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sensitivity.map((row) => {
                    const simPrice = activeTab === 'CALL' ? row.callPrice : row.putPrice;
                    const simDelta = activeTab === 'CALL' ? row.callDelta : row.putDelta;
                    const diff = simPrice - currentGreek.price;
                    const isZero = row.percentChange === 0;

                    return (
                      <tr
                        key={row.percentChange}
                        className={`hover:bg-muted/40 transition-colors ${
                          isZero ? 'bg-primary/10 font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-2">
                          {row.percentChange > 0 ? `+${row.percentChange}%` : `${row.percentChange}%`}
                        </td>
                        <td className="py-2 px-2 font-mono">
                          {sym}{Math.round(row.spotPrice).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 font-mono font-semibold">
                          {sym}{simPrice.toFixed(2)}
                        </td>
                        <td className={`py-2 px-2 font-mono ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {diff > 0 ? `+${sym}${diff.toFixed(2)}` : diff < 0 ? `-${sym}${Math.abs(diff).toFixed(2)}` : '0.00'}
                        </td>
                        <td className="py-2 px-2 font-mono text-muted-foreground">
                          {simDelta.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

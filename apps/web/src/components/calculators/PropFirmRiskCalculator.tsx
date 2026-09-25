// ──────────────────────────────────────────────
// TradeMind — Institutional Prop Firm Buffer & Sizer
// Calculates contract/lot sizing to strictly prevent violating
// FTMO, Topstep, Apex, FundedNext, and Funding Pips daily & max drawdown rules.
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import {
  Award,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Calculator,
  Flame,
  Gauge,
  Sliders,
} from 'lucide-react';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface PropFirmPreset {
  name: string;
  firm: string;
  accountSize: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  drawdownType: 'STATIC' | 'TRAILING';
  profitTarget: number;
}

const PRESETS: PropFirmPreset[] = [
  {
    name: 'FTMO $100K (Normal)',
    firm: 'FTMO',
    accountSize: 100000,
    dailyLossLimit: 5000,
    maxDrawdown: 10000,
    drawdownType: 'STATIC',
    profitTarget: 10000,
  },
  {
    name: 'FTMO $50K (Normal)',
    firm: 'FTMO',
    accountSize: 50000,
    dailyLossLimit: 2500,
    maxDrawdown: 5000,
    drawdownType: 'STATIC',
    profitTarget: 5000,
  },
  {
    name: 'Topstep $50K Combine',
    firm: 'Topstep',
    accountSize: 50000,
    dailyLossLimit: 1000,
    maxDrawdown: 2000,
    drawdownType: 'TRAILING',
    profitTarget: 3000,
  },
  {
    name: 'Topstep $100K Combine',
    firm: 'Topstep',
    accountSize: 100000,
    dailyLossLimit: 2000,
    maxDrawdown: 3000,
    drawdownType: 'TRAILING',
    profitTarget: 6000,
  },
  {
    name: 'Apex $50K Trailing',
    firm: 'Apex',
    accountSize: 50000,
    dailyLossLimit: 1250,
    maxDrawdown: 2500,
    drawdownType: 'TRAILING',
    profitTarget: 3000,
  },
  {
    name: 'Apex $150K Trailing',
    firm: 'Apex',
    accountSize: 150000,
    dailyLossLimit: 2500,
    maxDrawdown: 5000,
    drawdownType: 'TRAILING',
    profitTarget: 9000,
  },
  {
    name: 'FundedNext $100K Stellar',
    firm: 'FundedNext',
    accountSize: 100000,
    dailyLossLimit: 5000,
    maxDrawdown: 10000,
    drawdownType: 'STATIC',
    profitTarget: 8000,
  },
  {
    name: 'Funding Pips $100K',
    firm: 'Funding Pips',
    accountSize: 100000,
    dailyLossLimit: 5000,
    maxDrawdown: 10000,
    drawdownType: 'STATIC',
    profitTarget: 8000,
  },
];

interface InstrumentMultiplier {
  id: string;
  name: string;
  dollarPerPoint: number;
  unitLabel: string;
}

const INSTRUMENTS: InstrumentMultiplier[] = [
  { id: 'NQ', name: 'NQ (E-mini Nasdaq)', dollarPerPoint: 20, unitLabel: 'contracts' },
  { id: 'MNQ', name: 'MNQ (Micro Nasdaq)', dollarPerPoint: 2, unitLabel: 'contracts' },
  { id: 'ES', name: 'ES (E-mini S&P 500)', dollarPerPoint: 50, unitLabel: 'contracts' },
  { id: 'MES', name: 'MES (Micro S&P 500)', dollarPerPoint: 5, unitLabel: 'contracts' },
  { id: 'FOREX_STD', name: 'Forex (1.0 Std Lot)', dollarPerPoint: 10, unitLabel: 'lots' },
  { id: 'FOREX_MINI', name: 'Forex (0.1 Mini Lot)', dollarPerPoint: 1, unitLabel: 'lots' },
  { id: 'CUSTOM', name: 'Custom ($1 per point/pip)', dollarPerPoint: 1, unitLabel: 'units' },
];

interface PropFirmRiskCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function PropFirmRiskCalculator({ currency, onCopySummary }: PropFirmRiskCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);

  // Form State
  const [selectedPresetName, setSelectedPresetName] = useState<string>(PRESETS[0].name);
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [currentEquity, setCurrentEquity] = useState<number>(100000);
  const [highWaterMark, setHighWaterMark] = useState<number>(100000);
  const [dailyLossLimit, setDailyLossLimit] = useState<number>(5000);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(10000);
  const [drawdownType, setDrawdownType] = useState<'STATIC' | 'TRAILING'>('STATIC');
  const [profitTarget, setProfitTarget] = useState<number>(10000);
  const [todayRealizedLoss, setTodayRealizedLoss] = useState<number>(0);
  const [plannedTradesToday, setPlannedTradesToday] = useState<number>(2);
  const [stopLossPoints, setStopLossPoints] = useState<number>(15);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('NQ');
  const [customPointValue, setCustomPointValue] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  // Load Preset
  const applyPreset = (preset: PropFirmPreset) => {
    setSelectedPresetName(preset.name);
    setAccountSize(preset.accountSize);
    setCurrentEquity(preset.accountSize);
    setHighWaterMark(preset.accountSize);
    setDailyLossLimit(preset.dailyLossLimit);
    setMaxDrawdown(preset.maxDrawdown);
    setDrawdownType(preset.drawdownType);
    setProfitTarget(preset.profitTarget);
    setTodayRealizedLoss(0);
  };

  // Point Value
  const activeInstrument = INSTRUMENTS.find((i) => i.id === selectedInstrument) ?? INSTRUMENTS[0];
  const pointValue = selectedInstrument === 'CUSTOM' ? Math.max(0.01, customPointValue) : activeInstrument.dollarPerPoint;

  // ── Math Calculations ─────────────────────────────────────
  // 1. Daily Loss Remaining
  const remainingDailyBuffer = Math.max(0, dailyLossLimit - todayRealizedLoss);

  // 2. Trailing vs Static Liquidation Threshold
  let liquidationLevel = 0;
  if (drawdownType === 'TRAILING') {
    // Trailing stop moves up with peak balance (capped at initial account size once locked for some firms)
    liquidationLevel = highWaterMark - maxDrawdown;
  } else {
    // Static drawdown relative to initial balance
    liquidationLevel = accountSize - maxDrawdown;
  }

  const remainingTotalCushion = Math.max(0, currentEquity - liquidationLevel);

  // Effective immediate risk capital: you can never exceed the smaller of Daily Buffer or Max Cushion
  const effectiveMaxLossCapital = Math.min(remainingDailyBuffer, remainingTotalCushion);

  // Max Risk per individual trade to survive N planned consecutive losses
  const safeTradesCount = Math.max(1, plannedTradesToday);
  const maxDollarRiskPerTrade = effectiveMaxLossCapital / safeTradesCount;

  // Max Position Size in Contracts/Lots
  const riskPerContract = Math.max(0.1, stopLossPoints * pointValue);
  const recommendedContracts = Math.max(0, Math.floor(maxDollarRiskPerTrade / riskPerContract));

  // Profit Target Progress
  const targetLevel = accountSize + profitTarget;
  const profitRemaining = Math.max(0, targetLevel - currentEquity);
  const profitProgressPct = Math.min(100, Math.max(0, ((currentEquity - accountSize) / profitTarget) * 100));

  // Risk of breach condition
  const cushionPctOfMax = (remainingTotalCushion / maxDrawdown) * 100;
  let cushionStatus: 'SAFE' | 'CAUTION' | 'CRITICAL' = 'SAFE';
  if (cushionPctOfMax < 25) cushionStatus = 'CRITICAL';
  else if (cushionPctOfMax < 55) cushionStatus = 'CAUTION';

  const handleCopy = () => {
    const summary = `🛡️ TradeMind Prop Firm Execution Plan:
• Account Rule: ${selectedPresetName} (${drawdownType})
• Current Equity: ${sym}${currentEquity.toLocaleString()} | Liquidation: ${sym}${liquidationLevel.toLocaleString()}
• Remaining Total Cushion: ${sym}${remainingTotalCushion.toLocaleString()} (${cushionPctOfMax.toFixed(1)}%)
• Today's Remaining Daily Buffer: ${sym}${remainingDailyBuffer.toLocaleString()}
• Max Risk Per Trade (${safeTradesCount} attempts): ${sym}${maxDollarRiskPerTrade.toFixed(2)}
• Selected Instrument: ${activeInstrument.name} (Stop Loss: ${stopLossPoints} pts)
• Max Position Size: ${recommendedContracts} ${activeInstrument.unitLabel}
• Remaining to Pass Evaluation: ${sym}${profitRemaining.toLocaleString()} (${profitProgressPct.toFixed(1)}% complete)`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    applyPreset(PRESETS[0]);
    setStopLossPoints(15);
    setPlannedTradesToday(2);
  };

  return (
    <div className="space-y-6">
      {/* ── Firm Preset Selector Ribbon ── */}
      <div className="bg-card/70 backdrop-blur-sm p-4 rounded-2xl border border-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Quick Institutional Presets
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            FTMO, Topstep, Apex, FundedNext, Funding Pips
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const isSelected = selectedPresetName === p.name;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-bold border-primary shadow-sm'
                    : 'bg-background hover:bg-accent border-border/80 text-foreground'
                }`}
              >
                <div className="font-semibold truncate">{p.name}</div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {p.drawdownType} · {sym}{p.accountSize.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-6 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Evaluation Account Parameters
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

          {/* Account Size & Current Equity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Account Size ({sym})
              </label>
              <input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Current Equity ({sym})
              </label>
              <input
                type="number"
                value={currentEquity}
                onChange={(e) => setCurrentEquity(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* High Water Mark (for Trailing) & Drawdown Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Peak Balance / HWM ({sym})
              </label>
              <input
                type="number"
                value={highWaterMark}
                onChange={(e) => setHighWaterMark(Math.max(accountSize, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Drawdown Logic
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-background border border-border rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setDrawdownType('STATIC')}
                  className={`py-1 rounded-lg font-semibold transition-all ${
                    drawdownType === 'STATIC' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Static
                </button>
                <button
                  type="button"
                  onClick={() => setDrawdownType('TRAILING')}
                  className={`py-1 rounded-lg font-semibold transition-all ${
                    drawdownType === 'TRAILING' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Trailing
                </button>
              </div>
            </div>
          </div>

          {/* Daily Loss Limit & Realized Loss Today */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Max Daily Loss Limit ({sym})
              </label>
              <input
                type="number"
                value={dailyLossLimit}
                onChange={(e) => setDailyLossLimit(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Today's Realized Loss ({sym})
              </label>
              <input
                type="number"
                value={todayRealizedLoss}
                onChange={(e) => setTodayRealizedLoss(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-rose-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Max Total Drawdown & Profit Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Max Drawdown Limit ({sym})
              </label>
              <input
                type="number"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Profit Target Goal ({sym})
              </label>
              <input
                type="number"
                value={profitTarget}
                onChange={(e) => setProfitTarget(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Instrument & Stop Loss */}
          <div className="pt-2 border-t border-border/50 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Trade Execution Sizing
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Instrument / Multiplier
                </label>
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} (${inst.dollarPerPoint}/pt)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Stop Loss Distance (pts / pips)
                </label>
                <input
                  type="number"
                  value={stopLossPoints}
                  onChange={(e) => setStopLossPoints(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {selectedInstrument === 'CUSTOM' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Custom Point / Pip Value in {sym}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customPointValue}
                  onChange={(e) => setCustomPointValue(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Planned Consecutive Attempts Today ({plannedTradesToday} trades)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlannedTradesToday(n)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      plannedTradesToday === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border text-muted-foreground'
                    }`}
                  >
                    {n} Trade{n > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Divides daily remaining buffer so you can withstand {plannedTradesToday} consecutive stops without failing.
              </span>
            </div>
          </div>
        </div>

        {/* ── Outputs & Safety Gauge Column ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              cushionStatus === 'SAFE'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : cushionStatus === 'CAUTION'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            {cushionStatus === 'SAFE' ? (
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            ) : cushionStatus === 'CAUTION' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <Flame className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold">
                {cushionStatus === 'SAFE'
                  ? 'Evaluation Cushion Healthy'
                  : cushionStatus === 'CAUTION'
                  ? 'Caution: Drawdown Approaching 50% Threshold'
                  : 'Critical Tilt Warning: Drawdown Cushion < 25%!'}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {cushionStatus === 'SAFE'
                  ? 'Your risk parameters are well within institutional safety margins. Strictly follow the recommended contracts.'
                  : cushionStatus === 'CAUTION'
                  ? 'Reduce position size by 50% to prevent rapid compounding losses near the daily threshold.'
                  : 'Immediately step down to micros (MNQ/MES) or pause trading for the session to prevent account liquidation.'}
              </p>
            </div>
          </div>

          {/* Primary Recommended Sizing Card */}
          <div className="bg-gradient-to-br from-primary/10 via-card to-card p-6 rounded-2xl border border-primary/30 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  Recommended Max Position Size
                </span>
                <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-2 font-display">
                  <span>{recommendedContracts}</span>
                  <span className="text-sm font-semibold text-primary">{activeInstrument.unitLabel}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  Max Dollar Risk / Trade
                </span>
                <div className="text-lg font-bold font-mono text-foreground">
                  {sym}{maxDollarRiskPerTrade.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Remaining Daily Buffer
                </span>
                <div className="text-base font-bold font-mono text-foreground">
                  {sym}{remainingDailyBuffer.toLocaleString()}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Limit: {sym}{dailyLossLimit.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Total Drawdown Cushion
                </span>
                <div className="text-base font-bold font-mono text-foreground">
                  {sym}{remainingTotalCushion.toLocaleString()}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Floor: {sym}{liquidationLevel.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Risk Per {activeInstrument.unitLabel.slice(0, -1)}
                </span>
                <div className="text-base font-bold font-mono text-foreground">
                  {sym}{riskPerContract.toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {stopLossPoints} pts × {sym}{pointValue}/pt
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Target Remaining
                </span>
                <div className="text-base font-bold font-mono text-emerald-500">
                  {sym}{profitRemaining.toLocaleString()}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {profitProgressPct.toFixed(1)}% to Funded Status
                </span>
              </div>
            </div>

            {/* Copy Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Sizing Summary'}</span>
              </button>

              <Link
                href="/dashboard/prop-firm"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <span>Open Prop Firm Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

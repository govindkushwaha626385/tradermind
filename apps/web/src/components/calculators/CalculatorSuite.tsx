// ──────────────────────────────────────────────
// TradeMind — Master Calculator Suite Container
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo } from 'react';
import {
  Scale,
  Activity,
  LineChart,
  Target,
  Receipt,
  TrendingUp,
  ShieldAlert,
  Compass,
  Layers,
  Sliders,
  Coins,
  DollarSign,
  Search,
  Sparkles,
  Calculator as CalcIcon,
  CheckCircle,
  BarChart2,
  Zap,
  Crosshair,
  Percent,
  Gauge,
  Landmark,
  Globe2,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  CALCULATORS_CATALOG,
  type CalculatorId,
  type CalculatorCategory,
  type Currency,
} from './types';

// Calculator components
import { PositionSizeCalculator } from './PositionSizeCalculator';
import { OptionsGreeksCalculator } from './OptionsGreeksCalculator';
import { OptionsStrategyPayoff } from './OptionsStrategyPayoff';
import { RiskRewardCalculator } from './RiskRewardCalculator';
import { BrokerageCalculator } from './BrokerageCalculator';
import { CompoundingSimulator } from './CompoundingSimulator';
import { DrawdownRecoveryCalculator } from './DrawdownRecoveryCalculator';
import { PivotPointsCalculator } from './PivotPointsCalculator';
import { FibonacciCalculator } from './FibonacciCalculator';
import { PositionAveragingCalculator } from './PositionAveragingCalculator';
import { SipCalculator } from './SipCalculator';
import { CagrCalculator } from './CagrCalculator';
import { MarginCalculator } from './MarginCalculator';
import { BreakEvenCalculator } from './BreakEvenCalculator';
import { KellyCriterionCalculator } from './KellyCriterionCalculator';
import { AtrStopLossCalculator } from './AtrStopLossCalculator';
import { ForexPipCalculator } from './ForexPipCalculator';
import { EmiCalculator } from './EmiCalculator';

const ICON_MAP: Record<string, any> = {
  Scale,
  Activity,
  LineChart,
  Target,
  Receipt,
  TrendingUp,
  ShieldAlert,
  Compass,
  Layers,
  Sliders,
  Coins,
  DollarSign,
  BarChart2,
  Zap,
  Crosshair,
  Percent,
  Gauge,
  Landmark,
  Globe2,
};

const CATEGORIES: Array<{ id: CalculatorCategory; label: string }> = [
  { id: 'ALL',                 label: 'All Calculators' },
  { id: 'RISK_SIZING',         label: 'Risk & Sizing' },
  { id: 'OPTIONS_DERIVATIVES', label: 'Options & Greeks' },
  { id: 'MARKET_LEVELS',       label: 'Market Levels' },
  { id: 'CHARGES_TAXES',       label: 'Brokerage & Taxes' },
  { id: 'INVESTING_GROWTH',    label: 'Wealth & Investing' },
];

interface CalculatorSuiteProps {
  initialCalculatorId?: CalculatorId;
  defaultCurrency?: Currency;
  isPublicView?: boolean;
}

export function CalculatorSuite({
  initialCalculatorId = 'position-size',
  defaultCurrency = 'INR',
  isPublicView = false,
}: CalculatorSuiteProps) {
  const [activeCalcId, setActiveCalcId] = useState<CalculatorId>(initialCalculatorId);
  const [activeCategory, setActiveCategory] = useState<CalculatorCategory>('ALL');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered calculators list based on search and category
  const filteredCalculators = useMemo(() => {
    return CALCULATORS_CATALOG.filter((c) => {
      const matchesCategory = activeCategory === 'ALL' || c.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.shortDesc.toLowerCase().includes(query) ||
        c.badge.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const activeCalculatorMeta = CALCULATORS_CATALOG.find((c) => c.id === activeCalcId) ?? CALCULATORS_CATALOG[0]!;

  const handleCopySummary = (text: string) => {
    setToastMessage('Calculation summary copied to clipboard!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Bar: Search, Category Chips & Currency Switcher ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search calculators (e.g. Black-Scholes, Nifty, Tax, Pivot, SIP)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
            />
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground font-medium">Currency:</span>
            <div className="flex rounded-lg bg-secondary/80 p-1 border border-border">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  currency === 'INR'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  currency === 'USD'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary/15 text-primary border border-primary/30 font-semibold shadow-sm'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calculator Selector Carousel / Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {filteredCalculators.map((c) => {
          const IconComp = ICON_MAP[c.iconName] ?? CalcIcon;
          const isActive = activeCalcId === c.id;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCalcId(c.id)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                isActive
                  ? 'bg-primary/10 border-primary shadow-md ring-1 ring-primary/40'
                  : 'bg-card/70 border-border hover:bg-secondary/50 hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground group-hover:text-foreground'}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {c.badge}
                </span>
              </div>

              <div>
                <span className="font-semibold text-xs text-foreground block truncate">
                  {c.name}
                </span>
                <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {c.shortDesc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active Calculator Container (Crash-Proof Boundary) ── */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="border-b border-border/50 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {activeCalculatorMeta.badge}
              </span>
              <h2 className="text-xl font-extrabold text-foreground">
                {activeCalculatorMeta.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCalculatorMeta.shortDesc}
            </p>
          </div>
        </div>

        <ErrorBoundary
          fallback={
            <div className="p-8 rounded-xl bg-destructive/5 border border-destructive/20 text-center space-y-3">
              <p className="text-sm font-semibold text-destructive">An error occurred in this calculation</p>
              <p className="text-xs text-muted-foreground">Please check your parameters or reset inputs.</p>
            </div>
          }
        >
          {activeCalcId === 'position-size' && (
            <PositionSizeCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'options-greeks' && (
            <OptionsGreeksCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'options-payoff' && (
            <OptionsStrategyPayoff currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'risk-reward' && (
            <RiskRewardCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'brokerage' && (
            <BrokerageCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'compounding' && (
            <CompoundingSimulator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'drawdown-recovery' && (
            <DrawdownRecoveryCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'pivot-points' && (
            <PivotPointsCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'fibonacci' && (
            <FibonacciCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'position-averaging' && (
            <PositionAveragingCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'sip-investor' && (
            <SipCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'cagr' && (
            <CagrCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'margin' && (
            <MarginCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'break-even' && (
            <BreakEvenCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'kelly-criterion' && (
            <KellyCriterionCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'atr-stop-loss' && (
            <AtrStopLossCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
          {activeCalcId === 'forex-pip' && (
            <ForexPipCalculator />
          )}
          {activeCalcId === 'emi-loan' && (
            <EmiCalculator currency={currency} onCopySummary={handleCopySummary} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

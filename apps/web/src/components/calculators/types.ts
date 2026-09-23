// ──────────────────────────────────────────────
// TradeMind — Calculator Suite Types & Presets
// ──────────────────────────────────────────────

export type Currency = 'INR' | 'USD';

export type CalculatorCategory =
  | 'ALL'
  | 'RISK_SIZING'
  | 'OPTIONS_DERIVATIVES'
  | 'MARKET_LEVELS'
  | 'CHARGES_TAXES'
  | 'INVESTING_GROWTH';

export type CalculatorId =
  | 'position-size'
  | 'options-greeks'
  | 'options-payoff'
  | 'risk-reward'
  | 'brokerage'
  | 'compounding'
  | 'drawdown-recovery'
  | 'pivot-points'
  | 'fibonacci'
  | 'position-averaging'
  | 'sip-investor'
  // ── New calculators ──────────────────────────
  | 'cagr'
  | 'margin'
  | 'break-even'
  | 'kelly-criterion'
  | 'atr-stop-loss'
  | 'emi-loan';

export interface CalculatorMeta {
  id: CalculatorId;
  name: string;
  shortDesc: string;
  category: CalculatorCategory;
  badge: string;
  iconName: string;
  popular?: boolean;
}

export const CALCULATORS_CATALOG: CalculatorMeta[] = [
  {
    id: 'position-size',
    name: 'Position Size & Risk',
    shortDesc: 'Calculate exact shares, contracts, and lots to never exceed your predefined capital risk.',
    category: 'RISK_SIZING',
    badge: 'Essential',
    iconName: 'Scale',
    popular: true,
  },
  {
    id: 'options-greeks',
    name: 'Options Pricing & Greeks',
    shortDesc: 'Black-Scholes theoretical price, Delta, Gamma, Theta decay, Vega, and sensitivity analysis.',
    category: 'OPTIONS_DERIVATIVES',
    badge: 'Black-Scholes',
    iconName: 'Activity',
    popular: true,
  },
  {
    id: 'options-payoff',
    name: 'Options Strategy Payoff',
    shortDesc: 'Visual payoff diagrams for Bull Spreads, Straddles, Iron Condors, and custom multi-leg trades.',
    category: 'OPTIONS_DERIVATIVES',
    badge: 'Interactive Chart',
    iconName: 'LineChart',
    popular: true,
  },
  {
    id: 'risk-reward',
    name: 'Risk-Reward & Multi-Target',
    shortDesc: 'Scale-out profit targets (T1, T2, T3) and calculate blended risk-to-reward ratio.',
    category: 'RISK_SIZING',
    badge: 'Target Planner',
    iconName: 'Target',
  },
  {
    id: 'brokerage',
    name: 'Brokerage & Tax Charges',
    shortDesc: 'Exact NSE/BSE fees (STT, GST, SEBI, stamp duty) and break-even points required per trade.',
    category: 'CHARGES_TAXES',
    badge: 'Indian Tax Ready',
    iconName: 'Receipt',
    popular: true,
  },
  {
    id: 'compounding',
    name: 'Compounding & Growth',
    shortDesc: 'Simulate account compounding velocity with period-by-period progression schedule.',
    category: 'INVESTING_GROWTH',
    badge: 'Wealth Builder',
    iconName: 'TrendingUp',
  },
  {
    id: 'drawdown-recovery',
    name: 'Drawdown Recovery & Ruin Matrix',
    shortDesc: 'Gain needed to recover losses plus consecutive loss probability risk simulator.',
    category: 'RISK_SIZING',
    badge: 'Capital Shield',
    iconName: 'ShieldAlert',
  },
  {
    id: 'pivot-points',
    name: 'Pivot Points (5 Systems)',
    shortDesc: 'Classic, Fibonacci, Camarilla H1-H4/L1-L4 scalping levels, Woodie, and Tom DeMark pivots.',
    category: 'MARKET_LEVELS',
    badge: 'Multi-Algorithm',
    iconName: 'Compass',
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Retracement & Ext.',
    shortDesc: 'Calculate golden ratio retracement bounce levels (38.2%, 61.8%) and extension targets.',
    category: 'MARKET_LEVELS',
    badge: 'Golden Ratio',
    iconName: 'Layers',
  },
  {
    id: 'position-averaging',
    name: 'Position Averaging (Scale-In)',
    shortDesc: 'Calculate blended weighted entry price across up to 5 tranches with target exit price.',
    category: 'RISK_SIZING',
    badge: 'Scale-In',
    iconName: 'Sliders',
  },
  {
    id: 'sip-investor',
    name: 'SIP & Step-Up Wealth',
    shortDesc: 'Long-term wealth compounding with yearly step-up additions and inflation adjustments.',
    category: 'INVESTING_GROWTH',
    badge: 'Long-Term',
    iconName: 'Coins',
  },
  // ── New Calculators (v2) ──────────────────────────────────────────────
  {
    id: 'cagr',
    name: 'CAGR Calculator',
    shortDesc: 'Compounded Annual Growth Rate with year-by-year portfolio growth projection table.',
    category: 'INVESTING_GROWTH',
    badge: 'Growth Rate',
    iconName: 'BarChart2',
    popular: true,
  },
  {
    id: 'margin',
    name: 'F&O Margin Calculator',
    shortDesc: 'Estimate SPAN + Exposure margin for Nifty, BankNifty, FinNifty, and commodity futures.',
    category: 'RISK_SIZING',
    badge: 'Futures/Options',
    iconName: 'Zap',
    popular: true,
  },
  {
    id: 'break-even',
    name: 'Break-Even Calculator',
    shortDesc: 'Exact exit price needed to cover all charges (STT, GST, brokerage, exchange fees).',
    category: 'CHARGES_TAXES',
    badge: 'Charge-Adjusted',
    iconName: 'Crosshair',
  },
  {
    id: 'kelly-criterion',
    name: 'Kelly Criterion',
    shortDesc: 'Mathematically optimal position sizing based on your historical win rate and R-multiple.',
    category: 'RISK_SIZING',
    badge: 'Optimal Sizing',
    iconName: 'Percent',
  },
  {
    id: 'atr-stop-loss',
    name: 'ATR Stop Loss',
    shortDesc: 'Volatility-adjusted stop loss placement using ATR × multiplier with risk-sized position.',
    category: 'RISK_SIZING',
    badge: 'Volatility-Based',
    iconName: 'Gauge',
  },
  {
    id: 'emi-loan',
    name: 'EMI / Loan Calculator',
    shortDesc: 'Monthly EMI, total interest, and full 12-month amortization schedule for any loan.',
    category: 'INVESTING_GROWTH',
    badge: 'Loan Planning',
    iconName: 'Landmark',
  },
];

export interface InstrumentPreset {
  name: string;
  lotSize: number;
  tickSize: number;
  defaultPrice: number;
  /** Approx SPAN margin % of notional value */
  spanMarginPct?: number;
  /** Approx Exposure margin % of notional value */
  exposureMarginPct?: number;
  category: 'INDICES' | 'COMMODITIES' | 'EQUITIES' | 'CRYPTO';
}

export const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  NIFTY_50: {
    name: 'Nifty 50',
    lotSize: 50,
    tickSize: 0.05,
    defaultPrice: 25400,
    spanMarginPct: 9.0,
    exposureMarginPct: 3.0,
    category: 'INDICES',
  },
  BANK_NIFTY: {
    name: 'Bank Nifty',
    lotSize: 15,
    tickSize: 0.05,
    defaultPrice: 53200,
    spanMarginPct: 10.0,
    exposureMarginPct: 3.5,
    category: 'INDICES',
  },
  FIN_NIFTY: {
    name: 'Fin Nifty',
    lotSize: 25,
    tickSize: 0.05,
    defaultPrice: 24500,
    spanMarginPct: 9.5,
    exposureMarginPct: 3.0,
    category: 'INDICES',
  },
  SENSEX: {
    name: 'Sensex (BSE)',
    lotSize: 10,
    tickSize: 0.05,
    defaultPrice: 83000,
    spanMarginPct: 9.0,
    exposureMarginPct: 3.0,
    category: 'INDICES',
  },
  CRUDE_OIL: {
    name: 'Crude Oil (MCX)',
    lotSize: 100,
    tickSize: 1.0,
    defaultPrice: 6200,
    spanMarginPct: 5.0,
    exposureMarginPct: 2.5,
    category: 'COMMODITIES',
  },
  GOLD_MINI: {
    name: 'Gold Mini (MCX)',
    lotSize: 10,
    tickSize: 1.0,
    defaultPrice: 75000,
    spanMarginPct: 4.5,
    exposureMarginPct: 2.0,
    category: 'COMMODITIES',
  },
  US_EQUITY: {
    name: 'US Equity / Stock',
    lotSize: 1,
    tickSize: 0.01,
    defaultPrice: 150,
    spanMarginPct: 20.0,
    exposureMarginPct: 5.0,
    category: 'EQUITIES',
  },
  CRYPTO_BTC: {
    name: 'Bitcoin (BTC/USDT)',
    lotSize: 0.001,
    tickSize: 0.1,
    defaultPrice: 65000,
    spanMarginPct: 30.0,
    exposureMarginPct: 10.0,
    category: 'CRYPTO',
  },
};

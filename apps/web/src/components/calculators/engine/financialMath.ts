// TradeMind — Core Financial Mathematics Engine
// Position Sizing, Fibonacci, Compounding, Drawdown Recovery, SIP, Averaging, Margin
// ──────────────────────────────────────────────

// ── 1. Position Sizing & Risk Management ───────
export interface PositionSizeInputs {
  accountBalance: number;
  riskMode: 'PERCENT' | 'FIXED';
  riskPercent: number;      // e.g. 1% or 2%
  riskAmount: number;       // fixed cash risk e.g. 5000
  entryPrice: number;
  stopLossPrice: number;
  lotSize?: number;         // 1 for stocks, 50 for Nifty, 15 for BankNifty, etc.
  direction: 'LONG' | 'SHORT';
}

export interface PositionSizeOutput {
  monetaryRisk: number;
  riskPerUnit: number;
  riskPercentOfCapital: number;
  maxUnits: number;
  maxLots: number;
  effectiveUnits: number;
  totalPositionValue: number;
  marginLeverageRatio: number;
  targets: Array<{
    ratio: string;
    multiplier: number;
    targetPrice: number;
    projectedProfit: number;
  }>;
}

export function calculatePositionSize(inputs: PositionSizeInputs): PositionSizeOutput {
  const {
    accountBalance,
    riskMode,
    riskPercent,
    riskAmount,
    entryPrice,
    stopLossPrice,
    lotSize = 1,
    direction,
  } = inputs;

  const balance = Math.max(1, accountBalance);
  const monetaryRisk = riskMode === 'PERCENT' ? (balance * riskPercent) / 100 : riskAmount;
  const riskPerUnit = direction === 'LONG'
    ? Math.max(0.0001, entryPrice - stopLossPrice)
    : Math.max(0.0001, stopLossPrice - entryPrice);

  const rawUnits = Math.floor(monetaryRisk / riskPerUnit);
  const maxLots = Math.max(0, Math.floor(rawUnits / Math.max(1, lotSize)));
  const effectiveUnits = lotSize > 1 ? maxLots * lotSize : rawUnits;
  const totalPositionValue = effectiveUnits * entryPrice;
  const marginLeverageRatio = balance > 0 ? Number((totalPositionValue / balance).toFixed(2)) : 0;
  const riskPercentOfCapital = Number(((monetaryRisk / balance) * 100).toFixed(2));

  const multipliers = [1.5, 2.0, 3.0, 4.0];
  const targets = multipliers.map((m) => {
    const priceDelta = riskPerUnit * m;
    const targetPrice = direction === 'LONG' ? entryPrice + priceDelta : entryPrice - priceDelta;
    const projectedProfit = effectiveUnits * priceDelta;
    return {
      ratio: `1:${m}`,
      multiplier: m,
      targetPrice: Number(targetPrice.toFixed(2)),
      projectedProfit: Number(projectedProfit.toFixed(2)),
    };
  });

  return {
    monetaryRisk: Number(monetaryRisk.toFixed(2)),
    riskPerUnit: Number(riskPerUnit.toFixed(2)),
    riskPercentOfCapital,
    maxUnits: rawUnits,
    maxLots,
    effectiveUnits,
    totalPositionValue: Number(totalPositionValue.toFixed(2)),
    marginLeverageRatio,
    targets,
  };
}

// ── 2. Fibonacci Retracements & Extensions ─────
export interface FibonacciLevel {
  ratio: number;
  label: string;
  price: number;
  isGoldenRatio?: boolean;
}

export function calculateFibonacciLevels(high: number, low: number, direction: 'UPTREND' | 'DOWNTREND') {
  const diff = high - low;
  const retracementRatios = [
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.500, label: '50.0%' },
    { ratio: 0.618, label: '61.8% (Golden)', isGoldenRatio: true },
    { ratio: 0.786, label: '78.6%' },
  ];

  const extensionRatios = [
    { ratio: 1.000, label: '100.0%' },
    { ratio: 1.272, label: '127.2%' },
    { ratio: 1.618, label: '161.8% (Golden Ext)', isGoldenRatio: true },
    { ratio: 2.000, label: '200.0%' },
    { ratio: 2.618, label: '261.8%' },
  ];

  const retracements: FibonacciLevel[] = retracementRatios.map((item) => ({
    ratio: item.ratio,
    label: item.label,
    isGoldenRatio: item.isGoldenRatio,
    price: Number((direction === 'UPTREND' ? high - diff * item.ratio : low + diff * item.ratio).toFixed(2)),
  }));

  const extensions: FibonacciLevel[] = extensionRatios.map((item) => ({
    ratio: item.ratio,
    label: item.label,
    isGoldenRatio: item.isGoldenRatio,
    price: Number((direction === 'UPTREND' ? high + diff * (item.ratio - 1) : low - diff * (item.ratio - 1)).toFixed(2)),
  }));

  return { retracements, extensions, diff };
}

// ── 3. Compounding & Wealth Growth Simulator ──
export interface CompoundingInputs {
  initialCapital: number;
  returnRatePercent: number; // rate per period
  periodType: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  totalPeriods: number;
  periodicAddition: number;  // cash added each period
}

export interface CompoundingScheduleItem {
  period: number;
  startBalance: number;
  interestEarned: number;
  addition: number;
  endBalance: number;
  totalGain: number;
}

export function simulateCompounding(inputs: CompoundingInputs) {
  const { initialCapital, returnRatePercent, totalPeriods, periodicAddition } = inputs;
  const rate = returnRatePercent / 100;
  const periods = Math.min(360, Math.max(1, Math.round(totalPeriods)));

  let currentBalance = initialCapital;
  let totalDeposited = initialCapital;
  const schedule: CompoundingScheduleItem[] = [];

  for (let i = 1; i <= periods; i++) {
    const startBalance = currentBalance;
    const interest = startBalance * rate;
    currentBalance = startBalance + interest + periodicAddition;
    totalDeposited += periodicAddition;

    schedule.push({
      period: i,
      startBalance: Number(startBalance.toFixed(2)),
      interestEarned: Number(interest.toFixed(2)),
      addition: periodicAddition,
      endBalance: Number(currentBalance.toFixed(2)),
      totalGain: Number((currentBalance - totalDeposited).toFixed(2)),
    });
  }

  const finalBalance = currentBalance;
  const totalProfit = finalBalance - totalDeposited;
  const overallRoiPercent = totalDeposited > 0 ? (totalProfit / totalDeposited) * 100 : 0;

  return {
    finalBalance: Number(finalBalance.toFixed(2)),
    totalDeposited: Number(totalDeposited.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    overallRoiPercent: Number(overallRoiPercent.toFixed(2)),
    schedule,
  };
}

// ── 4. Drawdown Recovery & Ruin Probability ───
export function calculateDrawdownRecovery(drawdownPercent: number) {
  const dd = Math.min(99.9, Math.max(0.1, drawdownPercent));
  const recoveryNeededPercent = (1 / (1 - dd / 100) - 1) * 100;
  return Number(recoveryNeededPercent.toFixed(2));
}

export function calculateConsecutiveLossProbability(winRatePercent: number) {
  const lossRate = 1 - Math.min(99, Math.max(1, winRatePercent)) / 100;
  const streaks = [2, 3, 4, 5, 6, 8, 10];

  return streaks.map((k) => {
    const probability = Math.pow(lossRate, k) * 100;
    // Capital remaining if risking 1%, 2%, 5% per trade
    const rem1Pct = Math.pow(1 - 0.01, k) * 100;
    const rem2Pct = Math.pow(1 - 0.02, k) * 100;
    const rem5Pct = Math.pow(1 - 0.05, k) * 100;
    const rem10Pct = Math.pow(1 - 0.10, k) * 100;

    return {
      streak: k,
      probabilityPercent: Number(probability.toFixed(2)),
      rem1Pct: Number(rem1Pct.toFixed(1)),
      rem2Pct: Number(rem2Pct.toFixed(1)),
      rem5Pct: Number(rem5Pct.toFixed(1)),
      rem10Pct: Number(rem10Pct.toFixed(1)),
    };
  });
}

// ── 5. Position Averaging (Scale-In / Averaging) ─
export interface AverageTranche {
  price: number;
  quantity: number;
}

export function calculateAveraging(tranches: AverageTranche[]) {
  let totalCost = 0;
  let totalQty = 0;

  for (const t of tranches) {
    if (t.price > 0 && t.quantity > 0) {
      totalCost += t.price * t.quantity;
      totalQty += t.quantity;
    }
  }

  const averagePrice = totalQty > 0 ? totalCost / totalQty : 0;
  return {
    averagePrice: Number(averagePrice.toFixed(2)),
    totalQuantity: totalQty,
    totalInvested: Number(totalCost.toFixed(2)),
  };
}

// ── 6. SIP & Step-Up Wealth Investor ──────────
export interface SipInputs {
  monthlyInvestment: number;
  stepUpPercentPerYear: number;
  expectedAnnualReturnPercent: number;
  durationYears: number;
  inflationRatePercent?: number;
}

export function calculateSip(inputs: SipInputs) {
  const {
    monthlyInvestment,
    stepUpPercentPerYear,
    expectedAnnualReturnPercent,
    durationYears,
    inflationRatePercent = 0,
  } = inputs;

  const totalMonths = durationYears * 12;
  const monthlyRate = expectedAnnualReturnPercent / 12 / 100;
  let currentMonthly = monthlyInvestment;
  let totalInvested = 0;
  let totalWealth = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // Step up every 12 months
    if (m > 1 && m % 12 === 1) {
      currentMonthly += (currentMonthly * stepUpPercentPerYear) / 100;
    }
    totalInvested += currentMonthly;
    totalWealth = (totalWealth + currentMonthly) * (1 + monthlyRate);
  }

  const wealthGained = totalWealth - totalInvested;
  // Real wealth adjusted for inflation: FV / (1 + i)^n
  const inflationDiscount = Math.pow(1 + inflationRatePercent / 100, durationYears);
  const inflationAdjustedWealth = inflationDiscount > 0 ? totalWealth / inflationDiscount : totalWealth;

  return {
    totalInvested: Math.round(totalInvested),
    estimatedWealth: Math.round(totalWealth),
    wealthGained: Math.round(wealthGained),
    inflationAdjustedWealth: Math.round(inflationAdjustedWealth),
    gainMultiplier: totalInvested > 0 ? Number((totalWealth / totalInvested).toFixed(2)) : 1,
  };
}

// ── 7. CAGR (Compound Annual Growth Rate) ───────
export interface CagrInputs {
  initialValue: number;
  finalValue: number;
  durationYears: number;
}

export interface CagrOutput {
  cagrPercent: number;
  absoluteReturnPercent: number;
  totalGain: number;
  yearlyProgression: Array<{
    year: number;
    value: number;
    gain: number;
  }>;
}

export function calculateCagr(inputs: CagrInputs): CagrOutput {
  const { initialValue, finalValue, durationYears } = inputs;
  const initial = Math.max(0.01, initialValue);
  const final = Math.max(0, finalValue);
  const years = Math.max(0.1, durationYears);

  const cagr = (Math.pow(final / initial, 1 / years) - 1) * 100;
  const absoluteReturn = ((final - initial) / initial) * 100;
  const totalGain = final - initial;

  const progression: CagrOutput['yearlyProgression'] = [];
  const wholeYears = Math.min(25, Math.ceil(years));
  for (let y = 0; y <= wholeYears; y++) {
    const projected = initial * Math.pow(1 + cagr / 100, y);
    progression.push({
      year: y,
      value: Math.round(projected),
      gain: Math.round(projected - initial),
    });
  }

  return {
    cagrPercent: Number(cagr.toFixed(2)),
    absoluteReturnPercent: Number(absoluteReturn.toFixed(2)),
    totalGain: Math.round(totalGain),
    yearlyProgression: progression,
  };
}

// ── 9. F&O Margin Calculator ───────────────────
export interface MarginInputs {
  cmp: number;
  lots: number;
  lotSize: number;
  spanMarginPct: number;
  exposureMarginPct: number;
}

export interface MarginOutput {
  totalQuantity: number;
  notionalValue: number;
  spanMargin: number;
  exposureMargin: number;
  totalMarginRequired: number;
  effectiveLeverage: number;
}

export function calculateMargin(inputs: MarginInputs): MarginOutput {
  const { cmp, lots, lotSize, spanMarginPct, exposureMarginPct } = inputs;
  const totalQuantity = Math.max(1, lots) * Math.max(1, lotSize);
  const notionalValue = cmp * totalQuantity;
  const spanMargin = notionalValue * (Math.max(0, spanMarginPct) / 100);
  const exposureMargin = notionalValue * (Math.max(0, exposureMarginPct) / 100);
  const totalMarginRequired = spanMargin + exposureMargin;
  const effectiveLeverage = totalMarginRequired > 0 ? notionalValue / totalMarginRequired : 1;

  return {
    totalQuantity,
    notionalValue: Math.round(notionalValue),
    spanMargin: Math.round(spanMargin),
    exposureMargin: Math.round(exposureMargin),
    totalMarginRequired: Math.round(totalMarginRequired),
    effectiveLeverage: Number(effectiveLeverage.toFixed(1)),
  };
}

// ── 10. Break-Even Price Calculator ────────────
export interface BreakEvenInputs {
  entryPrice: number;
  quantity: number;
  flatBrokeragePerOrder: number;
  sttPercent: number;
  exchangeFeePercent: number;
  gstPercent: number;
  stampDutyPercent: number;
  direction: 'LONG' | 'SHORT';
}

export interface BreakEvenOutput {
  breakEvenPrice: number;
  pointsRequired: number;
  percentMoveRequired: number;
  estimatedTotalCharges: number;
  brokeragePerUnit: number;
  taxesPerUnit: number;
}

export function calculateBreakEven(inputs: BreakEvenInputs): BreakEvenOutput {
  const {
    entryPrice,
    quantity,
    flatBrokeragePerOrder,
    sttPercent,
    exchangeFeePercent,
    gstPercent,
    stampDutyPercent,
    direction,
  } = inputs;

  const qty = Math.max(1, quantity);
  const buyTurnover = entryPrice * qty;
  
  // Total brokerage for 2 legs (buy + sell)
  const totalBrokerage = flatBrokeragePerOrder * 2;
  
  // Taxes on buy turn: stamp duty
  const stampDuty = buyTurnover * (stampDutyPercent / 100);
  
  // Exchange turnover fee (approx for both legs based on entry)
  const exchangeCharges = buyTurnover * 2 * (exchangeFeePercent / 100);
  
  // GST on (brokerage + exchange fee)
  const gst = (totalBrokerage + exchangeCharges) * (gstPercent / 100);
  
  // STT on sell side (approx on entry value)
  const stt = buyTurnover * (sttPercent / 100);

  const estimatedTotalCharges = totalBrokerage + stampDuty + exchangeCharges + gst + stt;
  const pointsRequired = estimatedTotalCharges / qty;
  const percentMoveRequired = entryPrice > 0 ? (pointsRequired / entryPrice) * 100 : 0;
  const breakEvenPrice = direction === 'LONG' ? entryPrice + pointsRequired : entryPrice - pointsRequired;

  return {
    breakEvenPrice: Number(breakEvenPrice.toFixed(2)),
    pointsRequired: Number(pointsRequired.toFixed(2)),
    percentMoveRequired: Number(percentMoveRequired.toFixed(2)),
    estimatedTotalCharges: Number(estimatedTotalCharges.toFixed(2)),
    brokeragePerUnit: Number((totalBrokerage / qty).toFixed(2)),
    taxesPerUnit: Number(((estimatedTotalCharges - totalBrokerage) / qty).toFixed(2)),
  };
}

// ── 11. Kelly Criterion Calculator ─────────────
export interface KellyInputs {
  winRatePercent: number;
  winLossRatio: number;
  accountBalance: number;
}

export interface KellyOutput {
  fullKellyPercent: number;
  halfKellyPercent: number;
  quarterKellyPercent: number;
  fullKellyCapital: number;
  halfKellyCapital: number;
  quarterKellyCapital: number;
  expectedGrowthRate: number;
  riskCategory: 'SAFE' | 'AGGRESSIVE' | 'NEGATIVE_EDGE' | 'OVER_LEVERAGED';
}

export function calculateKelly(inputs: KellyInputs): KellyOutput {
  const { winRatePercent, winLossRatio, accountBalance } = inputs;
  const W = Math.min(0.99, Math.max(0.01, winRatePercent / 100));
  const R = Math.max(0.01, winLossRatio);
  const balance = Math.max(0, accountBalance);

  // Kelly % = W - (1 - W) / R = (W * R - (1 - W)) / R
  const fullKelly = ((W * R - (1 - W)) / R) * 100;
  const boundedFull = Math.max(0, Math.min(100, fullKelly));
  const halfKelly = boundedFull / 2;
  const quarterKelly = boundedFull / 4;

  let riskCategory: KellyOutput['riskCategory'] = 'SAFE';
  if (fullKelly <= 0) {
    riskCategory = 'NEGATIVE_EDGE';
  } else if (fullKelly > 50) {
    riskCategory = 'OVER_LEVERAGED';
  } else if (fullKelly > 25) {
    riskCategory = 'AGGRESSIVE';
  }

  // Expected growth rate: g = W * ln(1 + f*R) + (1-W) * ln(1 - f)
  const fHalf = halfKelly / 100;
  let expectedGrowth = 0;
  if (fHalf > 0 && fHalf < 1 && 1 + fHalf * R > 0 && 1 - fHalf > 0) {
    expectedGrowth = (W * Math.log(1 + fHalf * R) + (1 - W) * Math.log(1 - fHalf)) * 100;
  }

  return {
    fullKellyPercent: Number(boundedFull.toFixed(2)),
    halfKellyPercent: Number(halfKelly.toFixed(2)),
    quarterKellyPercent: Number(quarterKelly.toFixed(2)),
    fullKellyCapital: Math.round((balance * boundedFull) / 100),
    halfKellyCapital: Math.round((balance * halfKelly) / 100),
    quarterKellyCapital: Math.round((balance * quarterKelly) / 100),
    expectedGrowthRate: Number(expectedGrowth.toFixed(2)),
    riskCategory,
  };
}

// ── 12. ATR Stop Loss & Target Calculator ──────
export interface AtrStopLossInputs {
  entryPrice: number;
  atr: number;
  multiplier: number;
  direction: 'LONG' | 'SHORT';
  riskCapital: number;
}

export interface AtrStopLossOutput {
  stopLossPrice: number;
  stopDistance: number;
  stopDistancePercent: number;
  suggestedShares: number;
  totalPositionValue: number;
  targets: Array<{
    rMultiple: number;
    price: number;
    projectedProfit: number;
  }>;
}

export function calculateAtrStopLoss(inputs: AtrStopLossInputs): AtrStopLossOutput {
  const { entryPrice, atr, multiplier, direction, riskCapital } = inputs;
  const distance = Math.max(0.01, atr * multiplier);
  const stopLossPrice = direction === 'LONG' ? entryPrice - distance : entryPrice + distance;
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePercent = entryPrice > 0 ? (stopDistance / entryPrice) * 100 : 0;
  const suggestedShares = Math.max(1, Math.floor(riskCapital / stopDistance));
  const totalPositionValue = suggestedShares * entryPrice;

  const targets = [1, 1.5, 2, 3].map((r) => {
    const targetDistance = distance * r;
    const price = direction === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance;
    return {
      rMultiple: r,
      price: Number(price.toFixed(2)),
      projectedProfit: Math.round(suggestedShares * targetDistance),
    };
  });

  return {
    stopLossPrice: Number(stopLossPrice.toFixed(2)),
    stopDistance: Number(stopDistance.toFixed(2)),
    stopDistancePercent: Number(stopDistancePercent.toFixed(2)),
    suggestedShares,
    totalPositionValue: Math.round(totalPositionValue),
    targets,
  };
}

// ── 13. EMI / Loan Calculator ──────────────────
export interface EmiInputs {
  loanAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
}

export interface EmiScheduleRow {
  month: number;
  openingBalance: number;
  emi: number;
  principal: number;
  interest: number;
  closingBalance: number;
}

export interface EmiOutput {
  monthlyEmi: number;
  totalInterestPayable: number;
  totalPayment: number;
  interestToPrincipalRatio: number;
  schedule: EmiScheduleRow[];
}

export function calculateEmi(inputs: EmiInputs): EmiOutput {
  const { loanAmount, annualInterestRate, tenureMonths } = inputs;
  const P = Math.max(1, loanAmount);
  const n = Math.max(1, tenureMonths);
  const r = annualInterestRate / 12 / 100;

  let monthlyEmi = 0;
  if (r === 0) {
    monthlyEmi = P / n;
  } else {
    monthlyEmi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const totalPayment = monthlyEmi * n;
  const totalInterestPayable = totalPayment - P;

  // Build first 12 months (or up to n) amortization schedule
  const schedule: EmiScheduleRow[] = [];
  let balance = P;
  const maxRows = Math.min(n, 12);

  for (let m = 1; m <= maxRows; m++) {
    const interest = balance * r;
    const principal = monthlyEmi - interest;
    const closing = Math.max(0, balance - principal);

    schedule.push({
      month: m,
      openingBalance: Math.round(balance),
      emi: Math.round(monthlyEmi),
      principal: Math.round(principal),
      interest: Math.round(interest),
      closingBalance: Math.round(closing),
    });

    balance = closing;
  }

  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalInterestPayable: Math.round(totalInterestPayable),
    totalPayment: Math.round(totalPayment),
    interestToPrincipalRatio: P > 0 ? Number(((totalInterestPayable / P) * 100).toFixed(1)) : 0,
    schedule,
  };
}

// ── 15. Forex & Crypto Pip & Lot Size Calculator ──────
export interface ForexPipInputs {
  pair: string;
  accountCurrency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'USDT' | string;
  lotType: 'STANDARD' | 'MINI' | 'MICRO' | 'NANO' | 'CUSTOM';
  lots: number;
  entryPrice: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  accountBalance?: number;
  riskPercent?: number;
  exchangeRateToAccount?: number; // quote to account currency rate (defaults to 1.0)
}

export interface ForexPipOutput {
  pipSize: number;
  unitsTraded: number;
  pipValuePerPip: number;
  riskPips: number;
  rewardPips: number;
  monetaryRisk: number;
  monetaryReward: number;
  riskRewardRatio: number;
  suggestedLotsForRisk?: number;
  totalPositionValue: number;
}

export function calculateForexPip(inputs: ForexPipInputs): ForexPipOutput {
  const {
    pair,
    accountCurrency,
    lotType,
    lots,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    accountBalance = 10000,
    riskPercent = 1,
    exchangeRateToAccount = 1.0,
  } = inputs;

  // Determine standard pip size based on instrument
  const isJpyPair = pair.toUpperCase().includes('JPY');
  const isCrypto = pair.toUpperCase().includes('BTC') || pair.toUpperCase().includes('ETH') || pair.toUpperCase().includes('SOL');
  const isInrPair = pair.toUpperCase().includes('INR');

  let pipSize = 0.0001;
  if (isJpyPair) {
    pipSize = 0.01;
  } else if (isCrypto) {
    pipSize = 1.0;
  } else if (isInrPair) {
    pipSize = 0.0025;
  }

  // Determine unit multiplier based on lot type
  let unitsPerLot = 100000; // standard
  if (lotType === 'MINI') unitsPerLot = 10000;
  else if (lotType === 'MICRO') unitsPerLot = 1000;
  else if (lotType === 'NANO') unitsPerLot = 100;
  else if (lotType === 'CUSTOM') unitsPerLot = 1;

  const unitsTraded = Math.max(1, lots * unitsPerLot);
  const totalPositionValue = unitsTraded * (entryPrice > 0 ? entryPrice : 1);

  // 1 pip value in Quote Currency = unitsTraded * pipSize
  const pipValueInQuote = unitsTraded * pipSize;
  const pipValuePerPip = Number((pipValueInQuote * Math.max(0.0001, exchangeRateToAccount)).toFixed(4));

  // Risk and Reward Pips
  let riskPips = 0;
  let rewardPips = 0;

  if (stopLossPrice && stopLossPrice > 0 && entryPrice > 0) {
    riskPips = Number((Math.abs(entryPrice - stopLossPrice) / pipSize).toFixed(1));
  }
  if (takeProfitPrice && takeProfitPrice > 0 && entryPrice > 0) {
    rewardPips = Number((Math.abs(takeProfitPrice - entryPrice) / pipSize).toFixed(1));
  }

  const monetaryRisk = Number((riskPips * pipValuePerPip).toFixed(2));
  const monetaryReward = Number((rewardPips * pipValuePerPip).toFixed(2));
  const riskRewardRatio = riskPips > 0 ? Number((rewardPips / riskPips).toFixed(2)) : 0;

  // Sizing recommendation based on target % risk of account balance
  let suggestedLotsForRisk: number | undefined;
  if (riskPips > 0 && accountBalance > 0) {
    const allowedCashRisk = (accountBalance * riskPercent) / 100;
    const cashRiskPerSingleLot = riskPips * (unitsPerLot * pipSize * exchangeRateToAccount);
    if (cashRiskPerSingleLot > 0) {
      suggestedLotsForRisk = Number((allowedCashRisk / cashRiskPerSingleLot).toFixed(2));
    }
  }

  return {
    pipSize,
    unitsTraded,
    pipValuePerPip,
    riskPips,
    rewardPips,
    monetaryRisk,
    monetaryReward,
    riskRewardRatio,
    suggestedLotsForRisk,
    totalPositionValue,
  };
}

// ──────────────────────────────────────────────
// TradeMind — Black-Scholes-Merton Options Engine
// High precision Abramowitz & Stegun (7.1.26) approximation
// ──────────────────────────────────────────────

export interface BlackScholesInputs {
  spotPrice: number;       // S: Current price of the underlying asset
  strikePrice: number;     // K: Strike price
  timeToExpiryDays: number;// DTE: Days to expiration (calendar days)
  volatilityPercent: number;// IV: Implied Volatility in % (e.g. 20 for 20%)
  riskFreeRatePercent: number; // r: Annualized risk-free rate in % (e.g. 6.5 for 6.5%)
  dividendYieldPercent?: number; // q: Annualized dividend yield in % (e.g. 1.2)
}

export interface GreeksResult {
  price: number;      // Theoretical option price
  delta: number;      // Δ: Hedge ratio & directional sensitivity
  gamma: number;      // Γ: Rate of change of Delta per unit spot move
  theta: number;      // Θ: Dollar decay per calendar day
  vega: number;       // ν: Dollar change per 1% change in IV
  rho: number;        // ρ: Dollar change per 1% change in interest rate
  intrinsicValue: number;
  extrinsicValue: number;
}

export interface OptionsPricingOutput {
  call: GreeksResult;
  put: GreeksResult;
  d1: number;
  d2: number;
}

/** Standard Normal Probability Density Function: φ(x) */
function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard Normal Cumulative Distribution Function: Φ(x)
 * Accurate to within 7.5 × 10^-8 using Abramowitz & Stegun 7.1.26
 */
function normalCdf(x: number): number {
  if (x < -10) return 0;
  if (x > 10) return 1;

  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.3989422804014327; // 1 / sqrt(2*PI)

  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-0.5 * x * x) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-0.5 * x * x) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

/**
 * Calculate Black-Scholes theoretical prices and full suite of Greeks for both Call and Put.
 */
export function calculateBlackScholes(inputs: BlackScholesInputs): OptionsPricingOutput {
  const S = Math.max(0.001, inputs.spotPrice);
  const K = Math.max(0.001, inputs.strikePrice);
  const T = Math.max(0.0001, inputs.timeToExpiryDays / 365); // Time in years
  const sigma = Math.max(0.0001, inputs.volatilityPercent / 100);
  const r = (inputs.riskFreeRatePercent ?? 6.5) / 100;
  const q = (inputs.dividendYieldPercent ?? 0) / 100;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const expNegQT = Math.exp(-q * T);
  const expNegRT = Math.exp(-r * T);

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const nNegD1 = normalCdf(-d1);
  const nNegD2 = normalCdf(-d2);
  const pdfD1 = normalPdf(d1);

  // Theoretical Prices
  const callPrice = Math.max(0, S * expNegQT * nd1 - K * expNegRT * nd2);
  const putPrice = Math.max(0, K * expNegRT * nNegD2 - S * expNegQT * nNegD1);

  // Gamma is identical for Call and Put
  const gamma = (expNegQT * pdfD1) / (S * sigma * sqrtT);

  // Vega is identical for Call and Put (expressed per 1% change in IV: dPrice / dSigma * 0.01)
  const vega = (S * expNegQT * pdfD1 * sqrtT) / 100;

  // Daily Theta (divided by 365)
  const thetaCommon = -(S * expNegQT * pdfD1 * sigma) / (2 * sqrtT);
  const callTheta = (thetaCommon - r * K * expNegRT * nd2 + q * S * expNegQT * nd1) / 365;
  const putTheta = (thetaCommon + r * K * expNegRT * nNegD2 - q * S * expNegQT * nNegD1) / 365;

  // Delta
  const callDelta = expNegQT * nd1;
  const putDelta = expNegQT * (nd1 - 1);

  // Rho (expressed per 1% change in interest rate)
  const callRho = (K * T * expNegRT * nd2) / 100;
  const putRho = (-K * T * expNegRT * nNegD2) / 100;

  // Intrinsic & Extrinsic values
  const callIntrinsic = Math.max(0, S - K);
  const callExtrinsic = Math.max(0, callPrice - callIntrinsic);

  const putIntrinsic = Math.max(0, K - S);
  const putExtrinsic = Math.max(0, putPrice - putIntrinsic);

  return {
    call: {
      price: callPrice,
      delta: callDelta,
      gamma,
      theta: callTheta,
      vega,
      rho: callRho,
      intrinsicValue: callIntrinsic,
      extrinsicValue: callExtrinsic,
    },
    put: {
      price: putPrice,
      delta: putDelta,
      gamma,
      theta: putTheta,
      vega,
      rho: putRho,
      intrinsicValue: putIntrinsic,
      extrinsicValue: putExtrinsic,
    },
    d1,
    d2,
  };
}

/**
 * Generate Spot Price Sensitivity Matrix (e.g. -10% to +10%)
 */
export function generateSpotSensitivity(inputs: BlackScholesInputs) {
  const percentages = [-10, -5, -2, 0, 2, 5, 10];
  return percentages.map((pct) => {
    const spot = inputs.spotPrice * (1 + pct / 100);
    const result = calculateBlackScholes({ ...inputs, spotPrice: spot });
    return {
      percentChange: pct,
      spotPrice: spot,
      callPrice: result.call.price,
      putPrice: result.put.price,
      callDelta: result.call.delta,
      putDelta: result.put.delta,
    };
  });
}

export interface VolatilityScenarioCell {
  ivShift: number;           // e.g. -10%
  simulatedIv: number;       // e.g. 15%
  daysPassed: number;        // e.g. 2 days passed
  remainingDte: number;      // e.g. 5 days remaining
  callPrice: number;
  putPrice: number;
  callPnl: number;           // Dollar change from base
  putPnl: number;
  callPnlPct: number;        // % change from base
  putPnlPct: number;
}

/**
 * Generate 2D Volatility & DTE Scenario Surface Matrix (IV Crush & Time Decay)
 */
export function generateVolatilityScenarioMatrix(inputs: BlackScholesInputs): {
  ivShifts: number[];
  daysPassedSteps: number[];
  baseCallPrice: number;
  basePutPrice: number;
  matrix: VolatilityScenarioCell[][];
} {
  const baseResult = calculateBlackScholes(inputs);
  const baseCallPrice = baseResult.call.price;
  const basePutPrice = baseResult.put.price;

  const ivShifts = [-15, -10, -5, 0, 5, 10, 15];
  const maxDays = Math.max(1, Math.floor(inputs.timeToExpiryDays));
  const daysPassedSteps = [0, 1, Math.min(3, maxDays), Math.min(7, maxDays), Math.max(0, maxDays - 0.1)]
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .sort((a, b) => a - b);

  const matrix = ivShifts.map((ivShift) => {
    const simIv = Math.max(1, inputs.volatilityPercent + ivShift);
    return daysPassedSteps.map((daysPassed) => {
      const remainingDte = Math.max(0.01, inputs.timeToExpiryDays - daysPassed);
      const res = calculateBlackScholes({
        ...inputs,
        volatilityPercent: simIv,
        timeToExpiryDays: remainingDte,
      });

      const callPnl = res.call.price - baseCallPrice;
      const putPnl = res.put.price - basePutPrice;
      const callPnlPct = baseCallPrice > 0 ? (callPnl / baseCallPrice) * 100 : 0;
      const putPnlPct = basePutPrice > 0 ? (putPnl / basePutPrice) * 100 : 0;

      return {
        ivShift,
        simulatedIv: simIv,
        daysPassed,
        remainingDte,
        callPrice: res.call.price,
        putPrice: res.put.price,
        callPnl,
        putPnl,
        callPnlPct,
        putPnlPct,
      };
    });
  });

  return {
    ivShifts,
    daysPassedSteps,
    baseCallPrice,
    basePutPrice,
    matrix,
  };
}

// ──────────────────────────────────────────────
// TradeMind — Pivot Points Calculation Engine
// 5 Industry Standard Methodologies: Classic, Fibonacci, Camarilla, Woodie, DeMark
// ──────────────────────────────────────────────

export interface PivotInputs {
  high: number;
  low: number;
  close: number;
  open?: number;
}

export interface PivotLevel {
  label: string;
  price: number;
  type: 'resistance' | 'pivot' | 'support';
  description?: string;
}

export interface PivotSystemResult {
  system: 'classic' | 'fibonacci' | 'camarilla' | 'woodie' | 'demark';
  name: string;
  description: string;
  pivot: number;
  resistances: PivotLevel[];
  supports: PivotLevel[];
}

export function calculateAllPivots(inputs: PivotInputs): Record<string, PivotSystemResult> {
  const { high: H, low: L, close: C, open: O = C } = inputs;
  const range = H - L;

  // 1. Classic Floor Trader
  const classicPP = (H + L + C) / 3;
  const classicR1 = 2 * classicPP - L;
  const classicS1 = 2 * classicPP - H;
  const classicR2 = classicPP + range;
  const classicS2 = classicPP - range;
  const classicR3 = H + 2 * (classicPP - L);
  const classicS3 = L - 2 * (H - classicPP);
  const classicR4 = classicR3 + range;
  const classicS4 = classicS3 - range;

  const classic: PivotSystemResult = {
    system: 'classic',
    name: 'Classic / Floor Trader',
    description: 'Standard floor trader pivot points used by institutional intraday desks.',
    pivot: Number(classicPP.toFixed(2)),
    resistances: [
      { label: 'R4', price: Number(classicR4.toFixed(2)), type: 'resistance' },
      { label: 'R3', price: Number(classicR3.toFixed(2)), type: 'resistance' },
      { label: 'R2', price: Number(classicR2.toFixed(2)), type: 'resistance' },
      { label: 'R1', price: Number(classicR1.toFixed(2)), type: 'resistance' },
    ],
    supports: [
      { label: 'S1', price: Number(classicS1.toFixed(2)), type: 'support' },
      { label: 'S2', price: Number(classicS2.toFixed(2)), type: 'support' },
      { label: 'S3', price: Number(classicS3.toFixed(2)), type: 'support' },
      { label: 'S4', price: Number(classicS4.toFixed(2)), type: 'support' },
    ],
  };

  // 2. Fibonacci Pivots
  const fibPP = (H + L + C) / 3;
  const fibR1 = fibPP + 0.382 * range;
  const fibS1 = fibPP - 0.382 * range;
  const fibR2 = fibPP + 0.618 * range;
  const fibS2 = fibPP - 0.618 * range;
  const fibR3 = fibPP + 1.000 * range;
  const fibS3 = fibPP - 1.000 * range;

  const fibonacci: PivotSystemResult = {
    system: 'fibonacci',
    name: 'Fibonacci Pivots',
    description: 'Pivots weighted using golden ratio projections (38.2%, 61.8%, 100%).',
    pivot: Number(fibPP.toFixed(2)),
    resistances: [
      { label: 'R3 (100%)', price: Number(fibR3.toFixed(2)), type: 'resistance' },
      { label: 'R2 (61.8%)', price: Number(fibR2.toFixed(2)), type: 'resistance' },
      { label: 'R1 (38.2%)', price: Number(fibR1.toFixed(2)), type: 'resistance' },
    ],
    supports: [
      { label: 'S1 (38.2%)', price: Number(fibS1.toFixed(2)), type: 'support' },
      { label: 'S2 (61.8%)', price: Number(fibS2.toFixed(2)), type: 'support' },
      { label: 'S3 (100%)', price: Number(fibS3.toFixed(2)), type: 'support' },
    ],
  };

  // 3. Camarilla Pivots
  const camH4 = C + (range * 1.1) / 2;
  const camH3 = C + (range * 1.1) / 4;
  const camH2 = C + (range * 1.1) / 6;
  const camH1 = C + (range * 1.1) / 12;
  const camPP = (H + L + C) / 3;
  const camL1 = C - (range * 1.1) / 12;
  const camL2 = C - (range * 1.1) / 6;
  const camL3 = C - (range * 1.1) / 4;
  const camL4 = C - (range * 1.1) / 2;

  const camarilla: PivotSystemResult = {
    system: 'camarilla',
    name: 'Camarilla Equation',
    description: 'Premier scalping system. H3/L3 mark mean reversion; H4/L4 mark explosive breakouts.',
    pivot: Number(camPP.toFixed(2)),
    resistances: [
      { label: 'H4 (Breakout)', price: Number(camH4.toFixed(2)), type: 'resistance', description: 'Long breakout entry' },
      { label: 'H3 (Reversal)', price: Number(camH3.toFixed(2)), type: 'resistance', description: 'Short reversal entry' },
      { label: 'H2', price: Number(camH2.toFixed(2)), type: 'resistance' },
      { label: 'H1', price: Number(camH1.toFixed(2)), type: 'resistance' },
    ],
    supports: [
      { label: 'L1', price: Number(camL1.toFixed(2)), type: 'support' },
      { label: 'L2', price: Number(camL2.toFixed(2)), type: 'support' },
      { label: 'L3 (Reversal)', price: Number(camL3.toFixed(2)), type: 'support', description: 'Long reversal entry' },
      { label: 'L4 (Breakout)', price: Number(camL4.toFixed(2)), type: 'support', description: 'Short breakout entry' },
    ],
  };

  // 4. Woodie Pivots
  const woodiePP = (H + L + 2 * C) / 4;
  const woodieR1 = 2 * woodiePP - L;
  const woodieS1 = 2 * woodiePP - H;
  const woodieR2 = woodiePP + range;
  const woodieS2 = woodiePP - range;
  const woodieR3 = H + 2 * (woodiePP - L);
  const woodieS3 = L - 2 * (H - woodiePP);
  const woodieR4 = woodieR3 + range;
  const woodieS4 = woodieS3 - range;

  const woodie: PivotSystemResult = {
    system: 'woodie',
    name: 'Woodie Pivots',
    description: 'Weights the session close twice as heavily as high and low.',
    pivot: Number(woodiePP.toFixed(2)),
    resistances: [
      { label: 'R4', price: Number(woodieR4.toFixed(2)), type: 'resistance' },
      { label: 'R3', price: Number(woodieR3.toFixed(2)), type: 'resistance' },
      { label: 'R2', price: Number(woodieR2.toFixed(2)), type: 'resistance' },
      { label: 'R1', price: Number(woodieR1.toFixed(2)), type: 'resistance' },
    ],
    supports: [
      { label: 'S1', price: Number(woodieS1.toFixed(2)), type: 'support' },
      { label: 'S2', price: Number(woodieS2.toFixed(2)), type: 'support' },
      { label: 'S3', price: Number(woodieS3.toFixed(2)), type: 'support' },
      { label: 'S4', price: Number(woodieS4.toFixed(2)), type: 'support' },
    ],
  };

  // 5. Tom DeMark Pivots
  let X = 0;
  if (C < O) {
    X = H + 2 * L + C;
  } else if (C > O) {
    X = 2 * H + L + C;
  } else {
    X = H + L + 2 * C;
  }
  const demarkPP = X / 4;
  const demarkR1 = X / 2 - L;
  const demarkS1 = X / 2 - H;

  const demark: PivotSystemResult = {
    system: 'demark',
    name: 'Tom DeMark Pivots',
    description: 'Calculates asymmetric support and resistance conditioned on whether close was above or below open.',
    pivot: Number(demarkPP.toFixed(2)),
    resistances: [
      { label: 'R1', price: Number(demarkR1.toFixed(2)), type: 'resistance' },
    ],
    supports: [
      { label: 'S1', price: Number(demarkS1.toFixed(2)), type: 'support' },
    ],
  };

  return { classic, fibonacci, camarilla, woodie, demark };
}

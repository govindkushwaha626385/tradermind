// ──────────────────────────────────────────────
// TradeMind — Pre-configured Institutional Chart Presets
// Real-world candlestick scenarios for instant 1-click AI Vision testing
// ──────────────────────────────────────────────

export interface ChartPreset {
  id: string;
  name: string;
  market: string;
  timeframe: string;
  notes: string;
  svgDataUri: string;
}

// Candlestick SVG generator helper that outputs a clean TradingView-style dark chart
function generateCandlestickSvg(symbol: string, timeframe: string, trend: 'bullish' | 'bearish' | 'sweep'): string {
  const candles = trend === 'bullish'
    ? [
        { o: 80, c: 95, h: 100, l: 75, green: true },
        { o: 95, c: 90, h: 105, l: 85, green: false },
        { o: 90, c: 110, h: 115, l: 85, green: true },
        { o: 110, c: 125, h: 130, l: 105, green: true },
        { o: 125, c: 120, h: 135, l: 115, green: false },
        { o: 120, c: 145, h: 150, l: 118, green: true },
        { o: 145, c: 160, h: 165, l: 140, green: true },
        { o: 160, c: 155, h: 170, l: 150, green: false },
        { o: 155, c: 180, h: 185, l: 150, green: true },
      ]
    : trend === 'bearish'
    ? [
        { o: 180, c: 165, h: 185, l: 160, green: false },
        { o: 165, c: 170, h: 175, l: 160, green: true },
        { o: 170, c: 145, h: 172, l: 140, green: false },
        { o: 145, c: 130, h: 150, l: 125, green: false },
        { o: 130, c: 138, h: 142, l: 128, green: true },
        { o: 138, c: 115, h: 140, l: 110, green: false },
        { o: 115, c: 95, h: 120, l: 90, green: false },
        { o: 95, c: 100, h: 105, l: 90, green: true },
        { o: 100, c: 80, h: 102, l: 75, green: false },
      ]
    : [
        { o: 120, c: 135, h: 140, l: 115, green: true },
        { o: 135, c: 130, h: 142, l: 125, green: false },
        { o: 130, c: 150, h: 155, l: 128, green: true },
        { o: 150, c: 165, h: 175, l: 148, green: true },
        // Sweep wick:
        { o: 165, c: 140, h: 185, l: 135, green: false },
        { o: 140, c: 120, h: 145, l: 115, green: false },
        { o: 120, c: 105, h: 125, l: 100, green: false },
        { o: 105, c: 112, h: 118, l: 102, green: true },
        { o: 112, c: 90, h: 115, l: 85, green: false },
      ];

  const candleElements = candles.map((c, i) => {
    const x = 50 + i * 50;
    const wickTop = 220 - c.h;
    const wickBottom = 220 - c.l;
    const bodyTop = 220 - Math.max(c.o, c.c);
    const bodyHeight = Math.max(Math.abs(c.o - c.c), 4);
    const color = c.green ? '#10b981' : '#f43f5e';

    return `
      <!-- Wick -->
      <line x1="${x + 12}" y1="${wickTop}" x2="${x + 12}" y2="${wickBottom}" stroke="${color}" stroke-width="2"/>
      <!-- Body -->
      <rect x="${x}" y="${bodyTop}" width="24" height="${bodyHeight}" rx="2" fill="${color}" stroke="${color}" stroke-width="1"/>
    `;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 280" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090a0f"/>
        <stop offset="100%" stop-color="#12131c"/>
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="560" height="280" fill="url(#bgGrad)"/>
    <!-- Grid -->
    <line x1="0" y1="60" x2="560" y2="60" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="0" y1="120" x2="560" y2="120" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="0" y1="180" x2="560" y2="180" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="0" y1="240" x2="560" y2="240" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="140" y1="0" x2="140" y2="280" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="280" y1="0" x2="280" y2="280" stroke="#1f2438" stroke-dasharray="3,3"/>
    <line x1="420" y1="0" x2="420" y2="280" stroke="#1f2438" stroke-dasharray="3,3"/>
    <!-- Watermark / Title -->
    <text x="24" y="34" fill="#6366f1" font-size="14" font-family="sans-serif" font-weight="bold">${symbol} • ${timeframe}</text>
    <text x="24" y="52" fill="#64748b" font-size="10" font-family="monospace">TradeMind Institutional Candlestick Vision Engine</text>
    <!-- Candlesticks -->
    ${candleElements}
    <!-- Moving average / EMA guide -->
    <path d="M 40 180 Q 160 140, 260 100 T 520 70" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CHART_PRESETS: ChartPreset[] = [
  {
    id: 'nifty-liquidity-sweep',
    name: 'NIFTY 50 (15m)',
    market: 'Indian Indices',
    timeframe: '15m',
    notes: 'Testing previous day high around 25,450. Notice the rejection wick at the top with high volume. Is this a classic liquidity sweep or continuation?',
    svgDataUri: generateCandlestickSvg('NIFTY 50', '15m', 'sweep'),
  },
  {
    id: 'btc-breakout',
    name: 'BTC/USDT (1H)',
    market: 'Crypto',
    timeframe: '1H',
    notes: 'Higher highs and higher lows building up against the $64,500 resistance zone. Looking for confirmation before entering a breakout long position.',
    svgDataUri: generateCandlestickSvg('BTC/USDT', '1H', 'bullish'),
  },
  {
    id: 'eurusd-orderblock',
    name: 'EUR/USD (4H)',
    market: 'Forex',
    timeframe: '4H',
    notes: 'Clean bearish breakdown through structure, returning into a 4H bearish order block. Evaluating short entry with stop above swing high.',
    svgDataUri: generateCandlestickSvg('EUR/USD', '4H', 'bearish'),
  },
];

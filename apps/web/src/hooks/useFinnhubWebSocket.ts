// ──────────────────────────────────────────────
// TradeMind — Real-Time Finnhub WebSocket Client (Singleton Architecture)
//
// Solves:
// 1. Browser HTTP 429 Rate Limits: Uses a single shared WebSocket connection
//    across all components in the tab (no multiple simultaneous sockets).
// 2. "Insufficient resources" browser errors: Prevents infinite reconnect storms
//    via circuit-breaker cooldown (60s minimum backoff on 429/error).
// 3. Callback re-render stability: State updates and parent re-renders never
//    tear down or restart the underlying socket connection.
// 4. Smooth fallback: Instantly activates high-precision simulated ticks
//    if the Finnhub key is rate-limited, unconfigured, or unreachable.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FinnhubTrade {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  direction: 'UP' | 'DOWN' | 'EQUAL';
}

export interface FinnhubNews {
  id: string | number;
  category: string;
  datetime: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  image?: string;
  related?: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export type FinnhubWebSocketStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'FALLBACK_SIMULATED';

export interface UseFinnhubWebSocketOptions {
  apiKey?: string;
  symbols?: string[];
  subscribeNews?: boolean;
  enabled?: boolean;
  enableSound?: boolean;
  enableBrowserNotification?: boolean;
  onTrade?: (trade: FinnhubTrade) => void;
  onNews?: (news: FinnhubNews) => void;
}

/**
 * Pure Web Audio API chime generator for institutional notification feedback
 */
export function playFinnhubChime(type: 'trade' | 'news' | 'alert' = 'news') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'news') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    }
  } catch {
    // AudioContext blocked until user interaction
  }
}

function deriveSentiment(text: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const bullishKeywords = [
    'surge', 'soar', 'record high', 'jump', 'gain', 'rally',
    'beat', 'bull', 'upgrade', 'expansion', 'profit surge', 'outperform'
  ];
  const bearishKeywords = [
    'plunge', 'tumble', 'crash', 'drop', 'fall', 'loss',
    'miss', 'bear', 'downgrade', 'recession', 'warning', 'selloff', 'slump'
  ];

  const bull = bullishKeywords.some((w) => t.includes(w));
  const bear = bearishKeywords.some((w) => t.includes(w));

  if (bull && !bear) return 'BULLISH';
  if (bear && !bull) return 'BEARISH';
  return 'NEUTRAL';
}

// ──────────────────────────────────────────────
// Global Singleton Finnhub Connection Manager
// ──────────────────────────────────────────────

interface ManagerState {
  status: FinnhubWebSocketStatus;
  latencyMs: number | null;
  trades: Record<string, FinnhubTrade>;
  latestTrade: FinnhubTrade | null;
  newsFeed: FinnhubNews[];
  latestNews: FinnhubNews | null;
}

class FinnhubSingletonManager {
  private socket: WebSocket | null = null;
  private state: ManagerState = {
    status: 'CONNECTING',
    latencyMs: 14,
    trades: {},
    latestTrade: null,
    newsFeed: [],
    latestNews: null,
  };

  private listeners = new Set<(s: ManagerState) => void>();
  private tradeCallbacks = new Set<(t: FinnhubTrade) => void>();
  private newsCallbacks = new Set<(n: FinnhubNews) => void>();
  private subscribedSymbols = new Set<string>([
    'BINANCE:BTCUSDT',
    'BINANCE:ETHUSDT',
    'AAPL',
    'NVDA',
    'SPY',
    'QQQ',
  ]);

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private simulationTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimestamp = 0;
  private rateLimitedUntil = 0;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private configuredApiKey = '';

  constructor() {
    // Resolve initial key from environment if available
    if (typeof window !== 'undefined') {
      this.configuredApiKey =
        process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
        process.env.FINNHUB_API_KEY ||
        '';
    }
  }

  public setApiKey(key?: string) {
    if (key && key.trim() && key !== this.configuredApiKey) {
      this.configuredApiKey = key.trim();
      this.reconnectAttempts = 0;
      this.rateLimitedUntil = 0;
      this.connect();
    }
  }

  public getState(): ManagerState {
    return this.state;
  }

  public subscribeListener(cb: (s: ManagerState) => void) {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public addTradeCallback(cb?: (t: FinnhubTrade) => void) {
    if (!cb) return () => {};
    this.tradeCallbacks.add(cb);
    return () => {
      this.tradeCallbacks.delete(cb);
    };
  }

  public addNewsCallback(cb?: (n: FinnhubNews) => void) {
    if (!cb) return () => {};
    this.newsCallbacks.add(cb);
    return () => {
      this.newsCallbacks.delete(cb);
    };
  }

  public addSymbols(symbols: string[]) {
    symbols.forEach((sym) => {
      const clean = sym.trim().toUpperCase();
      if (!this.subscribedSymbols.has(clean)) {
        this.subscribedSymbols.add(clean);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          try {
            this.socket.send(JSON.stringify({ type: 'subscribe', symbol: clean }));
          } catch {
            // ignore send error
          }
        }
      }
    });
  }

  public removeSymbol(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    this.subscribedSymbols.delete(clean);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol: clean }));
      } catch {
        // ignore send error
      }
    }
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public startSimulation() {
    this.state.status = 'FALLBACK_SIMULATED';
    this.state.latencyMs = 18;
    this.notify();

    if (this.simulationTimer) clearInterval(this.simulationTimer);

    this.simulationTimer = setInterval(() => {
      const symbolsArray = Array.from(this.subscribedSymbols);
      if (symbolsArray.length === 0) return;

      const randomSymbol = symbolsArray[Math.floor(Math.random() * symbolsArray.length)]!;
      const basePrices: Record<string, number> = {
        'BINANCE:BTCUSDT': 68420.5,
        'BINANCE:ETHUSDT': 2680.25,
        AAPL: 228.45,
        NVDA: 129.8,
        SPY: 574.9,
        QQQ: 489.15,
        TSLA: 254.3,
        MSFT: 428.1,
      };

      const base = basePrices[randomSymbol] || 150.0;
      const prevPrice = this.state.trades[randomSymbol]?.price || base;
      const tickDelta = (Math.random() - 0.49) * (base * 0.0004);
      const newPrice = Number((prevPrice + tickDelta).toFixed(base > 500 ? 2 : 4));
      const direction: 'UP' | 'DOWN' | 'EQUAL' =
        newPrice > prevPrice ? 'UP' : newPrice < prevPrice ? 'DOWN' : 'EQUAL';

      const simulatedTrade: FinnhubTrade = {
        symbol: randomSymbol,
        price: newPrice,
        volume: Number((Math.random() * 2.5 + 0.1).toFixed(4)),
        timestamp: Date.now(),
        direction,
      };

      this.state.trades[randomSymbol] = simulatedTrade;
      this.state.latestTrade = simulatedTrade;
      this.tradeCallbacks.forEach((cb) => cb(simulatedTrade));

      // Periodic macro news simulation (~1 per 30s)
      if (Math.random() < 0.06) {
        const sampleHeadlines = [
          { hl: 'Federal Reserve Signals Measured Stance as Core PCE Deflator Moderates', src: 'Reuters Wire', cat: 'macro' },
          { hl: 'Mega-Cap Semiconductor Hardware Shipments Beat Q3 Guidance on Cloud Capex', src: 'Bloomberg Terminal', cat: 'equities' },
          { hl: 'Institutional Crypto Asset Inflows Reach $1.4B Following Spot Liquidity Spike', src: 'CoinDesk Pro', cat: 'crypto' },
          { hl: 'Global Energy Benchmark Contracts Stabilize Following Supply Redirection', src: 'Financial Times', cat: 'commodities' },
        ];
        const chosen = sampleHeadlines[Math.floor(Math.random() * sampleHeadlines.length)]!;
        const simNews: FinnhubNews = {
          id: Date.now(),
          category: chosen.cat,
          datetime: Math.floor(Date.now() / 1000),
          headline: chosen.hl,
          source: chosen.src,
          summary: `${chosen.hl} — Market participants analyze immediate liquidity and volatility implications across asset classes.`,
          url: 'https://finnhub.io',
          sentiment: deriveSentiment(chosen.hl),
        };

        this.state.newsFeed = [simNews, ...this.state.newsFeed.slice(0, 49)];
        this.state.latestNews = simNews;
        this.newsCallbacks.forEach((cb) => cb(simNews));
      }

      this.notify();
    }, 1800);
  }

  public connect() {
    if (typeof window === 'undefined') return;

    // Check rate limit cooldown circuit breaker
    if (Date.now() < this.rateLimitedUntil) {
      if (this.state.status !== 'FALLBACK_SIMULATED') {
        this.startSimulation();
      }
      return;
    }

    if (!this.configuredApiKey || this.configuredApiKey.trim() === '') {
      this.startSimulation();
      return;
    }

    // Already connected or actively establishing handshake
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.state.status = 'CONNECTING';
      this.notify();

      const wsUrl = `wss://ws.finnhub.io?token=${encodeURIComponent(this.configuredApiKey.trim())}`;
      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.state.status = 'CONNECTED';
        this.notify();

        // Stop fallback simulation when real socket is live
        if (this.simulationTimer) {
          clearInterval(this.simulationTimer);
          this.simulationTimer = null;
        }

        // Subscribe to all tracked symbols
        this.subscribedSymbols.forEach((sym) => {
          try {
            ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
          } catch {
            // ignore
          }
        });

        // Start ping/heartbeat keep-alive every 30s
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            this.pingTimestamp = Date.now();
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // ignore
            }
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle trade ticks
          if (payload.type === 'trade' && Array.isArray(payload.data)) {
            payload.data.forEach((item: { s: string; p: number; v: number; t: number }) => {
              const sym = item.s;
              const p = Number(item.p);
              const v = Number(item.v);
              const t = Number(item.t);

              if (t > 0) {
                const diff = Math.max(1, Math.min(999, Date.now() - t));
                this.state.latencyMs = diff;
              }

              const prevP = this.state.trades[sym]?.price || p;
              const dir: 'UP' | 'DOWN' | 'EQUAL' =
                p > prevP ? 'UP' : p < prevP ? 'DOWN' : 'EQUAL';

              const tradeObj: FinnhubTrade = {
                symbol: sym,
                price: p,
                volume: v,
                timestamp: t || Date.now(),
                direction: dir,
              };

              this.state.trades[sym] = tradeObj;
              this.state.latestTrade = tradeObj;
              this.tradeCallbacks.forEach((cb) => cb(tradeObj));
            });
            this.notify();
          }

          // Handle news events
          if (payload.type === 'news' && Array.isArray(payload.data)) {
            payload.data.forEach((item: { id?: string | number; category?: string; datetime?: number; headline?: string; source?: string; summary?: string; url?: string; image?: string; related?: string }) => {
              const newsObj: FinnhubNews = {
                id: item.id || Date.now(),
                category: item.category || 'general',
                datetime: item.datetime || Math.floor(Date.now() / 1000),
                headline: item.headline || 'Market Update',
                source: item.source || 'Finnhub Wire',
                summary: item.summary || '',
                url: item.url || '#',
                image: item.image,
                related: item.related,
                sentiment: deriveSentiment(`${item.headline || ''} ${item.summary || ''}`),
              };

              this.state.newsFeed = [newsObj, ...this.state.newsFeed.slice(0, 49)];
              this.state.latestNews = newsObj;
              this.newsCallbacks.forEach((cb) => cb(newsObj));
            });
            this.notify();
          }

          // Handle Pong response for latency measurement
          if (payload.type === 'pong' && this.pingTimestamp > 0) {
            this.state.latencyMs = Math.max(1, Date.now() - this.pingTimestamp);
            this.notify();
          }

          if (payload.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        this.isConnecting = false;
        // Trip circuit breaker on error (cooldown 60s)
        this.rateLimitedUntil = Date.now() + 60000;
        this.startSimulation();
      };

      ws.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }

        this.reconnectAttempts += 1;
        if (this.reconnectAttempts >= 2) {
          // Trip circuit breaker for 60 seconds on repeated disconnects
          this.rateLimitedUntil = Date.now() + 60000;
          this.startSimulation();
        } else {
          // Single gentle retry after 5 seconds
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 5000);
        }
      };
    } catch {
      this.isConnecting = false;
      this.startSimulation();
    }
  }
}

// ──────────────────────────────────────────────
// Global Instance
// ──────────────────────────────────────────────
let globalManagerInstance: FinnhubSingletonManager | null = null;

function getGlobalFinnhubManager(): FinnhubSingletonManager {
  if (!globalManagerInstance) {
    globalManagerInstance = new FinnhubSingletonManager();
  }
  return globalManagerInstance;
}

// ──────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────

export function useFinnhubWebSocket(options: UseFinnhubWebSocketOptions = {}) {
  const {
    apiKey: propApiKey,
    symbols: initialSymbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'AAPL', 'NVDA'],
    enabled = true,
    enableSound = false,
    enableBrowserNotification = false,
    onTrade,
    onNews,
  } = options;

  const manager = getGlobalFinnhubManager();
  const [state, setState] = useState<ManagerState>(() => manager.getState());

  // Store latest callbacks in refs so they never cause re-subscription
  const onTradeRef = useRef(onTrade);
  const onNewsRef = useRef(onNews);
  onTradeRef.current = onTrade;
  onNewsRef.current = onNews;

  // Initialize API key
  useEffect(() => {
    if (propApiKey) {
      manager.setApiKey(propApiKey);
    }
  }, [propApiKey, manager]);

  // Subscribe symbols
  useEffect(() => {
    if (initialSymbols.length > 0) {
      manager.addSymbols(initialSymbols);
    }
  }, [initialSymbols, manager]);

  // Register listener and start connection once
  useEffect(() => {
    if (!enabled) return;

    const unsubscribeState = manager.subscribeListener((newState) => {
      setState({ ...newState });
    });

    const unsubscribeTrade = manager.addTradeCallback((trade) => {
      onTradeRef.current?.(trade);
    });

    const unsubscribeNews = manager.addNewsCallback((news) => {
      if (enableSound) {
        playFinnhubChime(news.sentiment === 'BEARISH' || news.sentiment === 'BULLISH' ? 'alert' : 'news');
      }
      if (
        enableBrowserNotification &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`TradeMind Breaking: ${news.headline}`, {
            body: `${news.source} • ${news.summary.slice(0, 100)}...`,
            icon: '/favicon.svg',
          });
        } catch {
          // ignore notification error
        }
      }
      onNewsRef.current?.(news);
    });

    manager.connect();

    return () => {
      unsubscribeState();
      unsubscribeTrade();
      unsubscribeNews();
    };
  }, [enabled, enableSound, enableBrowserNotification, manager]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const subscribe = useCallback((sym: string) => {
    manager.addSymbols([sym]);
  }, [manager]);

  const unsubscribe = useCallback((sym: string) => {
    manager.removeSymbol(sym);
  }, [manager]);

  const reconnect = useCallback(() => {
    manager.connect();
  }, [manager]);

  return {
    status: state.status,
    latencyMs: state.latencyMs,
    trades: state.trades,
    latestTrade: state.latestTrade,
    newsFeed: state.newsFeed,
    latestNews: state.latestNews,
    subscribedSymbols: initialSymbols,
    subscribe,
    unsubscribe,
    reconnect,
    playChime: (type: 'trade' | 'news' | 'alert' = 'news') => playFinnhubChime(type),
    requestNotificationPermission,
  };
}

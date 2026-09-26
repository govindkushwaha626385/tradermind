// ──────────────────────────────────────────────
// TradeMind — Real-Time Finnhub WebSocket Client Hook
//
// Connects to wss://ws.finnhub.io for sub-millisecond trade ticks
// and live news stream pushes with automatic reconnection, heartbeat,
// roundtrip latency tracking, Web Audio alerts, and smooth simulation fallback.
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
 * without requiring external media assets or network latency.
 */
export function playFinnhubChime(type: 'trade' | 'news' | 'alert' = 'news') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'news') {
      // 2-tone melodic chime (A5 880Hz -> E6 1318Hz)
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
      // Urgent triple pulse chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Subtle tick sound (650Hz micro-chirp)
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
    // AudioContext might be blocked until user interaction
  }
}

function deriveSentiment(text: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const bullishKeywords = ['surge', 'soar', 'record high', 'jump', 'gain', 'rally', 'beat', 'bull', 'upgrade', 'expansion', 'profit surge', 'outperform'];
  const bearishKeywords = ['plunge', 'tumble', 'crash', 'drop', 'fall', 'loss', 'miss', 'bear', 'downgrade', 'recession', 'warning', 'selloff', 'slump'];

  const bull = bullishKeywords.some((w) => t.includes(w));
  const bear = bearishKeywords.some((w) => t.includes(w));

  if (bull && !bear) return 'BULLISH';
  if (bear && !bull) return 'BEARISH';
  return 'NEUTRAL';
}

export function useFinnhubWebSocket(options: UseFinnhubWebSocketOptions = {}) {
  const {
    apiKey: propApiKey,
    symbols: initialSymbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'AAPL', 'NVDA'],
    subscribeNews = true,
    enabled = true,
    enableSound = false,
    enableBrowserNotification = false,
    onTrade,
    onNews,
  } = options;

  const [status, setStatus] = useState<FinnhubWebSocketStatus>('CONNECTING');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [trades, setTrades] = useState<Record<string, FinnhubTrade>>({});
  const [latestTrade, setLatestTrade] = useState<FinnhubTrade | null>(null);
  const [newsFeed, setNewsFeed] = useState<FinnhubNews[]>([]);
  const [latestNews, setLatestNews] = useState<FinnhubNews | null>(null);
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>(initialSymbols);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSubscriptionsRef = useRef<Set<string>>(new Set(initialSymbols));
  const pingTimestampRef = useRef<number>(0);

  // Resolved API Key (from props, env, or public fallback)
  const resolvedApiKey =
    propApiKey ||
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
    process.env.FINNHUB_API_KEY ||
    '';

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Dynamic subscribe to a symbol
  const subscribe = useCallback((symbol: string) => {
    if (!symbol) return;
    const cleanSym = symbol.trim().toUpperCase();
    activeSubscriptionsRef.current.add(cleanSym);
    setSubscribedSymbols(Array.from(activeSubscriptionsRef.current));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'subscribe', symbol: cleanSym }));
        if (subscribeNews) {
          socketRef.current.send(JSON.stringify({ type: 'subscribe-news', symbol: cleanSym }));
        }
      } catch {
        // Socket send error fallback
      }
    }
  }, [subscribeNews]);

  // Dynamic unsubscribe from a symbol
  const unsubscribe = useCallback((symbol: string) => {
    if (!symbol) return;
    const cleanSym = symbol.trim().toUpperCase();
    activeSubscriptionsRef.current.delete(cleanSym);
    setSubscribedSymbols(Array.from(activeSubscriptionsRef.current));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: cleanSym }));
      } catch {
        // Socket send error fallback
      }
    }
  }, []);

  // Graceful simulation fallback when WebSocket or key is unavailable
  const startSimulation = useCallback(() => {
    setStatus('FALLBACK_SIMULATED');
    setLatencyMs(18); // Simulated institutional local latency
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

    simulationIntervalRef.current = setInterval(() => {
      const symbolsArray = Array.from(activeSubscriptionsRef.current);
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
      const prevPrice = trades[randomSymbol]?.price || base;
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

      setTrades((prev) => ({ ...prev, [randomSymbol]: simulatedTrade }));
      setLatestTrade(simulatedTrade);
      onTrade?.(simulatedTrade);

      // Periodically simulate a breaking market news update (every ~25 seconds on avg)
      if (Math.random() < 0.07) {
        const sampleHeadlines = [
          { hl: 'Federal Reserve Signals Measured Interest Rate Stance at Jackson Hole Follow-Up', src: 'Reuters Wire', cat: 'macro' },
          { hl: 'Tech Sector Mega-Caps Rally on Accelerated Enterprise AI Infrastructure Capex', src: 'Bloomberg Terminal', cat: 'equities' },
          { hl: 'Institutional Digital Asset Inflows Reach $1.2B Following Spot ETF Volume Surge', src: 'CoinDesk Pro', cat: 'crypto' },
          { hl: 'US Crude Oil Inventories Show Surprise Drawdown Amid Global Supply Constraints', src: 'Financial Times', cat: 'commodities' },
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
        setNewsFeed((prev) => [simNews, ...prev.slice(0, 49)]);
        setLatestNews(simNews);
        if (enableSound) playFinnhubChime('news');
        onNews?.(simNews);
      }
    }, 1800);
  }, [trades, onTrade, onNews, enableSound]);

  // Connect to Finnhub WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    if (!resolvedApiKey || resolvedApiKey.trim() === '') {
      startSimulation();
      return;
    }

    try {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      setStatus('CONNECTING');
      const wsUrl = `wss://ws.finnhub.io?token=${encodeURIComponent(resolvedApiKey.trim())}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;

        // Clear simulation fallback if active
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }

        // Re-subscribe to all active symbols
        activeSubscriptionsRef.current.forEach((sym) => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
          if (subscribeNews) {
            ws.send(JSON.stringify({ type: 'subscribe-news', symbol: sym }));
          }
        });

        // Start ping/heartbeat keep-alive every 25 seconds
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimestampRef.current = Date.now();
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // Ignore ping error
            }
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle Trade Tick
          if (payload.type === 'trade' && Array.isArray(payload.data)) {
            payload.data.forEach((item: { s: string; p: number; v: number; t: number }) => {
              const sym = item.s;
              const p = Number(item.p);
              const v = Number(item.v);
              const t = Number(item.t);

              // Calculate transmission latency
              if (t > 0) {
                const diff = Math.max(1, Math.min(999, Date.now() - t));
                setLatencyMs(diff);
              }

              setTrades((prev) => {
                const prevP = prev[sym]?.price || p;
                const dir: 'UP' | 'DOWN' | 'EQUAL' = p > prevP ? 'UP' : p < prevP ? 'DOWN' : 'EQUAL';
                const tradeObj: FinnhubTrade = {
                  symbol: sym,
                  price: p,
                  volume: v,
                  timestamp: t,
                  direction: dir,
                };
                setLatestTrade(tradeObj);
                onTrade?.(tradeObj);
                return { ...prev, [sym]: tradeObj };
              });
            });
          }

          // Handle News Event
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

              setNewsFeed((prev) => [newsObj, ...prev.slice(0, 49)]);
              setLatestNews(newsObj);

              if (enableSound) {
                playFinnhubChime(newsObj.sentiment === 'BEARISH' || newsObj.sentiment === 'BULLISH' ? 'alert' : 'news');
              }

              if (enableBrowserNotification && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`TradeMind Breaking: ${newsObj.headline}`, {
                    body: `${newsObj.source} • ${newsObj.summary.slice(0, 100)}...`,
                    icon: '/trademind-icon.png',
                  });
                } catch {
                  // Ignore notification error
                }
              }

              onNews?.(newsObj);
            });
          }

          // Handle Pong response for RTT latency measurement
          if (payload.type === 'pong' && pingTimestampRef.current > 0) {
            const rtt = Math.max(1, Date.now() - pingTimestampRef.current);
            setLatencyMs(rtt);
          }

          // Handle Ping
          if (payload.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // Parse error
        }
      };

      ws.onerror = () => {
        setStatus('ERROR');
      };

      ws.onclose = () => {
        setStatus('DISCONNECTED');
        socketRef.current = null;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Auto-reconnect with exponential backoff (max 30s)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;

        if (reconnectAttemptsRef.current > 4) {
          // Fallback to simulation if server is unreachable
          startSimulation();
        } else {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      startSimulation();
    }
  }, [enabled, resolvedApiKey, subscribeNews, onTrade, onNews, enableSound, enableBrowserNotification, startSimulation]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Lifecycle initialization
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    latencyMs,
    trades,
    latestTrade,
    newsFeed,
    latestNews,
    subscribedSymbols,
    subscribe,
    unsubscribe,
    reconnect,
    playChime: (type: 'trade' | 'news' | 'alert' = 'news') => playFinnhubChime(type),
    requestNotificationPermission,
  };
}

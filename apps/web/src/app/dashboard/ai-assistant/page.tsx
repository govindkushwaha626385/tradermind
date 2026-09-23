'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  Send,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  RefreshCw,
  X,
  Compass,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import type { AiChatMessage, AiChatResponse } from '@trademind/shared';

export default function AiAssistantPage() {
  const { format } = useCurrency();
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('question');

  const [activeTab, setActiveTab] = useState<'chat' | 'chart'>('chat');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your TradeMind AI Copilot. I have live access to your 30-day trading performance, win rate, recurring behavioral leaks, and today's pre-market plan.\n\nHow can I assist your execution today? You can ask me to critique your recent trades, check your risk limits, or switch to the **Chart Analysis** tab to upload and break down any chart screenshot.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Live trader context
  const [liveContext, setLiveContext] = useState<any>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Chart upload state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [chartNotes, setChartNotes] = useState('');
  const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);
  const [chartResult, setChartResult] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live trader context
  const loadContext = () => {
    setLoadingContext(true);
    api.getAiLiveContext()
      .then((res) => {
        if (res.data) setLiveContext(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingContext(false));
  };

  useEffect(() => {
    loadContext();
  }, []);

  // Handle initial question from URL if navigated from replay/autopsy
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && messages.length === 1) {
      handleSendMessage(initialQuestion.trim());
    }
  }, [initialQuestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: AiChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await api.chatWithAssistant(text, messages);
      if (res.data) {
        const assistantMsg: AiChatMessage = {
          role: 'assistant',
          content: res.data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err?.message ?? 'Please try again'}. Make sure GEMINI_API_KEY is configured on the backend.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Image handling for chart analysis
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setChartError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setChartError(null);
      setChartResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) handleFileSelect(file);
        break;
      }
    }
  };

  const handleAnalyzeChart = async () => {
    if (!selectedImage || isAnalyzingChart) return;

    setIsAnalyzingChart(true);
    setChartError(null);

    try {
      const res = await api.analyzeChartImage(selectedImage, imageMime, chartNotes);
      if (res.data) {
        setChartResult(res.data);
      }
    } catch (err: any) {
      setChartError(err?.message ?? 'Chart analysis failed. Please verify API key.');
    } finally {
      setIsAnalyzingChart(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in" onPaste={handlePaste}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Institutional AI Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Trading Assistant & Chart Vision
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Personalized behavioral trading coach with live context & institutional candlestick chart breakdown.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Copilot Chat
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'chart'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Chart Screenshot Analysis
          </button>
        </div>
      </div>

      {/* Live Trader Context Strip */}
      {liveContext && (
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Live Context:
            </span>
            <span className="text-zinc-400">
              Win Rate (30D): <strong className="text-emerald-400">{liveContext.winRate30d}%</strong>
            </span>
            <span className="text-zinc-400">
              Net PnL:{' '}
              <strong className={liveContext.netPnl30d >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {format(liveContext.netPnl30d)}
              </strong>
            </span>
            <span className="text-zinc-400">
              Profit Factor: <strong className="text-white">{liveContext.profitFactor}</strong>
            </span>
            {liveContext.todayPremarketBias && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                Today&apos;s Bias: {liveContext.todayPremarketBias}
              </span>
            )}
            {liveContext.topMistakes?.[0] && (
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                Top Leak: {liveContext.topMistakes[0]}
              </span>
            )}
          </div>
          <button
            onClick={loadContext}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title="Refresh Live Context"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: Conversational Chat */}
      {activeTab === 'chat' && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden flex flex-col h-[640px]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAssistant
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : 'YOU'}
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-zinc-950/80 border border-zinc-800/80 text-zinc-200 shadow-sm'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-[10px] mt-2 font-mono ${
                        isAssistant ? 'text-zinc-500' : 'text-indigo-200'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3 items-center text-xs text-zinc-400 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <span>Analyzing your live context & formulating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt suggestions */}
          <div className="px-4 py-2 bg-zinc-950/40 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
              Quick Prompts:
            </span>
            {[
              'What was my biggest execution mistake this week?',
              'Should I trade right now based on my bias?',
              'How can I stop revenge trading after a stop out?',
              'Give me 3 rules for today’s session',
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isSending}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700/60 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 bg-zinc-950/90 border-t border-zinc-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask TradeMind AI about your trades, psychology, risk limits, or strategy..."
                disabled={isSending}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all text-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Multimodal Chart Vision Analysis */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload & Setup Column */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-400" />
                  Upload Chart Screenshot
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload any TradingView, broker, or candlestick chart. You can also press <strong>Ctrl+V / Cmd+V</strong> to paste directly from your clipboard.
                </p>
              </div>

              {/* Dropzone / Preview */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              {selectedImage ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950">
                  <img
                    src={selectedImage}
                    alt="Uploaded chart"
                    className="w-full h-64 object-contain"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setChartResult(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black text-zinc-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/80 rounded-xl p-8 text-center cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-950/80"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Click to browse or drop chart image here
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Supports PNG, JPG, WebP • Or press Cmd+V / Ctrl+V to paste
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Context / Trade Idea (Optional)
                </label>
                <textarea
                  value={chartNotes}
                  onChange={(e) => setChartNotes(e.target.value)}
                  placeholder="e.g. 5-min Nifty testing yesterday's high. Looking to buy a breakout above 25,450. Is risk-reward favorable?"
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {chartError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{chartError}</span>
                </div>
              )}

              <button
                onClick={handleAnalyzeChart}
                disabled={!selectedImage || isAnalyzingChart}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzingChart ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Vision Engine Analyzing Candlesticks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Institutional Chart Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Analysis Results Column */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Technical & Risk Breakdown
              </h3>

              {isAnalyzingChart ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-zinc-400 max-w-xs">
                    Scanning market structure, supply/demand zones, liquidity sweeps, and invalidation stop levels...
                  </p>
                </div>
              ) : chartResult ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Quick Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Bias</div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 ${
                          chartResult.summary.bias === 'BULLISH'
                            ? 'text-emerald-400'
                            : chartResult.summary.bias === 'BEARISH'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {chartResult.summary.bias}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Stop Invalidation</div>
                      <div className="text-xs font-mono font-bold text-rose-400 mt-0.5 truncate">
                        {chartResult.summary.suggestedStopLoss || 'Structural'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Take Profit</div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">
                        {chartResult.summary.suggestedTarget || 'Next zone'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Risk:Reward</div>
                      <div className="text-sm font-black text-sky-400 mt-0.5">
                        {chartResult.summary.riskReward || '1:2+'}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Institutional Analysis */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 max-h-[360px] overflow-y-auto text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap scrollbar-thin">
                    {chartResult.analysis}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-zinc-500 space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-zinc-700" />
                  <p className="text-sm">Upload a chart on the left to see institutional technical analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

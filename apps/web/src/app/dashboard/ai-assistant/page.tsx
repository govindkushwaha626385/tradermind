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
  Trash2,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Brain,
  Shield,
  Activity,
  Zap,
  ArrowRight,
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { ChatMessageBubble } from '@/components/ai/ChatMessageBubble';
import { CHART_PRESETS, type ChartPreset } from '@/lib/chart-presets';
import type { AiChatMessage } from '@trademind/shared';

// Persona modes
type PersonaMode = 'psychology' | 'risk' | 'smc' | 'autopsy';

interface PersonaConfig {
  id: PersonaMode;
  name: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  borderActive: string;
  systemDirective: string;
  prompts: string[];
}

const PERSONAS: PersonaConfig[] = [
  {
    id: 'psychology',
    name: 'Behavioral Psychologist',
    tagline: 'FOMO, revenge trading, tilt & discipline',
    icon: Brain,
    color: 'from-purple-500 to-indigo-500 text-purple-400',
    borderActive: 'border-purple-500 bg-purple-500/10 text-purple-300',
    systemDirective: 'Act as a compassionate, hyper-disciplined trading psychologist.',
    prompts: [
      'How can I stop revenge trading after a stop out?',
      'I feel hesitation pulling the trigger. How do I overcome it?',
      'What was my biggest behavioral leak this week?',
      'Give me a 5-minute pre-market grounding routine',
    ],
  },
  {
    id: 'risk',
    name: 'Risk & Capital Guardian',
    tagline: 'Drawdown defense, position sizing, R:R',
    icon: Shield,
    color: 'from-amber-500 to-rose-500 text-amber-400',
    borderActive: 'border-amber-500 bg-amber-500/10 text-amber-300',
    systemDirective: 'Act as a ruthless institutional risk manager protecting capital.',
    prompts: [
      'Calculate my max position size for a 1.5% stop on NIFTY',
      'Should I continue trading if I lost 1.8% of my account today?',
      'Audit my risk-to-reward ratio on my recent losing trades',
      'Give me 3 strict non-negotiable risk rules for today',
    ],
  },
  {
    id: 'smc',
    name: 'SMC & Price Action',
    tagline: 'Liquidity sweeps, order blocks, FVG, structure',
    icon: Activity,
    color: 'from-emerald-500 to-teal-500 text-emerald-400',
    borderActive: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
    systemDirective: 'Act as a master ICT / SMC price-action and market structure quantitative trader.',
    prompts: [
      'How do I confirm a liquidity sweep vs a true breakout?',
      'What qualifies a valid Fair Value Gap (FVG) on 15m timeframe?',
      'Explain how to identify premium vs discount zones before entering',
      'Check if my pre-market bias aligns with today’s key levels',
    ],
  },
  {
    id: 'autopsy',
    name: 'Execution Autopsy',
    tagline: 'Critiquing fills, slippage, MAE/MFE leaks',
    icon: Zap,
    color: 'from-sky-500 to-blue-500 text-sky-400',
    borderActive: 'border-sky-500 bg-sky-500/10 text-sky-300',
    systemDirective: 'Act as a rigorous execution forensic analyst reviewing trade entries and exits.',
    prompts: [
      'Why am I consistently taking early exits before my target?',
      'Analyze my Maximum Adverse Excursion (MAE) on recent trades',
      'How do I eliminate chasing green candles on market open?',
      'Diagnose why my win rate drops during the afternoon session',
    ],
  },
];

export default function AiAssistantPage() {
  const { format } = useCurrency();
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('question');
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'chat' | 'chart'>(
    initialTab === 'chart' ? 'chart' : 'chat'
  );

  // Active persona
  const [activePersona, setActivePersona] = useState<PersonaMode>('psychology');

  // Zen / Fullscreen mode
  const [isZenMode, setIsZenMode] = useState(false);

  // Voice recording
  const [isListening, setIsListening] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your **TradeMind AI Copilot**. I have live access to your 30-day trading performance, win rate, recurring behavioral leaks, and today's pre-market plan.\n\nHow can I assist your execution today? You can select a **Specialist Coach Persona** above, ask about your risk limits, or switch to the **Chart Screenshot Analysis** tab to break down any candlestick chart.",
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const handleBrokerSynced = () => {
      loadContext();
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
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

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputMessage]);

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  // Voice dictation toggle via Web Speech API
  const handleToggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Export full transcript as Markdown
  const handleExportTranscript = () => {
    const markdown = `# TradeMind AI Copilot Session Log
Generated: ${new Date().toLocaleString()}
Active Persona: ${PERSONAS.find((p) => p.id === activePersona)?.name}

${messages
  .map(
    (m) =>
      `### ${m.role === 'assistant' ? '🤖 TradeMind AI Coach' : '👤 Trader'} (${m.timestamp})\n\n${m.content}\n`
  )
  .join('\n---\n\n')}
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TradeMind-Session-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyTranscript = async () => {
    const text = messages
      .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}:\n${m.content}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
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

  const handleSelectPreset = (preset: ChartPreset) => {
    setSelectedImage(preset.svgDataUri);
    setImageMime('image/svg+xml');
    setChartNotes(preset.notes);
    setChartError(null);
    setChartResult(null);
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

  // Send chart analysis into AI Copilot Chat for interactive follow-up
  const handleSendAnalysisToChat = () => {
    if (!chartResult) return;
    const summaryText = `I analyzed a candlestick chart with TradeMind Vision:\n- **Bias**: ${chartResult.summary.bias}\n- **Pattern**: ${chartResult.summary.pattern || 'Price Action Setup'}\n- **Suggested Stop**: ${chartResult.summary.suggestedStopLoss || 'Structural'}\n- **Target**: ${chartResult.summary.suggestedTarget || 'Next liquidity'}\n- **Risk:Reward**: ${chartResult.summary.riskReward || '1:2+'}\n\n${chartNotes ? `**Context/Notes**: "${chartNotes}"\n\n` : ''}How should I manage my entry and trailing stop for this setup?`;

    setActiveTab('chat');
    handleSendMessage(summaryText);
  };

  const currentPersona = PERSONAS.find((p) => p.id === activePersona) || PERSONAS[0];

  return (
    <div
      className={`mx-auto space-y-6 animate-fade-in ${
        isZenMode ? 'fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto max-w-none' : 'max-w-6xl'
      }`}
      onPaste={handlePaste}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Institutional AI Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            AI Trading Assistant & Chart Vision
            {isZenMode && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase font-mono font-bold tracking-wider">
                Zen Mode
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalized behavioral trading coach with live context & institutional candlestick chart breakdown.
          </p>
        </div>

        {/* Tab switch & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Copilot Chat
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Chart Vision
            </button>
          </div>

          {/* Zen mode toggle button */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className="p-2 rounded-xl bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={isZenMode ? 'Exit Fullscreen Zen Mode' : 'Enter Fullscreen Zen Focus Mode'}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Trader Context Strip */}
      {liveContext && (
        <div className="p-3.5 rounded-2xl bg-card/80 border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              Live Context:
            </span>
            <span className="text-muted-foreground">
              Win Rate (30D): <strong className="text-emerald-400 font-bold">{liveContext.winRate30d}%</strong>
            </span>
            <span className="text-muted-foreground">
              Net PnL:{' '}
              <strong className={liveContext.netPnl30d >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {format(liveContext.netPnl30d)}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Profit Factor: <strong className="text-foreground font-bold">{liveContext.profitFactor}</strong>
            </span>
            {liveContext.todayPremarketBias && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                Bias: {liveContext.todayPremarketBias}
              </span>
            )}
            {liveContext.topMistakes?.[0] && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                Leak: {liveContext.topMistakes[0]}
              </span>
            )}
          </div>
          <button
            onClick={loadContext}
            disabled={loadingContext}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh Live Context"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingContext ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* TAB 1: Conversational Chat */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Persona Selector Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {PERSONAS.map((persona) => {
              const Icon = persona.icon;
              const isSelected = activePersona === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => setActivePersona(persona.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `bg-card border-primary ring-1 ring-primary/40 shadow-lg shadow-primary/10`
                      : 'bg-card/60 border-border/60 hover:border-border hover:bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl bg-gradient-to-tr ${persona.color} bg-opacity-20`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-foreground font-jakarta">{persona.name}</span>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{persona.tagline}</p>
                </button>
              );
            })}
          </div>

          {/* Main Chat Container */}
          <div
            className={`rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl transition-all ${
              isZenMode ? 'h-[calc(100vh-230px)]' : 'h-[640px]'
            }`}
          >
            {/* Header Status Bar */}
            <div className="px-5 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-bold text-foreground font-jakarta flex items-center gap-1.5">
                  <span>{currentPersona.name} Active</span>
                </span>
                <span className="hidden sm:inline text-muted-foreground font-mono text-[11px]">
                  • Multi-turn institutional coaching with live account guardrails
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportTranscript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                  title="Download conversation log (.md)"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden md:inline">Export</span>
                </button>
                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                  title="Copy full transcript"
                >
                  {copiedTranscript ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
                  <span className="hidden md:inline">{copiedTranscript ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => {
                    setMessages([
                      {
                        role: 'assistant',
                        content: `Chat history cleared. I'm ready as your **${currentPersona.name}** with live access to your 30-day performance and pre-market plan.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ]);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin">
              {messages.map((msg, index) => (
                <ChatMessageBubble
                  key={index}
                  message={msg}
                  provider={liveContext?.provider ?? 'gemini'}
                  onSelectPrompt={(prompt) => handleSendMessage(prompt)}
                  isLatest={index === messages.length - 1}
                />
              ))}

              {isSending && (
                <div className="flex gap-3 items-center text-xs text-muted-foreground animate-pulse p-3 rounded-2xl bg-muted/30 border border-border/40 w-fit">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <span>Analyzing live performance telemetry & formulating institutional response...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Persona Quick Prompts */}
            <div className="px-4 py-2.5 bg-muted/20 border-t border-border/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Prompt Ideas:
              </span>
              {currentPersona.prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isSending}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground text-xs border border-border/60 hover:border-primary/40 transition-all font-medium cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Smart Multiline Input Box */}
            <div className="p-3 sm:p-4 bg-card border-t border-border/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1 relative flex items-center">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Ask your ${currentPersona.name} anything about setups, risk limits, emotions... (Enter to send, Shift+Enter for newline)`}
                    disabled={isSending}
                    className="w-full px-4 py-3 pr-20 rounded-2xl bg-muted/40 border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none max-h-36 scrollbar-thin"
                  />
                  {/* Actions inside input */}
                  <div className="absolute right-2.5 flex items-center gap-1">
                    {inputMessage && (
                      <button
                        type="button"
                        onClick={() => setInputMessage('')}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      title={isListening ? 'Stop voice recording' : 'Dictate using voice (Speech-to-Text)'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="h-11 px-5 rounded-2xl bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all text-sm cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Multimodal Chart Vision Analysis */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          {/* Preset Candlestick Showcase Strip */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                1-Click Preset Candlestick Setups:
              </span>
              <span className="text-[11px] text-muted-foreground">Click any preset to test AI Vision immediately</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CHART_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 rounded-xl border border-border/60 hover:border-primary/50 bg-muted/30 hover:bg-muted/60 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {preset.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {preset.market}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                    {preset.notes}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload & Setup Column */}
            <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  Upload Chart Screenshot
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
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
                <div className="relative rounded-2xl overflow-hidden border border-border bg-zinc-950 shadow-inner">
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
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-black text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Remove chart"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/80 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Click to browse or drop chart image here
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Supports PNG, JPG, WebP, SVG • Or press Cmd+V / Ctrl+V to paste
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Context / Trade Idea (Optional)
                </label>
                <textarea
                  value={chartNotes}
                  onChange={(e) => setChartNotes(e.target.value)}
                  placeholder="e.g. 15-min Nifty testing yesterday's high. Looking to buy a breakout above 25,450. Is risk-reward favorable?"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {chartError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{chartError}</span>
                </div>
              )}

              <button
                onClick={handleAnalyzeChart}
                disabled={!selectedImage || isAnalyzingChart}
                className="w-full py-3.5 rounded-xl bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzingChart ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Vision Engine Scanning Candlesticks...</span>
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
            <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Technical & Risk Breakdown
                </h3>
                {chartResult && (
                  <button
                    onClick={handleSendAnalysisToChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Ask Copilot Follow-up</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isAnalyzingChart ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Scanning market structure, supply/demand zones, liquidity sweeps, and invalidation stop levels...
                  </p>
                </div>
              ) : chartResult ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Quick Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Bias</div>
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

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Stop Invalidation</div>
                      <div className="text-xs font-mono font-bold text-rose-400 mt-0.5 truncate">
                        {chartResult.summary.suggestedStopLoss || 'Structural'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Take Profit</div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">
                        {chartResult.summary.suggestedTarget || 'Next zone'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Risk:Reward</div>
                      <div className="text-sm font-black text-sky-400 mt-0.5">
                        {chartResult.summary.riskReward || '1:2+'}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Institutional Analysis */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 max-h-[440px] overflow-y-auto text-xs text-zinc-300 leading-relaxed scrollbar-thin space-y-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-sm font-bold text-foreground mt-3 mb-1.5 font-jakarta border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-3.5 rounded-full bg-primary" />
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xs sm:text-sm font-bold text-indigo-400 mt-2.5 mb-1 font-jakarta flex items-center gap-1.5">
                            <span className="w-1.5 h-3 rounded-full bg-indigo-500" />
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => <h3 className="text-xs font-bold text-violet-400 mt-2 mb-0.5">{children}</h3>,
                        p: ({ children }) => <p className="mb-2 text-zinc-300 leading-relaxed">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-bold text-white bg-white/5 px-1 py-0.5 rounded border border-white/10">
                            {children}
                          </strong>
                        ),
                        ul: ({ children }) => <ul className="space-y-1 my-2 list-none pl-0">{children}</ul>,
                        li: ({ children }) => (
                          <li className="flex items-start gap-1.5 text-zinc-300">
                            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                            <span className="flex-1">{children}</span>
                          </li>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2 rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm scrollbar-thin">
                            <table className="w-full text-left text-[11px] border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-zinc-800 text-zinc-200 border-b border-zinc-700/80 uppercase text-[9px] font-semibold">
                            {children}
                          </thead>
                        ),
                        tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/50">{children}</tbody>,
                        th: ({ children }) => <th className="py-2 px-3 font-bold text-zinc-300">{children}</th>,
                        td: ({ children }) => <td className="py-1.5 px-3 text-zinc-300 font-mono text-[10px] sm:text-[11px]">{children}</td>,
                      }}
                    >
                      {chartResult.analysis}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/40" />
                  <p className="text-sm">Upload a chart or click one of the presets above to see institutional technical analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

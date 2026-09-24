// ──────────────────────────────────────────────
// TradeMind — Modern Advanced AI Chat Message Component
//
// Features:
// - Full GitHub-flavored Markdown rendering (tables, headers, bold, lists, quotes)
// - Sleek glassmorphic tables with alternating row shading and clean borders
// - Code block syntax highlighting with instant one-click copy button
// - Interactive message actions: Copy message, Text-to-Speech audio, feedback
// - Dynamic follow-up chips to explore advice deeper
// - Responsive layout optimized for mobile, tablet, and wide screens
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiChatMessage } from '@trademind/shared';

interface ChatMessageBubbleProps {
  message: AiChatMessage;
  provider?: string;
  onSelectPrompt?: (prompt: string) => void;
  isLatest?: boolean;
}

export function ChatMessageBubble({
  message,
  provider = 'gemini',
  onSelectPrompt,
  isLatest = false,
}: ChatMessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async (codeText: string, id: string) => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown characters for pleasant speech audio
    const cleanText = message.content
      .replace(/[#*`_~|\[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.02;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={cn(
        'group flex gap-3.5 sm:gap-4 w-full transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
        isAssistant ? 'items-start justify-start' : 'items-start justify-end flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105',
          isAssistant
            ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white shadow-indigo-500/20 ring-1 ring-white/20'
            : 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-blue-500/20 ring-1 ring-white/20'
        )}
      >
        {isAssistant ? <Sparkles className="w-4 h-4 text-white" /> : 'YOU'}
      </div>

      {/* Bubble Container */}
      <div
        className={cn(
          'relative max-w-[92%] sm:max-w-[85%] md:max-w-[82%] rounded-2xl p-4 sm:p-5 text-sm transition-all duration-200',
          isAssistant
            ? 'bg-card/95 dark:bg-zinc-900/90 border border-border/80 dark:border-zinc-800 text-foreground shadow-xl backdrop-blur-md'
            : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 ml-auto'
        )}
      >
        {isAssistant ? (
          <div className="prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed text-zinc-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-base sm:text-lg font-bold text-foreground mt-4 mb-2 pb-1.5 border-b border-border/40 font-jakarta flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-primary" />
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm sm:text-base font-bold text-foreground mt-3.5 mb-1.5 font-jakarta flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-violet-500" />
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xs sm:text-sm font-bold text-indigo-400 mt-3 mb-1 font-jakarta flex items-center gap-1.5">
                    {children}
                  </h3>
                ),
                // Paragraph
                p: ({ children }) => <p className="mb-2.5 last:mb-0 text-zinc-300 leading-relaxed">{children}</p>,
                // Bold & Emphasis
                strong: ({ children }) => (
                  <strong className="font-bold text-white bg-white/5 px-1 py-0.5 rounded border border-white/10">
                    {children}
                  </strong>
                ),
                // Lists
                ul: ({ children }) => <ul className="space-y-1.5 my-2.5 list-none pl-0">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1.5 my-2.5 list-decimal pl-5 text-zinc-300">{children}</ol>,
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-zinc-300">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2" />
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                // Tables
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-xl border border-zinc-700/80 bg-zinc-950/70 shadow-sm scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-zinc-800/90 text-zinc-200 border-b border-zinc-700/80 uppercase text-[10px] tracking-wider font-semibold">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/50">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>,
                th: ({ children }) => <th className="py-2.5 px-3.5 font-bold text-zinc-300">{children}</th>,
                td: ({ children }) => <td className="py-2 px-3.5 text-zinc-300 font-mono text-[11px] sm:text-xs">{children}</td>,
                // Blockquote
                blockquote: ({ children }) => (
                  <blockquote className="my-2.5 border-l-2 border-indigo-500 bg-indigo-500/10 px-3.5 py-2 rounded-r-xl text-xs text-zinc-200 italic">
                    {children}
                  </blockquote>
                ),
                // Code block & inline code
                code: ({ inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const codeId = Math.random().toString(36).substring(7);

                  if (!inline && (match || codeString.includes('\n'))) {
                    return (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
                          <span className="flex items-center gap-1.5 uppercase font-bold text-indigo-400">
                            <Terminal className="w-3 h-3" />
                            {match ? match[1] : 'Code'}
                          </span>
                          <button
                            onClick={() => handleCopyCode(codeString, codeId)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                          >
                            {copiedCodeId === codeId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed scrollbar-thin">
                          <code>{codeString}</code>
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded font-mono text-[11px] sm:text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                hr: () => <hr className="my-4 border-border/40" />,
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Quick Follow-Up Suggestion Chips on latest assistant message */}
            {isLatest && onSelectPrompt && (
              <div className="pt-3 mt-3 border-t border-border/40 flex flex-wrap gap-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1 flex items-center gap-1">
                  <ArrowRight className="w-2.5 h-2.5 text-primary" />
                  Follow up:
                </span>
                {[
                  'Give me a 3-step action checklist',
                  'Show me a real example scenario',
                  'What rule prevents this in my next trade?',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectPrompt(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40 transition-all font-medium cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm sm:text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Footer info & Actions */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 pt-2.5 mt-2 border-t text-[10px] font-mono',
            isAssistant
              ? 'border-border/40 text-muted-foreground'
              : 'border-white/20 text-white/80'
          )}
        >
          <div className="flex items-center gap-2">
            {isAssistant && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/20 text-[9px] uppercase tracking-wider">
                <ShieldCheck className="w-2.5 h-2.5" />
                {provider === 'groq' ? 'Groq Llama 3.3 Engine' : 'Institutional AI Engine'}
              </span>
            )}
            <span>{message.timestamp}</span>
          </div>

          {isAssistant && (
            <div className="flex items-center gap-1.5">
              {/* Text-to-speech button */}
              <button
                onClick={handleToggleSpeech}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                  isSpeaking
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                title={isSpeaking ? 'Stop speaking' : 'Read response aloud'}
              >
                {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span className="font-sans text-[10px] hidden sm:inline">
                  {isSpeaking ? 'Stop' : 'Listen'}
                </span>
              </button>

              {/* Feedback up/down */}
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={cn(
                  'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
                  feedback === 'up' ? 'text-emerald-400' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Helpful response"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={cn(
                  'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
                  feedback === 'down' ? 'text-rose-400' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Needs improvement"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>

              {/* Copy button */}
              <button
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
                title="Copy message to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500 font-sans text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="font-sans text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


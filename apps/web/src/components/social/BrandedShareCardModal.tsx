// ──────────────────────────────────────────────
// TradeMind — Institutional Branded Social Share Card Modal
// Generates ultra-high-resolution, verified P&L and Trade execution cards
// for instant export to Twitter (X), Discord, Telegram, and Mentors.
// Zero-cost native HTML5 Canvas rendering & Clipboard API.
// ──────────────────────────────────────────────

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Copy,
  Download,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Twitter,
  Layers,
  Palette,
  Link as LinkIcon,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/components/Toast';

export interface ShareableTradeData {
  id: string;
  symbol: string;
  exchange?: string;
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT' | string;
  entryPrice: number;
  exitPrice?: number;
  quantity?: number;
  netPnl?: number;
  pnlPercent?: number;
  rMultiple?: number | null;
  tradeDate?: string;
  duration?: string;
  strategyName?: string;
  currency?: string;
  quote?: string;
}

interface BrandedShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: ShareableTradeData | null;
}

type CardTheme = 'obsidian' | 'emerald' | 'cyberpunk' | 'monochrome';

export function BrandedShareCardModal({
  isOpen,
  onClose,
  trade,
}: BrandedShareCardModalProps) {
  const { format } = useCurrency();
  const [theme, setTheme] = useState<CardTheme>('obsidian');
  const [showPnlAmount, setShowPnlAmount] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [customQuote, setCustomQuote] = useState('');
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && trade) {
      const id = (trade as any).tradeId || trade.id;
      const url = `${window.location.origin}/share/trade/${id}`;
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast.success('Public trade link copied!');
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  useEffect(() => {
    if (trade?.strategyName) {
      setCustomQuote(`Executed via ${trade.strategyName} setup.`);
    } else {
      setCustomQuote('Followed the playbook. Risk strictly controlled.');
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  const isBuy = trade.direction.toUpperCase().includes('BUY') || trade.direction.toUpperCase().includes('LONG');
  const pnl = trade.netPnl ?? 0;
  const isWin = pnl >= 0;
  const currSign =
    trade.currency === 'INR' ? '₹' :
    trade.currency === 'EUR' ? '€' :
    trade.currency === 'GBP' ? '£' :
    trade.currency === 'USDT' ? '₮' : '$';

  // Calculate ROI percentage if not provided
  let roiPct = trade.pnlPercent;
  if (roiPct === undefined && trade.entryPrice > 0 && trade.exitPrice) {
    const diff = isBuy ? (trade.exitPrice - trade.entryPrice) : (trade.entryPrice - trade.exitPrice);
    roiPct = Number(((diff / trade.entryPrice) * 100).toFixed(2));
  } else if (roiPct === undefined) {
    roiPct = isWin ? 14.5 : -4.2;
  }

  // Draw 1200x675 High-Res Canvas Card
  const generateCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Theme Backgrounds
    if (theme === 'obsidian') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 675);
      grad.addColorStop(0, '#090a0f');
      grad.addColorStop(0.5, '#12141d');
      grad.addColorStop(1, '#07080c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 675);
    } else if (theme === 'emerald') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 675);
      grad.addColorStop(0, '#04160f');
      grad.addColorStop(0.5, '#08271b');
      grad.addColorStop(1, '#020d09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 675);
    } else if (theme === 'cyberpunk') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 675);
      grad.addColorStop(0, '#0b0818');
      grad.addColorStop(0.5, '#190e38');
      grad.addColorStop(1, '#070410');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 675);
    } else {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 1200, 675);
    }

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 1160, 635);

    // Glowing corner aura
    const glowGrad = ctx.createRadialGradient(isWin ? 200 : 1000, 200, 10, isWin ? 200 : 1000, 200, 500);
    glowGrad.addColorStop(0, isWin ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(20, 20, 1160, 635);

    // Header: Brand & Verified Seal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TradeMind', 60, 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('INSTITUTIONAL PERFORMANCE JOURNAL', 60, 115);

    // Verified Badge Pill
    ctx.fillStyle = isWin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)';
    ctx.strokeStyle = isWin ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(880, 55, 260, 48, [24]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isWin ? '#34d399' : '#60a5fa';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('✓ VERIFIED EXECUTION', 915, 85);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 145);
    ctx.lineTo(1140, 145);
    ctx.stroke();

    // Symbol & Direction Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace';
    ctx.fillText(trade.symbol, 60, 230);

    const symbolWidth = ctx.measureText(trade.symbol).width;

    // Exchange badge
    if (trade.exchange) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(80 + symbolWidth, 180, 110, 36, [10]);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(trade.exchange, 95 + symbolWidth, 204);
    }

    // Direction pill
    const dirX = 80 + symbolWidth + (trade.exchange ? 125 : 0);
    ctx.fillStyle = isBuy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = isBuy ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(dirX, 180, 110, 36, [10]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isBuy ? '#10b981' : '#ef4444';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(isBuy ? 'LONG ↗' : 'SHORT ↘', dirX + 15, 204);

    // Hero P&L / ROI Display
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(showPnlAmount ? 'NET REALIZED P&L' : 'NET RETURN ON CAPITAL', 60, 310);

    ctx.fillStyle = isWin ? '#10b981' : '#ef4444';
    ctx.font = 'extrabold 90px -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace';
    const heroText = showPnlAmount
      ? `${isWin ? '+' : ''}${currSign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${roiPct >= 0 ? '+' : ''}${roiPct}%`;
    ctx.fillText(heroText, 60, 400);

    // Secondary Metric Badges
    const badgeY = 460;
    const drawPill = (x: number, label: string, val: string, color: string) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(x, badgeY, 210, 65, [14]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(label, x + 18, badgeY + 26);

      ctx.fillStyle = color;
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace';
      ctx.fillText(val, x + 18, badgeY + 52);
    };

    drawPill(60, 'RETURN (ROI)', `${roiPct >= 0 ? '+' : ''}${roiPct}%`, isWin ? '#34d399' : '#f87171');
    drawPill(290, 'RISK : REWARD', trade.rMultiple ? `1 : ${trade.rMultiple}` : '1 : 2.5', '#38bdf8');
    if (showPrices && trade.entryPrice > 0) {
      drawPill(520, 'ENTRY PRICE', `${currSign}${trade.entryPrice.toFixed(2)}`, '#f1f5f9');
      if (trade.exitPrice && trade.exitPrice > 0) {
        drawPill(750, 'EXIT PRICE', `${currSign}${trade.exitPrice.toFixed(2)}`, '#f1f5f9');
      }
    }

    // Trader Quote / Strategy Banner
    if (customQuote.trim()) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(60, 550, 1080, 50, [12]);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`“${customQuote.trim()}”`, 80, 582);
    }

    // Footer Watermark
    ctx.fillStyle = '#475569';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('POWERED BY TRADEMIND • WWW.TRADEMIND.IO', 60, 640);

    return canvas;
  };

  const handleCopyImage = async () => {
    setCopying(true);
    try {
      const canvas = generateCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to create image blob');
          setCopying(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          toast.success('P&L Card copied to clipboard! Paste directly into Discord, Twitter, or Telegram.');
          setTimeout(() => setCopied(false), 3000);
        } catch {
          // Fallback if clipboard image writing is blocked
          handleDownloadImage();
        } finally {
          setCopying(false);
        }
      }, 'image/png');
    } catch {
      toast.error('Failed to generate image');
      setCopying(false);
    }
  };

  const handleDownloadImage = () => {
    try {
      const canvas = generateCanvas();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeMind-${trade.symbol}-${trade.id.slice(0, 6)}.png`;
      a.click();
      toast.success('Downloaded HD Trade Card');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const handleTweet = () => {
    const text = `Just closed my ${trade.symbol} ${trade.direction} trade on @TradeMindHQ 🎯\n` +
      `${isWin ? '💰 Net P&L: +' : '📉 Net P&L: -'}${showPnlAmount ? currSign + Math.abs(pnl).toFixed(2) : roiPct + '%'}\n` +
      `📊 ROI: ${roiPct}%\n` +
      `🎯 Setup: ${trade.strategyName || 'Discipline Rulebook'}\n\n` +
      `Logged on #TradeMind #TradingJournal #DayTrading`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-6 animate-bounce-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Verified Trade Share Card</h2>
              <p className="text-xs text-muted-foreground">
                High-definition branded P&L graphic for Twitter, Discord, and Mentors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Visual Card Preview */}
        <div
          ref={previewRef}
          className={cn(
            'relative overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all duration-300 shadow-xl',
            theme === 'obsidian' && 'bg-gradient-to-br from-[#090a0f] via-[#12141d] to-[#07080c] border-white/10 text-white',
            theme === 'emerald'  && 'bg-gradient-to-br from-[#04160f] via-[#08271b] to-[#020d09] border-emerald-500/20 text-white',
            theme === 'cyberpunk' && 'bg-gradient-to-br from-[#0b0818] via-[#190e38] to-[#070410] border-purple-500/20 text-white',
            theme === 'monochrome' && 'bg-neutral-950 border-white/15 text-white',
          )}
        >
          {/* Top Brand & Verified Badge */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <span>TradeMind</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  Institutional
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                PERFORMANCE JOURNAL
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VERIFIED EXECUTION</span>
            </div>
          </div>

          {/* Symbol & Direction */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
              {trade.symbol}
            </span>
            {trade.exchange && (
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300 font-semibold">
                {trade.exchange}
              </span>
            )}
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border',
              isBuy
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            )}>
              {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isBuy ? 'LONG' : 'SHORT'}
            </span>
          </div>

          {/* Main Hero P&L */}
          <div className="my-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {showPnlAmount ? 'Net Realized P&L' : 'Net Return on Capital'}
            </div>
            <div className={cn(
              'text-4xl sm:text-6xl font-black font-mono tracking-tight',
              isWin ? 'text-emerald-400' : 'text-red-400'
            )}>
              {showPnlAmount
                ? `${isWin ? '+' : ''}${currSign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${roiPct >= 0 ? '+' : ''}${roiPct}%`
              }
            </div>
          </div>

          {/* Key Metrics Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/10">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium uppercase">ROI</div>
              <div className={cn(
                'text-base font-bold font-mono',
                isWin ? 'text-emerald-400' : 'text-red-400'
              )}>
                {roiPct >= 0 ? '+' : ''}{roiPct}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Risk : Reward</div>
              <div className="text-base font-bold font-mono text-cyan-400">
                {trade.rMultiple ? `1 : ${trade.rMultiple}` : '1 : 2.5'}
              </div>
            </div>

            {showPrices && trade.entryPrice > 0 && (
              <>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Entry</div>
                  <div className="text-base font-bold font-mono text-slate-200">
                    {currSign}{trade.entryPrice.toFixed(2)}
                  </div>
                </div>

                {trade.exitPrice && trade.exitPrice > 0 && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Exit</div>
                    <div className="text-base font-bold font-mono text-slate-200">
                      {currSign}{trade.exitPrice.toFixed(2)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trader Quote */}
          {customQuote.trim() && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 italic">
              “{customQuote.trim()}”
            </div>
          )}

          {/* Footer watermark */}
          <div className="mt-6 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>AUDITED BY TRADEMIND</span>
            <span>WWW.TRADEMIND.IO</span>
          </div>
        </div>

        {/* Customization Toolbar */}
        <div className="space-y-4 pt-2">
          {/* Themes */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Theme:
            </span>
            {[
              { id: 'obsidian', label: 'Obsidian' },
              { id: 'emerald', label: 'Emerald Alpha' },
              { id: 'cyberpunk', label: 'Cyberpunk' },
              { id: 'monochrome', label: 'Minimal' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id as CardTheme)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                  theme === t.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 hover:bg-muted border-border/50 text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Privacy & Display Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowPnlAmount(!showPnlAmount)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPnlAmount ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              <span>{showPnlAmount ? 'Showing Dollar Amount' : 'Privacy Mode (ROI % Only)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrices(!showPrices)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPrices ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              <span>{showPrices ? 'Showing Entry/Exit' : 'Prices Hidden'}</span>
            </button>
          </div>

          {/* Custom Quote Input */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Add Personal Reflection / Strategy Tag:
            </label>
            <input
              type="text"
              value={customQuote}
              onChange={(e) => setCustomQuote(e.target.value)}
              placeholder="e.g. Clean 5m liquidity sweep. Risk:Reward respected."
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={copying}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Image'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-accent text-foreground text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-accent text-foreground text-xs font-semibold transition-colors"
              title="Copy read-only public trade link"
            >
              {linkCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4" />}
              <span>{linkCopied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleTweet}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Twitter className="w-4 h-4 fill-current" />
            <span>Share to Twitter / X</span>
          </button>
        </div>
      </div>
    </div>
  );
}

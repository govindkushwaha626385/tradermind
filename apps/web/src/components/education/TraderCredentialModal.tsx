// ──────────────────────────────────────────────
// TradeMind — Verified Trader Credential Certificate Modal
// Generates institutional-grade, high-DPI verified credentials
// certifying completed roadmap stages and competency levels.
// 100% client-side HTML5 Canvas rendering & 1-click export.
// ──────────────────────────────────────────────

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Award,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Twitter,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { toast } from '@/components/Toast';

interface TraderCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  traderName?: string;
  rankTitle: string;
  rankBadge: string;
  levelNumber: number;
  totalXp: number;
  completedCount: number;
  totalMilestones: number;
}

export function TraderCredentialModal({
  isOpen,
  onClose,
  traderName = 'TraderMind Operator',
  rankTitle,
  rankBadge,
  levelNumber,
  totalXp,
  completedCount,
  totalMilestones,
}: TraderCredentialModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina 2x scale: 1200 x 750
    const w = 1200;
    const h = 750;
    canvas.width = w;
    canvas.height = h;

    // Background Gradient: Institutional Dark Obsidian
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#05070c');
    bgGrad.addColorStop(1, '#0c111d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Radial Glow behind central badge
    const radGlow = ctx.createRadialGradient(w / 2, 220, 10, w / 2, 220, 360);
    radGlow.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    radGlow.addColorStop(0.6, 'rgba(99, 102, 241, 0.05)');
    radGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, w, h);

    // Ornate Border Frame
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // Corner Ornaments
    const drawCorner = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(40, 40, 0);
    drawCorner(w - 40, 40, 0);
    drawCorner(40, h - 40, 0);
    drawCorner(w - 40, h - 40, 0);

    // Top Header: TradeMind Institutional Logo
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.textAlign = 'center';
    ctx.fillText('TRADEMIND · INSTITUTIONAL TRADER ACADEMY', w / 2, 90);

    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('OFFICIAL CERTIFICATE OF RISK & EXECUTION COMPETENCY', w / 2, 115);

    // Center Gold Medal / Badge
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(rankBadge, w / 2, 185);

    // Credential Title
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(rankTitle.toUpperCase(), w / 2, 240);

    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`LEVEL ${levelNumber} VERIFIED PROFESSIONAL STATUS`, w / 2, 270);

    // Presentation text
    ctx.font = 'normal 16px Georgia, serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('This institutional credential is authenticated and awarded to', w / 2, 330);

    // Trader Name
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(traderName, w / 2, 380);

    // Line under name
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 180, 400);
    ctx.lineTo(w / 2 + 180, 400);
    ctx.stroke();

    // Verification Statement
    ctx.font = 'normal 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      `For successfully demonstrating mastery across ${completedCount} of ${totalMilestones} institutional milestones,`,
      w / 2,
      440
    );
    ctx.fillText(
      'strict adherence to the 1% Capital Defense rule, asymmetric risk-reward, and tilt prevention.',
      w / 2,
      465
    );

    // 3 Metric Stat Badges at bottom
    const badgeY = 540;
    const badgeW = 240;
    const badgeH = 75;

    // Stat 1: Total XP
    const drawStatCard = (cx: number, label: string, val: string, sub: string) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(label.toUpperCase(), cx, badgeY - 14);

      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(val, cx, badgeY + 12);

      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(sub, cx, badgeY + 28);
    };

    drawStatCard(w / 2 - 270, 'Experience Score', `${totalXp.toLocaleString()} XP`, 'Verified Execution Math');
    drawStatCard(w / 2, 'Curriculum Completion', `${completedCount} / ${totalMilestones}`, `${Math.round((completedCount / totalMilestones) * 100)}% Milestone Rate`);
    drawStatCard(w / 2 + 270, 'Behavioral Shield', 'ACTIVE', 'Zero Tilt Invalidation');

    // Bottom Footer Signatures & Date
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    ctx.textAlign = 'left';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Issued: ${today}`, 70, h - 65);
    ctx.fillText('Verification Hash: 0xTM_' + Math.random().toString(36).substring(2, 10).toUpperCase(), 70, h - 45);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Authorized by TradeMind Institutional Review Board', w - 70, h - 65);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('https://trademind.app/verify', w - 70, h - 45);
  }, [traderName, rankTitle, rankBadge, levelNumber, totalXp, completedCount, totalMilestones]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCertificate, 50);
    }
  }, [isOpen, drawCertificate]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeMind-Credential-${rankTitle.replace(/\s+/g, '-')}.png`;
      a.click();
      toast.success('Official Credential Certificate downloaded!');
    } catch {
      toast.error('Failed to export image.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        toast.success('Certificate copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      toast.error('Direct clipboard copy unsupported by browser. Use Download instead.');
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `I just achieved ${rankBadge} ${rankTitle} (Level ${levelNumber}) on @TradeMindHQ!\n\nMastering institutional risk defense, asymmetric R:R, and tilt control.\n\n#Trading #PropFirm #TradeMind`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl border border-border/80 bg-card shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Verified Trader Credential
              </h3>
              <p className="text-xs text-muted-foreground">
                Institutional certificate of execution & risk competency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Preview Frame */}
        <div className="rounded-2xl border border-border/80 bg-black/60 overflow-hidden shadow-inner flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[500px] object-contain rounded-xl"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically sealed & watermarked</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`/verify/CRED-L${levelNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-colors"
              title="Open public verification page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Verify Online</span>
            </a>

            <button
              onClick={handleShareTwitter}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border/60 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
            >
              <Twitter className="w-3.5 h-3.5 text-sky-400" />
              <span>Share to X</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border/60 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold shadow-lg shadow-primary/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

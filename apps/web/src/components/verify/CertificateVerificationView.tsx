// ──────────────────────────────────────────────
// TradeMind — Public Prop Firm Certificate Verification View
// Luxury Institutional Obsidian/Gold Aesthetic
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Share2,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Search,
  Lock,
  ArrowRight,
  Sparkles,
  Calendar,
  FileCheck2,
  CheckCheck,
} from 'lucide-react';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import type { VerifiedCertificateResult } from '@/lib/server/services/certificate-verification.service';

interface CertificateVerificationViewProps {
  certificate: VerifiedCertificateResult;
}

export function CertificateVerificationView({
  certificate,
}: CertificateVerificationViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formattedSize = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: certificate.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(certificate.accountSize);

  const formattedProfit = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: certificate.currency || 'USD',
    minimumFractionDigits: 2,
  }).format(certificate.profitEarned);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Official verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareTwitter = () => {
    const text = `Verified Prop Firm Evaluation Credential for ${certificate.firmName} (${formattedSize}) on @TradeMind Institutional Verification. Consistency Score: ${certificate.consistencyScore}/100 🛡️📈`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/verify/${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-amber-500/20 selection:text-amber-200">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-blue-500/5 blur-3xl rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight font-display text-foreground flex items-center gap-1.5">
                TradeMind
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase font-mono font-bold">
                  Audit Protocol
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                Prop Firm Certificate Verification
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify Another ID</span>
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              Join TradeMind
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
        {/* Verification Status Banner */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-background shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Award className="w-64 h-64 text-amber-400" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>OFFICIAL VERIFIED EVALUATION CREDENTIAL</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  {certificate.firmName} {formattedSize}
                </h1>
                <p className="text-sm sm:text-base text-amber-200/90 font-medium mt-1">
                  {certificate.phase} · Certified by TradeMind Institutional Audit Engine
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <span>Awarded to:</span>
                  <span className="text-amber-300 font-mono">{certificate.traderName}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Issued {certificate.issuedAt}</span>
                </span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Immutable SHA-256 Ledger</span>
                </span>
              </div>
            </div>

            {/* Verification Seal Badge */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950/80 border border-amber-500/40 shadow-xl min-w-[200px] text-center self-start md:self-auto">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                VERIFIED PASS
              </span>
              <span className="text-xs font-mono text-zinc-400 mt-0.5">
                {certificate.certificateId}
              </span>
              <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
                {certificate.verificationHash.slice(0, 16)}...
              </div>
            </div>
          </div>
        </div>

        {/* 6 Institutional Verification Metrics Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              <span>Institutional Consistency & Compliance Metrics</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              Evaluated against CFTC & Prop Firm Standards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Consistency Score */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Consistency Score
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {certificate.consistencyRating}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-foreground font-mono">
                  {certificate.consistencyScore}
                </span>
                <span className="text-sm text-muted-foreground font-mono">/100</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {certificate.consistencyExplanation}
              </p>
              <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-border/50">
                Max Single Day: {certificate.maxSingleDayProfitPct}% (Limit: 30%)
              </div>
            </div>

            {/* 2. Maximum Trailing Drawdown */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Drawdown Maintained
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  <span>Compliant</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {certificate.actualDrawdownPct}%
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  / {certificate.maxDrawdownPct}% max
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trader preserved a {certificate.drawdownSafetyBufferPct}% safety buffer against the prop firm maximum loss threshold.
              </p>
              <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                Zero Daily Loss Limit Violations
              </div>
            </div>

            {/* 3. Profit Target Hit */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Realized Return
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Target Satisfied
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-foreground font-mono">
                  +{formattedProfit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Target was +{certificate.profitTargetPct}% (+{certificate.curSymbol}{certificate.targetProfitAbs.toLocaleString()}). Completed with verified positive R:R.
              </p>
              <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-border/50">
                Starting: {formattedSize} → High: {certificate.curSymbol}{certificate.highWaterMark.toLocaleString()}
              </div>
            </div>

            {/* 4. Trading Days Fulfilled */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Trading Days
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Fulfilled
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-foreground font-mono">
                  {certificate.tradingDaysCompleted}
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  / {certificate.minTradingDays} days min
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trading activity spanned {certificate.tradingDaysCompleted} individual market sessions without reckless one-candle lot sizing.
              </p>
              <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                Minimum requirement: {certificate.minTradingDays} days
              </div>
            </div>

            {/* 5. Rule & Risk Protocol */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Risk Rule Adherence
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% Passed
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  100%
                </span>
                <span className="text-sm text-muted-foreground font-mono">Clean Record</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero rule infractions: No prohibited weekend holding, zero news blackout breaches, and verified protective stop-losses.
              </p>
              <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                Status: Audit Passed & Verified
              </div>
            </div>

            {/* 6. Cryptographic Authenticity */}
            <div className="glass-card rounded-2xl p-5 border border-border/80 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  SHA-256 Checksum
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Valid
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950 font-mono text-xs text-amber-300 break-all select-all border border-zinc-800">
                {certificate.verificationHash}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tamper-evident verification hash computed across trader identity, account size, profit reached, and issuance timestamp.
              </p>
              <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                Standard: {certificate.auditStandard}
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Sign-off & Audit Notes */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Official Evaluation Audit Memorandum</span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
            "{certificate.evaluatorNotes}"
          </p>
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/40">
            <span>Authorized by: <strong className="text-foreground">{certificate.issuer}</strong></span>
            <span>Validity: <strong className="text-emerald-400">{certificate.validUntil}</strong></span>
          </div>
        </div>

        {/* Action Toolbar for Evaluators & Recruiters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-secondary/50 border border-border/70">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              <span>{copied ? 'Copied Link!' : 'Copy Verification Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-muted-foreground" />
              <span>Print Transcript (PDF)</span>
            </button>

            <button
              onClick={handleShareTwitter}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span>Share on X</span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Verify another ID or hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Verify
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-background/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} TradeMind Institutional Trading Journal. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms & Verification Policy
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/dashboard/prop-firm" className="text-primary hover:underline">
              Trader Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

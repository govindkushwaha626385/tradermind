// ──────────────────────────────────────────────
// TradeMind — Public Prop Firm Certificate Verification Portal (/verify)
//
// Search and verification portal where prop firm recruiters, talent scouts,
// and funding evaluators can enter a certificate hash to verify a trader's
// compliance and consistency score.
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Award,
  Lock,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VerifySearchForm } from './VerifySearchForm';

export const metadata: Metadata = {
  title: 'Verify Prop Firm Certificate & Consistency Score',
  description:
    'Public verification portal for prop firm recruiters and funding evaluators. Verify trader certificates, consistency scores, max trailing drawdown, and tamper-evident SHA-256 audit signatures.',
  keywords: [
    'prop firm certificate verification',
    'FTMO certificate verification',
    'Topstep combine pass verify',
    'FundedNext certificate lookup',
    'Apex Trader Funding pass verify',
    'trader consistency score',
    'prop firm recruiter lookup',
  ],
  openGraph: {
    title: 'Prop Firm Certificate Verification Portal | TradeMind',
    description:
      'Instantly authenticate prop firm evaluation certificates and consistency scores for FTMO, Topstep, FundedNext, and Apex.',
    url: 'https://trademind.app/verify',
    siteName: 'TradeMind Institutional Verification',
  },
};

const SAMPLE_CREDENTIALS = [
  { id: 'TM-PF-FTMO-200K', label: 'FTMO $200K Funded', firm: 'FTMO', score: '97% Consistency' },
  { id: 'TM-PF-FUNDED-100K', label: 'FundedNext $100K Phase 2', firm: 'FundedNext', score: '95% Consistency' },
  { id: 'TM-PF-APEX-50K', label: 'Apex $50K PA Funded', firm: 'Apex', score: '94% Consistency' },
  { id: 'TM-PF-TOPSTEP-150K', label: 'Topstep $150K Combine', firm: 'Topstep', score: '98% Consistency' },
];

export default function VerifyPortalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-amber-500/20 selection:text-amber-200">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl opacity-60" />
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
                  Verification Portal
                </span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm">
            <Award className="w-4 h-4" />
            <span>INSTITUTIONAL PROP FIRM AUDIT ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Verify Prop Firm Certificates & Consistency Scores
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Publicly verifiable ledger where prop firm evaluators, recruitment heads, and talent scouts validate challenge passes, risk compliance, and consistency metrics.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="max-w-2xl mx-auto space-y-4">
          <VerifySearchForm />

          {/* Quick-test Benchmarks */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground font-medium">Quick benchmarks:</span>
            {SAMPLE_CREDENTIALS.map((sample) => (
              <Link
                key={sample.id}
                href={`/verify/${sample.id}`}
                className="px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:border-amber-500/40 hover:bg-accent text-xs text-foreground/90 font-medium transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="font-semibold text-amber-400">{sample.firm}</span>
                <span className="text-muted-foreground">•</span>
                <span>{sample.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 3 Pillar Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border/60">
          <div className="glass-card rounded-2xl p-6 border border-border/80 bg-card/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Cryptographic SHA-256 Seals
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every certificate incorporates a tamper-evident cryptographic hash compiled directly from immutable trade executions. Zero falsification possible.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-border/80 bg-card/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Prop Firm Consistency Standard
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculates whether single trading sessions exceed 30% of total profit, validating disciplined risk-reward rather than high-leverage gambling.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-border/80 bg-card/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Drawdown Defense Audit
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifies maximum trailing drawdown preserved during evaluation, daily loss limits adhered to, and strict stop-loss compliance.
            </p>
          </div>
        </div>

        {/* Prop Firms Supported Banner */}
        <div className="p-6 rounded-2xl border border-border/80 bg-secondary/30 text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recognized & Compatible with Leading Prop Evaluation Protocols
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm font-bold text-foreground/80 font-mono">
            <span>FTMO</span>
            <span>•</span>
            <span>TOPSTEP</span>
            <span>•</span>
            <span>FUNDEDNEXT</span>
            <span>•</span>
            <span>APEX TRADER FUNDING</span>
            <span>•</span>
            <span>THE5ERS</span>
            <span>•</span>
            <span>FUNDING PIPS</span>
          </div>
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
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/" className="text-primary hover:underline">
              TradeMind Platform
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

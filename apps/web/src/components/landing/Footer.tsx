// ──────────────────────────────────────────────
// TradeMind — Footer (Landing Page)
// ──────────────────────────────────────────────

import Link from 'next/link';
import { Brain, Twitter, Github, Mail, ArrowRight } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';

const FOOTER_LINKS = {
  Product: [
    { label: 'Live Demo Sandbox', href: '/demo' },
    { label: 'Features Overview', href: '/#features' },
    { label: 'Market News & Calendar', href: '/#news' },
    { label: 'Prop Firm Verification', href: '/verify' },
    { label: '19 Free Calculators', href: '/calculators' },
    { label: 'Trader Academy & Roadmap', href: '/education' },
    { label: 'Product Roadmap', href: '/roadmap' },
    { label: 'Product Changelog', href: '/changelog' },
    { label: 'Pricing Plans', href: '/#pricing' },
    { label: 'Strategy Store & Playbooks', href: '/store' },
  ],
  Company: [
    { label: 'Research Blog', href: '/blog' },
    { label: 'Trader Leaderboard', href: '/leaderboard' },
    { label: 'Partners & Affiliates', href: '/partners' },
    { label: 'Supported Brokers', href: '/brokers' },
    { label: 'Contact Support', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  'Brokers & Exchanges': [
    { label: 'Zerodha Kite Connect', href: '/brokers' },
    { label: 'Dhan HQ Direct API', href: '/brokers' },
    { label: 'Interactive Brokers (IBKR)', href: '/brokers' },
    { label: 'Binance & Bybit (Crypto)', href: '/brokers' },
    { label: 'ThinkorSwim & Schwab', href: '/brokers' },
    { label: 'Tradovate & NinjaTrader', href: '/brokers' },
    { label: 'Webull & Robinhood', href: '/brokers' },
    { label: 'Upstox & Angel One', href: '/brokers' },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand col */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight font-display">{APP_NAME}</span>
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              The premier automated trading journal for active multi-asset traders worldwide. Auto-sync trades, eliminate psychological leaks, and build an institutional edge.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com/trademind"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
                aria-label="TradeMind on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/trademind"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
                aria-label="TradeMind on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="mailto:support@trademind.app"
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
                aria-label="Email TradeMind support"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* CTA */}
            <Link
              href="/register"
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-md shadow-violet-500/20"
            >
              Start Free Today
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <div className="text-white font-semibold text-sm mb-4">{group}</div>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-400 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
            <span className="text-slate-500 text-xs">Made with ❤️ for Active Traders Worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

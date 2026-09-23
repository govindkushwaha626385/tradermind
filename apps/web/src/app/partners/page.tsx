'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Handshake,
  Search,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Percent,
  Zap,
  HelpCircle,
  Building2,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import type { Partner } from '@trademind/shared';

const CATEGORIES = [
  { id: 'all', label: 'All Partners' },
  { id: 'discount', label: 'Discount Brokers' },
  { id: 'full_service', label: 'Full-Service' },
  { id: 'crypto', label: 'Crypto & F&O' },
  { id: 'algo', label: 'Algo / API Ready' },
];

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    document.title = 'Partners & Exclusive Broker Deals — TradeMind';
    async function fetchPartners() {
      try {
        const res = await api.getPartners();
        if (res.data?.partners) {
          setPartners(res.data.partners);
        }
      } catch (err) {
        console.error('Failed to fetch partners:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  const handleOpenAccount = async (partner: Partner) => {
    try {
      // Track affiliate click in background
      api.trackPartnerClick(partner.id).catch(() => {});
    } finally {
      window.open(partner.affiliateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredPartners = partners.filter((p) => {
    const matchesCat =
      selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tag && p.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0A0B0F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              Trade<span className="text-emerald-400">Mind</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/calculators" className="hover:text-white transition-colors">
              Calculators
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/partners" className="text-emerald-400 font-medium">
              Partners
            </Link>
            <Link href="/store" className="hover:text-white transition-colors">
              Store
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-12 border-b border-zinc-800/60">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Official Partner Directory
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
          >
            Open an Account with Our{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Trusted Partners
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            Compare zero-brokerage pricing, TradingView chart features, and exclusive perks.
            Accounts opened through TradeMind partners automatically unlock free auto-sync and verified trader badges.
          </motion.p>

          {/* Value Props Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-zinc-300"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SEBI & FIU Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Instant TradeMind OAuth Ready</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <Percent className="w-4 h-4 text-amber-400" />
              <span>Exclusive Zero Brokerage Deals</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Filter & Search Bar ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 font-semibold'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search partner by name or feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* ── Partner Cards Grid ────────────────────────────── */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">No partners found</h3>
              <p className="text-sm mt-1 text-zinc-400">
                Try selecting another category or clearing your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredPartners.map((partner, idx) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    className="flex flex-col justify-between rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 p-6 relative group overflow-hidden"
                  >
                    {/* Background glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div>
                      {/* Top Row: Logo, Tag & Rating */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                            {partner.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={partner.logoUrl}
                                alt={partner.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                              {partner.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-zinc-400 capitalize">
                                {partner.category.replace('_', ' ')}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <div className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {partner.rating || '4.8'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {partner.tag && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold whitespace-nowrap">
                            {partner.tag}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-3.5 text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                        {partner.description ||
                          'Trade seamlessly with fast order routing, modern charts, and real-time execution.'}
                      </p>

                      {/* Commission Highlight Box */}
                      {partner.commissionNote && (
                        <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                            <Percent className="w-3 h-3" /> Exclusive Brokerage Rate
                          </div>
                          <p className="mt-1 text-xs text-zinc-200 font-medium leading-snug">
                            {partner.commissionNote}
                          </p>
                        </div>
                      )}

                      {/* Key Features Bullets */}
                      {partner.features && partner.features.length > 0 && (
                        <div className="mt-4 space-y-1.5">
                          {partner.features.slice(0, 3).map((feat, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center gap-2 text-xs text-zinc-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pricing Meta */}
                      <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-500 block">Account Opening:</span>
                          <span className="text-white font-medium">
                            {partner.accountOpeningFee || 'Free'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Maintenance (AMC):</span>
                          <span className="text-white font-medium">
                            {partner.maintenanceCharges || '₹0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <div className="mt-6 pt-2">
                      <button
                        onClick={() => handleOpenAccount(partner)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all cursor-pointer group-hover:scale-[1.01]"
                      >
                        <span>Open Free Account</span>
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* ── Partner Perks / Why Section ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/60">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Why Open Through TradeMind Partners?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Enjoy premium integrations, automatic trade journal synchronization, and zero-effort analytics.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Automatic Syncing</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Never copy-paste trade data manually. Connect your account via OAuth and have executions automatically converted into journal entries with charges and tax calculations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Percent className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Zero Hidden Fees</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Benefit from negotiated introductory pricing, zero delivery fees, and flat rate intraday trading with India&apos;s leading regulated brokerages.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Verified Trader Badge</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Traders with active partner broker connections qualify for the TradeMind Verified Trader badge on our privacy-first community leaderboard.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/80 py-8 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            © {new Date().getFullYear()} TradeMind Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-zinc-400 transition-colors">
              Home
            </Link>
            <Link href="/calculators" className="hover:text-zinc-400 transition-colors">
              Calculators
            </Link>
            <Link href="/partners" className="text-emerald-400 font-medium">
              Partners
            </Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

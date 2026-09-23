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
  Percent,
  Zap,
  Building2,
  Plug,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Partner } from '@trademind/shared';

const CATEGORIES = [
  { id: 'all', label: 'All Partners' },
  { id: 'discount', label: 'Discount Brokers' },
  { id: 'full_service', label: 'Full-Service' },
  { id: 'crypto', label: 'Crypto & F&O' },
  { id: 'algo', label: 'Algo / API Ready' },
];

export default function DashboardPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    document.title = 'Partner Directory — TradeMind';
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
    <div className="space-y-6">
      {/* ── Header Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/80 to-zinc-900 border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Exclusive Trader Perks
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Partner Directory & Account Opening
          </h1>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            Open accounts through our trusted partner links to unlock automated trade syncing,
            zero-brokerage delivery, and certified badges on TradeMind.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> SEBI & FIU Verified
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Plug className="w-3.5 h-3.5" /> OAuth Auto-Sync Supported
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Percent className="w-3.5 h-3.5" /> Negotiated Brokerage Rates
            </span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Partners Grid ─────────────────────────────────── */}
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
        <div className="py-16 text-center text-zinc-500 rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">No partners found</h3>
          <p className="text-sm mt-1 text-zinc-400">Try choosing another category or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="flex flex-col justify-between rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 p-6 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Logo & Header */}
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

                {/* Commission Offer */}
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

                {/* Features list */}
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
                    <span className="text-zinc-500 block">AMC Charges:</span>
                    <span className="text-white font-medium">
                      {partner.maintenanceCharges || '₹0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 pt-2">
                <button
                  onClick={() => handleOpenAccount(partner)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all cursor-pointer group-hover:scale-[1.01]"
                >
                  <span>Open Free Account</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

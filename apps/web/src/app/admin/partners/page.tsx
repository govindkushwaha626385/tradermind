'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Handshake,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MousePointerClick,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Building2,
  Star,
  Tag,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Partner } from '@trademind/shared';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'discount', label: 'Discount Broker' },
  { value: 'full_service', label: 'Full-Service Broker' },
  { value: 'crypto', label: 'Crypto & Derivatives' },
  { value: 'algo', label: 'Algo & API Trading' },
  { value: 'platform', label: 'Platform & Terminal' },
];

export default function AdminPartnersPage() {
  const [partnersList, setPartnersList] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    websiteUrl: '',
    affiliateUrl: '',
    description: '',
    category: 'discount',
    country: 'IN',
    isFeatured: false,
    isActive: true,
    displayOrder: 0,
    commissionNote: '',
    tag: '',
    featuresText: '',
    rating: '4.8',
    accountOpeningFee: 'Free',
    maintenanceCharges: '₹0 for 1st Year',
  });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminPartners({
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res.data?.partners) {
        setPartnersList(res.data.partners);
      }
    } catch (err) {
      console.error('Failed to load partners:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    document.title = 'Partner Directory — TradeMind | Admin';
    fetchPartners();
  }, [fetchPartners]);

  // KPI Calculations
  const totalPartners = partnersList.length;
  const activePartners = partnersList.filter((p) => p.isActive).length;
  const totalClicks = partnersList.reduce((sum, p) => sum + (p.clickCount || 0), 0);
  const topPartner = [...partnersList].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))[0];

  const handleOpenCreate = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      slug: '',
      logoUrl: '',
      websiteUrl: '',
      affiliateUrl: '',
      description: '',
      category: 'discount',
      country: 'IN',
      isFeatured: false,
      isActive: true,
      displayOrder: partnersList.length + 1,
      commissionNote: '',
      tag: 'Recommended',
      featuresText: 'Fast Execution, TradeMind OAuth Ready, TradingView Charts',
      rating: '4.8',
      accountOpeningFee: 'Free',
      maintenanceCharges: '₹0 for 1st Year',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      slug: partner.slug,
      logoUrl: partner.logoUrl || '',
      websiteUrl: partner.websiteUrl || '',
      affiliateUrl: partner.affiliateUrl,
      description: partner.description || '',
      category: partner.category || 'discount',
      country: partner.country || 'IN',
      isFeatured: partner.isFeatured,
      isActive: partner.isActive,
      displayOrder: partner.displayOrder,
      commissionNote: partner.commissionNote || '',
      tag: partner.tag || '',
      featuresText: Array.isArray(partner.features) ? partner.features.join(', ') : '',
      rating: partner.rating || '4.8',
      accountOpeningFee: partner.accountOpeningFee || 'Free',
      maintenanceCharges: partner.maintenanceCharges || '₹0 for 1st Year',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.affiliateUrl.trim()) return;

    setSaving(true);
    const features = formData.featuresText
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload: Partial<Partner> = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      logoUrl: formData.logoUrl.trim() || null,
      websiteUrl: formData.websiteUrl.trim() || null,
      affiliateUrl: formData.affiliateUrl.trim(),
      description: formData.description.trim() || null,
      category: formData.category,
      country: formData.country,
      isFeatured: formData.isFeatured,
      isActive: formData.isActive,
      displayOrder: Number(formData.displayOrder) || 0,
      commissionNote: formData.commissionNote.trim() || null,
      tag: formData.tag.trim() || null,
      features,
      rating: formData.rating.trim() || '4.8',
      accountOpeningFee: formData.accountOpeningFee.trim() || 'Free',
      maintenanceCharges: formData.maintenanceCharges.trim() || '₹0',
    };

    try {
      if (editingPartner) {
        await api.updateAdminPartner(editingPartner.id, payload);
      } else {
        await api.createAdminPartner(payload);
      }
      setModalOpen(false);
      fetchPartners();
    } catch (err) {
      console.error('Failed to save partner:', err);
      alert('Failed to save partner. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.toggleAdminPartner(id);
      fetchPartners();
    } catch (err) {
      console.error('Failed to toggle partner status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAdminPartner(id);
      setDeleteConfirmId(null);
      fetchPartners();
    } catch (err) {
      console.error('Failed to delete partner:', err);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= partnersList.length) return;

    const newList = [...partnersList];
    const currentItem = newList[index]!;
    const targetItem = newList[targetIndex]!;

    const tempOrder = currentItem.displayOrder;
    currentItem.displayOrder = targetItem.displayOrder;
    targetItem.displayOrder = tempOrder;

    newList[index] = targetItem;
    newList[targetIndex] = currentItem;

    setPartnersList(newList);

    try {
      await api.reorderAdminPartners([
        { id: currentItem.id, displayOrder: currentItem.displayOrder },
        { id: targetItem.id, displayOrder: targetItem.displayOrder },
      ]);
    } catch (err) {
      console.error('Failed to reorder:', err);
      fetchPartners();
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Handshake className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Partner Directory & Affiliates
              </h1>
              <p className="text-sm text-zinc-400">
                Manage broker partners, exclusive deals, affiliate links, and monetization perks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/partners"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 text-sm font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            View Public Page
          </a>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Total Partners
            </span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{totalPartners}</span>
            <span className="text-xs text-zinc-500">Brokers & Platforms</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Active Deals
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{activePartners}</span>
            <span className="text-xs text-emerald-400 font-medium">Live on Site</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Affiliate Clicks
            </span>
            <MousePointerClick className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {totalClicks.toLocaleString()}
            </span>
            <span className="text-xs text-purple-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              Tracking
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Top Pick Partner
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white truncate">
              {topPartner ? topPartner.name : 'None yet'}
            </span>
            {topPartner && (
              <span className="text-xs text-amber-400 font-medium">
                {topPartner.clickCount} clicks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search partners by name, tag, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => fetchPartners()}
            className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Partners Table / List ──────────────────────────── */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">Order</th>
                <th className="py-3.5 px-4">Partner</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Commission Note</th>
                <th className="py-3.5 px-4">Affiliate URL</th>
                <th className="py-3.5 px-4 text-center">Clicks</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading && partnersList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading partner directory...
                  </td>
                </tr>
              ) : partnersList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Handshake className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No partners found matching your search.
                  </td>
                </tr>
              ) : (
                partnersList.map((partner, index) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Order & Reorder Controls */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-mono text-zinc-500 w-4">
                          {partner.displayOrder}
                        </span>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={index === 0}
                            className="text-zinc-500 hover:text-emerald-400 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={index === partnersList.length - 1}
                            className="text-zinc-500 hover:text-emerald-400 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Partner Name & Tag */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center overflow-hidden shrink-0">
                          {partner.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={partner.logoUrl}
                              alt={partner.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                              {partner.name}
                            </span>
                            {partner.isFeatured && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Featured
                              </span>
                            )}
                            {partner.tag && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                                {partner.tag}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">
                            /{partner.slug} • {partner.country}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs capitalize font-medium">
                        {partner.category?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Commission Note / Perk */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-zinc-300">
                      {partner.commissionNote || (
                        <span className="text-zinc-600 italic">No notes</span>
                      )}
                    </td>

                    {/* Affiliate Link */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-400 truncate font-mono max-w-[180px]">
                          {partner.affiliateUrl}
                        </span>
                        <button
                          onClick={() => handleCopyLink(partner.affiliateUrl, partner.id)}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === partner.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={partner.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Clicks */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
                        {partner.clickCount || 0}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(partner.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          partner.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {partner.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(partner)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Partner"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(partner.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete Partner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Handshake className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-white">
                  {editingPartner ? `Edit ${editingPartner.name}` : 'Add New Partner'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Partner Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zerodha"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Slug (Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. zerodha"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Affiliate Link / Referral URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://broker.com/open-account?ref=TRADEMIND"
                  value={formData.affiliateUrl}
                  onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="discount">Discount Broker</option>
                    <option value="full_service">Full-Service Broker</option>
                    <option value="crypto">Crypto & Derivatives</option>
                    <option value="algo">Algo & API Trading</option>
                    <option value="platform">Platform & Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Tag / Badge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Most Popular, Zero Brokerage"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../logo.svg"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://broker.com"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Commission Note / Offer Details
                </label>
                <input
                  type="text"
                  placeholder="₹0 Brokerage on Equity Delivery | ₹20 on Intraday & F&O"
                  value={formData.commissionNote}
                  onChange={(e) => setFormData({ ...formData, commissionNote: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Rating (e.g. 4.9)
                  </label>
                  <input
                    type="text"
                    placeholder="4.9"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Opening Fee
                  </label>
                  <input
                    type="text"
                    placeholder="Free / ₹200"
                    value={formData.accountOpeningFee}
                    onChange={(e) => setFormData({ ...formData, accountOpeningFee: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    AMC Charges
                  </label>
                  <input
                    type="text"
                    placeholder="Zero AMC / ₹300/yr"
                    value={formData.maintenanceCharges}
                    onChange={(e) =>
                      setFormData({ ...formData, maintenanceCharges: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Key Features (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="TradingView Charts, Fast Execution, Zero Delivery, Free API"
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of the partner platform, why traders love them, and integration highlights..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Mark as Featured Partner</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Publish as Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPartner ? 'Save Changes' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Delete Partner</h3>
            <p className="text-sm text-zinc-400">
              Are you sure you want to delete this partner? This action cannot be undone and will
              remove the affiliate card from the public and dashboard pages.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

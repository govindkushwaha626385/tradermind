'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Video,
  BookOpen,
  Layers,
  X,
  ShieldCheck,
  RefreshCw,
  Clock,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import type { StoreProduct, StoreProductType } from '@trademind/shared';

export default function AdminStorePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Create/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    productType: 'PDF' as StoreProductType,
    priceInRupees: 0,
    isFree: false,
    downloadUrl: '',
    videoUrl: '',
    previewImageUrl: '',
    tags: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantProductId, setGrantProductId] = useState<string | null>(null);
  const [grantUserId, setGrantUserId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodsRes, ordersRes, analyticsRes] = await Promise.all([
        api.getAdminProducts({ limit: 100 }),
        api.getAdminStoreOrders({ limit: 100 }),
        api.getAdminStoreAnalytics(),
      ]);
      if (prodsRes.data?.products) setProducts(prodsRes.data.products);
      if (ordersRes.data?.orders) setOrders(ordersRes.data.orders);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      longDescription: '',
      productType: 'PDF',
      priceInRupees: 0,
      isFree: false,
      downloadUrl: '',
      videoUrl: '',
      previewImageUrl: '',
      tags: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (p: StoreProduct) => {
    setEditingProduct(p);
    setFormData({
      title: p.title,
      description: p.description,
      longDescription: p.longDescription || '',
      productType: p.productType,
      priceInRupees: Math.round(p.price / 100),
      isFree: p.isFree,
      downloadUrl: p.downloadUrl || '',
      videoUrl: p.videoUrl || '',
      previewImageUrl: p.previewImageUrl || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      isActive: p.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        longDescription: formData.longDescription.trim() || undefined,
        productType: formData.productType,
        price: formData.isFree ? 0 : Math.round(formData.priceInRupees * 100),
        currency: 'INR',
        isFree: formData.isFree,
        downloadUrl: formData.downloadUrl.trim() || undefined,
        videoUrl: formData.videoUrl.trim() || undefined,
        previewImageUrl: formData.previewImageUrl.trim() || undefined,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isActive: formData.isActive,
      };

      if (editingProduct) {
        await api.updateAdminProduct(editingProduct.id, payload);
      } else {
        await api.createAdminProduct(payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteAdminProduct(id);
      fetchData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete product');
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantProductId || !grantUserId.trim()) return;
    try {
      await api.grantAdminProductAccess(grantProductId, grantUserId.trim());
      alert('Access granted successfully!');
      setGrantModalOpen(false);
      setGrantUserId('');
      fetchData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to grant access');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <PageHeader
        title="Digital Products & Store Management"
        description="Create, price, and distribute trading playbooks, video courses, and indicator templates."
        icon={ShoppingBag}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-border hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Add New Product
            </button>
          </div>
        }
      />

      {/* Analytics Metric Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Store Revenue (INR)
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              ₹{(analytics.totalRevenuePaise / 100).toLocaleString()}
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Verified Razorpay Fills
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Orders
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {analytics.totalPaidOrders}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Paid customer purchases</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Catalog Items
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {analytics.activeProducts} / {analytics.totalProducts}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Published active products</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Pending Reviews
            </div>
            <div className="text-2xl font-extrabold text-amber-500 mt-1">
              {analytics.pendingReviewsCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting moderation</div>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'products'
              ? 'bg-accent text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Products List ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'orders'
              ? 'bg-accent text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Customer Orders ({orders.length})
        </button>
      </div>

      {/* TAB 1: Products Table */}
      {activeTab === 'products' && (
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Sales</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      <div>{p.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 font-normal">
                        {p.description}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-accent text-foreground border border-border">
                        {p.productType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold">
                      {p.isFree || p.price === 0 ? (
                        <span className="text-emerald-500">FREE</span>
                      ) : (
                        `₹${(p.price / 100).toFixed(0)}`
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {p.totalSales}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-500/10 text-zinc-400'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setGrantProductId(p.id);
                          setGrantModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Grant User Access"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.title)}
                        className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Customer Orders */}
      {activeTab === 'orders' && (
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Gateway</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      <div>{ord.userName}</div>
                      <div className="text-xs text-muted-foreground font-normal">{ord.userEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">
                      {ord.productTitle}
                      <span className="ml-1.5 text-xs text-muted-foreground">({ord.productType})</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold">
                      {ord.amountPaid === 0 ? 'FREE' : `₹${(ord.amountPaid / 100).toFixed(0)}`}
                    </td>
                    <td className="px-4 py-3.5 uppercase text-xs font-semibold text-muted-foreground">
                      {ord.provider}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ord.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Digital Product' : 'Create New Digital Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Master Class: Price Action Breakouts PDF"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase mb-1">
                    Product Type
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) =>
                      setFormData({ ...formData, productType: e.target.value as StoreProductType })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PDF">PDF / Document</option>
                    <option value="VIDEO">Video Masterclass</option>
                    <option value="COURSE">Complete Course</option>
                    <option value="TEMPLATE">Strategy / Indicator Template</option>
                    <option value="BUNDLE">Bundle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase mb-1">
                    Price (INR)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.priceInRupees}
                      onChange={(e) =>
                        setFormData({ ...formData, priceInRupees: Number(e.target.value) })
                      }
                      disabled={formData.isFree}
                      placeholder="e.g. 499"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300">
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                        className="rounded accent-indigo-500"
                      />
                      Free
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  Short Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description displayed on store cards..."
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  Full Details & Curriculum (Markdown)
                </label>
                <textarea
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  placeholder="Detailed breakdown shown on product page..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase mb-1">
                    Download File URL (Protected)
                  </label>
                  <input
                    type="text"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    placeholder="https://... (only visible after purchase)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 uppercase mb-1">
                    Video URL (YouTube/Vimeo)
                  </label>
                  <input
                    type="text"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  Preview Image URL (Thumbnail)
                </label>
                <input
                  type="text"
                  value={formData.previewImageUrl}
                  onChange={(e) => setFormData({ ...formData, previewImageUrl: e.target.value })}
                  placeholder="https://... (card thumbnail)"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Price Action, Options, Risk"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-zinc-200 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded accent-indigo-500 w-4 h-4"
                    />
                    Published & Active in Store
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Grant Free Access to User</h3>
              <button
                onClick={() => setGrantModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGrantAccess} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  User UUID
                </label>
                <input
                  type="text"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  placeholder="Paste user UUID from Users page..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

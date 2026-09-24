'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  FileText,
  Video,
  BookOpen,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Lock,
  Download,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Star,
  Zap,
  PackageCheck,
  X,
  Eye,
} from 'lucide-react';
import { api, getAccessToken } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import type { StoreProduct, StoreProductType } from '@trademind/shared';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Products' },
  { id: 'PDF', label: 'PDF Playbooks' },
  { id: 'VIDEO', label: 'Video Lessons' },
  { id: 'COURSE', label: 'Courses' },
  { id: 'TEMPLATE', label: 'Templates' },
];

export default function DashboardStorePage() {
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<StoreProduct | null>(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getStoreProducts(selectedCategory === 'ALL' ? undefined : selectedCategory);
      if (res.data) {
        setProducts(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load store products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handlePurchase = async (product: StoreProduct) => {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?redirect=/dashboard/store/${product.id}`);
      return;
    }

    setPurchasingId(product.id);
    setError(null);

    try {
      const res = await api.purchaseProduct(product.id);
      const data = res.data;

      // Free product — direct unlock
      if (data?.isFree || data?.hasAccess) {
        router.push('/dashboard/purchases');
        return;
      }

      // Paid product — trigger Razorpay Checkout
      if (data?.razorpayOrderId && data?.razorpayKeyId) {
        const options = {
          key: data.razorpayKeyId,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'TradeMind Store',
          description: data.productTitle || product.title,
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            try {
              await api.verifyProductPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                productId: product.id,
                orderId: data.orderId!,
              });
              router.push('/dashboard/purchases?success=true');
            } catch (verifyErr: any) {
              setError(verifyErr?.message ?? 'Payment verification failed.');
            }
          },
          theme: {
            color: '#6366f1',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to initiate checkout.');
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const getIcon = (type: StoreProductType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'VIDEO':
        return <Video className="w-5 h-5 text-sky-400" />;
      case 'COURSE':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      default:
        return <Layers className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <PageHeader
        title="Digital Store & Tooling"
        description="Handcrafted institutional playbooks, video masterclasses, and quantitative models."
        icon={ShoppingBag}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/purchases"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold shadow-sm transition-all"
            >
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              My Purchases & Library
            </Link>
          </div>
        }
      />

      {/* Banner / Value Prop */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/90 to-zinc-900 border border-indigo-500/20 p-5 sm:p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" /> Lifetime Digital Library
            </div>
            <h2 className="text-lg font-bold text-white">Upgrade Your Trading Edge</h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              All digital materials include instant lifetime access, full downloadable strategy PDFs, and direct integration into TradeMind playbooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Instant Unlocks
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Lock className="w-4 h-4" /> Secure Razorpay
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Zap className="w-4 h-4" /> Free & Premium
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
          {error}
        </div>
      )}

      {/* Controls: Category tabs + Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search playbooks, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">No products found</h3>
          <p className="text-xs text-zinc-400 mt-1">Try selecting another category or clearing your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const isFree = prod.isFree || prod.price === 0;
            const formattedPrice = isFree ? 'Free' : `₹${(prod.price / 100).toLocaleString('en-IN')}`;

            return (
              <div
                key={prod.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-zinc-900/80 border border-zinc-800/90 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-indigo-500/5"
              >
                {/* Top preview illustration */}
                <div className="h-44 relative bg-gradient-to-br from-zinc-800/60 to-zinc-950 flex items-center justify-center p-6 border-b border-zinc-800/80 group-hover:scale-[1.01] transition-transform duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-xl flex items-center justify-center">
                    {getIcon(prod.productType)}
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-900/90 border border-zinc-700 text-zinc-300 backdrop-blur-md">
                      {prod.productType}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide ${
                        isFree
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {formattedPrice}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {prod.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  {/* Tags */}
                  {prod.tags && prod.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {prod.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => setPreviewProduct(prod)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Quick Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <button
                      onClick={() => handlePurchase(prod)}
                      disabled={purchasingId === prod.id}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                        isFree
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                      }`}
                    >
                      {purchasingId === prod.id ? (
                        'Processing...'
                      ) : isFree ? (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Unlock Free</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/dashboard/store/${prod.id}`}
                      className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white transition-colors"
                      title="Open Detail Page"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Quick Preview Drawer */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setPreviewProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                {getIcon(previewProduct.productType)}
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {previewProduct.productType}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{previewProduct.title}</h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {previewProduct.longDescription || previewProduct.description}
            </p>

            {previewProduct.tags && previewProduct.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {previewProduct.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500">Price</div>
                <div className="text-lg font-black text-white">
                  {previewProduct.isFree || previewProduct.price === 0
                    ? 'Free'
                    : `₹${(previewProduct.price / 100).toLocaleString('en-IN')}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/store/${previewProduct.id}`}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  Full Details
                </Link>
                <button
                  onClick={() => {
                    const p = previewProduct;
                    setPreviewProduct(null);
                    handlePurchase(p);
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {previewProduct.isFree || previewProduct.price === 0 ? 'Unlock Free' : 'Buy Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

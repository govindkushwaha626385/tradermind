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
  ArrowLeft,
} from 'lucide-react';
import { api, getAccessToken } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import type { StoreProduct, StoreProductType } from '@trademind/shared';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StoreCatalogPage() {
  const router = useRouter();
  const { currency, format } = useCurrency();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
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
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handlePurchase = async (product: StoreProduct) => {
    // Check if user is logged in
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?redirect=/store/${product.id}`);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <Link
            href="/dashboard/store"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/purchases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
              My Purchases
            </Link>
          </div>
        </div>

        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            TradeMind Digital Library & Tooling
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Institutional Playbooks, Video Masterclasses & Quantitative Tools
          </h1>
          <p className="text-base sm:text-lg text-zinc-400">
            Handcrafted strategy PDFs, video breakdowns, and psychological execution guides designed to make you a consistent trader.
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Instant Lifetime Access
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Free & Premium Resources
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              Secure 256-Bit Razorpay Checkout
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-2xl mx-auto text-center">
            {error}
          </div>
        )}

        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'All Products' },
              { id: 'PDF', label: 'PDF Playbooks' },
              { id: 'VIDEO', label: 'Video Lessons' },
              { id: 'COURSE', label: 'Courses' },
              { id: 'TEMPLATE', label: 'Templates' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3">
            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Products Found</h3>
            <p className="text-sm text-zinc-400">
              {searchQuery ? 'Try another search keyword.' : 'Check back soon for upcoming masterclasses and guides!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const isFree = prod.isFree || prod.price === 0;
              const formattedPrice = isFree ? 'FREE' : format(prod.price / 100, prod.currency || currency);

              return (
                <div
                  key={prod.id}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 overflow-hidden flex flex-col group shadow-lg"
                >
                  {/* Card Media / Thumbnail */}
                  <div className="relative h-44 bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {prod.previewImageUrl ? (
                      <img
                        src={prod.previewImageUrl}
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2">
                          {getIcon(prod.productType)}
                        </div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          {prod.productType}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur border border-zinc-700/80 text-[11px] font-bold text-white">
                      {getIcon(prod.productType)}
                      <span>{prod.productType}</span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black shadow-md ${
                          isFree
                            ? 'bg-emerald-500 text-black'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {formattedPrice}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {prod.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>

                      {/* Tags */}
                      {prod.tags && prod.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {prod.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom CTA */}
                    <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                      <Link
                        href={`/store/${prod.id}`}
                        className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                      >
                        View Details →
                      </Link>

                      <button
                        onClick={() => handlePurchase(prod)}
                        disabled={purchasingId === prod.id}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                          isFree
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                        }`}
                      >
                        {purchasingId === prod.id ? (
                          'Processing...'
                        ) : isFree ? (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Get Free Access</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Buy {formattedPrice}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  Download,
  Lock,
  CheckCircle2,
  FileText,
  Video,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Zap,
  Play,
  PackageCheck,
} from 'lucide-react';
import { api, getAccessToken } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import type { StoreProduct } from '@trademind/shared';

export default function DashboardProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { format } = useCurrency();
  const productId = params.productId as string;

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api
      .getStoreProduct(productId)
      .then((res) => {
        if (res.data) setProduct(res.data);
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Product not found.');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const handlePurchase = async () => {
    if (!product) return;
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?redirect=/dashboard/store/${product.id}`);
      return;
    }

    setPurchasing(true);
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

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to initiate purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShoppingBag className="w-12 h-12 text-zinc-600" />
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <p className="text-zinc-400 text-xs max-w-sm">{error || "The requested item doesn't exist."}</p>
        <Link
          href="/dashboard/store"
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
        >
          Back to Store
        </Link>
      </div>
    );
  }

  const isFree = product.isFree || product.price === 0;
  const formattedPrice = isFree ? 'FREE' : format(product.price / 100);

  let youtubeEmbedUrl: string | null = null;
  if (product.videoUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = product.videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      youtubeEmbedUrl = `https://www.youtube.com/embed/${match[2]}`;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top breadcrumb / navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/store"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Digital Store
        </Link>

        <Link
          href="/dashboard/purchases"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
        >
          <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
          My Library
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Content Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              {product.productType === 'PDF' && <FileText className="w-3.5 h-3.5" />}
              {product.productType === 'VIDEO' && <Video className="w-3.5 h-3.5" />}
              {product.productType === 'COURSE' && <BookOpen className="w-3.5 h-3.5" />}
              {product.productType}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {product.title}
            </h1>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Video Player Preview */}
          {youtubeEmbedUrl && (
            <div className="rounded-2xl overflow-hidden border border-zinc-800 aspect-video shadow-2xl bg-black">
              <iframe
                src={youtubeEmbedUrl}
                title={product.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Curriculum / Deep Description */}
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              What You Will Learn & Receive
            </h3>
            <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {product.longDescription || product.description}
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="pt-4 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-zinc-500 font-semibold">Tags:</span>
                {product.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pricing / Checkout Sidebar Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 sticky top-6 shadow-2xl space-y-6">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Access Fee</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{formattedPrice}</span>
              {!isFree && <span className="text-xs text-zinc-400">one-time payment</span>}
            </div>
          </div>

          <div className="space-y-3 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant lifetime access in your TradeMind account</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct PDF download & offline review</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rule templates importable into Checklists</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className={`w-full py-3 rounded-xl font-bold text-xs shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isFree
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {purchasing ? (
              'Processing...'
            ) : isFree ? (
              <>
                <Download className="w-4 h-4" />
                <span>Get Free Access Now</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Buy Now ({formattedPrice})</span>
              </>
            )}
          </button>

          <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            Secured by Razorpay • Instant Auto-Sync
          </div>
        </div>
      </div>
    </div>
  );
}

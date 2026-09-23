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
} from 'lucide-react';
import { api, getAccessToken } from '@/lib/api';
import type { StoreProduct } from '@trademind/shared';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.getStoreProduct(productId)
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
      router.push(`/login?redirect=/store/${product.id}`);
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const res = await api.purchaseProduct(product.id);
      const data = res.data;

      if (data?.isFree || data?.hasAccess) {
        router.push('/dashboard/purchases');
        return;
      }

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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 space-y-4">
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <p className="text-zinc-400 text-sm">{error || "The requested item doesn't exist."}</p>
        <Link
          href="/store"
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
        >
          Back to Store
        </Link>
      </div>
    );
  }

  const isFree = product.isFree || product.price === 0;
  const formattedPrice = isFree ? 'FREE' : `₹${(product.price / 100).toFixed(0)}`;

  // Embed YouTube video if present
  let youtubeEmbedUrl: string | null = null;
  if (product.videoUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = product.videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      youtubeEmbedUrl = `https://www.youtube.com/embed/${match[2]}`;
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <Link
          href="/store"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store Catalog
        </Link>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Main Info (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                {product.productType === 'PDF' && <FileText className="w-3.5 h-3.5" />}
                {product.productType === 'VIDEO' && <Video className="w-3.5 h-3.5" />}
                {product.productType === 'COURSE' && <BookOpen className="w-3.5 h-3.5" />}
                {product.productType}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {product.title}
              </h1>
              <p className="text-zinc-400 text-base mt-3 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Video Preview Player if available */}
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

            {/* Detailed Description */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                What You Will Learn & Receive
              </h3>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {product.longDescription || product.description}
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="pt-4 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-500 font-semibold">Topics:</span>
                  {product.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Checkout Card (1 col) */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 sticky top-8 shadow-2xl space-y-6">
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pricing</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-white">{formattedPrice}</span>
                {!isFree && <span className="text-xs text-zinc-400">one-time payment</span>}
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant lifetime access in your library</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited downloads & offline study</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified institutional strategies</span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
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

            <div className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              Secured by Razorpay • Instant Access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

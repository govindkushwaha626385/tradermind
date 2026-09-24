'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Download,
  Video,
  FileText,
  BookOpen,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Receipt,
  X,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

export default function UserPurchasesPage() {
  const { format } = useCurrency();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'orders'>('library');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Video playback modal
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, ordersRes] = await Promise.all([
        api.getMyPurchases(),
        api.getUserOrderHistory(),
      ]);
      if (purchasesRes.data) setPurchases(purchasesRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error('Failed to fetch user library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccess = async (productId: string) => {
    setDownloadingId(productId);
    try {
      const res = await api.accessProduct(productId);
      if (res.data) {
        if (res.data.downloadUrl) {
          window.open(res.data.downloadUrl, '_blank');
        } else if (res.data.videoUrl) {
          setSelectedVideo({ title: res.data.title, url: res.data.videoUrl });
        }
      }
    } catch (err: any) {
      alert(err?.message ?? 'Failed to access product file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getYoutubeEmbed = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="My Library & Purchases"
        description="Access your purchased playbooks, courses, and download billing receipts."
        icon={ShoppingBag}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/store"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Browse Store
            </Link>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'library'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                My Library ({purchases.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Orders ({orders.length})
              </button>
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'library' ? (
        purchases.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-4">
            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Your Library is Empty</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              You haven&apos;t added any products yet. Browse our free and premium trading playbooks and video masterclasses.
            </p>
            <Link
              href="/dashboard/store"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
            >
              Explore Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((item) => (
              <div
                key={item.accessId}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between shadow-xl"
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="h-40 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                    {item.previewImageUrl ? (
                      <img
                        src={item.previewImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        {item.productType === 'VIDEO' ? (
                          <Video className="w-6 h-6 text-sky-400" />
                        ) : (
                          <FileText className="w-6 h-6 text-indigo-400" />
                        )}
                      </div>
                    )}

                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur text-[10px] font-bold text-white border border-zinc-700/80">
                      {item.productType}
                    </div>

                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Unlocked
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-white line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="text-[11px] text-zinc-500 pt-1">
                      Accessed {item.downloadCount} times • Granted{' '}
                      {new Date(item.accessGrantedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleAccess(item.productId)}
                    disabled={downloadingId === item.productId}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    {item.productType === 'VIDEO' ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Watch Video</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === item.productId ? 'Fetching...' : 'Open / Download'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Orders History Table */
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Payment & Order Transactions</h3>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">No payment orders recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {orders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        {ord.title}
                        <span className="ml-2 text-[10px] text-zinc-500 font-normal">
                          ({ord.productType})
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-200">
                        {ord.amountPaid === 0 ? 'FREE' : format(ord.amountPaid / 100)}
                      </td>
                      <td className="px-4 py-3 uppercase font-semibold text-zinc-400">
                        {ord.provider}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Video Playback Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white line-clamp-1">{selectedVideo.title}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
              <iframe
                src={getYoutubeEmbed(selectedVideo.url)}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

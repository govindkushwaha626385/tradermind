'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Sparkles,
  RefreshCw,
  Clock,
  User,
  MessageSquare,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'featured' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminReviews({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      });
      if (res.data?.reviews) {
        setReviews(res.data.reviews);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveAdminReview(id);
      fetchReviews();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to approve review');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectAdminReview(id);
      fetchReviews();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to reject review');
    }
  };

  const handleToggleFeature = async (id: string, currentFeatured: boolean) => {
    try {
      await api.featureAdminReview(id, !currentFeatured);
      fetchReviews();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to toggle featured status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      await api.deleteAdminReview(id);
      fetchReviews();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <PageHeader
        title="User Reviews & Testimonials Moderation"
        description="Review user-submitted testimonials before they appear on the landing page and social proof widgets."
        icon={Star}
        actions={
          <button
            onClick={fetchReviews}
            className="p-2 rounded-xl border border-border hover:bg-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'pending', label: 'Pending Moderation' },
          { id: 'approved', label: 'Approved Testimonials' },
          { id: 'featured', label: 'Featured on Landing Page' },
          { id: 'all', label: 'All Reviews' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === tab.id
                ? 'bg-accent text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews Cards List */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading testimonials...</div>
      ) : reviews.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-border space-y-2">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Reviews Found</h3>
          <p className="text-xs text-muted-foreground">
            No testimonials match the selected status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="glass-card p-5 rounded-2xl border border-border flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                {/* User & Rating header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      {rev.displayName || rev.userName}
                      {rev.traderType && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">
                          {rev.traderType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{rev.userEmail}</div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h4 className="text-sm font-bold text-foreground">{rev.headline}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                    &quot;{rev.body}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Submitted {new Date(rev.createdAt).toLocaleDateString()}</span>
                  {rev.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                  {rev.isApproved ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleFeature(rev.id, rev.isFeatured)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                    rev.isFeatured
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {rev.isFeatured ? 'Featured' : 'Feature on Landing'}
                </button>

                <div className="flex items-center gap-2">
                  {!rev.isApproved ? (
                    <button
                      onClick={() => handleApprove(rev.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReject(rev.id)}
                      className="px-3 py-1.5 rounded-xl border border-border hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold"
                    >
                      Un-Approve
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(rev.id)}
                    className="p-1.5 rounded-xl border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

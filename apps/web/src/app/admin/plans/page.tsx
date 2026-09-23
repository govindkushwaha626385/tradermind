// ──────────────────────────────────────────────
// TradeMind — Admin Plans Page
//
// Allows admins to:
// - View all subscription plans
// - Create new plans
// - Edit existing plans (name, price, features)
// - Delete plans safely with ConfirmDialog
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
  features: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  isPopular: boolean;
  createdAt: string;
}

const emptyPlan = {
  slug: '',
  name: '',
  description: '',
  amount: 0,
  currency: 'INR',
  interval: 'month' as const,
  features: {},
  isActive: true,
  sortOrder: 0,
  isPopular: false,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editPlan, setEditPlan] = useState<Partial<Plan> & { features: Record<string, unknown> }>(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState('{}');

  // ConfirmDialog delete state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = 'Plans — TradeMind | Admin';
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminPlans();
      if (res.success) setPlans((res.data as Plan[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreate = () => {
    setEditPlan(emptyPlan);
    setFeaturesText('{}');
    setEditingId(null);
    setShowEditor(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setFeaturesText(JSON.stringify(plan.features ?? {}, null, 2));
    setEditingId(plan.id);
    setShowEditor(true);
  };

  const handleSave = async () => {
    let parsedFeatures: Record<string, unknown> = {};
    try {
      parsedFeatures = JSON.parse(featuresText);
    } catch {
      toast.error('Invalid JSON in features field');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...editPlan, features: parsedFeatures };
      if (editingId) {
        await api.updateAdminPlan(editingId, payload);
        toast.success(`Plan "${editPlan.name}" updated`);
      } else {
        await api.createAdminPlan(payload);
        toast.success(`Plan "${editPlan.name}" created`);
      }
      setShowEditor(false);
      await fetchPlans();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (plan: Plan) => {
    setDeleteTarget(plan);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteAdminPlan(deleteTarget.id);
      toast.success(`Plan "${deleteTarget.name}" deleted`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      await fetchPlans();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete plan');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    const value = amount / 100;
    return `${symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* ConfirmDialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Subscription Plan"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.slug})? Existing subscribers will retain access until their period ends, but no new users can subscribe to this tier.`
            : ''
        }
        confirmLabel="Delete Plan"
        cancelLabel="Keep Plan"
        danger
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />

      <PageHeader
        title="Subscription Plans"
        description="Configure pricing tiers, active features, and recurring billing terms"
        icon={Layers}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlans}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Layers}
            title="No subscription plans yet"
            description="Create your first pricing plan to allow users to subscribe."
            action={{
              label: 'Create First Plan',
              onClick: openCreate,
            }}
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'glass-card rounded-2xl p-6 relative transition-all duration-300 hover:shadow-card-hover flex flex-col justify-between',
                plan.isPopular && 'ring-2 ring-primary shadow-glow',
                !plan.isActive && 'opacity-60 grayscale-[30%]',
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{plan.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => requestDelete(plan)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-3xl font-extrabold mb-2 font-mono text-foreground">
                  {formatPrice(plan.amount, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground font-sans ml-1">
                    /{plan.interval === 'year' ? 'yr' : plan.interval === 'month' ? 'mo' : plan.interval}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plan.description}</p>
                )}

                <div className="space-y-2 mb-6 border-t border-border/60 pt-4">
                  {Object.entries(plan.features ?? {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      </span>
                      <span
                        className={cn(
                          'font-semibold font-mono',
                          value === false ? 'text-destructive' : 'text-success',
                        )}
                      >
                        {value === true ? '✓ Included' : value === false ? '✗ Excluded' : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full font-semibold border',
                    plan.isActive
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-muted text-muted-foreground border-border/50',
                  )}
                >
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="font-mono">Sort Order: {plan.sortOrder}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4 shadow-card-lg animate-bounce-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">{editingId ? 'Edit Plan' : 'Create Plan'}</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Slug (Unique identifier)</label>
                  <input
                    type="text"
                    value={editPlan.slug ?? ''}
                    onChange={(e) => setEditPlan({ ...editPlan, slug: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="pro_monthly"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <input
                    type="text"
                    value={editPlan.name ?? ''}
                    onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Pro Monthly"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={editPlan.description ?? ''}
                  onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="For active traders seeking automated journaling"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Amount (paise / cents)</label>
                  <input
                    type="number"
                    value={editPlan.amount ?? 0}
                    onChange={(e) => setEditPlan({ ...editPlan, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <input
                    type="text"
                    value={editPlan.currency ?? 'INR'}
                    onChange={(e) => setEditPlan({ ...editPlan, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Billing Interval</label>
                  <select
                    value={editPlan.interval ?? 'month'}
                    onChange={(e) => setEditPlan({ ...editPlan, interval: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="one-time">One-time</option>
                    <option value="free">Free</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Feature Flags (JSON)</label>
                <textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={5}
                  placeholder='{"maxTradesPerMonth": 100, "aiInsights": true}'
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Sort Order</label>
                  <input
                    type="number"
                    value={editPlan.sortOrder ?? 0}
                    onChange={(e) => setEditPlan({ ...editPlan, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5 flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPlan.isActive ?? true}
                      onChange={(e) => setEditPlan({ ...editPlan, isActive: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
                <div className="space-y-1.5 flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPlan.isPopular ?? false}
                      onChange={(e) => setEditPlan({ ...editPlan, isPopular: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium">Popular</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-xl border border-input text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editPlan.name || !editPlan.slug}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingId ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

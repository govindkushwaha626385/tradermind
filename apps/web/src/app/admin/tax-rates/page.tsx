// ──────────────────────────────────────────────
// TradeMind — Admin Tax Rates Management Page
//
// Allows admins to view, add, edit, and toggle statutory tax rates
// (STT, Stamp Duty, GST, Turnover fees, SEBI charges).
// Features: ConfirmDialog, SkeletonTable, EmptyState, segment filter, document.title.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Percent,
  Search,
  Sliders,
  Edit2,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { downloadCsv } from '@/lib/export-csv';

interface TaxRate {
  id: string;
  name: string;
  description: string | null;
  segment: string;
  transactionType: string | null;
  rateType: 'percentage' | 'flat';
  rateValue: number;
  appliedOn: 'buy' | 'sell' | 'both';
  maxCap: number | null;
  minAmount: number | null;
  isActive: boolean;
  priority: number;
}

const emptyTaxRate: Omit<TaxRate, 'id'> = {
  name: '',
  description: '',
  segment: 'EQUITY',
  transactionType: null,
  rateType: 'percentage',
  rateValue: 0,
  appliedOn: 'both',
  maxCap: null,
  minAmount: null,
  isActive: true,
  priority: 0,
};

export default function AdminTaxRatesPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TaxRate, 'id'>>(emptyTaxRate);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  // ConfirmDialog state for delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaxRate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = 'Tax Rates — TradeMind | Admin';
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminTaxRates();
      if (res.success) setTaxRates((res.data as TaxRate[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch tax rates:', err);
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyTaxRate);
    setShowModal(true);
  };

  const openEdit = (rate: TaxRate) => {
    setEditingId(rate.id);
    const { id: _, ...rest } = rate;
    setForm(rest);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.updateAdminTaxRate(editingId, form);
        toast.success('Tax rate updated successfully');
      } else {
        await api.createAdminTaxRate(form);
        toast.success('Tax rate created successfully');
      }
      setShowModal(false);
      await fetchRates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save tax rate');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (rate: TaxRate) => {
    setDeleteTarget(rate);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteAdminTaxRate(deleteTarget.id);
      toast.success(`Tax rate "${deleteTarget.name}" deleted`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      await fetchRates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete tax rate');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRates = taxRates.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesSegment = !segmentFilter || r.segment.toUpperCase() === segmentFilter.toUpperCase();
    return matchesSearch && matchesSegment;
  });

  const handleExportCsv = () => {
    if (taxRates.length === 0) {
      toast.error('No tax rates available to export');
      return;
    }
    downloadCsv('trademind-statutory-tax-rates', taxRates, [
      { header: 'Rule Name', accessor: (r) => r.name },
      { header: 'Segment', accessor: (r) => r.segment },
      { header: 'Applies On', accessor: (r) => r.appliedOn },
      { header: 'Rate Type', accessor: (r) => r.rateType },
      { header: 'Rate Value', accessor: (r) => r.rateValue },
      { header: 'Active', accessor: (r) => r.isActive ? 'Active' : 'Disabled' },
      { header: 'Description', accessor: (r) => r.description ?? '' },
    ]);
    toast.success('Exported statutory tax rates to CSV');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* ConfirmDialog for deletion */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Tax Rate Rule"
        description={
          deleteTarget
            ? `Are you sure you want to delete the "${deleteTarget.name}" tax rule (${deleteTarget.segment})? Trades calculated afterwards will no longer include this charge.`
            : ''
        }
        confirmLabel="Delete Rule"
        cancelLabel="Keep Rule"
        danger
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />

      <PageHeader
        title="Tax & Statutory Rates"
        description="Configure STT, GST, stamp duty, SEBI turnover fees, and exchange charges"
        icon={Percent}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={taxRates.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/80 hover:bg-accent text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchRates}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
              title="Refresh rates"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Add Rate
            </button>
          </div>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by rate name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Segments</option>
          <option value="EQUITY">Equity</option>
          <option value="FNO">Futures &amp; Options (FNO)</option>
          <option value="COMMODITY">Commodity</option>
          <option value="CURRENCY">Currency</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={6} cols={6} />
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Percent}
            title={search || segmentFilter ? 'No matching tax rates' : 'No tax rates configured'}
            description={
              search || segmentFilter
                ? 'Try adjusting your search criteria or segment filter.'
                : 'Tax rules calculate net P&L and statutory deductions automatically.'
            }
            action={
              search || segmentFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setSegmentFilter('');
                    },
                  }
                : {
                    label: 'Add First Rate',
                    onClick: openCreate,
                  }
            }
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-accent/20">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Rule Name</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Segment</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Applies On</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Rate Value</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRates.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-accent/40 transition-colors cursor-pointer group"
                    onClick={() => openEdit(r)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {r.name}
                      </div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono font-medium">
                      <span className="px-2 py-0.5 rounded bg-accent/60 text-muted-foreground">
                        {r.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs capitalize text-muted-foreground font-medium">
                      {r.appliedOn}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-mono font-bold text-foreground">
                      {r.rateType === 'percentage' ? `${r.rateValue}%` : `₹${r.rateValue}`}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                          r.isActive
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground border-border/50',
                        )}
                      >
                        {r.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requestDelete(r)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete Rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4 shadow-card-lg animate-bounce-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">{editingId ? 'Edit Tax Rate' : 'New Tax Rate'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Rule Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., STT Delivery or GST Brokerage"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                <input
                  type="text"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note on applicability"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Segment</label>
                  <select
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="EQUITY">Equity</option>
                    <option value="FNO">Futures &amp; Options</option>
                    <option value="COMMODITY">Commodity</option>
                    <option value="CURRENCY">Currency</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Applied On</label>
                  <select
                    value={form.appliedOn}
                    onChange={(e) => setForm({ ...form, appliedOn: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                    <option value="both">Both (Turnover)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Rate Type</label>
                  <select
                    value={form.rateType}
                    onChange={(e) => setForm({ ...form, rateType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.rateValue}
                    onChange={(e) => setForm({ ...form, rateValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="font-medium text-foreground">Rule is Active</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-input text-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Rule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Checklist Manager
//
// CRUD interface for creating and managing checklist
// templates. Each template has rules that traders
// check off after every trade.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  X,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface Rule {
  id: string;
  label: string;
  order: number;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_RULE = (order: number): Rule => ({
  id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  label: '',
  order,
});

export default function ChecklistManagerPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [editing, setEditing]     = useState<ChecklistTemplate | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);

  // Form state
  const [formName, setFormName]   = useState('');
  const [formDesc, setFormDesc]   = useState('');
  const [formRules, setFormRules] = useState<Rule[]>([]);
  const [saving, setSaving]       = useState(false);

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmId, setConfirmId]       = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    document.title = 'Checklists — TradeMind';
    fetchChecklists();
  }, []);

  async function fetchChecklists() {
    setLoading(true);
    try {
      const res = await api.getChecklists();
      if (res.success) setTemplates((res.data as ChecklistTemplate[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch checklists:', err);
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }

  const openNewForm = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormRules([DEFAULT_RULE(1), DEFAULT_RULE(2), DEFAULT_RULE(3)]);
    setShowForm(true);
  };

  const openEditForm = (tpl: ChecklistTemplate) => {
    setEditing(tpl);
    setFormName(tpl.name);
    setFormDesc(tpl.description ?? '');
    setFormRules([...tpl.rules].sort((a, b) => a.order - b.order));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const addRule = () => setFormRules([...formRules, DEFAULT_RULE(formRules.length + 1)]);

  const removeRule = (ruleId: string) =>
    setFormRules(formRules.filter((r) => r.id !== ruleId).map((r, i) => ({ ...r, order: i + 1 })));

  const updateRule = (ruleId: string, label: string) =>
    setFormRules(formRules.map((r) => (r.id === ruleId ? { ...r, label } : r)));

  const handleSave = async () => {
    if (!formName.trim() || formRules.filter((r) => r.label.trim()).length === 0) return;

    const cleanedRules = formRules
      .filter((r) => r.label.trim())
      .map((r, i) => ({ ...r, order: i + 1, label: r.label.trim() }));

    setSaving(true);
    try {
      if (editing) {
        await api.updateChecklist(editing.id, { name: formName, description: formDesc, rules: cleanedRules });
        toast.success('Checklist updated');
      } else {
        await api.createChecklist({ name: formName, description: formDesc, rules: cleanedRules });
        toast.success('Checklist created');
      }
      closeForm();
      await fetchChecklists();
    } catch (err: any) {
      console.error('Failed to save checklist:', err);
      toast.error(err?.message ?? 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  /** Opens the non-blocking ConfirmDialog instead of window.confirm() */
  const requestDelete = (id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await api.deleteChecklist(confirmId);
      toast.success('Checklist deleted');
      await fetchChecklists();
    } catch (err: any) {
      console.error('Failed to delete checklist:', err);
      toast.error(err?.message ?? 'Failed to delete checklist');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklist Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create checklists for each setup. Complete them after every trade to track discipline.
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Checklist
        </button>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={4} showHeader />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No checklists yet"
          description="Create your first checklist to start tracking discipline after every trade."
          action={{ label: 'Create Checklist', onClick: openNewForm }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className={cn(
                'glass-card rounded-2xl p-5 transition-all hover:shadow-card-hover',
                !tpl.isActive && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{tpl.name}</div>
                    {tpl.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rules Preview */}
              <div className="space-y-1.5 mb-4">
                {tpl.rules.slice(0, 4).map((rule) => (
                  <div key={rule.id} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{rule.label}</span>
                  </div>
                ))}
                {tpl.rules.length > 4 && (
                  <div className="text-xs text-muted-foreground pl-5">+{tpl.rules.length - 4} more rules</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <button
                  onClick={() => openEditForm(tpl)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  tpl.isActive ? 'bg-success/10 text-success' : 'bg-accent text-muted-foreground',
                )}>
                  {tpl.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => requestDelete(tpl.id)}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                  aria-label={`Delete ${tpl.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-background border border-border shadow-xl p-6 animate-bounce-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                {editing ? 'Edit Checklist' : 'New Checklist'}
              </h3>
              <button
                onClick={closeForm}
                className="p-1 rounded-lg hover:bg-accent"
                aria-label="Close checklist form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Checklist Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Pre-Trade Checklist"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What is this checklist for?"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Rules *</label>
                  <button
                    onClick={addRule}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Rule
                  </button>
                </div>

                <div className="space-y-2">
                  {formRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right">{index + 1}.</span>
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(e) => updateRule(rule.id, e.target.value)}
                        placeholder="Enter your rule..."
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove rule"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-border">
              <button
                onClick={closeForm}
                className="flex-1 px-4 py-2 rounded-xl bg-accent text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || formRules.filter((r) => r.label.trim()).length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editing ? 'Update Checklist' : 'Create Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Checklist"
        description="This will permanently delete the checklist and all its rules. This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={confirmLoading}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmId(null);
        }}
      />
    </div>
  );
}

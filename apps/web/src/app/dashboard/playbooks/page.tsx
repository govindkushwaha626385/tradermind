// ──────────────────────────────────────────────
// TradeMind — Playbooks Page
//
// CRUD interface for creating and managing trading
// strategy playbooks with entry/exit criteria.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  X,
  BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface Playbook {
  id: string;
  name: string;
  description?: string;
  entryCriteria?: string;
  exitCriteria?: string;
  isActive: boolean;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [editing, setEditing]     = useState<Playbook | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    name: '', description: '', entryCriteria: '', exitCriteria: '',
  });

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [confirmId, setConfirmId]           = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    document.title = 'Playbooks — TradeMind';
    fetchPlaybooks();
  }, []);

  async function fetchPlaybooks() {
    setLoading(true);
    try {
      const res = await api.getPlaybooks();
      if (res.success) setPlaybooks((res.data as Playbook[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch playbooks:', err);
      toast.error('Failed to load playbooks');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Playbook name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updatePlaybook(editing.id, form);
        toast.success('Playbook updated');
      } else {
        await api.createPlaybook(form);
        toast.success('Playbook created');
      }
      setForm({ name: '', description: '', entryCriteria: '', exitCriteria: '' });
      setEditing(null);
      setShowForm(false);
      await fetchPlaybooks();
    } catch (err: any) {
      console.error('Failed to save playbook:', err);
      toast.error(err?.message ?? 'Failed to save playbook');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (playbook: Playbook) => {
    setForm({
      name: playbook.name,
      description: playbook.description ?? '',
      entryCriteria: playbook.entryCriteria ?? '',
      exitCriteria: playbook.exitCriteria ?? '',
    });
    setEditing(playbook);
    setShowForm(true);
  };

  /** Opens ConfirmDialog instead of window.confirm() */
  const requestDelete = (id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await api.deletePlaybook(confirmId);
      toast.success('Playbook deleted');
      await fetchPlaybooks();
    } catch (err: any) {
      console.error('Failed to delete playbook:', err);
      toast.error(err?.message ?? 'Failed to delete playbook');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmId(null);
    }
  };

  const openNewForm = () => {
    setForm({ name: '', description: '', entryCriteria: '', exitCriteria: '' });
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Setup Playbooks"
        description="Define your trading strategies and track rule compliance"
        icon={BookMarked}
        actions={
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Playbook
          </button>
        }
      />

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} rows={5} showHeader />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No playbooks yet"
          description="Create your first strategy playbook to start tracking setup adherence and rule compliance."
          action={{ label: 'Create Playbook', onClick: openNewForm }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((playbook) => (
            <div
              key={playbook.id}
              className={cn(
                'glass-card rounded-2xl p-5 transition-all hover:shadow-card-hover',
                !playbook.isActive && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                  <h3 className="font-semibold">{playbook.name}</h3>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded font-medium flex-shrink-0',
                  playbook.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                )}>
                  {playbook.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {playbook.description && (
                <p className="text-sm text-muted-foreground mb-3">{playbook.description}</p>
              )}

              <div className="space-y-2 text-xs">
                {playbook.entryCriteria && (
                  <div className="p-2.5 rounded-lg bg-success/5 border border-success/10">
                    <span className="font-semibold text-success block mb-0.5">Entry</span>
                    {playbook.entryCriteria}
                  </div>
                )}
                {playbook.exitCriteria && (
                  <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <span className="font-semibold text-destructive block mb-0.5">Exit</span>
                    {playbook.exitCriteria}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => handleEdit(playbook)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => requestDelete(playbook.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
                  aria-label={`Delete ${playbook.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Playbook Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg space-y-4 animate-bounce-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Playbook' : 'New Playbook'}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
                aria-label="Close playbook form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Breakout Pullback"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2}
                placeholder="Brief description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entry Criteria</label>
              <textarea
                value={form.entryCriteria}
                onChange={(e) => setForm({ ...form, entryCriteria: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="What conditions must be met to enter?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Exit Criteria</label>
              <textarea
                value={form.exitCriteria}
                onChange={(e) => setForm({ ...form, exitCriteria: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="When do you exit?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update Playbook' : 'Create Playbook'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Playbook"
        description="This will permanently delete the playbook and its criteria. This action cannot be undone."
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

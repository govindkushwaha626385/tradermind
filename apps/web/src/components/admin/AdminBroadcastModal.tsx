// ──────────────────────────────────────────────
// TradeMind — Admin Broadcast & Emergency Banner Modal
//
// Allows platform administrators to:
// - Publish site-wide broadcast announcements to all users
// - Toggle emergency maintenance mode
// - Customize styles (info, success, warning, alert)
// - Add direct CTA links
// - Real-time visual preview before publishing
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Megaphone,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldAlert,
  Save,
  Eye,
} from 'lucide-react';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

interface AdminBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminBroadcastModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminBroadcastModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [linkText, setLinkText] = useState('Learn More');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getAnnouncementBanner()
      .then((res) => {
        if (res?.data) {
          setEnabled(Boolean(res.data.enabled));
          setMaintenanceMode(Boolean(res.data.maintenanceMode));
          setType(res.data.type || 'info');
          setText(res.data.text || '');
          setLink(res.data.link || '');
          setLinkText(res.data.linkText || 'Learn More');
        }
      })
      .catch(() => {
        // use defaults
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.adminUpdateBroadcastBanner({
        enabled,
        maintenanceMode,
        type,
        text: text.trim(),
        link: link.trim() || undefined,
        linkText: linkText.trim() || 'Learn More',
      });
      if (res.success) {
        toast.success(
          maintenanceMode
            ? '🚨 Global Emergency Maintenance Mode Activated'
            : enabled
            ? '📢 Site-wide Announcement Banner Published'
            : 'Banner deactivated',
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error((res as any).error?.message || 'Failed to update broadcast banner');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update broadcast banner');
    } finally {
      setSaving(false);
    }
  };

  const previewStyles = {
    info: {
      bg: 'bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-cyan-800/40 text-cyan-200',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      btn: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
      icon: '📢',
    },
    success: {
      bg: 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-800/40 text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      btn: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
      icon: '✨',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border-amber-800/40 text-amber-200',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btn: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
      icon: '⚡',
    },
    alert: {
      bg: 'bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 border-rose-800/40 text-rose-200',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      btn: 'bg-rose-500 text-white hover:bg-rose-400',
      icon: '🚨',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-rose-500" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Global Broadcast &amp; Emergency Banner Control
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  SITE-WIDE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display critical notices, scheduled maintenance alerts, or promotional announcements to all traders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Live Visual Preview */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                <Eye className="w-3.5 h-3.5" />
                <span>Live User Preview</span>
              </div>
              <div className="rounded-2xl border border-border/60 overflow-hidden shadow-inner bg-accent/20">
                {maintenanceMode ? (
                  <div className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2.5">
                    <span className="animate-pulse">⚠️</span>
                    <span>
                      <strong>System Maintenance Scheduled:</strong> Some automated broker sync and AI services may be temporarily paused for upgrades.
                    </span>
                  </div>
                ) : enabled && text ? (
                  <div className={`w-full ${previewStyles.bg} border-b px-4 py-2.5 text-xs flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span>{previewStyles.icon}</span>
                      <span className="font-medium truncate">{text}</span>
                    </div>
                    {link && (
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${previewStyles.btn}`}>
                        {linkText}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    Banner is currently inactive / disabled.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Status Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3.5 rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 cursor-pointer flex items-center justify-between transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">Announcement Banner Active</div>
                  <div className="text-[11px] text-muted-foreground">Display banner across all authenticated pages</div>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-5 w-5"
                />
              </label>

              <label className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 cursor-pointer flex items-center justify-between transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Emergency Maintenance Mode
                  </div>
                  <div className="text-[11px] text-rose-400/80">Forces permanent amber maintenance header</div>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded border-rose-500 text-rose-600 focus:ring-rose-500 h-5 w-5"
                />
              </label>
            </div>

            {/* Banner Category / Style */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Banner Style &amp; Visual Theme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['info', 'success', 'warning', 'alert'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-1.5 transition-all ${
                      type === t
                        ? 'border-primary bg-primary/20 text-primary shadow-sm'
                        : 'border-input hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <span>
                      {t === 'info' && '📢 Info'}
                      {t === 'success' && '✨ Success'}
                      {t === 'warning' && '⚡ Warning'}
                      {t === 'alert' && '🚨 Alert'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast Message Text */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Broadcast Announcement Message
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="e.g. Zerodha and Dhan automated sync upgraded to v2. All trades now sync in sub-second latency!"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>

            {/* CTA Link & Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Call-to-Action Link (Optional)
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="/dashboard/brokers or https://status.trademind.com"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Action Button Label
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Check Status / Read More"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-input hover:bg-accent text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Publish Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

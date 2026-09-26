// ──────────────────────────────────────────────
// TradeMind — Admin System Configuration & Feature Flags Control Center
//
// Allows platform administrators to:
// - View and update runtime system configs (Finnhub API keys, broker secrets)
// - Toggle feature gates and behavioral safeguards (Prop Firm lockout window)
// - Configure retention rules, MFE/MAE flags, and maintenance switches
// - Export system settings to RFC-4180 CSV for compliance audits
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  Search,
  RefreshCw,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Key,
  Globe,
  Radio,
  Cpu,
  Lock,
  Layers,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { downloadCsv, type CsvColumn } from '@/lib/export-csv';

interface ConfigItem {
  key: string;
  label: string;
  description: string | null;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  isPublic: boolean;
  value: any;
  updatedAt: string | null;
}

const CATEGORIES = [
  { id: 'all', label: 'All Settings', icon: Sliders },
  { id: 'broker', label: 'Brokers & Market Feeds', icon: Radio },
  { id: 'general', label: 'Risk & General Safeguards', icon: Shield },
  { id: 'features', label: 'Feature Flags & AI', icon: Sparkles },
];

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = 'System Configuration & Feature Flags — TradeMind Admin';
    fetchConfigs();
  }, []);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminConfigs();
      if (res && res.success && Array.isArray(res.data)) {
        const items = res.data as ConfigItem[];
        setConfigs(items);

        // Prepopulate editing state
        const initialVals: Record<string, any> = {};
        for (const item of items) {
          initialVals[item.key] = item.value;
        }
        setEditingValues(initialVals);
      } else {
        setConfigs([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load system configs');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtered configs
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const matchesSearch =
        !search ||
        c.key.toLowerCase().includes(search.toLowerCase()) ||
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      let matchesCat = true;
      if (activeCategory === 'broker') {
        matchesCat = c.category === 'broker' || c.key.startsWith('broker.');
      } else if (activeCategory === 'general') {
        matchesCat = c.category === 'general' || c.key.startsWith('news.') || c.key.startsWith('reports.');
      } else if (activeCategory === 'features') {
        matchesCat = c.category === 'features' || c.key.startsWith('analytics.') || c.key.startsWith('feature.') || c.key.startsWith('ai.');
      }

      return matchesSearch && matchesCat;
    });
  }, [configs, search, activeCategory]);

  // Handle Save
  const handleSaveConfig = async (key: string) => {
    const val = editingValues[key];
    setSavingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await api.updateAdminConfig(key, val);
      if (res && res.success) {
        toast.success(`Updated ${key}`);
        setConfigs((prev) =>
          prev.map((c) => (c.key === key ? { ...c, value: val, updatedAt: new Date().toISOString() } : c))
        );
      } else {
        toast.error((res as any)?.error?.message || 'Failed to update config');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update config');
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Toggle secret visibility
  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Export CSV
  const handleExportCsv = () => {
    if (configs.length === 0) {
      toast.error('No configuration entries to export');
      return;
    }

    const columns: CsvColumn<ConfigItem>[] = [
      { header: 'Config Key', accessor: (c) => c.key },
      { header: 'Label', accessor: (c) => c.label },
      { header: 'Category', accessor: (c) => c.category },
      { header: 'Type', accessor: (c) => c.type },
      { header: 'Public Flag', accessor: (c) => (c.isPublic ? 'YES' : 'NO') },
      {
        header: 'Current Value',
        accessor: (c) => {
          if (c.key.toLowerCase().includes('secret') || c.key.toLowerCase().includes('token') || c.key.toLowerCase().includes('apikey')) {
            return '[REDACTED_SECRET]';
          }
          return typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value);
        },
      },
      { header: 'Last Updated', accessor: (c) => c.updatedAt || 'Default' },
    ];

    downloadCsv(`TradeMind_System_Config_${Date.now()}.csv`, configs, columns);
    toast.success(`Exported ${configs.length} configuration keys to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* ── Header ── */}
      <PageHeader
        title="System Configuration & Feature Gates"
        description="Institutional administrative runtime configuration for brokers, Finnhub news feeds, prop firm blackout thresholds, and platform feature gates."
        icon={Sliders}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={configs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/80 hover:bg-accent text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              title="Export configuration records to RFC-4180 CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchConfigs}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50 cursor-pointer"
              title="Refresh system configs"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* ── Category Filter & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search key or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>
      </div>

      {/* ── Configs List Stage ── */}
      {loading ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading institutional configuration ledger...</p>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">No configuration keys found.</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or switching categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredConfigs.map((cfg) => {
            const isSaving = !!savingKeys[cfg.key];
            const isSecret =
              cfg.key.toLowerCase().includes('secret') ||
              cfg.key.toLowerCase().includes('token') ||
              cfg.key.toLowerCase().includes('apikey') ||
              cfg.key.toLowerCase().includes('key') && !cfg.key.startsWith('analytics.');

            const showSecretVal = !!showSecrets[cfg.key];
            const currentVal = editingValues[cfg.key] ?? cfg.value;
            const hasChanged = currentVal !== cfg.value;

            return (
              <div
                key={cfg.key}
                className="glass-card rounded-2xl p-4 border-border/60 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      {cfg.key}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {cfg.type}
                    </span>
                    {cfg.isPublic ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        <span>Public</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Restricted</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground pt-0.5">{cfg.label}</h4>
                  {cfg.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {cfg.description}
                    </p>
                  )}
                </div>

                {/* Right: Interactive Value Input & Action */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {cfg.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = !currentVal;
                        setEditingValues((prev) => ({ ...prev, [cfg.key]: newVal }));
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        currentVal ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                          currentVal ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  ) : cfg.type === 'number' ? (
                    <input
                      type="number"
                      value={currentVal ?? 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setEditingValues((prev) => ({ ...prev, [cfg.key]: val }));
                      }}
                      className="w-32 px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <div className="relative w-64 sm:w-80">
                      <input
                        type={isSecret && !showSecretVal ? 'password' : 'text'}
                        value={currentVal ?? ''}
                        placeholder={isSecret ? 'Enter API key or secret...' : 'Enter value...'}
                        onChange={(e) => {
                          setEditingValues((prev) => ({ ...prev, [cfg.key]: e.target.value }));
                        }}
                        className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-input bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(cfg.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showSecretVal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleSaveConfig(cfg.key)}
                    disabled={isSaving || !hasChanged}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer',
                      hasChanged
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40 opacity-70'
                    )}
                    title="Save this configuration value"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{hasChanged ? 'Save' : 'Saved'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// TradeMind — Settings Page
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Link,
  Save,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Lock,
  KeyRound,
  Sparkles,
  Smartphone,
  Send,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Link },
];

const NOTIFICATION_ITEMS = [
  { key: 'unlogged_trade', label: 'Unlogged Trade Detection', desc: 'Get notified when a closed trade needs journaling' },
  { key: 'daily_summary', label: 'Daily P&L Summary', desc: 'Receive a daily summary of your trading performance' },
  { key: 'weekly_report', label: 'Weekly AI Report', desc: 'Weekly behavioral analysis and insights' },
  { key: 'sync_complete', label: 'Broker Sync Alerts', desc: 'Get notified when broker sync completes or fails' },
  { key: 'token_expiry', label: 'Token Expiry Warning', desc: 'Reminder when your broker API token is about to expire' },
  { key: 'behavioral_insight', label: 'Behavioral Bias Alerts', desc: 'Alerts when revenge trading or FOMO patterns are detected' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Notification toggles
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Broker connections
  const [brokerConnections, setBrokerConnections] = useState<{ name: string; connected: boolean }[]>([]);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('trademind_theme') as 'light' | 'dark' | 'system') ?? 'system';
  });

  // Font size state
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    if (typeof window === 'undefined') return 'md';
    return (localStorage.getItem('trademind_font_size') as 'sm' | 'md' | 'lg') ?? 'md';
  });

  // Billing state
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Web Push Notification State
  const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        setPushPermission('unsupported');
      } else {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  async function handleRequestPushPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Web Push is not supported in this browser.');
      return;
    }

    setRequestingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        toast.success('Web Push Notifications enabled!');
        await api.updateNotificationPreference({ type: 'web_push', channel: 'push', isEnabled: true }).catch(() => {});
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            reg.showNotification('TradeMind Push Active', {
              body: 'Real-time trade and behavioral alerts are enabled.',
              icon: '/favicon.svg',
            });
          } else {
            new Notification('TradeMind Push Active', {
              body: 'Real-time trade and behavioral alerts are enabled.',
              icon: '/favicon.svg',
            });
          }
        }
      } else if (permission === 'denied') {
        toast.error('Push Notifications were denied in browser permissions.');
      }
    } catch {
      toast.error('Failed to request notification permission.');
    } finally {
      setRequestingPush(false);
    }
  }

  function handleSendTestNotification() {
    if (pushPermission !== 'granted') {
      toast.error('Please enable notifications first.');
      return;
    }
    if ('Notification' in window) {
      new Notification('TradeMind Pre-Market Alert', {
        body: 'Pre-market levels are ready. Stick to your risk plan today!',
        icon: '/favicon.svg',
      });
      toast.success('Test notification sent!');
    }
  }

  useEffect(() => {
    document.title = 'Settings — TradeMind';
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const [profileRes, brokersRes, plansRes, subRes, notifRes] = await Promise.all([
        api.getProfile(),
        api.getBrokers(),
        api.getPlans().catch(() => ({ success: false, data: [] })),
        api.getSubscription().catch(() => ({ success: false, data: null })),
        api.getNotificationPreferences().catch(() => ({ success: false, data: [] })),
      ]);

      if (profileRes.success) {
        const p = profileRes.data as any;
        setName(p.name ?? '');
        setEmail(p.email ?? '');
        setCurrency(p.preferredCurrency ?? 'INR');
        setTimezone(p.timezone ?? 'Asia/Kolkata');
      }

      if (notifRes.success && Array.isArray(notifRes.data)) {
        const prefMap: Record<string, boolean> = {};
        for (const pref of notifRes.data as Array<{ type: string; isEnabled: boolean }>) {
          prefMap[pref.type] = pref.isEnabled;
        }
        setNotifications((prev) => ({ ...prev, ...prefMap }));
      }

      if (brokersRes.success) {
        const conns = (brokersRes.data as any[]) ?? [];
        setBrokerConnections(
          ['Zerodha Kite', 'Dhan HQ', 'Angel One', 'Upstox', 'Groww', 'Sahi', 'Lemonn', 'Delta Exchange'].map((name) => ({
            name,
            connected: conns.some((c: any) =>
              name.toLowerCase().includes(c.brokerId.replace('_', ' ')),
            ),
          })),
        );
      }

      if (plansRes.success) setPlans((plansRes.data as any[]) ?? []);
      if (subRes.success) setSubscription((subRes.data as any) ?? null);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleNotification = async (key: string) => {
    const nextVal = !(notifications[key] ?? true);
    setNotifications((prev) => ({ ...prev, [key]: nextVal }));
    try {
      const res = await api.updateNotificationPreference({
        type: key,
        channel: 'email',
        isEnabled: nextVal,
      });
      if ((res as any).success) {
        toast.success('Notification preference updated');
      } else {
        throw new Error((res as any).error?.message || 'Failed to update');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update preference');
      setNotifications((prev) => ({ ...prev, [key]: !nextVal }));
    }
  };

  const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
    setFontSize(size);
    localStorage.setItem('trademind_font_size', size);
    document.documentElement.setAttribute('data-font-size', size);
    toast.success(`Font size updated`);
  };

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name,
        email,
        preferredCurrency: currency,
        timezone,
      });
      if ((res as any).success) {
        setSaved(true);
        toast.success('Settings updated successfully');
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error((res as any).error?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    try {
      const res = await api.resetPassword(newPassword);
      if ((res as any).success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error((res as any).error?.message || 'Failed to change password');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="skeleton h-8 w-40 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-48 flex-shrink-0 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-10 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex-1 glass-card rounded-2xl p-6 space-y-6">
            <div className="skeleton h-6 w-48" />
            <div className="space-y-4 max-w-lg">
              <div>
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
              <div>
                <div className="skeleton h-4 w-20 mb-2" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
              <div>
                <div className="skeleton h-4 w-32 mb-2" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
              <div className="skeleton h-10 w-32 rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={User}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 glass-card rounded-2xl p-6">
          {activeSection === 'profile' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold">Profile Settings</h2>

              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Default Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure browser push alerts and event notifications
                </p>
              </div>

              {/* Web Push Notification Banner Card */}
              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Browser Web Push</h3>
                      <p className="text-xs text-muted-foreground">Receive instant desktop & mobile alerts</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase',
                      pushPermission === 'granted' && 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                      pushPermission === 'denied' && 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
                      pushPermission === 'default' && 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                      pushPermission === 'unsupported' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {pushPermission === 'granted'
                      ? 'Subscribed'
                      : pushPermission === 'denied'
                      ? 'Blocked'
                      : pushPermission === 'unsupported'
                      ? 'Not Supported'
                      : 'Not Enabled'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get notified the second a trade is closed, when tilt or revenge trading patterns trigger, or when your broker session is about to expire.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {pushPermission === 'granted' ? (
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Test Alert
                    </button>
                  ) : pushPermission === 'denied' ? (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Notifications are blocked. Allow them in your browser site settings.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={requestingPush || pushPermission === 'unsupported'}
                      onClick={handleRequestPushPermission}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {requestingPush ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Requesting Access...
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          Enable Web Push Notifications
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alert Triggers</h3>
                {NOTIFICATION_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[item.key] ?? true}
                      onChange={() => handleToggleNotification(item.key)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h2 className="text-lg font-semibold">Security Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your credentials and account protection</p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 p-5 rounded-2xl border border-border bg-card/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Change Password
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword || !newPassword}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {updatingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-2xl bg-accent/40 border border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  Data & Key Protection
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  All broker API credentials, access tokens, and secrets are encrypted with AES-256-GCM at rest.
                  Your passwords are cryptographically hashed and never stored or logged in plain text.
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold">Appearance</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-3">
                  {(['Light', 'Dark', 'System'] as const).map((t) => {
                    const themeKey = t.toLowerCase() as 'light' | 'dark' | 'system';
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setTheme(themeKey);
                          localStorage.setItem('trademind_theme', themeKey);
                          if (themeKey === 'dark') {
                            document.documentElement.classList.add('dark');
                          } else if (themeKey === 'light') {
                            document.documentElement.classList.remove('dark');
                          } else {
                            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                            document.documentElement.classList.toggle('dark', prefersDark);
                          }
                        }}
                        className={cn(
                          'px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                          theme === themeKey
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value as 'sm' | 'md' | 'lg')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <div className="space-y-3">
                {brokerConnections.map((broker) => (
                  <div key={broker.name} className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                    <span className="text-sm font-medium">{broker.name}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded font-medium',
                      broker.connected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                    )}>
                      {broker.connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'billing' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold">Billing & Subscription</h2>

              {loadingBilling ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Current subscription status */}
                  {subscription ? (
                    <div className="p-4 rounded-xl bg-accent/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Plan</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Plan ID</span>
                        <span className="font-mono text-xs">{subscription.planId?.slice(0, 8)}...</span>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Billing Period End</span>
                          <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')}</span>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          setCancelling(true);
                          try {
                            await api.cancelSubscription();
                            setSubscription(null);
                          } catch (err) {
                            console.error('Failed to cancel:', err);
                          } finally {
                            setCancelling(false);
                          }
                        }}
                        disabled={cancelling}
                        className="w-full mt-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-accent/50 text-center">
                      <p className="text-sm text-muted-foreground mb-3">You are on the <strong>Free</strong> plan</p>
                      <p className="text-xs text-muted-foreground mb-4">Upgrade to unlock premium features like AI insights, unlimited trades, and multiple broker connections.</p>
                    </div>
                  )}

                  {/* Available plans */}
                  {plans.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Available Plans</h3>
                      {plans
                        .filter((p: any) => p.slug !== 'free')
                        .map((plan: any) => (
                          <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/50">
                            <div>
                              <div className="text-sm font-medium">{plan.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ₹{(plan.amount / 100).toLocaleString('en-IN')}/{plan.interval}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const order = await api.createOrder({
                                    planSlug: plan.slug,
                                    successUrl: window.location.href,
                                    cancelUrl: window.location.href,
                                  });
                                  if (order.success) {
                                    // Open Razorpay checkout
                                    const options = {
                                      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                                      order_id: (order.data as any).id,
                                      name: 'TradeMind',
                                      description: plan.name,
                                      prefill: { email: email },
                                      handler: async (response: any) => {
                                        await api.verifyPayment({
                                          razorpay_order_id: response.razorpay_order_id,
                                          razorpay_payment_id: response.razorpay_payment_id,
                                          razorpay_signature: response.razorpay_signature,
                                        });
                                        loadSettings();
                                      },
                                      modal: {
                                        ondismiss: () => console.log('Payment cancelled'),
                                      },
                                    };
                                    const rzp = new (window as any).Razorpay(options);
                                    rzp.open();
                                  }
                                } catch (err) {
                                  console.error('Failed to create order:', err);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              Upgrade
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Save Button for Profile & Notifications */}
          {(activeSection === 'profile' || activeSection === 'notifications') && (
            <div className="mt-6 pt-5 border-t border-border">
              <button
                onClick={handleSave}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

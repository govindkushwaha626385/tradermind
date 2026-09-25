// ──────────────────────────────────────────────
// TradeMind — Discord & Telegram Webhook Settings
// Configure real-time automated EOD debriefs, behavioral tilt
// circuit breakers, and risk breach notifications.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Save,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

export function WebhookSettingsCard() {
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [eodDebriefEnabled, setEodDebriefEnabled] = useState(true);
  const [riskAlertsEnabled, setRiskAlertsEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [dispatchingDebrief, setDispatchingDebrief] = useState(false);

  useEffect(() => {
    fetchWebhookConfig();
  }, []);

  const fetchWebhookConfig = async () => {
    setLoading(true);
    try {
      const res = await api.getWebhookConfig();
      if (res.success && res.data) {
        setDiscordWebhookUrl(res.data.discordWebhookUrl ?? '');
        setTelegramBotToken(res.data.telegramBotToken ?? '');
        setTelegramChatId(res.data.telegramChatId ?? '');
        setEodDebriefEnabled(res.data.eodDebriefEnabled ?? true);
        setRiskAlertsEnabled(res.data.riskAlertsEnabled ?? true);
      }
    } catch (err) {
      console.error('Failed to load webhook config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveWebhookConfig({
        discordWebhookUrl,
        telegramBotToken,
        telegramChatId,
        eodDebriefEnabled,
        riskAlertsEnabled,
      });

      if (res.success) {
        toast.success('Webhook notifications saved successfully');
      } else {
        toast.error((res as any).error?.message || 'Failed to save webhook settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving webhook settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDiscord = async () => {
    if (!discordWebhookUrl) {
      toast.error('Please enter a Discord Webhook URL first');
      return;
    }
    setTestingDiscord(true);
    try {
      const res = await api.testWebhook({
        platform: 'discord',
        discordWebhookUrl,
      });
      if (res.success) {
        toast.success('Discord test alert delivered! Check your channel.');
      } else {
        toast.error((res as any).error?.message || 'Discord ping failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to ping Discord');
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error('Please enter both Telegram Bot Token and Chat ID');
      return;
    }
    setTestingTelegram(true);
    try {
      const res = await api.testWebhook({
        platform: 'telegram',
        telegramBotToken,
        telegramChatId,
      });
      if (res.success) {
        toast.success('Telegram test message delivered! Check your chat.');
      } else {
        toast.error((res as any).error?.message || 'Telegram message failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to message Telegram');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleDispatchLiveDebrief = async () => {
    setDispatchingDebrief(true);
    try {
      const res = await api.dispatchEodDebrief();
      if (res.success) {
        toast.success('Live EOD Debrief dispatched to your configured channels!');
      } else {
        toast.error((res as any).error?.message || 'Failed to dispatch debrief');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch debrief');
    } finally {
      setDispatchingDebrief(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/20 border border-border/60 rounded-2xl">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Automated Webhook Alerts (Discord & Telegram)
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receive real-time automated EOD debriefs, behavioral tilt warnings, and risk breach circuit breakers directly in your private channels.
        </p>
      </div>

      {/* Discord Webhook Configuration */}
      <div className="p-4 sm:p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Discord Channel Webhook</h4>
              <p className="text-xs text-muted-foreground">Post rich embeds to your trading server or DM</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase',
              discordWebhookUrl
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {discordWebhookUrl ? 'Configured' : 'Inactive'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-foreground">
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleTestDiscord}
              disabled={testingDiscord || !discordWebhookUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold disabled:opacity-50 transition-colors shrink-0"
            >
              {testingDiscord ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Ping
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Create in your Discord channel: <i>Edit Channel ➔ Integrations ➔ Webhooks ➔ Copy Webhook URL</i>.
          </p>
        </div>
      </div>

      {/* Telegram Bot Configuration */}
      <div className="p-4 sm:p-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Telegram Instant Alerts</h4>
              <p className="text-xs text-muted-foreground">Receive direct mobile alerts from your private bot</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase',
              telegramBotToken && telegramChatId
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {telegramBotToken && telegramChatId ? 'Configured' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="123456789:ABCdefGHI..."
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Your Chat ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram || !telegramBotToken || !telegramChatId}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold disabled:opacity-50 transition-colors shrink-0"
              >
                {testingTelegram ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Test
              </button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Create a bot via <code>@BotFather</code> on Telegram, copy token, and message <code>@userinfobot</code> to discover your chat ID.
        </p>
      </div>

      {/* Webhook Alert Event Triggers */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Event Triggers
        </h4>

        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Automated End-of-Day (EOD) Debrief
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dispatches daily net P&L, win rate, best/worst trades, and AI behavioral leaks at market close.
              </p>
            </div>
            <input
              type="checkbox"
              checked={eodDebriefEnabled}
              onChange={(e) => setEodDebriefEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Behavioral Shield & Risk Breach Alerts
              </div>
              <p className="text-[11px] text-muted-foreground">
                Urgent notification when daily drawdown limits are reached or revenge trading patterns trigger the kill switch.
              </p>
            </div>
            <input
              type="checkbox"
              checked={riskAlertsEnabled}
              onChange={(e) => setRiskAlertsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
            />
          </label>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={handleDispatchLiveDebrief}
          disabled={dispatchingDebrief || (!discordWebhookUrl && (!telegramBotToken || !telegramChatId))}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-background/50 hover:bg-muted text-xs font-semibold text-foreground disabled:opacity-50 transition-colors"
        >
          {dispatchingDebrief ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          )}
          <span>Dispatch Live EOD Debrief Now</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md shadow-primary/20"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save Webhook Settings</span>
        </button>
      </div>
    </div>
  );
}

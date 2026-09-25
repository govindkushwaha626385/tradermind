// ──────────────────────────────────────────────
// TradeMind — Institutional Webhook Dispatcher Service
// Delivers real-time automated EOD debriefs, behavioral tilt warnings,
// and risk breach alerts directly to traders via Discord and Telegram.
// ──────────────────────────────────────────────

export interface WebhookField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedPayload {
  title: string;
  description?: string;
  color?: number; // Decimal color code (e.g. 0x10B981 for green, 0xEF4444 for red)
  fields?: WebhookField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface EodDebriefNotificationData {
  traderName?: string;
  dateStr: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  netPnl: number;
  currency: string;
  profitFactor: number;
  topWinner?: { symbol: string; pnl: number };
  worstLoser?: { symbol: string; pnl: number };
  behavioralLeak?: string;
  aiAdvice?: string;
}

export interface RiskBreachNotificationData {
  traderName?: string;
  timestampStr: string;
  breachType: 'DAILY_LOSS_LIMIT' | 'MAX_DRAWDOWN' | 'REVENGE_TRADING' | 'OVERSIZING';
  severity: 'CRITICAL' | 'WARNING';
  currentNetPnl: number;
  limitThreshold: number;
  currency: string;
  actionTaken: string;
}

/**
 * Dispatch rich embed payload to a Discord Webhook endpoint
 */
export async function dispatchDiscordWebhook(
  webhookUrl: string,
  embeds: DiscordEmbedPayload[],
  content?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return { success: false, error: 'Invalid Discord webhook URL' };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'TradeMind Sentinel',
        avatar_url: 'https://trademind.app/favicon.svg',
        content,
        embeds,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Discord returned HTTP ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to dispatch Discord webhook' };
  }
}

/**
 * Dispatch markdown/HTML message to a Telegram chat via Telegram Bot API
 */
export async function dispatchTelegramNotification(
  botToken: string,
  chatId: string,
  htmlMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!botToken || !chatId) {
      return { success: false, error: 'Missing Telegram bot token or chat ID' };
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: `Telegram returned HTTP ${res.status}: ${errJson.description || 'Unknown error'}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to dispatch Telegram message' };
  }
}

/**
 * Build and dispatch automated End-of-Day (EOD) Debrief
 */
export async function sendEodDebriefNotification({
  discordWebhookUrl,
  telegramBotToken,
  telegramChatId,
  data,
}: {
  discordWebhookUrl?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  data: EodDebriefNotificationData;
}): Promise<{ discord?: { success: boolean; error?: string }; telegram?: { success: boolean; error?: string } }> {
  const isProfit = data.netPnl >= 0;
  const pnlSign = isProfit ? '+' : '';
  const formattedPnl = `${pnlSign}${data.currency} ${data.netPnl.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const winRateFormatted = `${data.winRate.toFixed(1)}%`;

  const results: { discord?: { success: boolean; error?: string }; telegram?: { success: boolean; error?: string } } = {};

  // 1. Send Discord if configured
  if (discordWebhookUrl) {
    const embed: DiscordEmbedPayload = {
      title: `📊 TradeMind Daily Debrief — ${data.dateStr}`,
      description: isProfit
        ? `🔥 **Green Session!** Net realized profit: **${formattedPnl}**`
        : `⚠️ **Session Recap:** Realized drawdown: **${formattedPnl}**`,
      color: isProfit ? 0x10b981 : 0xef4444, // Green or Red
      fields: [
        { name: 'Net Realized P&L', value: formattedPnl, inline: true },
        { name: 'Win Rate', value: `${winRateFormatted} (${data.winCount}W / ${data.lossCount}L)`, inline: true },
        { name: 'Profit Factor', value: data.profitFactor > 0 ? data.profitFactor.toFixed(2) : '—', inline: true },
      ],
      footer: {
        text: 'TradeMind Institutional Analytics · Zero-Leak Execution',
      },
      timestamp: new Date().toISOString(),
    };

    if (data.topWinner) {
      embed.fields?.push({
        name: '🏆 Best Trade',
        value: `${data.topWinner.symbol}: +${data.currency} ${data.topWinner.pnl.toFixed(2)}`,
        inline: true,
      });
    }

    if (data.worstLoser) {
      embed.fields?.push({
        name: '🩸 Worst Trade',
        value: `${data.worstLoser.symbol}: ${data.currency} ${data.worstLoser.pnl.toFixed(2)}`,
        inline: true,
      });
    }

    if (data.behavioralLeak) {
      embed.fields?.push({
        name: '🧠 AI Execution Leak Detected',
        value: data.behavioralLeak,
        inline: false,
      });
    }

    if (data.aiAdvice) {
      embed.fields?.push({
        name: '💡 Actionable Coaching',
        value: data.aiAdvice,
        inline: false,
      });
    }

    results.discord = await dispatchDiscordWebhook(discordWebhookUrl, [embed]);
  }

  // 2. Send Telegram if configured
  if (telegramBotToken && telegramChatId) {
    const headerEmoji = isProfit ? '🟢' : '🔴';
    const tgMessage = `
<b>${headerEmoji} TradeMind EOD Debrief — ${data.dateStr}</b>

• <b>Net P&L:</b> <code>${formattedPnl}</code>
• <b>Win Rate:</b> <code>${winRateFormatted}</code> (${data.winCount}W / ${data.lossCount}L)
• <b>Total Trades:</b> <code>${data.totalTrades}</code>
• <b>Profit Factor:</b> <code>${data.profitFactor.toFixed(2)}</code>
${data.topWinner ? `• <b>Top Winner:</b> ${data.topWinner.symbol} (+${data.currency} ${data.topWinner.pnl.toFixed(2)})\n` : ''}${data.worstLoser ? `• <b>Worst Loser:</b> ${data.worstLoser.symbol} (${data.currency} ${data.worstLoser.pnl.toFixed(2)})\n` : ''}
${data.behavioralLeak ? `<b>🧠 Execution Leak:</b> <i>${data.behavioralLeak}</i>\n` : ''}
${data.aiAdvice ? `<b>💡 Coaching:</b> <i>${data.aiAdvice}</i>\n` : ''}
<i>Audit your full execution at <a href="https://trademind.app/dashboard">TradeMind Dashboard</a></i>
    `.trim();

    results.telegram = await dispatchTelegramNotification(telegramBotToken, telegramChatId, tgMessage);
  }

  return results;
}

/**
 * Build and dispatch instant Risk & Tilt Breach Alert
 */
export async function sendRiskBreachNotification({
  discordWebhookUrl,
  telegramBotToken,
  telegramChatId,
  data,
}: {
  discordWebhookUrl?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  data: RiskBreachNotificationData;
}): Promise<{ discord?: { success: boolean; error?: string }; telegram?: { success: boolean; error?: string } }> {
  const results: { discord?: { success: boolean; error?: string }; telegram?: { success: boolean; error?: string } } = {};

  if (discordWebhookUrl) {
    const embed: DiscordEmbedPayload = {
      title: `🚨 RISK BREACH ALERT: ${data.breachType.replace(/_/g, ' ')}`,
      description: `**Capital Protection Triggered:** Your account has reached predefined risk safety thresholds.`,
      color: 0xef4444, // Bright Red
      fields: [
        {
          name: 'Current P&L',
          value: `${data.currency} ${data.currentNetPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          inline: true,
        },
        {
          name: 'Limit Ceilings',
          value: `${data.currency} ${data.limitThreshold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          inline: true,
        },
        {
          name: 'Action Enforcement',
          value: data.actionTaken,
          inline: false,
        },
      ],
      footer: {
        text: 'TradeMind Behavioral Shield · Step away from the screens',
      },
      timestamp: new Date().toISOString(),
    };

    results.discord = await dispatchDiscordWebhook(discordWebhookUrl, [embed], '@here **RISK CIRCUIT BREAKER TRIGGERED**');
  }

  if (telegramBotToken && telegramChatId) {
    const tgMessage = `
<b>🚨 RISK BREACH CIRCUIT BREAKER</b>

<b>Breach Type:</b> <code>${data.breachType.replace(/_/g, ' ')}</code>
<b>Severity:</b> <b>${data.severity}</b>
<b>Time:</b> ${data.timestampStr}

• <b>Current P&L:</b> <code>${data.currency} ${data.currentNetPnl.toFixed(2)}</code>
• <b>Max Limit:</b> <code>${data.currency} ${data.limitThreshold.toFixed(2)}</code>
• <b>Status:</b> <b>${data.actionTaken}</b>

⚠️ <i>Step away from the screens to preserve trading psychology and capital.</i>
    `.trim();

    results.telegram = await dispatchTelegramNotification(telegramBotToken, telegramChatId, tgMessage);
  }

  return results;
}

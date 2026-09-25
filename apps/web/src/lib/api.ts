// ──────────────────────────────────────────────
// TradeMind — API Client
// ──────────────────────────────────────────────

import { API_PREFIX } from '@trademind/shared';
import type {
  StoreProduct,
  ProductOrder,
  ProductAccess,
  Review,
  TradeReplayData,
  AiChatMessage,
  AiChatResponse,
  TradingStrategy,
  StrategyPerformance,
  LeaderboardEntry,
  LeaderboardOptIn,
  LeaderboardPeriod,
  Partner,
  RiskProfile,
  RiskStatus,
} from '@trademind/shared';

// Phase 5 — Single deployment: API now lives inside the same Next.js app.
// • Browser: use a relative URL (same-origin, no CORS needed)
// • Server-side (SSR/RSC): use NEXT_PUBLIC_APP_URL or fallback to localhost:3000
const API_URL =
  typeof window !== 'undefined'
    ? '' // relative → same origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000');

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; details?: unknown[] };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface UploadResponse {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
  path: string;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      try {
        sessionStorage.setItem('trademind_access_token', token);
        localStorage.setItem('trademind_access_token', token);
        document.cookie = `trademind_access_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}
    } else {
      try {
        sessionStorage.removeItem('trademind_access_token');
        localStorage.removeItem('trademind_access_token');
        document.cookie = 'trademind_access_token=; path=/; max-age=0; SameSite=Lax';
      } catch {}
    }
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    if (accessToken) return accessToken;
    try {
      const sessionToken = sessionStorage.getItem('trademind_access_token');
      if (sessionToken) {
        accessToken = sessionToken;
        return sessionToken;
      }
      const localToken = localStorage.getItem('trademind_access_token');
      if (localToken) {
        accessToken = localToken;
        return localToken;
      }
      // Check Supabase stored auth keys: sb-<ref>-auth-token
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token) {
              accessToken = parsed.access_token;
              return parsed.access_token;
            }
          }
        }
      }
    } catch {}
  }
  return accessToken;
}

/**
 * Generic API request function
 */
async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;

  let url = `${API_URL}${API_PREFIX}${endpoint}`;

  // Append query params
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ── Timeout + retry with exponential backoff ──
  const TIMEOUT_MS = 15000;
  const MAX_RETRIES = 2;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Safely parse the JSON body — some error responses have empty bodies
      let json: any = null;
      const contentType = response.headers.get('content-type') ?? '';
      const contentLength = response.headers.get('content-length');
      const hasBody = contentLength !== '0' && contentType.includes('json');

      if (hasBody) {
        try {
          json = await response.json();
        } catch {
          // Body wasn't valid JSON — treat as empty
          json = null;
        }
      }

      if (!response.ok) {
        const errMsg =
          json?.error?.message ??
          json?.message ??
          `Request failed with status ${response.status}`;
        const err = new Error(errMsg) as any;
        err.status = response.status;
        throw err;
      }

      return json;
    } catch (err: any) {
      lastError = err;

      // Don't retry on 4xx errors (client mistakes)
      const status: number = err?.status ?? 0;
      const isClientError = status >= 400 && status < 500;
      // Don't retry on 5xx auth errors (register/login/forgot-password)
      const isAuthEndpoint = endpoint.startsWith('/auth/');
      const isServerError = status >= 500;

      if (isClientError || (isServerError && isAuthEndpoint) || attempt === MAX_RETRIES) break;

      // Exponential backoff: 300ms, 900ms
      const delay = 300 * Math.pow(3, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Request failed');
}

// ── API Methods ─────────────────────────

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: unknown; session: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<unknown>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: async () => {
    try {
      await request<unknown>('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  getProfile: () => request<unknown>('/auth/me'),
  updateProfile: (data: Record<string, unknown>) =>
    request<unknown>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  forgotPassword: (email: string) =>
    request<unknown>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (password: string) =>
    request<unknown>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  resendVerification: (email: string) =>
    request<unknown>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Brokers
  getBrokers: () => request<unknown[]>('/brokers'),
  connectBroker: (data: Record<string, unknown>) =>
    request<unknown>('/brokers/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  syncBroker: (id: string) =>
    request<unknown>(`/brokers/${id}/sync`, { method: 'POST' }),
  disconnectBroker: (id: string) =>
    request<unknown>(`/brokers/${id}`, { method: 'DELETE' }),
  getBrokerFunds: () => request<unknown[]>('/brokers/funds'),
  importCsvPreview: (csv: string) =>
    request<{
      broker: string;
      totalRows: number;
      preview: unknown[];
      totalParsed: number;
      skippedRows: number;
      errors: string[];
    }>('/brokers/import/csv/preview', {
      method: 'POST',
      body: JSON.stringify({ csv }),
    }),
  importCsv: (csv: string, brokerConnectionId?: string) =>
    request<{
      broker: string;
      inserted: number;
      totalRows: number;
      skippedRows: number;
      errors: string[];
    }>('/brokers/import/csv', {
      method: 'POST',
      body: JSON.stringify({ csv, ...(brokerConnectionId ? { brokerConnectionId } : {}) }),
    }),

  // Trades
  getTrades: (params?: Record<string, string | number | undefined>) =>
    request<unknown[]>('/trades', { params }),
  getTrade: (id: string) => request<unknown>(`/trades/${id}`),
  exportTradesCsv: async (params?: Record<string, string | number | undefined>) => {
    const token = getAccessToken();
    let url = `${API_URL}${API_PREFIX}/trades/export/csv`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString();
      if (qs) url += `?${qs}`;
    }
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  // Journal
  getJournalTrades: (params?: Record<string, string | number | undefined>) =>
    request<unknown[]>('/journal', { params }),
  getUnloggedTrades: () => request<unknown[]>('/journal/unlogged'),
  updateJournalTrade: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/journal/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  exportJournalCsv: async (params?: Record<string, string | number | undefined>) => {
    const token = getAccessToken();
    let url = `${API_URL}${API_PREFIX}/journal/export/csv`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString();
      if (qs) url += `?${qs}`;
    }
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `journal-trades-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  // Analytics
  getDashboard: (params?: Record<string, string>) =>
    request<unknown>('/analytics/dashboard', { params }),
  getBehavioralInsights: (params?: Record<string, string>) =>
    request<unknown>('/analytics/behavioral', { params }),
  getCalendar: (params?: { startDate?: string; endDate?: string }) =>
    request<unknown[]>('/analytics/calendar', {
      params: params as Record<string, string | number | undefined>,
    }),
  getCalendarDayDetail: (date: string) =>
    request<unknown>(`/analytics/calendar/${date}`),
  getWhatIfSimulation: (params?: { emotions?: string; mistakes?: string }) =>
    request<unknown>('/analytics/what-if', {
      params: params as Record<string, string | number | undefined>,
    }),
  getTaxReport: (params?: { year?: string }) =>
    request<unknown>('/analytics/tax-report', {
      params: params as Record<string, string | number | undefined>,
    }),
  exportTaxReportCsv: async (year?: string) => {
    const token = getAccessToken();
    let url = `${API_URL}${API_PREFIX}/analytics/tax-report?format=csv`;
    if (year) url += `&year=${encodeURIComponent(year)}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to export tax report CSV');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `TradeMind_Tax_Ledger_${year ?? 'current'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
  getWeeklySummary: () => request<unknown>('/analytics/summary/weekly'),
  getAdvancedAnalytics: (params?: { timeframe?: string }) =>
    request<import('@trademind/shared').AdvancedAnalyticsResponse>('/analytics/advanced', {
      params: params as Record<string, string | number | undefined>,
    }),
  calculateMfeMae: () =>
    request<{ total: number; updated: number }>('/analytics/mfe-mae/calculate', {
      method: 'POST',
    }),
  getEquityCurve: (params?: { startDate?: string; endDate?: string; limit?: number }) =>
    request<import('@trademind/shared').EquityPoint[]>('/analytics/equity-curve', {
      params: params as Record<string, string | number | undefined>,
    }),

  // ── Goals ─────────────────────────────────
  getGoals: () => request<any[]>('/goals'),
  createGoal: (body: {
    title: string;
    description?: string;
    type: string;
    targetValue: number;
    period?: string;
    periodStart?: string;
    periodEnd?: string;
    emoji?: string;
    color?: string;
  }) => request<any>('/goals', { method: 'POST', body: JSON.stringify(body) }),
  updateGoal: (id: string, body: Partial<{
    title: string;
    description: string;
    targetValue: number;
    period: string;
    periodStart: string;
    periodEnd: string;
    emoji: string;
    color: string;
    isActive: boolean;
    isCompleted: boolean;
  }>) => request<any>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteGoal: (id: string) => request<{ id: string }>(`/goals/${id}`, { method: 'DELETE' }),
  refreshGoal: (id: string) => request<any>(`/goals/${id}/refresh`, { method: 'POST' }),

  // ── Uploads ───────────────────────────────

  uploadScreenshot: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<UploadResponse>('/uploads/screenshot', {
      method: 'POST',
      body: formData,
    });
  },
  uploadAudio: (file: File | Blob, filename = 'voice-note.webm') => {
    const formData = new FormData();
    formData.append('file', file, filename);
    return request<UploadResponse>('/uploads/audio', {
      method: 'POST',
      body: formData,
    });
  },

  // ── Playbooks ─────────────────────────────
  getPlaybooks: () => request<unknown[]>('/playbooks'),
  createPlaybook: (data: Record<string, unknown>) =>
    request<unknown>('/playbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePlaybook: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/playbooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePlaybook: (id: string) =>
    request<unknown>(`/playbooks/${id}`, { method: 'DELETE' }),

  // ── Checklist Templates ───────────────────
  getChecklists: () => request<unknown[]>('/discipline/checklists'),
  createChecklist: (data: Record<string, unknown>) =>
    request<unknown>('/discipline/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateChecklist: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/discipline/checklists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteChecklist: (id: string) =>
    request<unknown>(`/discipline/checklists/${id}`, { method: 'DELETE' }),

  // ── Trade Checklists (per-trade) ──────────
  getTradeChecklist: (tradeId: string) =>
    request<unknown>(`/discipline/trade-checklists/${tradeId}`),
  submitTradeChecklist: (data: Record<string, unknown>) =>
    request<unknown>('/discipline/trade-checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Trade Plans ───────────────────────────
  getTradePlan: (tradeId: string) =>
    request<unknown>(`/discipline/plans/${tradeId}`),
  saveTradePlan: (data: Record<string, unknown>) =>
    request<unknown>('/discipline/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Trade Ratings ─────────────────────────
  getTradeRating: (tradeId: string) =>
    request<unknown>(`/discipline/ratings/${tradeId}`),
  saveTradeRating: (data: Record<string, unknown>) =>
    request<unknown>('/discipline/ratings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Discipline Analytics ──────────────────
  getDisciplineStats: () =>
    request<import('@trademind/shared').DisciplineStatsResponse>('/discipline/stats'),
  getStreaks: () =>
    request<import('@trademind/shared').StreakResponse>('/discipline/streaks'),

  // ── Onboarding ────────────────────────────
  getOnboardingStatus: () => request<unknown>('/notifications/onboarding'),
  updateOnboardingStep: (step: string, completed: boolean) =>
    request<unknown>('/notifications/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ step, completed }),
    }),

  // ── Prop Firm Accounts ────────────────────
  getPropFirmAccounts: () =>
    request<any[]>('/prop-firm'),
  getPropFirmAccount: (id: string) =>
    request<any>(`/prop-firm/${id}`),
  createPropFirmAccount: (data: Record<string, unknown>) =>
    request<any>('/prop-firm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePropFirmAccount: (id: string, data: Record<string, unknown>) =>
    request<any>(`/prop-firm/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePropFirmAccount: (id: string) =>
    request<unknown>(`/prop-firm/${id}`, { method: 'DELETE' }),
  syncPropFirmAccount: (id: string) =>
    request<any>(`/prop-firm/${id}/sync`, { method: 'POST' }),

  // ── Payments & Subscriptions ─────────────
  getPlans: () => request<unknown[]>('/payments/plans'),
  getSubscription: () => request<unknown>('/payments/subscription'),
  getUsage: () => request<unknown>('/payments/usage'),
  createOrder: (data: { planSlug: string; successUrl: string; cancelUrl: string }) =>
    request<unknown>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    request<unknown>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelSubscription: () =>
    request<unknown>('/payments/cancel', { method: 'POST' }),
  // ── Admin ─────────────────────────────────
  getAdminConfigs: () => request<unknown[]>('/admin/config'),
  updateAdminConfig: (key: string, value: unknown) =>
    request<unknown>(`/admin/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  getAdminStats: () => request<unknown>('/admin/stats'),
  getAdminAiAnalytics: () =>
    request<{
      totalRequestsCached: number;
      totalTokensConsumed: number;
      estimatedCostUsd: number;
      estimatedSavingsUsd: number;
      activeProviders: Array<{ provider: string; cachedEntries: number; tokensUsed: number }>;
      geminiFreeTierLimit: string;
      groqFreeTierLimit: string;
    }>('/admin/ai-analytics'),
  getAdminSubscriptions: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    request<{
      data: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/admin/subscriptions', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateAdminSubscription: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/admin/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getAdminBillingSummary: () =>
    request<{
      totalRevenuePaise: number;
      totalPaidInvoices: number;
      mrrPaise: number;
      arrPaise: number;
      byProvider: Array<{ provider: string; revenue: number; count: number }>;
      byStatus:   Array<{ status: string; count: number }>;
      byPlan:     Array<{ planName: string; planSlug: string; count: number }>;
      monthlyTrend: Array<{ month: string; revenue: number; count: number }>;
      recentInvoices: Array<{
        id: string; userId: string; userEmail: string; userName: string;
        provider: string; amountPaid: number; currency: string;
        status: string; paidAt: string | null; createdAt: string;
      }>;
    }>('/admin/billing/summary'),
  getAdminSyncLogs: (params?: { page?: number; limit?: number }) =>
    request<{ logs: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/sync-logs',
      { params: params as Record<string, string | number | undefined> },
    ),

  getAdminRevenue: () =>
    request<{
      mrrPaise: number;
      mrrInr: number;
      arrPaise: number;
      arrInr: number;
      totalSubscriptionRevenueInr: number;
      totalStoreRevenueInr: number;
      totalRevenueInr: number;
      activeSubscribers: number;
      churnRatePercent: number;
      totalUsers: number;
    }>('/admin/revenue'),

  getAdminSystemHealth: () =>
    request<{
      status: string;
      database: { status: string };
      queue: {
        depth: Record<string, number>;
        pendingJobs: number;
        runningJobs: number;
        failedJobs: number;
        totalCompleted: number;
      };
      cache: {
        totalEntries: number;
        expiredEntries: number;
      };
      rateLimiter: {
        activeWindows: number;
      };
      server: {
        uptimeSeconds: number;
        nodeVersion: string;
        rssMb: number;
        heapUsedMb: number;
      };
      totalUsers: number;
    }>('/admin/system-health'),

  impersonateUser: (userId: string) =>
    request<{ targetUser: { id: string; email: string; name: string; role: string }; token: string; expiresIn: number }>(
      `/admin/users/${userId}/impersonate`,
      { method: 'POST' },
    ),

  getFeatureFlags: () =>
    request<Array<{
      id: string;
      name: string;
      description?: string;
      isEnabled: boolean;
      rules?: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    }>>('/admin/feature-flags'),

  createFeatureFlag: (data: { name: string; description?: string; isEnabled?: boolean; rules?: Record<string, unknown> }) =>
    request<unknown>('/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFeatureFlag: (id: string, data: { isEnabled?: boolean; description?: string; rules?: Record<string, unknown> }) =>
    request<unknown>(`/admin/feature-flags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFeatureFlag: (id: string) =>
    request<unknown>(`/admin/feature-flags/${id}`, { method: 'DELETE' }),

  flushAdminCache: (pattern?: string) =>
    request<{ success: boolean; message: string }>(
      `/admin/cache?pattern=${encodeURIComponent(pattern ?? '*')}`,
      { method: 'DELETE' },
    ),

  getLiveSyncLogs: (limit?: number) =>
    request<Array<{
      id: string;
      brokerConnectionId: string;
      userId: string;
      syncType: string;
      status: string;
      executionsImported: number;
      tradesCreated: number;
      tradesUpdated: number;
      errorMessage: string | null;
      startedAt: string;
      completedAt: string | null;
    }>>(`/admin/sync-logs/live?limit=${limit ?? 30}`),

  // ── Admin: User Management ────────────────
  getAdminUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    request<{ users: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/users',
      { params: params as Record<string, string | number | undefined> },
    ),
  getAdminUser: (id: string) => request<unknown>(`/admin/users/${id}`),
  updateUserRole: (id: string, role: 'USER' | 'ADMIN') =>
    request<unknown>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteAdminUser: (id: string) =>
    request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  // ── Admin: Plan Management ────────────────
  getAdminPlans: () => request<unknown[]>('/admin/plans'),
  createAdminPlan: (data: Record<string, unknown>) =>
    request<unknown>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminPlan: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminPlan: (id: string) =>
    request<unknown>(`/admin/plans/${id}`, { method: 'DELETE' }),

  // ── Admin: Journal Trades Viewer ──────────
  getAdminJournal: (params?: Record<string, string | number | undefined>) =>
    request<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/journal',
      { params },
    ),

  // ── Admin: Broker Connections Viewer ──────
  getAdminBrokers: (params?: Record<string, string | number | undefined>) =>
    request<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/brokers',
      { params },
    ),

  // ── Admin: Invoices Viewer ────────────────
  getAdminInvoices: (params?: Record<string, string | number | undefined>) =>
    request<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/invoices',
      { params },
    ),

  // ── Admin: Trade Executions Viewer ────────
  getAdminExecutions: (params?: Record<string, string | number | undefined>) =>
    request<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/executions',
      { params },
    ),

  // ── Admin: Audit Logs ─────────────────────
  getAdminAuditLogs: (params?: { page?: number; limit?: number }) =>
    request<{ logs: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/admin/audit-logs',
      { params: params as Record<string, string | number | undefined> },
    ),

  // ── Admin: Tax Rates ──────────────────────
  getAdminTaxRates: () => request<unknown[]>('/admin/tax-rates'),
  createAdminTaxRate: (data: Record<string, unknown>) =>
    request<unknown>('/admin/tax-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminTaxRate: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/admin/tax-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminTaxRate: (id: string) =>
    request<unknown>(`/admin/tax-rates/${id}`, { method: 'DELETE' }),

  // ── Notifications ──────────────────────────
  getNotifications: (params?: { limit?: number; unreadOnly?: boolean }) =>
    request<unknown[]>('/notifications', {
      params: params as Record<string, string | number | undefined>,
    }),
  markNotificationRead: (id: string) =>
    request<unknown>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<unknown>('/notifications/read-all', { method: 'PATCH' }),
  deleteNotification: (id: string) =>
    request<unknown>(`/notifications/${id}`, { method: 'DELETE' }),
  getNotificationPreferences: () =>
    request<Array<{ type: string; channel: string; isEnabled: boolean }>>('/notifications/preferences'),
  updateNotificationPreference: (data: { type: string; channel?: 'email' | 'in_app' | 'push'; isEnabled: boolean }) =>
    request<unknown>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getWebhookConfig: () =>
    request<{
      discordWebhookUrl: string;
      telegramBotToken: string;
      telegramChatId: string;
      eodDebriefEnabled: boolean;
      riskAlertsEnabled: boolean;
    }>('/notifications/webhooks'),
  saveWebhookConfig: (data: {
    discordWebhookUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    eodDebriefEnabled?: boolean;
    riskAlertsEnabled?: boolean;
  }) =>
    request<{ message: string; config: any }>('/notifications/webhooks/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testWebhook: (data: {
    platform: 'discord' | 'telegram';
    discordWebhookUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  }) =>
    request<{ message: string }>('/notifications/webhooks/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchEodDebrief: () =>
    request<{ message: string; results: any }>('/notifications/webhooks/dispatch-debrief', {
      method: 'POST',
    }),

  // ── AI Services ───────────────────────────
  analyzeTradeAutopsy: (tradeId: string) =>
    request<import('@trademind/shared').TradeAutopsyResult>(`/ai/analyze/${tradeId}`, {
      method: 'POST',
    }),
  getBehavioralShield: () =>
    request<import('@trademind/shared').BehavioralShieldResult>('/ai/shield'),
  getDailyDebrief: () =>
    request<import('@trademind/shared').DailyDebriefResult | null>('/ai/debrief'),
  getAiStatus: () =>
    request<{ configured: boolean; providers: { gemini: boolean; groq: boolean } }>('/ai/status'),
  autofillJournal: (tradeId: string) =>
    request<import('@trademind/shared').JournalAutofillResult>(`/ai/autofill/${tradeId}`, {
      method: 'POST',
    }),
  batchAutofillJournal: (tradeIds?: string[]) =>
    request<import('@trademind/shared').BatchAutofillResult>('/ai/batch-autofill', {
      method: 'POST',
      body: JSON.stringify({ tradeIds }),
    }),

  // ── Statistical Simulations (Monte Carlo) ────
  getMonteCarloSimulation: (params?: {
    tradeHorizon?: number;
    startingCapital?: number;
    riskPerTradePercent?: number;
  }) =>
    request<import('@trademind/shared').MonteCarloSimulationResult>('/analytics/monte-carlo', {
      params: params as Record<string, string | number | undefined>,
    }),

  // ── Pre-Market Preparation Routine ─────────
  getTodayPremarketPlan: () =>
    request<import('@trademind/shared').DailyPremarketPlan | null>('/discipline/premarket'),
  savePremarketPlan: (data: Partial<import('@trademind/shared').DailyPremarketPlan>) =>
    request<import('@trademind/shared').DailyPremarketPlan>('/discipline/premarket', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  lockPremarketSession: () =>
    request<import('@trademind/shared').DailyPremarketPlan>('/discipline/premarket/lock', {
      method: 'POST',
    }),

  // ── Trade Replay ──────────────────────────
  getTradeReplay: (tradeId: string) =>
    request<TradeReplayData>(`/trades/${tradeId}/replay`),

  // ── AI Conversational Copilot & Chart Analysis
  getAiLiveContext: () =>
    request<any>('/ai/live-context'),
  chatWithAssistant: (message: string, history?: AiChatMessage[]) =>
    request<AiChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
  analyzeChartImage: (imageBase64: string, mimeType?: string, notes?: string) =>
    request<{
      analysis: string;
      summary: {
        symbol?: string;
        bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        keySupport?: string;
        keyResistance?: string;
        suggestedStopLoss?: string;
        suggestedTarget?: string;
        riskReward?: string;
        pattern?: string;
      };
      provider: string;
    }>('/ai/chart-analyze', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, notes }),
    }),
  generateAiStrategy: (prompt: string) =>
    request<{
      name: string;
      description: string;
      marketType: 'EQUITY' | 'OPTIONS' | 'FUTURES' | 'CRYPTO' | 'COMMODITY';
      timeframe: 'SCALPING' | 'INTRADAY' | 'SWING' | 'POSITIONAL' | 'LONG_TERM';
      entryCriteria: string;
      exitCriteria: string;
      riskRewardRatio: number;
      maxLossPerTrade: number;
      maxDailyLoss: number;
      tags: string[];
    }>('/ai/strategy-generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  // ── User Reviews & Testimonials ───────────
  getReviews: (params?: { featured?: boolean; limit?: number }) =>
    request<Review[]>('/reviews', {
      params: params as Record<string, string | number | undefined>,
    }),
  submitReview: (data: {
    rating: number;
    headline: string;
    body: string;
    traderType?: string;
    displayName?: string;
  }) =>
    request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyReview: () =>
    request<Review | null>('/reviews/mine'),

  // ── Digital Products Store (Public & User) ─
  getStoreProducts: (type?: string) =>
    request<StoreProduct[]>('/store/products', {
      params: type ? { type } : undefined,
    }),
  getStoreProduct: (id: string) =>
    request<StoreProduct>(`/store/products/${id}`),
  purchaseProduct: (productId: string) =>
    request<{
      orderId?: string;
      razorpayOrderId?: string;
      razorpayKeyId?: string;
      amount?: number;
      currency?: string;
      productTitle?: string;
      isFree?: boolean;
      hasAccess?: boolean;
    }>(`/store/purchase/${productId}`, {
      method: 'POST',
    }),
  verifyProductPayment: (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    productId: string;
    orderId: string;
  }) =>
    request<{ hasAccess: boolean; orderId: string }>('/store/verify-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyPurchases: () =>
    request<
      Array<{
        accessId: string;
        grantReason: string;
        downloadCount: number;
        lastAccessedAt?: string;
        accessGrantedAt: string;
        productId: string;
        title: string;
        description: string;
        productType: string;
        previewImageUrl?: string;
        videoUrl?: string;
        tags: string[];
        metadata: any;
        isFree: boolean;
      }>
    >('/store/my-purchases'),
  accessProduct: (productId: string) =>
    request<{
      downloadUrl?: string;
      videoUrl?: string;
      title: string;
      productType: string;
    }>(`/store/access/${productId}`, {
      method: 'POST',
    }),
  getUserOrderHistory: () =>
    request<Array<any>>('/store/orders'),

  // ── Admin: Digital Products Store ──────────
  getAdminProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
  }) =>
    request<{ products: StoreProduct[]; pagination: any }>('/admin/products', {
      params: params as Record<string, string | number | undefined>,
    }),
  createAdminProduct: (data: any) =>
    request<StoreProduct>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAdminProduct: (id: string) =>
    request<{ product: StoreProduct; accessList: any[] }>(`/admin/products/${id}`),
  updateAdminProduct: (id: string, data: any) =>
    request<StoreProduct>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminProduct: (id: string) =>
    request<{ message: string }>(`/admin/products/${id}`, {
      method: 'DELETE',
    }),
  getAdminStoreOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    request<{ orders: any[]; pagination: any }>('/admin/store/orders', {
      params: params as Record<string, string | number | undefined>,
    }),
  getAdminStoreAnalytics: () =>
    request<{
      totalRevenuePaise: number;
      totalPaidOrders: number;
      totalProducts: number;
      activeProducts: number;
      pendingReviewsCount: number;
      topProducts: any[];
    }>('/admin/store/analytics'),
  grantAdminProductAccess: (productId: string, userId: string) =>
    request<any>(`/admin/products/${productId}/grant`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  revokeAdminProductAccess: (productId: string, userId: string) =>
    request<any>(`/admin/products/${productId}/revoke/${userId}`, {
      method: 'DELETE',
    }),

  // ── Admin: Reviews Moderation ──────────────
  getAdminReviews: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    request<{ reviews: any[]; pagination: any }>('/admin/reviews', {
      params: params as Record<string, string | number | undefined>,
    }),
  approveAdminReview: (id: string) =>
    request<any>(`/admin/reviews/${id}/approve`, {
      method: 'PATCH',
    }),
  rejectAdminReview: (id: string) =>
    request<any>(`/admin/reviews/${id}/reject`, {
      method: 'PATCH',
    }),
  featureAdminReview: (id: string, isFeatured: boolean) =>
    request<any>(`/admin/reviews/${id}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ isFeatured }),
    }),
  deleteAdminReview: (id: string) =>
    request<any>(`/admin/reviews/${id}`, {
      method: 'DELETE',
    }),

  // ── Trading Strategies ─────────────────────
  getStrategies: (params?: { activeOnly?: boolean; marketType?: string }) =>
    request<TradingStrategy[]>('/strategies', {
      params: {
        activeOnly: params?.activeOnly !== undefined ? String(params.activeOnly) : undefined,
        marketType: params?.marketType,
      },
    }),
  getStrategy: (id: string) =>
    request<TradingStrategy>(`/strategies/${id}`),
  createStrategy: (data: Partial<TradingStrategy>) =>
    request<TradingStrategy>('/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStrategy: (id: string, data: Partial<TradingStrategy>) =>
    request<TradingStrategy>(`/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStrategy: (id: string) =>
    request<{ message: string; softDeleted: boolean }>(`/strategies/${id}`, {
      method: 'DELETE',
    }),
  getStrategyPerformance: (id: string) =>
    request<StrategyPerformance>(`/strategies/${id}/performance`),

  // ── Leaderboard ───────────────────────────
  getLeaderboard: (params?: { period?: LeaderboardPeriod; limit?: number }) =>
    request<LeaderboardEntry[]>('/leaderboard', {
      params: params as Record<string, string | number | undefined>,
    }),
  getMyLeaderboardStatus: () =>
    request<{
      optedIn: boolean;
      profile: LeaderboardOptIn | null;
      ranks: Record<string, LeaderboardEntry> | null;
    }>('/leaderboard/me'),
  optInLeaderboard: (data: { displayName: string; bio?: string; twitterUrl?: string }) =>
    request<LeaderboardOptIn>('/leaderboard/opt-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeaderboardOptIn: (data: Partial<LeaderboardOptIn>) =>
    request<LeaderboardOptIn>('/leaderboard/opt-in', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  optOutLeaderboard: () =>
    request<{ message: string }>('/leaderboard/opt-in', {
      method: 'DELETE',
    }),

  // ── Admin Leaderboard & Strategies ────────
  getAdminLeaderboard: (params?: { period?: string; search?: string }) =>
    request<{
      entries: Array<{
        userId: string;
        isPublic: boolean;
        displayName: string;
        bio: string | null;
        twitterUrl: string | null;
        userEmail: string;
        userName: string;
        updatedAt: string;
        rank: number | null;
        totalPnl: number;
        pnlPercent: number;
        winRate: number;
        totalTrades: number;
        disciplineScore: number;
        compositeScore: number;
        computedAt: string | null;
      }>;
      stats: {
        totalOptedIn: number;
        publicCount: number;
        disqualifiedCount: number;
        avgWinRate: number;
        avgCompositeScore: number;
      };
    }>('/admin/leaderboard', {
      params: params as Record<string, string | number | undefined>,
    }),
  moderateAdminLeaderboard: (
    userId: string,
    data: { isPublic?: boolean; action?: 'disqualify' | 'reinstate' | 'delete_snapshot' },
  ) =>
    request<any>(`/admin/leaderboard/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getAdminStrategies: (params?: { search?: string; marketType?: string }) =>
    request<{
      strategies: Array<TradingStrategy & { userEmail: string; userName: string }>;
      total: number;
    }>('/admin/strategies', {
      params: params as Record<string, string | number | undefined>,
    }),

  // ── Partners & Affiliate Directory ────────
  getPartners: (params?: { category?: string; featured?: boolean; country?: string }) =>
    request<{
      partners: Partner[];
      total: number;
    }>('/partners', {
      params: params as Record<string, string | number | undefined>,
    }),
  getPartnerBySlug: (slug: string) =>
    request<Partner>(`/partners/${slug}`),
  trackPartnerClick: (id: string) =>
    request<{ affiliateUrl: string; partnerId: string; name: string }>(`/partners/${id}/click`, {
      method: 'POST',
    }),
  getAdminPartners: (params?: { search?: string; category?: string; status?: string }) =>
    request<{
      partners: Partner[];
      total: number;
    }>('/admin/partners', {
      params: params as Record<string, string | number | undefined>,
    }),
  getAdminPartner: (id: string) =>
    request<Partner>(`/admin/partners/${id}`),
  createAdminPartner: (data: Partial<Partner>) =>
    request<Partner>('/admin/partners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminPartner: (id: string, data: Partial<Partner>) =>
    request<Partner>(`/admin/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminPartner: (id: string) =>
    request<{ message: string }>(`/admin/partners/${id}`, {
      method: 'DELETE',
    }),
  toggleAdminPartner: (id: string) =>
    request<Partner>(`/admin/partners/${id}/toggle`, {
      method: 'PATCH',
    }),
  reorderAdminPartners: (items: Array<{ id: string; displayOrder: number }>) =>
    request<{ message: string }>('/admin/partners/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  // ── Risk Management & Kill Switch ──────────
  getRiskStatus: () =>
    request<RiskStatus>('/risk/status'),
  getRiskProfile: () =>
    request<RiskProfile | null>('/risk/profile'),
  updateRiskProfile: (data: Partial<RiskProfile>) =>
    request<RiskProfile>('/risk/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  triggerKillSwitch: (reason?: string) =>
    request<{ activated: boolean; reason: string }>('/risk/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  resetKillSwitch: () =>
    request<{ reset: boolean }>('/risk/kill-switch/reset', {
      method: 'POST',
    }),

  // ── Public Configuration & System Status ───
  getPublicConfig: () =>
    request<Record<string, unknown>>('/config/public'),
  getAnnouncementBanner: () =>
    request<{
      enabled: boolean;
      text: string;
      type: 'info' | 'success' | 'warning' | 'alert';
      link: string;
      linkText: string;
      maintenanceMode: boolean;
    }>('/config/banner'),

  // ── System Health ──────────────────────────
  getHealth: () =>
    request<{
      status: 'healthy' | 'degraded';
      version: string;
      timestamp: string;
      checks: Record<string, 'healthy' | 'unhealthy'>;
    }>('/health'),
};


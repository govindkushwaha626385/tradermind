// ──────────────────────────────────────────────
// TradeMind — API Request/Response Types
// ──────────────────────────────────────────────

import type { BrokerId, Emotion, MistakeTag, TradeType } from './enums';
import type { User, Partner } from './domain';

// ── Auth ────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ── Broker Connection ───────────────────────
export interface ConnectBrokerRequest {
  brokerId: BrokerId;
  authCode?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  password?: string;
  totpSeed?: string;
  label?: string;
}

export interface BrokerAuthUrlResponse {
  authUrl: string;
  brokerId: BrokerId;
  state: string;
}

// ── Trade Journal ───────────────────────────
export interface UpdateJournalTradeRequest {
  tradeType?: TradeType;
  emotions?: Emotion[];
  setupPlaybookId?: string;
  ruleComplianceScore?: number;
  mistakeTags?: MistakeTag[];
  traderNotes?: string;
}

export interface TradeFilterParams {
  userId?: string;
  brokerConnectionId?: string;
  status?: 'OPEN' | 'CLOSED';
  symbol?: string;
  exchange?: string;
  assetClass?: string;
  direction?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Behavioral Insights ─────────────────────
export interface BehavioralInsight {
  id: string;
  emotion: Emotion;
  sampleSize: number;
  avgPositionSizeMultiplier: number;
  avgWinRate: number;
  avgRRatio: number;
  totalPnlImpact: number;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ── Equity Curve ─────────────────────────────
export interface EquityPoint {
  date: string;
  pnl: number;
  cumulativePnl: number;
  symbol?: string;
}

export interface DashboardStats {
  totalTrades: number;
  closedTrades?: number;
  openTrades?: number;
  totalWins?: number;
  totalLosses?: number;
  totalGrossPnl?: number;
  winRate: number;
  profitFactor: number;
  totalNetPnl: number;
  avgRRatio: number;
  totalFees: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  averageHoldingPeriod?: number;
  emotionsBreakdown: Record<string, number>;
  pnlByDay: Array<{ date: string; pnl: number }>;
  equityCurve?: EquityPoint[];
}


// ═════════════════════════════════════════════
//  Discipline Engine — API Types
// ═════════════════════════════════════════════

// ── Checklist Template ──────────────────────
export interface ChecklistRuleInput {
  id: string;
  label: string;
  order: number;
}

export interface CreateChecklistTemplateRequest {
  name: string;
  description?: string;
  rules: ChecklistRuleInput[];
  setupPlaybookId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateChecklistTemplateRequest {
  name?: string;
  description?: string;
  rules?: ChecklistRuleInput[];
  setupPlaybookId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ── Trade Checklist ─────────────────────────
export interface ChecklistResultInput {
  ruleId: string;
  label: string;
  passed: boolean;
}

export interface SubmitChecklistRequest {
  journalTradeId: string;
  checklistTemplateId: string;
  results: ChecklistResultInput[];
}

// ── Trade Plan ──────────────────────────────
export interface CreateTradePlanRequest {
  journalTradeId: string;
  plannedEntryPrice?: number;
  plannedStopLoss?: number;
  plannedTakeProfit?: number;
  plannedQuantity?: number;
  plannedRiskAmount?: number;
  plannedRR?: number;
}

// ── Trade Rating ────────────────────────────
export interface CreateTradeRatingRequest {
  journalTradeId: string;
  executionRating?: number;
  planRating?: number;
  psychologyRating?: number;
  emotions?: string[];
  mistakeTags?: string[];
  reflection?: string;
  lessonLearned?: string;
  followedPlan?: boolean;
  wouldChange?: boolean;
  whatWouldChange?: string;
}

// ── Discipline Stats (response shape) ───────
export interface MistakeCostItem {
  mistake: string;
  totalCost: number;
  tradeCount: number;
}

export interface EmotionPnlItem {
  emotion: string;
  avgPnl: number;
  tradeCount: number;
}

export interface PlanComparisonItem {
  followedPlan: boolean | null;
  avgPnl: number;
  tradeCount: number;
}

export interface DisciplineStatsResponse {
  compliance: { avgCompliance: number; totalChecked: number };
  planAdherence: { avgAdherence: number; totalPlanned: number };
  mistakeCosts: MistakeCostItem[];
  avgRatings: { execution: string; plan: string; psychology: string };
  planComparison: PlanComparisonItem[];
  emotionPnl: EmotionPnlItem[];
}

export interface StreakResponse {
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
}

// ── Advanced Analytics Response ─────────────
export interface RMultipleBucket {
  bucket: string;
  count: number;
  pct: number;
}

export interface SessionAnalysis {
  session: string;
  label: string;
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface WeekdayAnalysis {
  day: string;
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
}

export interface AdvancedAnalyticsResponse {
  // Risk-Adjusted Returns
  sharpeRatio: number;
  sortinoRatio: number;

  // Drawdown
  maxDrawdown: number;
  maxDrawdownPct: number;

  // Streaks
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;

  // Holding Time
  avgHoldMin: number;
  avgWinHoldMin: number;
  avgLossHoldMin: number;

  // R-Multiple Distribution
  rMultipleDistribution: RMultipleBucket[];
  avgRMultiple: number | null;

  // MFE/MAE Summary
  avgMfe: number | null;
  avgMae: number | null;
  mfeMaeCount: number;

  // Session & Weekday performance
  sessions: SessionAnalysis[];
  weekdays: WeekdayAnalysis[];

  // Expectancy & Institutional Metrics
  expectancy: number;  // (WinRate × AvgWin) - (LossRate × AvgLoss)
  profitFactor?: number; // Gross Profits / Gross Losses
  sqn?: number;          // Van Tharp System Quality Number
  sqnRating?: string;    // Rating tier (Holy Grail, Excellent, Good, Average, Hard to Trade)
  kellyCriterionPct?: number; // Optimal Kelly risk allocation %
  kRatio?: number;       // Lars Kestner K-Ratio (equity curve consistency)

  // Period
  timeframe: string;
  totalTrades: number;
}

// ── Partners API Types ───────────────────────
export interface CreatePartnerRequest {
  name: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  affiliateUrl: string;
  description?: string;
  category?: string;
  country?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  commissionNote?: string;
  tag?: string;
  features?: string[];
  rating?: string;
  accountOpeningFee?: string;
  maintenanceCharges?: string;
}

export interface UpdatePartnerRequest extends Partial<CreatePartnerRequest> {}

export interface PartnersListResponse {
  partners: Partner[];
  total: number;
}

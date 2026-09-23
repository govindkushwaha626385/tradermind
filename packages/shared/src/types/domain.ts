// ──────────────────────────────────────────────
// TradeMind — Core Domain Interfaces
// ──────────────────────────────────────────────

import type {
  BrokerId,
  AuthType,
  ConnectionStatus,
  Segment,
  ProductType,
  Exchange,
  TransactionType,
  OrderType,
  AssetClass,
  TradeDirection,
  TradeStatus,
  Emotion,
  MistakeTag,
  TradeType,
  UserRole,
} from './enums';

// ── User ────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Broker Connection ───────────────────────
export interface BrokerConnection {
  id: string;
  userId: string;
  brokerId: BrokerId;
  brokerClientId: string;
  label: string;
  authType: AuthType;
  accessToken: string; // encrypted
  refreshToken?: string; // encrypted
  apiKey?: string; // encrypted
  apiSecret?: string; // encrypted
  tokenExpiresAt?: Date;
  status: ConnectionStatus;
  lastSyncedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Broker Profile ──────────────────────────
export interface BrokerProfile {
  id: string;
  userId: string;
  brokerConnectionId: string;
  userName: string;
  email?: string;
  phone?: string;
  exchangesEnabled: string[];
  userType: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Account Balance ─────────────────────────
export interface AccountBalance {
  id: string;
  userId: string;
  brokerConnectionId: string;
  availableCash: number;
  usedMargin: number;
  totalCollateral: number;
  payinAmount: number;
  payoutAmount: number;
  currency: string;
  updatedAt: Date;
}

// ── Portfolio Holding ───────────────────────
export interface PortfolioHolding {
  id: string;
  userId: string;
  brokerConnectionId: string;
  isin?: string;
  tradingsymbol: string;
  exchange: Exchange;
  quantity: number;
  authorizedQuantity?: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  dayChangePercentage: number;
  updatedAt: Date;
}

// ── Active Position ─────────────────────────
export interface ActivePosition {
  id: string;
  userId: string;
  brokerConnectionId: string;
  tradingsymbol: string;
  exchange: Exchange;
  segment: Segment;
  productType: ProductType;
  quantity: number;
  buyQuantity: number;
  sellQuantity: number;
  buyAveragePrice: number;
  sellAveragePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  multiplier: number;
  updatedAt: Date;
}

// ── Trade Execution (Raw Fill) ──────────────
export interface TradeExecution {
  id: string;
  userId: string;
  brokerConnectionId: string;
  brokerExecutionId: string;
  brokerOrderId: string;
  exchangeOrderId?: string;
  tradingsymbol: string;
  exchange: Exchange;
  segment: Segment;
  transactionType: TransactionType;
  orderType: OrderType;
  quantity: number;
  executionPrice: number;
  executionTimestamp: Date;
  brokerageFee: number;
  sttTax: number;
  exchangeTurnoverFee: number;
  gstFee: number;
  sebiCharges: number;
  stampDuty: number;
  totalCharges: number;
  fillHash: string; // deduplication hash
  rawPayload?: Record<string, unknown>;
  createdAt: Date;
}

// ── Journal Trade (Aggregated) ──────────────
export interface JournalTrade {
  id: string;
  userId: string;
  brokerConnectionId: string;
  tradingsymbol: string;
  exchange: Exchange;
  assetClass: AssetClass;
  direction: TradeDirection;
  status: TradeStatus;
  totalQuantity: number;
  openQuantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number;
  openedAt: Date;
  closedAt?: Date;
  grossPnl: number;
  totalFeesAndTaxes: number;
  netPnl: number;
  maxFavorableExcursion?: number;
  maxAdverseExcursion?: number;
  rMultiple?: number;
  holdingPeriodMinutes?: number;

  // User qualitative overlay
  tradeType?: TradeType;
  emotions?: Emotion[];
  setupPlaybookId?: string;
  strategyId?: string;
  strategyName?: string;
  ruleComplianceScore?: number;
  mistakeTags?: MistakeTag[];
  traderNotes?: string;
  audioNoteUrl?: string;
  screenshotUrls?: string[];

  createdAt: Date;
  updatedAt: Date;
}

// ── Journal Trade → Execution Link ──────────
export interface TradeExecutionLink {
  id: string;
  journalTradeId: string;
  executionId: string;
  allocatedQuantity: number;
  allocatedFees: number;
}

// ── Setup Playbook ──────────────────────────
export interface SetupPlaybook {
  id: string;
  userId: string;
  name: string;
  description?: string;
  entryCriteria?: string;
  exitCriteria?: string;
  riskRules?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Admin Config (Dynamic System Configuration)
export interface AdminConfig {
  id: string;
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description?: string;
  category: string;
  isPublic: boolean;
  updatedAt: Date;
}

// ── Tax Rate (Dynamic config for Indian statutory fees)
export interface TaxRate {
  id: string;
  name: string;
  description?: string;
  segment: Segment;
  transactionType?: TransactionType;
  rateType: 'percentage' | 'flat';
  rateValue: number;
  appliedOn: 'buy' | 'sell' | 'both';
  maxCap?: number;
  minAmount?: number;
  isActive: boolean;
  priority: number;
  updatedAt: Date;
}

// ── Sync Log ────────────────────────────────
export interface SyncLog {
  id: string;
  userId: string;
  brokerConnectionId: string;
  syncType: 'full' | 'incremental' | 'webhook';
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt: Date;
  completedAt?: Date;
  executionsImported: number;
  tradesCreated: number;
  tradesUpdated: number;
  errorMessage?: string;
}

// ── Subscription Plan ───────────────────────
export interface Plan {
  id: string;
  slug: string; // 'free' | 'pro_monthly' | 'elite_yearly'
  name: string;
  description?: string;
  amount: number; // in smallest currency unit (paise/cents)
  currency: string;
  interval: 'month' | 'year' | 'one-time' | 'free';
  features: Record<string, unknown>; // feature flags
  isActive: boolean;
  sortOrder: number;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── User Subscription ───────────────────────
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  provider: 'stripe' | 'razorpay';
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'expired';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Invoice ──────────────────────────────────
export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: 'stripe' | 'razorpay';
  providerInvoiceId?: string;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  paidAt?: Date;
  rawProviderData?: Record<string, unknown>;
  createdAt: Date;
}

// ── Notification ─────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: 'daily_summary' | 'weekly_report' | 'token_expiry' | 'unlogged_trade' | 'sync_complete' | 'sync_failed' | 'behavioral_insight' | 'marketing';
  channel: 'email' | 'in_app' | 'push';
  subject?: string;
  body?: string;
  isEnabled: boolean;
  isDelivered: boolean;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ── User Onboarding ──────────────────────────
export interface UserOnboarding {
  id: string;
  userId: string;
  hasCompletedWelcome: boolean;
  hasConnectedBroker: boolean;
  hasImportedTrades: boolean;
  hasJournaledFirstTrade: boolean;
  hasViewedInsights: boolean;
  isComplete: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ═════════════════════════════════════════════
//  Discipline Engine — Core Interfaces
// ═════════════════════════════════════════════

// ── Checklist Template ──────────────────────
export interface ChecklistTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  /** JSON array: [{ id, label, order }] */
  rules: ChecklistRule[];
  setupPlaybookId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistRule {
  id: string;
  label: string;
  order: number;
}

// ── Trade Checklist (filled per trade) ───────
export interface TradeChecklist {
  id: string;
  userId: string;
  journalTradeId: string;
  checklistTemplateId: string;
  /** JSON array: [{ ruleId, label, passed }] */
  results: ChecklistResult[];
  complianceScore: number; // 0-1
  completedAt?: Date;
  createdAt: Date;
}

export interface ChecklistResult {
  ruleId: string;
  label: string;
  passed: boolean;
}

// ── Trade Plan (planned vs actual) ───────────
export interface TradePlan {
  id: string;
  userId: string;
  journalTradeId: string;
  plannedEntryPrice?: number;
  plannedStopLoss?: number;
  plannedTakeProfit?: number;
  plannedQuantity?: number;
  plannedRiskAmount?: number;
  plannedRR?: number;
  planAdherenceScore?: number; // 0-1
  entrySlippage?: number;
  exitSlippage?: number;
  slHitExactly?: number;
  tpHitExactly?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Trade Rating (self-reflection) ───────────
export interface TradeRating {
  id: string;
  userId: string;
  journalTradeId: string;
  executionRating?: number; // 1-5
  planRating?: number; // 1-5
  psychologyRating?: number; // 1-5
  emotions?: Emotion[];
  mistakeTags?: MistakeTag[];
  reflection?: string;
  lessonLearned?: string;
  followedPlan?: boolean;
  wouldChange?: boolean;
  whatWouldChange?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── AI Layer ─────────────────────────────────
export interface TradeAutopsyResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeLabel: string;
  gradeColor: string;
  executionLeak: string;
  strengths: string[];
  advice: string[];
  riskManagementScore: number;
  emotionalScore: number;
  executionScore: number;
  overallScore: number;
  provider: string;
  cached: boolean;
}

export type ShieldLevel = 'none' | 'caution' | 'warning' | 'danger';

export interface ShieldFlag {
  type: 'revenge_trading' | 'overtrading' | 'overconfidence' | 'loss_limit' | 'emotion_cascade';
  severity: ShieldLevel;
  title: string;
  description: string;
  recommendation: string;
}

export interface BehavioralShieldResult {
  level: ShieldLevel;
  flags: ShieldFlag[];
  tradesAnalyzed: number;
  dailyPnl: number;
  todayTradeCount: number;
  alertMessage: string;
}

export interface DailyDebriefResult {
  date: string;
  headline: string;
  pnlSummary: string;
  winRate: string;
  topLesson: string;
  emotionalPattern: string;
  tomorrowFocus: string;
  stats: {
    totalTrades: number;
    wins: number;
    losses: number;
    netPnl: number;
    bestTrade: { symbol: string; pnl: number } | null;
    worstTrade: { symbol: string; pnl: number } | null;
  };
  provider: string;
  cached: boolean;
}

// ── Statistical Simulations (Monte Carlo) ────
export interface MonteCarloSimulationResult {
  tradeHorizon: number; // number of projected future trades (e.g. 100)
  totalRuns: number; // 1000 runs
  historicalTradesSampled: number;
  startingCapital: number;
  riskPerTradePercent: number;
  baseline: {
    winRate: number; // 0..1
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
  };
  riskOfRuin: number; // probability % of losing >= 50% capital
  drawdownProbabilities: {
    gt10Percent: number; // 0..100%
    gt20Percent: number;
    gt30Percent: number;
    gt40Percent: number;
  };
  maxConsecutiveLosses: {
    median: number;
    worstCase95th: number;
  };
  percentiles: {
    p5: number[]; // equity curve at trade index 0..tradeHorizon
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
}

// ── Pre-Market Preparation ───────────────────
export interface PremarketChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PremarketWatchlistItem {
  symbol: string;
  direction: 'LONG' | 'SHORT' | 'WATCH';
  triggerPrice?: number;
  notes?: string;
}

export interface DailyPremarketPlan {
  id?: string;
  userId?: string;
  date: string;
  marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
  keyLevels?: string;
  maxDailyLoss?: number;
  maxDailyTrades?: number;
  maxRiskPerTrade?: number;
  checklistItems: PremarketChecklistItem[];
  watchlist: PremarketWatchlistItem[];
  mentalState?: string;
  notes?: string;
  isLocked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── AI Auto-Journal Assistant ─────────────────
export interface JournalAutofillResult {
  tradeId: string;
  symbol: string;
  emotions: Emotion[];
  mistakeTags: MistakeTag[];
  followedPlan: boolean;
  executionRating: number; // 1-5
  planRating: number; // 1-5
  psychologyRating: number; // 1-5
  reflection: string;
  lessonLearned: string;
  suggestedSetup?: string;
  keyHighlights?: string[];
  provider: string;
  cached: boolean;
}

export interface BatchAutofillResult {
  totalProcessed: number;
  results: JournalAutofillResult[];
}

// ── Digital Products Store ────────────────────
export type StoreProductType = 'PDF' | 'VIDEO' | 'COURSE' | 'BUNDLE' | 'TEMPLATE';
export type ProductOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type GrantReason = 'purchased' | 'free' | 'admin_granted' | 'subscription_benefit';

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  productType: StoreProductType;
  price: number; // paise for INR
  currency: string;
  downloadUrl?: string; // only returned if user has access
  videoUrl?: string;
  previewImageUrl?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  isFree: boolean;
  sortOrder: number;
  totalSales: number;
  hasAccess?: boolean; // populated by API when user is authenticated
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOrder {
  id: string;
  userId: string;
  productId: string;
  product?: StoreProduct;
  amountPaid: number;
  currency: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  status: ProductOrderStatus;
  paidAt?: Date;
  createdAt: Date;
}

export interface ProductAccess {
  id: string;
  userId: string;
  productId: string;
  product?: StoreProduct;
  orderId?: string;
  grantReason: GrantReason;
  downloadCount: number;
  lastAccessedAt?: Date;
  accessGrantedAt: Date;
}

// ── Reviews / Testimonials ────────────────────
export interface Review {
  id: string;
  userId: string;
  rating: number; // 1-5
  headline: string;
  body: string;
  traderType?: string;
  displayName?: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: Date;
}

// ── Trade Replay Data ─────────────────────────
export interface TradeReplayMarker {
  label: string;
  price: number;
  timestamp: string; // ISO
  type: 'ENTRY' | 'EXIT' | 'MFE' | 'MAE' | 'TARGET' | 'STOP' | 'PREMARKET_SUPPORT' | 'PREMARKET_RESISTANCE';
  color: string;
}

export interface TradeReplayData {
  tradeId: string;
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  segment: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryTime: string;
  exitTime?: string;
  mfe?: number; // max favorable excursion price level
  mae?: number; // max adverse excursion price level
  realizedPnl?: number;
  markers: TradeReplayMarker[];
  // Journal context
  journalReflection?: string;
  journalEmotions?: string[];
  journalMistakes?: string[];
  journalRatings?: { execution: number; plan: number; psychology: number };
  autopsyGrade?: string;
  // Pre-market context
  premarketBias?: string;
  premarketKeyLevels?: string;
  // Trade plan
  planTarget?: number;
  planStop?: number;
  planNotes?: string;
}

// ── AI Conversational Chat ────────────────────
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  hasImage?: boolean;
}

export interface AiChatResponse {
  message: string;
  provider: string;
  cached: boolean;
  contextUsed: string[];
}

// ── P&L Calendar & Consistency Heatmap ────────
export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  netPnl: number;
  grossPnl: number;
  charges: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  sessions?: {
    morning: { trades: number; pnl: number };
    midday: { trades: number; pnl: number };
    afternoon: { trades: number; pnl: number };
  };
}

export interface CalendarDayDetail {
  date: string;
  summary: CalendarDayData;
  trades: Array<{
    id: string;
    symbol: string;
    direction: string;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    netPnl: number;
    grossPnl: number;
    totalCharges: number;
    openedAt: string;
    closedAt?: string;
    emotions?: string[];
    mistakes?: string[];
    notes?: string;
  }>;
  premarketPlan?: {
    marketBias: string;
    keyLevels?: string;
    notes?: string;
  } | null;
}

// ── What-If Behavioral Eliminator Simulator ───
export interface WhatIfSimulationResult {
  original: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  adjusted: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    capitalSaved: number;
    eliminatedTradesCount: number;
  };
  eliminatedEmotions: string[];
  eliminatedMistakes: string[];
  curveComparison: Array<{
    tradeIndex: number;
    date: string;
    actualCumulativePnl: number;
    adjustedCumulativePnl: number;
  }>;
}

// ── Indian Tax & Turnover Ledger Report ───────
export interface TaxReportData {
  financialYear: string;
  period: { from: string; to: string };
  fnoTurnover: number;
  intradayTurnover: number;
  deliveryTurnover: number;
  totalTurnover: number;
  grossPnl: number;
  netPnl: number;
  totalCharges: number;
  chargesBreakdown: {
    stt: number;
    exchangeTurnoverFees: number;
    sebiTurnoverFees: number;
    gst: number;
    stampDuty: number;
    brokerage: number;
  };
  tradeCounts: {
    total: number;
    fno: number;
    equityIntraday: number;
    delivery: number;
  };
}

export type StrategyMarketType = 'EQUITY' | 'OPTIONS' | 'FUTURES' | 'CRYPTO' | 'COMMODITY';
export type StrategyTimeframe = 'SCALPING' | 'INTRADAY' | 'SWING' | 'POSITIONAL' | 'LONG_TERM';

export interface StrategyRiskRules {
  maxLossPerTrade?: number;
  maxDailyLoss?: number;
  riskRewardRatio?: number;
  maxOpenPositions?: number;
  stopLossType?: 'FIXED_POINTS' | 'PERCENTAGE' | 'ATR' | 'TECHNICAL';
  [key: string]: unknown;
}

export interface TradingStrategy {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  marketType: StrategyMarketType;
  timeframe?: StrategyTimeframe | null;
  entryCriteria?: string | null;
  exitCriteria?: string | null;
  riskRules?: StrategyRiskRules | null;
  tags?: string[] | null;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  totalPnl: number;
  avgRMultiple?: number | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  grossPnl: number;
  totalFees: number;
  avgPnlPerTrade: number;
  profitFactor: number;
  avgRMultiple: number;
  bestTradePnl: number;
  worstTradePnl: number;
  avgHoldingPeriodMinutes: number;
  recentTrades: Array<{
    id: string;
    tradingsymbol: string;
    direction: string;
    netPnl: number;
    openedAt: string | Date;
    closedAt?: string | Date;
    status: string;
  }>;
}

// ── Leaderboard ───────────────────────────────
export type LeaderboardPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export interface LeaderboardOptIn {
  userId: string;
  isPublic: boolean;
  displayName: string;
  bio?: string | null;
  twitterUrl?: string | null;
  updatedAt: string | Date;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  period: LeaderboardPeriod;
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  twitterUrl?: string | null;
  totalPnl: number;
  pnlPercent: number;
  winRate: number;
  totalTrades: number;
  disciplineScore: number;
  compositeScore: number;
  computedAt: string | Date;
}

// ── Partners & Affiliate Directory ───────────────
export type PartnerCategory = 'discount' | 'full_service' | 'crypto' | 'algo' | 'platform';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  affiliateUrl: string;
  description?: string | null;
  category: PartnerCategory | string;
  country: string;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  commissionNote?: string | null;
  tag?: string | null;
  features: string[];
  rating?: string | null;
  accountOpeningFee?: string | null;
  maintenanceCharges?: string | null;
  clickCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ── Risk Management & Kill Switch ─────────────
export type KillSwitchResetMode = 'midnight' | 'manual' | 'admin' | 'eod' | 'cooldown';

export interface RiskProfile {
  id: string;
  userId: string;
  // Daily Loss Limits
  dailyLossLimitAbs: string | number;  // ₹ absolute
  dailyLossLimitPct: string | number;  // % of capital
  // Trade Count Limits
  maxTradesPerDay: number;
  maxConsecutiveLosses: number;
  // Position Size Limits
  maxPositionSizePct: string | number;
  maxOpenPositions: number;
  // Kill Switch
  killSwitchEnabled: boolean;
  killSwitchActive: boolean;
  killSwitchResetMode: KillSwitchResetMode;
  killSwitchTriggeredAt?: string | Date | null;
  killSwitchReason?: string | null;
  // Cooldown
  cooldownMinutesAfterLoss: number;
  // Notifications
  notifyAt75Pct: boolean;
  notifyOnKillSwitch: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface RiskStatus {
  profile: RiskProfile | null;
  todayPnl: number;
  todayTradeCount: number;
  consecutiveLosses: number;
  killSwitchActive: boolean;
  warnings: string[];
  pctOfDailyLimitUsed: number; // 0–100
  canTrade: boolean;
  reason?: string; // why canTrade is false
}

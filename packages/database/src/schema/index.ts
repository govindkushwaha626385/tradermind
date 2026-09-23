// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Exports
// ──────────────────────────────────────────────

export { users } from './users';
export type { UserSelect, UserInsert } from './users';

export { brokerConnections } from './broker-connections';
export type { BrokerConnectionSelect, BrokerConnectionInsert } from './broker-connections';

export { brokerProfiles, accountBalances } from './broker-profiles';
export type { BrokerProfileSelect, AccountBalanceSelect } from './broker-profiles';

export { portfolioHoldings, positions } from './holdings-positions';
export type { PortfolioHoldingSelect, PositionSelect } from './holdings-positions';

export { tradeExecutions } from './trade-executions';
export type { TradeExecutionSelect, TradeExecutionInsert } from './trade-executions';

export { journalTrades, tradeExecutionLinks } from './journal-trades';
export type { JournalTradeSelect, JournalTradeInsert, TradeExecutionLinkSelect } from './journal-trades';

export { setupPlaybooks } from './playbooks';
export type { SetupPlaybookSelect, SetupPlaybookInsert } from './playbooks';

// ── Discipline Engine ─────────────────────
export { checklistTemplates } from './checklist-templates';
export type { ChecklistTemplateSelect, ChecklistTemplateInsert } from './checklist-templates';

export { tradeChecklists } from './trade-checklists';
export type { TradeChecklistSelect, TradeChecklistInsert } from './trade-checklists';

export { tradePlans } from './trade-plans';
export type { TradePlanSelect, TradePlanInsert } from './trade-plans';

export { tradeRatings } from './trade-ratings';
export type { TradeRatingSelect, TradeRatingInsert } from './trade-ratings';

export { adminConfigs, taxRates, syncLogs, adminAuditLogs } from './admin-configs';
export type { AdminConfigSelect, TaxRateSelect, SyncLogSelect, AdminAuditLogSelect } from './admin-configs';

// ── New: Subscriptions & Payments ──────────
export { plans, subscriptions, invoices } from './subscriptions';
export type { PlanSelect, PlanInsert, SubscriptionSelect, SubscriptionInsert, InvoiceSelect, InvoiceInsert } from './subscriptions';

// ── New: Notifications & Onboarding ────────
export { notifications, userOnboarding } from './notifications';
export type { NotificationSelect, NotificationInsert, UserOnboardingSelect, UserOnboardingInsert } from './notifications';

// ── AI Cache ─────────────────────────────────
export { aiCache } from './ai-cache';
export type { AiCacheSelect, AiCacheInsert } from './ai-cache';

// ── Pre-Market Preparation ───────────────────
export { dailyPremarketPlans } from './premarket-plans';
export type { DailyPremarketPlanSelect, DailyPremarketPlanInsert } from './premarket-plans';

// ── Digital Products Store ────────────────────
export { products, productOrders, productAccess } from './products';
export type { ProductSelect, ProductInsert, ProductOrderSelect, ProductOrderInsert, ProductAccessSelect, ProductAccessInsert } from './products';

// ── Reviews & Testimonials ────────────────────
export { reviews } from './reviews';
export type { ReviewSelect, ReviewInsert } from './reviews';

// ── Trading Strategies ──────────────────────────────────
export { tradingStrategies } from './strategies';
export type { TradingStrategySelect, TradingStrategyInsert } from './strategies';

// ── Leaderboard ─────────────────────────────────────────
export { leaderboardOptIns, leaderboardSnapshots } from './leaderboard';
export type { LeaderboardOptInSelect, LeaderboardOptInInsert, LeaderboardSnapshotSelect, LeaderboardSnapshotInsert } from './leaderboard';

// ── Partners & Affiliate Directory ──────────────────────
export { partners } from './partners';
export type { PartnerSelect, PartnerInsert } from './partners';

// ── Risk Management & Kill Switch ────────────────────────
export { riskProfiles } from './risk-profiles';
export type { RiskProfileSelect, RiskProfileInsert } from './risk-profiles';

// ── Supabase-backed Infrastructure ───────────────────────────
export { cacheEntries } from './cache-entries';
export type { CacheEntrySelect, CacheEntryInsert } from './cache-entries';

export { apiRateLimits } from './api-rate-limits';
export type { ApiRateLimitSelect, ApiRateLimitInsert } from './api-rate-limits';

export { backgroundJobs } from './background-jobs';
export type { BackgroundJobSelect, BackgroundJobInsert } from './background-jobs';

export { featureFlags } from './feature-flags';
export type { FeatureFlagSelect, FeatureFlagInsert } from './feature-flags';

// ── User Goals & Target Tracking ─────────────────────────────
export { userGoals } from './user-goals';
export type { UserGoalSelect, UserGoalInsert } from './user-goals';

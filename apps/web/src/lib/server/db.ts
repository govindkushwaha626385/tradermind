// ──────────────────────────────────────────────
// TradeMind — Server: Database Re-exports
//
// Centralises all @trademind/database imports so
// Next.js API routes use a consistent path.
// ──────────────────────────────────────────────

export {
  getDatabase,
  getSupabaseAdmin,
  getSupabaseClient,
  // Tables — core
  users,
  brokerConnections,
  brokerProfiles,
  tradeExecutions,
  tradeExecutionLinks,
  journalTrades,
  tradePlans,
  tradeRatings,
  dailyPremarketPlans,
  syncLogs,
  accountBalances,
  portfolioHoldings,
  positions,
  subscriptions,
  plans,
  invoices,             // was: payments (table is `invoices`)
  backgroundJobs,
  notifications,
  userOnboarding,
  apiRateLimits,
  riskProfiles,
  // Playbooks & Checklists
  setupPlaybooks,       // was: playbooks
  checklistTemplates,
  tradeChecklists,
  // Strategies
  tradingStrategies,    // was: strategies
  // Leaderboard
  leaderboardOptIns,
  leaderboardSnapshots, // was: leaderboardEntries
  // Store / Products
  products,             // was: storeProducts
  productOrders,
  productAccess,
  reviews,
  partners,
  // Admin
  adminConfigs,         // was: appConfigs
  adminAuditLogs,
  taxRates,
  // User Goals
  userGoals,            // was: goals
  // AI
  aiCache,
  // Infrastructure
  cacheEntries,
  featureFlags,
  // Utilities
  encrypt,
  decrypt,
  sha256,
  createHmac,
  createFillHash,
} from '@trademind/database';

export type {
  UserSelect,
  BrokerConnectionSelect,
  TradeExecutionSelect,
  JournalTradeSelect,
  BackgroundJobSelect,
  NotificationSelect,
  RiskProfileSelect,
  SubscriptionSelect,
  PlanSelect,
} from '@trademind/database';

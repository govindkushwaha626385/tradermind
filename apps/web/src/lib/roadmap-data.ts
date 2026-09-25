// ──────────────────────────────────────────────
// TradeMind — Trader Career Evolution Roadmap Database
// Comprehensive, 4-stage institutional progression framework
// from market novice to institutional funded professional.
// Includes scenario simulations, formulas, behavioral safeguards,
// and cross-market tracks (Stocks, F&O, Crypto, Forex).
// ──────────────────────────────────────────────

export type RoadmapTrack = 'all' | 'scalping' | 'options' | 'crypto' | 'swing' | 'prop_firm';

export interface RoadmapScenario {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  shortDesc: string;
  detailedAction: string;
  toolHref: string;
  toolLabel: string;
  category: 'Risk' | 'Psychology' | 'Technical' | 'Analytics' | 'Funding';
  tracks: RoadmapTrack[];
  formula?: string;
  pitfall?: string;
  proTip?: string;
  xpPoints: number;
  scenario?: RoadmapScenario;
}

export interface RoadmapStage {
  id: string;
  stageNumber: number;
  title: string;
  tagline: string;
  levelBadge: string;
  duration: string;
  color: string;
  accentBg: string;
  summary: string;
  corePhilosophy: string;
  milestones: RoadmapMilestone[];
}

export const TRACK_META: Record<RoadmapTrack, { label: string; icon: string; description: string }> = {
  all: { label: 'Universal Core', icon: '🌐', description: 'Essential principles applicable to every asset class and style.' },
  scalping: { label: 'Intraday Scalper', icon: '⚡', description: 'Fast 1m/5m execution, Level 2 tape reading, session opens, and VWAP.' },
  options: { label: 'F&O Derivatives', icon: '📊', description: 'Delta-neutral spreads, implied volatility crush, Theta decay, and expiry pins.' },
  crypto: { label: 'Crypto Perpetuals', icon: '🪙', description: 'Funding rate arbitrage, liquidation clusters, DEX/CEX order flow, and 24/7 risk.' },
  swing: { label: 'Swing & Trend', icon: '📈', description: 'Multi-day momentum, stage 2 breakouts, relative strength, and macro regimes.' },
  prop_firm: { label: 'Prop Firm Funded', icon: '💼', description: 'Strict 5% daily drawdown buffers, payout consistency, and evaluation rules.' },
};

export const TRADER_ROADMAP: RoadmapStage[] = [
  {
    id: 'stage-1-foundations',
    stageNumber: 1,
    title: 'The Foundation & Capital Defense',
    tagline: 'From Market Novice to Disciplined Risk Guardian',
    levelBadge: 'Stage 1 · Beginner',
    duration: 'Weeks 1 – 4',
    color: 'from-blue-600 to-indigo-600 text-blue-400 border-blue-500/30',
    accentBg: 'bg-blue-500/10',
    summary: 'Master the non-negotiable laws of survival. Before trying to make money, you must become mathematically impossible to blow up.',
    corePhilosophy: 'Capital preservation is the ultimate edge. Without money in the account, experience cannot compound.',
    milestones: [
      {
        id: 'm1-1',
        title: 'Hard-Code the 1% Capital Risk Rule',
        shortDesc: 'Never risk more than 1% of total account equity on any single execution.',
        detailedAction: 'Use the TradeMind Position Sizer before placing any order. Compute position size strictly as: Capital × 1% ÷ Distance to Invalidation Stop. Never size positions based on margin availability or contract price.',
        toolHref: '/dashboard/calculators',
        toolLabel: 'Open Position Sizer',
        category: 'Risk',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing', 'prop_firm'],
        formula: 'Position Qty = (Account Equity × Risk %) ÷ |Entry Price − Stop Loss|',
        pitfall: 'Buying standard round lots (e.g. 100 shares or 1 full crypto contract) regardless of how far the stop-loss is placed.',
        proTip: 'If your stop loss distance is wider due to market volatility, reduce your position size so the dollar risk stays identical.',
        xpPoints: 100,
        scenario: {
          question: 'Your trading balance is $25,000. You spot a setup on NIFTY/SPY with entry at 500 and stop-loss at 490. Following the 1% rule, what is your maximum allowable monetary risk and position size?',
          options: [
            '$250 risk, 25 shares/contracts',
            '$500 risk, 50 shares/contracts',
            '$250 risk, 100 shares/contracts',
            '$2,500 risk, 250 shares/contracts',
          ],
          correctIndex: 0,
          explanation: '1% of $25,000 is $250. The distance between entry ($500) and stop ($490) is $10. Position size = $250 ÷ $10 = 25 shares. You risk exactly $250.',
        },
      },
      {
        id: 'm1-2',
        title: 'Connect Real-Time Multi-Broker Sync',
        shortDesc: 'Eliminate manual spreadsheets by linking your live trading broker account.',
        detailedAction: 'Link Zerodha, Dhan, Angel One, Upstox, Interactive Brokers, Binance, or Bybit. Ensure trade fills, cash balances, and statutory tax charges sync automatically to eliminate manual entry friction.',
        toolHref: '/dashboard/brokers',
        toolLabel: 'Connect Brokers',
        category: 'Technical',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing'],
        formula: 'Net P&L = Gross Executions − (Brokerage + Exchange Turnover + STT + GST + Stamp Duty)',
        pitfall: 'Overlooking statutory transaction charges, which frequently turn an apparently winning scalper into a net losing account.',
        proTip: 'Review your Brokerage & Tax Breakdown in TradeMind Analytics every Friday to discover your true net expectancy.',
        xpPoints: 100,
        scenario: {
          question: 'A trader completes 40 scalps in an options session, showing +$600 gross profit. However, their broker charged $720 in exchange turnover fees and STT. What is their real outcome?',
          options: [
            '+$600 profit because broker charges are deducted monthly',
            '-$120 net loss due to fee bleed and excessive over-trading',
            'Break-even because exchange fees are tax deductible',
            '+$1,320 profit combined',
          ],
          correctIndex: 1,
          explanation: 'Net P&L = Gross ($600) − Fees ($720) = -$120 loss. Automated broker sync immediately reveals fee drag that manual logs hide.',
        },
      },
      {
        id: 'm1-3',
        title: 'Establish Mandatory Pre-Market Routine',
        shortDesc: 'Never trade without a pre-flight mental and macroeconomic check.',
        detailedAction: 'Run through the TradeMind Pre-Market Checklist every morning before the opening bell: verify major economic releases (CPI, Interest Rates, RBI/Fed), mark key liquidity levels, set maximum daily loss threshold, and evaluate emotional readiness.',
        toolHref: '/dashboard/checklists',
        toolLabel: 'Launch Checklist Runner',
        category: 'Psychology',
        tracks: ['all', 'scalping', 'options', 'swing', 'prop_firm'],
        pitfall: 'Opening the trading terminal at 9:14 AM and entering trades within the first 60 seconds without knowing the day’s macro events.',
        proTip: 'Mark high-impact news releases on your calendar and set a rule: no new entries 5 minutes before and after high-impact data.',
        xpPoints: 100,
        scenario: {
          question: 'The US Non-Farm Payrolls (NFP) or RBI Policy decision is scheduled for 8:30 AM / 10:00 AM. What is the institutional protocol for active positions?',
          options: [
            'Double your position size right before the news to catch the breakout candle',
            'Widen your stop loss by 100 points so you do not get whipped out',
            'Reduce risk, flatten speculative intraday bets, or hold only if entry is far in profit with hard breakeven stops',
            'Turn off your screen and let market orders fill naturally',
          ],
          correctIndex: 2,
          explanation: 'Major news causes massive slippage and spread expansion. Institutional desks flatten short-term exposure to protect capital.',
        },
      },
      {
        id: 'm1-4',
        title: 'Eliminate Revenge Trading & Tilt',
        shortDesc: 'Implement the 2-strike daily rule to stop emotional spiral re-entries.',
        detailedAction: 'Activate the TradeMind Behavioral Shield. If you hit two consecutive stop losses in a single morning session, enforce an automatic 45-minute cooling off period to allow cortisol and emotional stress to dissipate.',
        toolHref: '/dashboard/discipline',
        toolLabel: 'Check Behavioral Shield',
        category: 'Psychology',
        tracks: ['all', 'scalping', 'options', 'crypto', 'prop_firm'],
        formula: 'Max Daily Loss Limit = 2.0% of Total Capital (Trading terminates instantly if reached)',
        pitfall: 'Immediately doubling your position size on trade #3 to make back the losses from trades #1 and #2 (the classic Martingale tilt trap).',
        proTip: 'Walk away from the desk physically. Cortisol takes roughly 30 to 45 minutes to metabolize after an emotional shock.',
        xpPoints: 100,
        scenario: {
          question: 'You suffer two consecutive losses of -$250 each. Your maximum daily loss limit is -$500. A shiny 1-minute breakout candle appears on your screen. What must you do?',
          options: [
            'Take the trade with 2x size to get back to green before noon',
            'Shut down the terminal immediately and preserve mental capital for tomorrow',
            'Switch to a different asset class you have never traded before',
            'Deposit more margin to give the trade room to breathe',
          ],
          correctIndex: 1,
          explanation: 'You have hit your daily risk quota ($500). Continuing to trade under elevated emotional stress guarantees account destruction.',
        },
      },
      {
        id: 'm1-5',
        title: 'Log First 30 Consecutive Trades with Tags',
        shortDesc: 'Build your initial statistical baseline with process self-ratings.',
        detailedAction: 'Record every completed round-trip execution in your TradeMind journal. Grade your execution adherence (A to F), attach the setup screenshot, tag your emotional state (Calm, Anxious, FOMO), and note whether you followed your plan.',
        toolHref: '/dashboard/journal',
        toolLabel: 'Open Trade Journal',
        category: 'Analytics',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing', 'prop_firm'],
        pitfall: 'Only journaling winning trades while ignoring and hiding painful losing trades.',
        proTip: 'A losing trade that followed your trading plan perfectly is an Grade A trade. A winning trade where you broke rules is a Grade F trade.',
        xpPoints: 100,
        scenario: {
          question: 'You entered without a stop loss, price moved against you, but a sudden flash spike saved your position and you closed with +$400 profit. How should you grade this trade in your journal?',
          options: [
            'Grade A+ because you made $400 and winning is all that matters',
            'Grade F because you violated your non-negotiable risk rules and got lucky by bad habits',
            'Do not log it so it does not skew your win rate statistics',
            'Grade B because profit covers all mistakes',
          ],
          correctIndex: 1,
          explanation: 'Rewarding bad habits creates subconscious reinforcement that inevitably results in account liquidation on the next occurrence.',
        },
      },
    ],
  },
  {
    id: 'stage-2-setup-edge',
    stageNumber: 2,
    title: 'Setup Specialization & Market Structure',
    tagline: 'From Disciplined Novice to Consistent Edge Master',
    levelBadge: 'Stage 2 · Intermediate',
    duration: 'Months 2 – 4',
    color: 'from-emerald-600 to-teal-600 text-emerald-400 border-emerald-500/30',
    accentBg: 'bg-emerald-500/10',
    summary: 'Stop trading every chart pattern. Specialize in one or two high-conviction institutional setups and execute them with machine-like precision.',
    corePhilosophy: 'Consistency comes from setup specialization, not from predicting every market swing.',
    milestones: [
      {
        id: 'm2-1',
        title: 'Higher-Timeframe Trend & Liquidity Alignment',
        shortDesc: 'Ensure your execution timeframe aligns with 1H / 4H institutional order flow.',
        detailedAction: 'Identify resting Buy-Side (BSL) and Sell-Side (SSL) liquidity pools on higher timeframes (4H / Daily). Only trade intraday setups in the direction price is expanding toward until the higher-timeframe target is reached.',
        toolHref: '/dashboard/replay',
        toolLabel: 'Launch TradingView Live Chart',
        category: 'Technical',
        tracks: ['all', 'scalping', 'crypto', 'swing', 'prop_firm'],
        formula: 'Trade Bias = Multi-Timeframe Alignment: Weekly (Macro) ➔ Daily (Structure) ➔ 15M (Trigger)',
        pitfall: 'Taking counter-trend 1-minute scalp reversals against a strong 4-hour institutional expansion.',
        proTip: 'Always identify where the resting retail stop orders are pooled before entering. Institutions move price toward liquidity.',
        xpPoints: 150,
        scenario: {
          question: 'The Daily chart is printing higher highs and higher lows with high volume. On the 5-minute chart, an RSI overbought divergence appears. What is the institutional probability?',
          options: [
            'Take a heavy short position because 5-min RSI is over 80',
            'Wait for a lower-timeframe liquidity sweep, followed by a bullish market structure shift (MSS) in direction of the Daily trend',
            'Sell your entire portfolio and buy puts immediately',
            'Ignore the daily chart since day traders only care about 5 minutes',
          ],
          correctIndex: 1,
          explanation: 'Lower timeframe overbought signals get steamrolled in a trending market. Wait for pullbacks to re-join the dominant order flow.',
        },
      },
      {
        id: 'm2-2',
        title: 'Document & Lock Your 1st Setup Playbook',
        shortDesc: 'Formalize entry triggers, invalidation stop rules, and target scaling.',
        detailedAction: 'Create a dedicated Playbook card in TradeMind with verified chart screenshot examples of the setup in action, required volume parameters, and minimum R:R rules. You are forbidden from trading setups not in your playbook.',
        toolHref: '/dashboard/playbooks',
        toolLabel: 'Build Playbook',
        category: 'Technical',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing', 'prop_firm'],
        pitfall: 'Trading whatever symbol looks hot in chatrooms or Twitter feeds instead of waiting for your verified playbook setup.',
        proTip: 'Mastering a single setup (e.g. Opening Range Breakout or Fair Value Gap Retest) is enough to generate seven-figure annual returns.',
        xpPoints: 150,
        scenario: {
          question: 'What is the minimum required documentation for an institutional trading playbook entry?',
          options: [
            'A feeling that the stock will go up because of an influencer tweet',
            'Context conditions, exact entry trigger, objective invalidation stop price, scaling plan, and risk-reward ratio',
            'Just a moving average cross on a 1-minute chart',
            'The name of the ticker symbol and desired dollar profit',
          ],
          correctIndex: 1,
          explanation: 'Without clear invalidation and context rules, a trade cannot be systematically audited or repeated with edge.',
        },
      },
      {
        id: 'm2-3',
        title: 'Never Execute Below 1 : 2.0 Risk-to-Reward',
        shortDesc: 'Asymmetric risk math allows you to be wrong 55% of the time and still compound.',
        detailedAction: 'Calculate your target distance before entry. If target resistance is closer than 2x your stop-loss distance, pass on the trade completely.',
        toolHref: '/dashboard/calculators',
        toolLabel: 'Risk-Reward Calculator',
        category: 'Risk',
        tracks: ['all', 'scalping', 'crypto', 'swing', 'prop_firm'],
        formula: 'Expectancy = (Win % × Avg Win) − (Loss % × Avg Loss). At 1:2 R:R and 40% win rate, Expectancy = (0.40 × 2R) − (0.60 × 1R) = +0.20R per trade.',
        pitfall: 'Taking 1:0.5 risk-to-reward setups where you risk $200 to make $100. A 70% win rate is needed just to break even after commissions.',
        proTip: 'Asymmetry is the trader’s shield. With 1:3 R:R setups, you can lose 7 out of 10 trades and still end the month in net profit.',
        xpPoints: 150,
        scenario: {
          question: 'Trader A has a 40% win rate with an average 1:2.5 Risk-to-Reward. Trader B has a 75% win rate with an average 1:0.4 Risk-to-Reward. Across 100 trades risking $100 per loss, who makes more profit?',
          options: [
            'Trader B because 75% win rate is vastly superior to 40%',
            'Trader A: $4,000 profit vs Trader B: $500 profit (Trader A outperforms by 8x)',
            'Both make identical returns',
            'Both lose money due to slippage',
          ],
          correctIndex: 1,
          explanation: 'Trader A: (40 wins × $250) − (60 losses × $100) = $10,000 − $6,000 = +$4,000. Trader B: (75 wins × $40) − (25 losses × $100) = $3,000 − $2,500 = +$500. Asymmetric R:R dominates.',
        },
      },
      {
        id: 'm2-4',
        title: 'Master Candle Replay & Execution Audits',
        shortDesc: 'Step through winning and losing trades candle-by-candle.',
        detailedAction: 'Replay past sessions using the visual scrubber in TradeMind. Analyze Max Favorable Excursion (MFE) to determine whether you are exiting profits too early out of anxiety.',
        toolHref: '/dashboard/replay',
        toolLabel: 'Start Trade Replay',
        category: 'Technical',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing'],
        formula: 'MFE Efficiency % = Realized Profit ÷ Maximum Potential Profit reached before stop exit',
        pitfall: 'Never reviewing past trades and repeating the exact same execution mistakes week after week.',
        proTip: 'Look at the highest point price reached before returning to your stop. If MFE is regularly 3R while you exit at 0.8R, you have a profit retention leak.',
        xpPoints: 150,
        scenario: {
          question: 'During trade replay, you discover that in 18 out of 20 trades, price hits +2.5R before pulling back, but you consistently exited at +0.7R because you were afraid of losing profits. What adjustment is required?',
          options: [
            'Keep exiting at +0.7R because a profit is a profit',
            'Implement a mechanical trailing stop behind 15-minute swing pivots, allowing runners to capture the 2.5R extension',
            'Stop taking stops altogether',
            'Double your lot size at 0.7R',
          ],
          correctIndex: 1,
          explanation: 'Premature exits destroy asymmetric expectancy. A systematic trailing stop locks in baseline profit while capturing larger trends.',
        },
      },
      {
        id: 'm2-5',
        title: 'Run AI Trade Autopsies Weekly',
        shortDesc: 'Use the AI Copilot to diagnose execution leaks across your trades.',
        detailedAction: 'Generate AI autopsy reports on all losing trades to identify recurring behavioral traps: hesitation, chasing, or moving stop losses.',
        toolHref: '/dashboard/ai-assistant',
        toolLabel: 'Consult AI Copilot',
        category: 'Analytics',
        tracks: ['all', 'scalping', 'options', 'crypto', 'swing', 'prop_firm'],
        pitfall: 'Assuming that every losing trade was caused by "the market being manipulated" rather than subjective execution errors.',
        proTip: 'Review your AI Copilot behavioral heatmap every Sunday night to see which hour of the day produced the majority of your losses.',
        xpPoints: 150,
        scenario: {
          question: 'The AI Autopsy identifies that 78% of your trading losses occur between 1:30 PM and 2:30 PM on days after an early morning winning trade. What actionable rule should you establish?',
          options: [
            'Trade more aggressively in the afternoon to make up for the stats',
            'Lock the terminal at 1:00 PM if the morning session was profitable, protecting your daily gains from afternoon churn',
            'Ignore the AI report because time of day has no correlation with market edge',
            'Switch to 1-second charts in the afternoon',
          ],
          correctIndex: 1,
          explanation: 'Afternoon churn and euphoria after a morning win are prime behavioral leak triggers. A hard shutdown preserves real capital.',
        },
      },
    ],
  },
  {
    id: 'stage-3-derivatives-math',
    stageNumber: 3,
    title: 'Derivatives, Volatility & Portfolio Math',
    tagline: 'From Consistent Trader to Profitable Quantitative Pro',
    levelBadge: 'Stage 3 · Advanced',
    duration: 'Months 5 – 8',
    color: 'from-purple-600 to-pink-600 text-purple-400 border-purple-500/30',
    accentBg: 'bg-purple-500/10',
    summary: 'Expand into multi-asset derivatives, options Greeks, volatility crush defense, and quantitative stochastic simulation.',
    corePhilosophy: 'Professional traders manage volatility and time decay as rigorously as they manage directional price movement.',
    milestones: [
      {
        id: 'm3-1',
        title: 'Black-Scholes Options Greeks Mastery',
        shortDesc: 'Understand how Delta, Gamma, Theta decay, and Vega govern premium prices.',
        detailedAction: 'Model theoretical option values and calculate the Theta decay curve before trading weekly index expiry sessions.',
        toolHref: '/dashboard/calculators',
        toolLabel: 'Options Greeks Calculator',
        category: 'Technical',
        tracks: ['options', 'crypto', 'all'],
        formula: 'Δ (Delta) = ∂V/∂S | Γ (Gamma) = ∂²V/∂S² | Θ (Theta) = ∂V/∂t | ν (Vega) = ∂V/∂σ',
        pitfall: 'Holding out-of-the-money long call/put options over the weekend expecting directional moves, while Theta crushes 40% of the premium.',
        proTip: 'Theta decay accelerates non-linearly in the final 5 days before expiration. Net sellers of premium exploit this parabolic curve.',
        xpPoints: 200,
        scenario: {
          question: 'You buy an At-The-Money (ATM) weekly call option on Wednesday before a major corporate earnings announcement. Price moves up 1% after earnings, but your call option loses 25% of its value. Why did this happen?',
          options: [
            'The broker cheated you on the fill price',
            'Implied Volatility (IV) crushed from 60% down to 20% post-earnings, and the Vega loss exceeded the Delta gain',
            'Delta turned negative unexpectedly',
            'Options can only be traded during regular bank hours',
          ],
          correctIndex: 1,
          explanation: 'IV Crush: Post-event volatility collapse destroys option extrinsic value even if directional movement was favorable.',
        },
      },
      {
        id: 'm3-2',
        title: 'Construct Defined-Risk Options Payoff Curves',
        shortDesc: 'Replace naked directional buying/selling with hedged vertical spreads.',
        detailedAction: 'Simulate Bull Put Spreads, Bear Call Spreads, and Iron Condors. Verify maximum monetary risk and break-even points prior to fill.',
        toolHref: '/dashboard/calculators',
        toolLabel: 'Options Strategy Payoff',
        category: 'Risk',
        tracks: ['options', 'all'],
        formula: 'Max Loss (Credit Spread) = (Strike Width − Net Credit Received) × Multiplier',
        pitfall: 'Selling naked out-of-the-money options to collect small pennies while exposing your entire account to black swan tail risk.',
        proTip: 'Always buy cheap wing protection to cap maximum margin requirements and eliminate catastrophic liquidation risk.',
        xpPoints: 200,
        scenario: {
          question: 'You sell a 24,000 Put and buy a 23,800 Put for a net credit of 45 points on a lot size of 25. What is your absolute maximum risk on this trade?',
          options: [
            'Unlimited loss if the market drops to zero',
            'Max loss = (200 spread width − 45 credit) × 25 = 155 × 25 = 3,875 points/currency units',
            'Max loss is only the 45 points credit received',
            'Zero risk because options spreads are risk-free',
          ],
          correctIndex: 1,
          explanation: 'Defined-risk credit spreads strictly bound your loss to the spread width minus credit collected, regardless of how far the market falls.',
        },
      },
      {
        id: 'm3-3',
        title: 'Forex & Crypto Multi-Currency Pip Sizing',
        shortDesc: 'Manage global pairs and crypto perpetuals with normalized cash risk.',
        detailedAction: 'Use the Forex & Crypto Pip Calculator to accurately compute pip values in USD, EUR, GBP, INR, or USDT, respecting fixed risk budgets.',
        toolHref: '/dashboard/calculators',
        toolLabel: 'Forex Pip Calculator',
        category: 'Risk',
        tracks: ['crypto', 'all', 'prop_firm'],
        formula: 'Standard Lot Pip Value (EURUSD) = 0.0001 × 100,000 units = $10.00 per pip',
        pitfall: 'Assuming 1 lot on GBPJPY has the same monetary pip value as 1 lot on EURUSD or BTCUSDT.',
        proTip: 'Cross currency pairs have floating exchange rates against your account base currency. Always compute exact pip value prior to order entry.',
        xpPoints: 200,
        scenario: {
          question: 'Your account balance is $10,000 USD. You want to risk 1% ($100) on a EURUSD long with a 25-pip stop loss. What lot size should you enter?',
          options: [
            '1.00 Standard Lot',
            '0.40 Lots ($10 per pip × 25 pips = $250 risk)',
            '0.40 Mini Lots ($4.00 per pip × 25 pips = $100 risk)',
            '2.50 Lots',
          ],
          correctIndex: 2,
          explanation: '1 mini lot (0.10) on EURUSD is $1/pip. To risk $100 over 25 pips: $100 ÷ 25 pips = $4/pip. 4 × $1 = 0.40 lots ($4/pip × 25 pips = $100 exact risk).',
        },
      },
      {
        id: 'm3-4',
        title: '1,000-Iteration Monte Carlo Stress Testing',
        shortDesc: 'Simulate sequence-of-returns risk to forecast expected maximum drawdown.',
        detailedAction: 'Run Monte Carlo resampling on your real win-rate and payout ratios to ensure your capital can survive a 99th-percentile losing streak.',
        toolHref: '/dashboard/analytics',
        toolLabel: 'Run Monte Carlo Sim',
        category: 'Analytics',
        tracks: ['all', 'prop_firm', 'swing'],
        formula: 'P(Drawdown > D) = Stochastic Resampling across N = 10,000 permutations',
        pitfall: 'Assuming that because your historical maximum losing streak was 4 trades, you will never experience 8 consecutive losses in the future.',
        proTip: 'In any series of 1,000 trades with a 50% win rate, a sequence of 8 to 10 consecutive losses is mathematically guaranteed to occur.',
        xpPoints: 200,
        scenario: {
          question: 'A trader with a 55% win rate risks 4% of their account per trade. What does a 1,000-iteration Monte Carlo simulation reveal about their probability of ruin (>50% drawdown)?',
          options: [
            '0% chance of ruin because the win rate is above 50%',
            'Over 65% probability of experiencing a devastating drawdown due to sequence-of-returns clustering and high risk per trade',
            '100% guarantee of beating the S&P 500',
            'Monte Carlo math cannot predict trading returns',
          ],
          correctIndex: 1,
          explanation: 'High position risk (4%) guarantees ruin when inevitable losing clusters strike. Sizing at 1% drops the probability of ruin to near 0%.',
        },
      },
      {
        id: 'm3-5',
        title: 'Segment Asset Class Profitability',
        shortDesc: 'Audit whether your F&O, Equity, Forex, or Crypto strategies carry positive expectancy.',
        detailedAction: 'Use performance analytics heatmaps to eliminate venue bleeding and concentrate capital into your highest-Sharpe assets.',
        toolHref: '/dashboard/analytics',
        toolLabel: 'View Asset Heatmaps',
        category: 'Analytics',
        tracks: ['all', 'options', 'crypto', 'swing'],
        pitfall: 'Subsidizing a losing asset class (e.g. losing money on Crypto overnight) with gains earned from disciplined Equity day trading.',
        proTip: 'Stop trading any asset class where your last 50 trades produce a negative Sharpe ratio or negative profit factor.',
        xpPoints: 200,
        scenario: {
          question: 'Your TradeMind segment breakdown shows: Stocks: +$8,200 (Profit Factor 2.1), Crypto Perps: -$4,100 (Profit Factor 0.65). What is the highest ROI decision you can make this month?',
          options: [
            'Add more leverage to Crypto Perps to make back the $4,100 loss',
            'Immediately pause all Crypto Perp trading and allocate 100% of focus and capital to Stocks',
            'Start trading Commodity futures instead',
            'Trade both equally to maintain diversification',
          ],
          correctIndex: 1,
          explanation: 'Cutting negative expectancy segments instantly stops capital bleed and compounds returns on proven edges.',
        },
      },
    ],
  },
  {
    id: 'stage-4-institutional-funding',
    stageNumber: 4,
    title: 'Institutional Funding & Prop Firm Mastery',
    tagline: 'From Solo Trader to Institutional Funded Professional',
    levelBadge: 'Stage 4 · Elite Pro',
    duration: 'Months 9+',
    color: 'from-amber-500 to-orange-500 text-amber-400 border-amber-500/30',
    accentBg: 'bg-amber-500/10',
    summary: 'Attract outside investor capital, pass prop firm evaluations (FTMO, FundedNext, Apex), and build an institutional audited track record.',
    corePhilosophy: 'True wealth in trading comes from scaling outside capital with disciplined drawdown containment.',
    milestones: [
      {
        id: 'm4-1',
        title: 'Pass Prop Firm Evaluation Drawdown Rules',
        shortDesc: 'Meet 10% profit milestones while staying strictly within 5% daily loss limits.',
        detailedAction: 'Track your challenge metrics in the TradeMind Prop Firm hub. Set automated drawdown alarm buffers at 3.5% daily drawdown to avoid breach.',
        toolHref: '/dashboard/prop-firm',
        toolLabel: 'Open Prop Firm Hub',
        category: 'Funding',
        tracks: ['prop_firm', 'all'],
        formula: 'Daily Drawdown Buffer = Starting Day Balance − (5% Max Daily Breach Level)',
        pitfall: 'Focusing on the 10% profit target instead of obsessing over the 5% daily drawdown threshold. 95% of failed prop traders fail on drawdown.',
        proTip: 'Scale position size down to 0.5% per trade during prop evaluations. Slower progress guarantees survival.',
        xpPoints: 250,
        scenario: {
          question: 'On a $100,000 funded account, the maximum daily loss is $5,000 (5%). By 11:00 AM, your account is down -$3,200 for the day. What should your trading plan dictate?',
          options: [
            'Take a full-size trade to win back the $3,200 before market close',
            'Halt trading immediately or reduce position risk to 0.25% ($250), preserving the remaining $1,800 buffer to avoid account liquidation',
            'Close your eyes and hope the broker system glitches',
            'Widen stop loss to 500 pips',
          ],
          correctIndex: 1,
          explanation: 'Protecting the daily drawdown buffer is paramount. Once breached, the account is terminated permanently.',
        },
      },
      {
        id: 'm4-2',
        title: 'Mine Unconscious Behavioral Leaks',
        shortDesc: 'Leverage AI pattern analysis to identify subtle psychological blindspots.',
        detailedAction: 'Analyze time-of-day loss clusters, revenge asset hopping, and premature profit-taking across your last 100 logged trades.',
        toolHref: '/dashboard/ai-assistant',
        toolLabel: 'Run Behavioral Audit',
        category: 'Analytics',
        tracks: ['all', 'scalping', 'prop_firm'],
        pitfall: 'Blaming bad luck for repetitive behavioral blunders that recur every month.',
        proTip: 'Look for patterns where you increase lot size immediately following a 3-trade win streak. Overconfidence is a lethal killer.',
        xpPoints: 250,
        scenario: {
          question: 'What behavioral bias causes a trader to hold losing trades for hours hoping for a bounce, while closing winning trades in 45 seconds for tiny profits?',
          options: [
            'Prospect Theory / Loss Aversion (losses hurt psychologically twice as much as equivalent gains feel good)',
            'Gamma exposure',
            'High frequency arbitrage',
            'Broker latency',
          ],
          correctIndex: 0,
          explanation: 'Prospect Theory causes humans to take risk to avoid realizing a loss, while acting risk-averse to lock in tiny gains. Institutional rules reverse this instinct.',
        },
      },
      {
        id: 'm4-3',
        title: 'Export Retina Branded Social Share Cards',
        shortDesc: 'Build industry credibility with verified, watermarked performance cards.',
        detailedAction: 'Generate 1200x675 HD social cards with verified execution seals, R:R metrics, and Privacy Mode (% only) for Twitter, Discord, and Mentors.',
        toolHref: '/dashboard/trades',
        toolLabel: 'View Shareable Cards',
        category: 'Funding',
        tracks: ['all', 'prop_firm'],
        pitfall: 'Posting misleading, inspect-element fake profit screenshots instead of audited, cryptographic execution cards.',
        proTip: 'Use Privacy Mode (% gains and R:R multiples) when sharing publicly to maintain operational security while showing process mastery.',
        xpPoints: 250,
        scenario: {
          question: 'Why do institutional capital allocators and serious trading mentors prefer seeing R:R multiples and percentage return over raw dollar amounts?',
          options: [
            'Because dollar amounts depend purely on account size, whereas R-multiples measure true mathematical skill and risk management',
            'Because dollars cannot be converted to euros',
            'Because brokers do not track dollars',
            'Because percentage signs look prettier on social media',
          ],
          correctIndex: 0,
          explanation: 'A trader making $10,000 by risking $50,000 has negative edge. A trader making +3.5R consistently can manage $10,000,000 in outside capital.',
        },
      },
      {
        id: 'm4-4',
        title: 'Maintain Public Leaderboard Rank & Verification',
        shortDesc: 'Demonstrate audited, verifiable consistency to capital allocators.',
        detailedAction: 'Opt in to the TradeMind verified public leaderboard. Showcase your Sharpe ratio, profit factor, and discipline streak without exposing monetary balance.',
        toolHref: '/dashboard/leaderboard',
        toolLabel: 'Check Leaderboard',
        category: 'Funding',
        tracks: ['all', 'prop_firm'],
        pitfall: 'Trading for leaderboard vanity instead of adhering to your risk rules.',
        proTip: 'TradeMind ranks users by Process Quality Score, Sharpe Ratio, and Discipline Streaks, not by reckless raw leverage.',
        xpPoints: 250,
        scenario: {
          question: 'What metric best demonstrates institutional risk-adjusted consistency over 90 trading days?',
          options: [
            'Total number of Twitter followers',
            'Sharpe Ratio (> 1.8) and Profit Factor (> 1.75) alongside a max drawdown under 8%',
            'Highest single day gain using 100x leverage',
            'Number of tickers traded in a single day',
          ],
          correctIndex: 1,
          explanation: 'Sharpe ratio measures excess return per unit of volatility. Consistent, low-drawdown returns attract multi-million dollar allocations.',
        },
      },
      {
        id: 'm4-5',
        title: 'Multi-Account Capital Portfolio Allocation',
        shortDesc: 'Manage and trade across multiple live broker and prop accounts simultaneously.',
        detailedAction: 'Use the Portfolio Scope Selector in the top navigation bar to seamlessly filter analytics between personal broker accounts and prop accounts.',
        toolHref: '/dashboard',
        toolLabel: 'Switch Portfolio Scope',
        category: 'Funding',
        tracks: ['prop_firm', 'all', 'crypto'],
        pitfall: 'Treating a prop evaluation account with reckless disregard while being conservative on a personal account.',
        proTip: 'Treat every account as part of a single master balance sheet. Use TradeMind unified reporting to monitor gross portfolio exposure.',
        xpPoints: 250,
        scenario: {
          question: 'When managing 3 funded accounts simultaneously ($100k, $50k, $50k), what is the proper execution protocol?',
          options: [
            'Trade different setups on each account randomly',
            'Normalize risk so each account risks exactly 0.5% of its respective equity, executed simultaneously with identical stop parameters',
            'Risk 5% on the smaller account because it is cheaper to replace',
            'Manually trade one account per week',
          ],
          correctIndex: 1,
          explanation: 'Proportional risk sizing ensures systemic safety across the entire firm allocation without exposing any single sub-account to breach.',
        },
      },
    ],
  },
];

// Helper calculations
export function getTraderRankFromXP(xp: number): {
  level: number;
  rank: string;
  badge: string;
  nextLevelXp: number;
  progressPct: number;
} {
  const RANKS = [
    { level: 1, rank: 'Capital Scout', badge: '🥉 Bronze', xpRequired: 0 },
    { level: 2, rank: 'Disciplined Risk Guardian', badge: '🥈 Silver', xpRequired: 400 },
    { level: 3, rank: 'Consistent Edge Specialist', badge: '🥇 Gold', xpRequired: 1000 },
    { level: 4, rank: 'Quantitative Mathematical Operator', badge: '💎 Platinum', xpRequired: 2000 },
    { level: 5, rank: 'Institutional Funded Legend', badge: '👑 Diamond Master', xpRequired: 3200 },
  ];

  let current = RANKS[0];
  let next = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xpRequired) {
      current = RANKS[i];
      next = RANKS[i + 1] || { ...current, xpRequired: current.xpRequired + 1000 };
    }
  }

  const span = next.xpRequired - current.xpRequired;
  const inLevel = Math.max(0, xp - current.xpRequired);
  const progressPct = Math.min(100, Math.round((inLevel / (span || 1)) * 100));

  return {
    level: current.level,
    rank: current.rank,
    badge: current.badge,
    nextLevelXp: next.xpRequired,
    progressPct,
  };
}

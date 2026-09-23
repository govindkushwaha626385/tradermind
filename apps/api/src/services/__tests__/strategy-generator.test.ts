import { describe, it, expect } from 'vitest';
import { generateStrategyFromPrompt } from '../ai/strategy-generator.service';

describe('Strategy Generator Service', () => {
  it('should throw an error for empty or whitespace prompts', async () => {
    await expect(generateStrategyFromPrompt('user-1', '')).rejects.toThrow('Please describe your strategy idea');
    await expect(generateStrategyFromPrompt('user-1', '   ')).rejects.toThrow('Please describe your strategy idea');
  });

  it('should generate an Options strategy for Bank Nifty options scalp prompt', async () => {
    const prompt = '5-minute Bank Nifty options scalp: Enter when 9 EMA crosses above 21 EMA above VWAP with RSI > 60. Stop loss 25 points, target 50 points (1:2 R:R). Max 1% risk per trade.';
    const strategy = await generateStrategyFromPrompt('user-1', prompt);

    expect(strategy).toBeDefined();
    expect(strategy.name).toBeTruthy();
    expect(strategy.marketType).toBe('OPTIONS');
    expect(strategy.timeframe).toBe('SCALPING');
    expect(strategy.riskRewardRatio).toBe(2);
    expect(strategy.maxLossPerTrade).toBe(1);
    expect(strategy.entryCriteria).toContain('9 EMA');
    expect(strategy.tags).toContain('options');
  });

  it('should generate an Equity Swing strategy for daily breakout prompt', async () => {
    const prompt = 'Daily swing trade in high-beta equity: Enter 20-day high breakout with heavy volume. Stop at 20-day EMA, target 1:3 risk-reward. Max daily loss 3%.';
    const strategy = await generateStrategyFromPrompt('user-1', prompt);

    expect(strategy).toBeDefined();
    expect(strategy.marketType).toBe('EQUITY');
    expect(strategy.timeframe).toBe('SWING');
    expect(strategy.riskRewardRatio).toBe(3);
    expect(strategy.maxDailyLoss).toBe(3);
    expect(strategy.entryCriteria).toBeTruthy();
    expect(strategy.exitCriteria).toBeTruthy();
    expect(strategy.tags).toContain('equity');
    expect(strategy.tags).toContain('swing');
  });

  it('should generate a Crypto Futures strategy correctly', async () => {
    const prompt = 'BTC Bitcoin crypto futures: 15-min scalp when price breaks resistance on volume. 1:2 R:R with 1.5% max risk.';
    const strategy = await generateStrategyFromPrompt('user-1', prompt);

    expect(strategy).toBeDefined();
    expect(['CRYPTO', 'FUTURES']).toContain(strategy.marketType);
    expect(strategy.riskRewardRatio).toBe(2);
    expect(strategy.maxLossPerTrade).toBe(1.5);
  });
});

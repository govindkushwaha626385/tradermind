// ──────────────────────────────────────────────
// TradeMind — Dynamic Tax & Fee Engine
// All rates loaded from admin_configs or tax_rates tables
// Nothing is hardcoded — Admin can update via dashboard
// ──────────────────────────────────────────────

import { getDatabase } from '@trademind/database';
import { taxRates } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { configManager } from '@trademind/config';
import type { Segment, TransactionType } from '@trademind/shared';

export interface FeeBreakdown {
  brokerageFee: number;
  sttTax: number;
  exchangeTurnoverFee: number;
  gstFee: number;
  sebiCharges: number;
  stampDuty: number;
  totalCharges: number;
}

export interface FeeCalculationInput {
  segment: Segment;
  transactionType: TransactionType;
  tradeValue: number; // quantity * price
  premiumValue?: number; // for options: premium * qty
  isIntraday?: boolean;
  isExercised?: boolean;
}

/**
 * Calculate all statutory fees for a trade execution
 * Uses dynamic rates from database (admin-configurable)
 */
export async function calculateFees(input: FeeCalculationInput): Promise<FeeBreakdown> {
  const db = getDatabase();

  // Load active tax rates for the segment from DB
  const rates = await db
    .select()
    .from(taxRates)
    .where(
      and(
        eq(taxRates.segment, input.segment),
        eq(taxRates.isActive, true),
      ),
    )
    .orderBy(taxRates.priority);

  // Load dynamic config values
  const gstRate = await configManager.get<number>('fees.gst_rate');
  const flatBrokerage = await configManager.get<number>('fees.brokerage_flat_per_order');
  const pctBrokerage = await configManager.get<number>('fees.brokerage_percentage');

  // ── Brokerage ──────────────────────────
  const pctBrokerageAmt = input.tradeValue * pctBrokerage;
  const brokerageFee = Math.min(pctBrokerageAmt, flatBrokerage);

  // ── STT ────────────────────────────────
  let sttTax = 0;
  const sttRates = rates.filter(
    (r) =>
      r.name.toLowerCase().includes('stt') &&
      (r.transactionType === input.transactionType || !r.transactionType),
  );

  // Match the correct STT rate based on segment and product type
  const sttRate = sttRates.find((r) => {
    if (input.segment === 'EQUITY') {
      // For EQUITY, distinguish intraday vs delivery by rate name
      if (input.isIntraday) {
        return r.name.toLowerCase().includes('intraday');
      }
      return r.name.toLowerCase().includes('delivery') || !r.name.toLowerCase().includes('intraday');
    }
    if (input.segment === 'FNO') {
      // For FNO, distinguish futures vs options by premiumValue presence
      if (input.premiumValue != null && input.premiumValue > 0) {
        return r.name.toLowerCase().includes('option') || r.name.toLowerCase().includes('premium');
      }
      return r.name.toLowerCase().includes('future') || !r.name.toLowerCase().includes('option');
    }
    return true;
  });

  if (sttRate && matchesAppliedOn(sttRate.appliedOn, input.transactionType)) {
    const baseValue = input.segment === 'FNO' && input.premiumValue
      ? input.premiumValue
      : input.tradeValue;
    sttTax = baseValue * sttRate.rateValue;

    // Options exercise STT
    if (input.segment === 'FNO' && input.isExercised) {
      const exerciseRate = rates.find(
        (r) => r.name.toLowerCase().includes('stt') && r.name.toLowerCase().includes('exercise'),
      );
      if (exerciseRate) {
        sttTax += input.tradeValue * exerciseRate.rateValue;
      }
    }
  }

  // ── Exchange Turnover Fee ──────────────
  let exchangeTurnoverFee = 0;
  const turnoverRates = rates.filter(
    (r) => r.name.toLowerCase().includes('exchange turnover'),
  );
  const turnoverRate = turnoverRates.find((r) => {
    if (input.segment === 'FNO') {
      // Distinguish futures vs options for FNO
      if (input.premiumValue != null && input.premiumValue > 0) {
        return r.name.toLowerCase().includes('option');
      }
      return r.name.toLowerCase().includes('future') || !r.name.toLowerCase().includes('option');
    }
    return true;
  });
  if (turnoverRate) {
    const turnoverBase = input.premiumValue ?? input.tradeValue;
    exchangeTurnoverFee = turnoverBase * turnoverRate.rateValue;
  }

  // ── SEBI Turnover Fee ──────────────────
  const sebiPerCrore = await configManager.get<number>('fees.sebi_turnover_fee_per_crore');
  const sebiCharges = (input.tradeValue / 10_000_000) * sebiPerCrore;

  // ── Stamp Duty ─────────────────────────
  let stampDuty = 0;
  if (input.transactionType === 'BUY') {
    const stampRates = rates.filter(
      (r) => r.name.toLowerCase().includes('stamp duty'),
    );
    const stampRate = stampRates.find((r) => {
      if (input.segment === 'EQUITY' && input.isIntraday) {
        return r.name.toLowerCase().includes('intraday');
      }
      return true;
    });
    if (stampRate) {
      stampDuty = input.tradeValue * stampRate.rateValue;
    }
  }

  // ── GST on (Brokerage + Exchange + SEBI) ──
  const gstBase = brokerageFee + exchangeTurnoverFee + sebiCharges;
  const gstFee = gstBase * gstRate;

  // ── Total ──────────────────────────────
  const totalCharges = brokerageFee + sttTax + exchangeTurnoverFee + gstFee + sebiCharges + stampDuty;

  return {
    brokerageFee: round(brokerageFee),
    sttTax: round(sttTax),
    exchangeTurnoverFee: round(exchangeTurnoverFee),
    gstFee: round(gstFee),
    sebiCharges: round(sebiCharges),
    stampDuty: round(stampDuty),
    totalCharges: round(totalCharges),
  };
}

function matchesAppliedOn(appliedOn: string, txType: TransactionType): boolean {
  if (appliedOn === 'both') return true;
  if (appliedOn === 'buy' && txType === 'BUY') return true;
  if (appliedOn === 'sell' && txType === 'SELL') return true;
  return false;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

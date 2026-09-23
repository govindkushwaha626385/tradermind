// ──────────────────────────────────────────────
// TradeMind — Partner Directory & Affiliate Engine Tests
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const partnerAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  affiliateUrl: z.string().min(1, 'Affiliate URL is required'),
  description: z.string().optional().nullable(),
  category: z.string().default('discount'),
  country: z.string().default('IN'),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  commissionNote: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  features: z.array(z.string()).default([]),
  rating: z.string().default('4.8'),
  accountOpeningFee: z.string().default('Free'),
  maintenanceCharges: z.string().default('₹0 for 1st Year'),
});

function generateSlug(name: string, customSlug?: string): string {
  if (customSlug && customSlug.trim()) {
    return customSlug.trim();
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

describe('🤝 Partner Directory & Affiliate Engine', () => {
  describe('Partner Slug Generation', () => {
    it('generates a clean slug from standard partner names', () => {
      expect(generateSlug('Zerodha Kite')).toBe('zerodha-kite');
      expect(generateSlug('Delta Exchange India')).toBe('delta-exchange-india');
      expect(generateSlug('Angel One (SmartAPI)')).toBe('angel-one-smartapi');
    });

    it('respects explicitly provided custom slug', () => {
      expect(generateSlug('Zerodha', 'zerodha-demat')).toBe('zerodha-demat');
    });

    it('strips leading and trailing hyphens', () => {
      expect(generateSlug('---Fyers Web---')).toBe('fyers-web');
    });
  });

  describe('Partner Admin Schema Validation', () => {
    it('accepts valid partner payload with defaults', () => {
      const parsed = partnerAdminSchema.parse({
        name: 'Dhan',
        affiliateUrl: 'https://invite.dhan.co/?join=TRADEMIND',
      });

      expect(parsed.name).toBe('Dhan');
      expect(parsed.category).toBe('discount');
      expect(parsed.country).toBe('IN');
      expect(parsed.isActive).toBe(true);
      expect(parsed.isFeatured).toBe(false);
      expect(parsed.features).toEqual([]);
      expect(parsed.rating).toBe('4.8');
    });

    it('rejects partner missing name or affiliateUrl', () => {
      expect(() =>
        partnerAdminSchema.parse({
          name: '',
          affiliateUrl: 'https://broker.com',
        }),
      ).toThrow();

      expect(() =>
        partnerAdminSchema.parse({
          name: 'Zerodha',
          affiliateUrl: '',
        }),
      ).toThrow();
    });

    it('validates custom categories and arrays of features', () => {
      const parsed = partnerAdminSchema.parse({
        name: 'Delta Exchange',
        affiliateUrl: 'https://delta.exchange/ref',
        category: 'crypto',
        features: ['BTC Options', 'INR Deposit', 'FIU Compliant'],
        commissionNote: '0% maker fee on select pairs',
        displayOrder: 2,
      });

      expect(parsed.category).toBe('crypto');
      expect(parsed.features).toHaveLength(3);
      expect(parsed.commissionNote).toBe('0% maker fee on select pairs');
      expect(parsed.displayOrder).toBe(2);
    });
  });

  describe('Affiliate URL and Clicks Integrity', () => {
    it('ensures affiliate link maintains proper query parameters', () => {
      const baseAffiliate = 'https://open-account.fyers.in/?utm-source=TRADEMIND';
      const url = new URL(baseAffiliate);
      expect(url.searchParams.get('utm-source')).toBe('TRADEMIND');
    });
  });
});

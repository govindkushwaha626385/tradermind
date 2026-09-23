// ──────────────────────────────────────────────
// TradeMind — Dashboard Calculators Suite
// ──────────────────────────────────────────────

'use client';

import { Calculator, BookOpen, Shield } from 'lucide-react';
import Link from 'next/link';
import { CalculatorSuite } from '@/components/calculators/CalculatorSuite';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

export default function DashboardCalculatorsPage() {
  const { currency } = useCurrency();

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <PageHeader
        title="Trading & Investing Calculators"
        description="Precision financial engines for risk management, options Greeks, strategy payoffs, brokerage fees, and compound wealth planning."
        icon={Calculator}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/journal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Open Journal</span>
            </Link>
            <Link
              href="/dashboard/discipline"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Shield className="w-4 h-4" />
              <span>Risk Rules</span>
            </Link>
          </div>
        }
      />

      {/* ── Calculator Suite Master ── */}
      <CalculatorSuite defaultCurrency={currency} />
    </div>
  );
}

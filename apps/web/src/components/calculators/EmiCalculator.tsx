// ──────────────────────────────────────────────
// TradeMind — EMI & Loan Amortization Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  Landmark,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Percent,
  TrendingDown,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { calculateEmi } from './engine/financialMath';
import type { Currency } from './types';

interface EmiCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function EmiCalculator({ currency, onCopySummary }: EmiCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const amountId = useId();
  const rateId = useId();
  const tenureId = useId();

  const [loanAmount, setLoanAmount] = useState<number>(currency === 'INR' ? 500000 : 50000);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(11.5);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return calculateEmi({
      loanAmount,
      annualInterestRate,
      tenureMonths,
    });
  }, [loanAmount, annualInterestRate, tenureMonths]);

  const handleCopy = () => {
    const summary = `🏦 TradeMind Loan & EMI Projection:
• Principal Loan Amount: ${sym}${loanAmount.toLocaleString()}
• Annual Interest Rate: ${annualInterestRate}%
• Tenure: ${tenureMonths} Months (${(tenureMonths / 12).toFixed(1)} Years)
• Monthly EMI: ${sym}${result.monthlyEmi.toLocaleString()}
• Total Interest Payable: ${sym}${result.totalInterestPayable.toLocaleString()} (${result.interestToPrincipalRatio}% of principal)
• Total Repayment Amount: ${sym}${result.totalPayment.toLocaleString()}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setLoanAmount(currency === 'INR' ? 500000 : 50000);
    setAnnualInterestRate(11.5);
    setTenureMonths(24);
  };

  const principalPct = Math.round((loanAmount / Math.max(1, result.totalPayment)) * 100);
  const interestPct = 100 - principalPct;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              Loan Parameters
            </h3>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={amountId} className="text-xs font-medium text-muted-foreground block mb-1">
                Loan Amount ({sym})
              </label>
              <input
                id={amountId}
                type="number"
                min="1000"
                step="10000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <label htmlFor={rateId}>Annual Interest Rate</label>
                <span className="text-foreground font-semibold">{annualInterestRate}% p.a.</span>
              </div>
              <input
                id={rateId}
                type="range"
                min="1"
                max="30"
                step="0.25"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>8% (Home)</span>
                <span>12% (Personal)</span>
                <span>24% (Card/NBFC)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                <label htmlFor={tenureId}>Loan Tenure</label>
                <span className="text-foreground font-semibold">{tenureMonths} Months ({(tenureMonths / 12).toFixed(1)} Yrs)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[12, 24, 36, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenureMonths(m)}
                    className={`py-1.5 rounded-md border text-xs font-medium transition-all ${
                      tenureMonths === m
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'border-border bg-background/50 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {m} Mo
                  </button>
                ))}
              </div>
              <input
                id={tenureId}
                type="range"
                min="3"
                max="120"
                step="1"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Monthly EMI
              </div>
              <div className="text-2xl font-bold mt-1 text-primary">
                {sym}{result.monthlyEmi.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Due every month
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                Total Interest
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-500">
                {sym}{result.totalInterestPayable.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {result.interestToPrincipalRatio}% of borrowed amount
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-blue-500" />
                Total Repayment
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {sym}{result.totalPayment.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Principal + Interest
              </div>
            </div>
          </div>

          {/* Repayment Ratio Bar */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Principal vs Interest Distribution</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </button>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${principalPct}%` }}
                title={`Principal: ${principalPct}%`}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${interestPct}%` }}
                title={`Interest: ${interestPct}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Principal: {principalPct}% ({sym}{loanAmount.toLocaleString()})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Interest: {interestPct}% ({sym}{result.totalInterestPayable.toLocaleString()})
              </span>
            </div>
          </div>

          {/* First 12 Months Amortization Schedule */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm max-h-48 overflow-y-auto">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Amortization Schedule (First 12 Months)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="pb-1.5 font-medium">Mo</th>
                    <th className="pb-1.5 font-medium">Opening</th>
                    <th className="pb-1.5 font-medium">EMI</th>
                    <th className="pb-1.5 font-medium">Principal</th>
                    <th className="pb-1.5 font-medium">Interest</th>
                    <th className="pb-1.5 font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {result.schedule.map((row) => (
                    <tr key={row.month} className="hover:bg-muted/30 transition-colors font-mono">
                      <td className="py-1.5 text-muted-foreground">#{row.month}</td>
                      <td className="py-1.5">{sym}{row.openingBalance.toLocaleString()}</td>
                      <td className="py-1.5 font-semibold text-foreground">{sym}{row.emi.toLocaleString()}</td>
                      <td className="py-1.5 text-emerald-600 dark:text-emerald-400">{sym}{row.principal.toLocaleString()}</td>
                      <td className="py-1.5 text-amber-500">{sym}{row.interest.toLocaleString()}</td>
                      <td className="py-1.5 text-muted-foreground">{sym}{row.closingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

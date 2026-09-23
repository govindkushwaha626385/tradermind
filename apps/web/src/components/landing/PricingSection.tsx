// ──────────────────────────────────────────────
// TradeMind — Pricing Section (Client Island)
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    features: [
      'Up to 50 trades/month',
      '1 broker connection',
      'Basic analytics',
      'Manual trade entry',
      'Standard journal tags',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    features: [
      'Unlimited trades',
      'Up to 3 broker connections',
      'Advanced analytics & MFE/MAE',
      'Behavioral insights & tilt detection',
      'Trade replay simulator',
      'Real-time webhook sync',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Elite',
    price: '₹999',
    period: '/month',
    features: [
      'Everything in Pro',
      'Unlimited broker connections',
      'AI behavioral coaching & strategy synthesis',
      'Custom playbooks & rule validation',
      'Direct API & webhook access',
      'Priority 24/7 support',
      'Team & mentor sharing',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

export function PricingSection() {
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  useEffect(() => {
    api.getPlans().then((res) => {
      if (!res.success || !Array.isArray(res.data) || res.data.length === 0) return;
      setPlans(
        (res.data as any[]).map((plan) => ({
          name: plan.name,
          price: plan.amount === 0 ? 'Free' : `₹${(plan.amount / 100).toLocaleString('en-IN')}`,
          period:
            plan.interval === 'year'
              ? '/year'
              : plan.interval === 'month'
              ? '/month'
              : plan.interval === 'free'
              ? 'forever'
              : '',
          features: Object.entries(plan.features ?? {}).map(
            ([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${String(value)}`
          ),
          cta: plan.amount === 0 ? 'Get Started' : 'Start Free Trial',
          popular: Boolean(plan.isPopular),
        }))
      );
    }).catch(() => {});
  }, []);

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-violet-50/50 to-transparent dark:via-violet-950/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple,{' '}
            <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="text-muted-foreground">Start free. Upgrade when you grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'glass-card rounded-2xl p-6 relative flex flex-col justify-between transition-all duration-300',
                plan.popular && 'ring-2 ring-primary shadow-xl shadow-primary/10 lg:-translate-y-1'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/register"
                className={cn(
                  'block text-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

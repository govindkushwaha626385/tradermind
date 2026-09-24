'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, SUPPORTED_CURRENCIES, type ActiveCurrency } from '@/hooks/useCurrency';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0]!;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-xs font-semibold text-foreground transition-all duration-150 cursor-pointer shadow-sm"
        title="Change Global Currency"
      >
        <span className="text-primary font-bold">{currentOption.symbol}</span>
        <span className="hidden sm:inline font-mono">{currentOption.code}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-border bg-popover shadow-xl p-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-primary" />
            Global Base Currency
          </div>
          <div className="mt-1 space-y-0.5">
            {SUPPORTED_CURRENCIES.map((c) => {
              const active = c.code === currency;
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                    active ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-accent',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-mono font-bold text-muted-foreground">
                      {c.symbol}
                    </span>
                    <span>{c.code}</span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

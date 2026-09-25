// ──────────────────────────────────────────────
// TradeMind — Verify Search Form (Client Component)
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, ShieldCheck } from 'lucide-react';

export function VerifySearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 sm:p-2.5 rounded-2xl glass-card border border-amber-500/40 bg-card/90 shadow-2xl flex flex-col sm:flex-row items-center gap-2"
    >
      <div className="relative flex-1 w-full flex items-center">
        <div className="pl-3.5 text-amber-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Certificate ID or Hash (e.g. TM-PF-FTMO-200K)..."
          className="w-full px-3 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <span>{loading ? 'Authenticating...' : 'Verify Credential'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

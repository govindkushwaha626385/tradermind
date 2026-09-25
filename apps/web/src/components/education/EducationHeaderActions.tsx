// ──────────────────────────────────────────────
// TradeMind — Education Interactive Actions (Client Island)
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';
import { StageMasteryQuizModal } from './StageMasteryQuizModal';
import { PreFlightChecklistModal } from './PreFlightChecklistModal';

export function EducationHeaderActions() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(1);

  return (
    <>
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => {
            setActiveStage(1);
            setQuizOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Take Stage Mastery Assessment</span>
        </button>

        <button
          onClick={() => setChecklistOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Pre-Flight Execution Checklist</span>
        </button>

        <Link
          href="/dashboard/roadmap"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 shadow-md shadow-primary/20 transition-all"
        >
          <Compass className="w-4 h-4" />
          <span>Open Dashboard Tracker</span>
        </Link>

        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/80 bg-background hover:bg-accent text-foreground font-semibold text-xs transition-colors"
        >
          <span>Create Free Account</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <StageMasteryQuizModal
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        defaultStage={activeStage}
      />

      <PreFlightChecklistModal
        isOpen={checklistOpen}
        onClose={() => setChecklistOpen(false)}
      />
    </>
  );
}

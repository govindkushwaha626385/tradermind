// ──────────────────────────────────────────────
// TradeMind — Education Interactive Actions (Client Island)
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { StageMasteryQuizModal } from './StageMasteryQuizModal';

export function EducationHeaderActions() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(1);

  return (
    <>
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => {
            setActiveStage(1);
            setQuizOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Take Stage Mastery Assessment</span>
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
    </>
  );
}

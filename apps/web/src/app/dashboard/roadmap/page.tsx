// ──────────────────────────────────────────────
// TradeMind — In-Dashboard Trader Progression Roadmap
// Personal career milestone tracker from Beginner to Institutional Funded Trader.
// Interactive milestone completion, scenario simulations, track filters,
// XP progression, and exportable verified credentials.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Trophy,
  Shield,
  Activity,
  Award,
  Zap,
  BarChart3,
  BookOpen,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Check,
  Share2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TRADER_ROADMAP,
  TRACK_META,
  getTraderRankFromXP,
  type RoadmapStage,
  type RoadmapMilestone,
  type RoadmapTrack,
} from '@/lib/roadmap-data';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { RoadmapScenarioModal } from '@/components/education/RoadmapScenarioModal';
import { TraderCredentialModal } from '@/components/education/TraderCredentialModal';

const STORAGE_KEY = 'trademind_user_roadmap_progress';
const STORAGE_XP_KEY = 'trademind_user_roadmap_xp';

export default function DashboardRoadmapPage() {
  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>({});
  const [activeStageId, setActiveStageId] = useState<string>(TRADER_ROADMAP[0].id);
  const [selectedTrack, setSelectedTrack] = useState<RoadmapTrack>('all');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [activeScenarioMilestone, setActiveScenarioMilestone] = useState<RoadmapMilestone | null>(null);
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [copiedFormulaId, setCopiedFormulaId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Trader Progression Roadmap — TradeMind';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCompletedMilestones(JSON.parse(stored));
      } else {
        // Default starter milestones
        setCompletedMilestones({
          'm1-1': true,
          'm1-2': true,
        });
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  const toggleMilestone = (id: string, title: string, xpPoints: number) => {
    setCompletedMilestones((prev) => {
      const isNowCompleted = !prev[id];
      const next = { ...prev, [id]: isNowCompleted };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}

      if (isNowCompleted) {
        toast.success(`Milestone completed: "${title}" (+${xpPoints} XP)!`);
      }
      return next;
    });
  };

  const handlePassScenario = (milestoneId: string, xpEarned: number) => {
    setCompletedMilestones((prev) => {
      const next = { ...prev, [milestoneId]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    toast.success(`Scenario mastered! Earned ${xpEarned} XP!`);
  };

  const resetProgress = () => {
    setCompletedMilestones({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast.success('Roadmap milestones reset.');
  };

  const handleCopyFormula = (id: string, formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormulaId(id);
    toast.success('Formula copied to clipboard!');
    setTimeout(() => setCopiedFormulaId(null), 2000);
  };

  // Compute stats across entire roadmap
  const allMilestones = TRADER_ROADMAP.flatMap((s) => s.milestones);
  const totalMilestonesCount = allMilestones.length;
  const totalCompletedCount = allMilestones.filter((m) => completedMilestones[m.id]).length;
  const progressPct = Math.round((totalCompletedCount / (totalMilestonesCount || 1)) * 100);

  // Compute earned XP
  const totalEarnedXp = allMilestones
    .filter((m) => completedMilestones[m.id])
    .reduce((acc, m) => acc + (m.xpPoints || 100), 0);

  const rankInfo = getTraderRankFromXP(totalEarnedXp);

  const activeStage = TRADER_ROADMAP.find((s) => s.id === activeStageId) || TRADER_ROADMAP[0];

  // Filter milestones by track if selected
  const visibleMilestones = activeStage.milestones.filter(
    (m) => selectedTrack === 'all' || m.tracks.includes(selectedTrack)
  );

  const stageCompletedCount = visibleMilestones.filter((m) => completedMilestones[m.id]).length;
  const stagePct = Math.round((stageCompletedCount / (visibleMilestones.length || 1)) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Trader Progression Roadmap"
        description="Your structured 4-stage institutional path to capital defense, setup edge, volatility math, and prop firm mastery."
        icon={Compass}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCredentialModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold shadow-sm transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Export Credential</span>
            </button>
            <button
              onClick={resetProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        }
      />

      {/* Hero Overview & XP Status Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                Institutional Competency Level
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                <Trophy className="w-3 h-3" />
                {rankInfo.badge} {rankInfo.rank}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Level {rankInfo.level} · {rankInfo.rank}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Earn XP by mastering risk defense rules, logging real executions, and passing scenario simulations.
            </p>
          </div>

          {/* XP & Next Level Ring */}
          <div className="flex items-center gap-6 p-4 rounded-2xl bg-card/80 border border-border/80 shadow-md shrink-0">
            <div className="space-y-1">
              <div className="text-[11px] uppercase font-bold text-muted-foreground font-mono">
                Total Experience
              </div>
              <div className="text-2xl font-black text-foreground font-mono flex items-baseline gap-1.5">
                <span>{totalEarnedXp.toLocaleString()}</span>
                <span className="text-xs font-bold text-primary">XP</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Next Rank at {rankInfo.nextLevelXp.toLocaleString()} XP
              </div>
            </div>

            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-bold font-mono text-sm text-primary">
              {rankInfo.progressPct}%
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Overall Roadmap Mastery ({totalCompletedCount} of {totalMilestonesCount} Milestones)
            </span>
            <span className="font-mono font-bold text-primary">{progressPct}% Complete</span>
          </div>
          <div className="w-full h-3 bg-muted/60 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trading Track Specialization Selector */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono px-1">
          Specialization Filter
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.keys(TRACK_META) as RoadmapTrack[]).map((trackKey) => {
            const track = TRACK_META[trackKey];
            const isSelected = selectedTrack === trackKey;
            return (
              <button
                key={trackKey}
                onClick={() => setSelectedTrack(trackKey)}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all space-y-1',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40'
                    : 'border-border/60 bg-card/60 hover:bg-card hover:border-border'
                )}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <span>{track.icon}</span>
                  <span className="truncate">{track.label}</span>
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {track.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stages Horizontal Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TRADER_ROADMAP.map((stage) => {
          const isActive = stage.id === activeStageId;
          const stageTotal = stage.milestones.length;
          const stageDone = stage.milestones.filter((m) => completedMilestones[m.id]).length;
          const stagePercent = Math.round((stageDone / stageTotal) * 100);

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStageId(stage.id)}
              className={cn(
                'rounded-2xl p-4 border text-left transition-all space-y-3 relative overflow-hidden',
                isActive
                  ? 'border-primary/80 bg-card shadow-lg ring-1 ring-primary/40'
                  : 'border-border/60 bg-card/50 hover:bg-card hover:border-border/80'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-primary">
                  Stage {stage.stageNumber}
                </span>
                <span className="text-[11px] font-mono font-bold text-muted-foreground">
                  {stageDone}/{stageTotal}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">
                  {stage.title}
                </h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {stage.tagline}
                </p>
              </div>

              {/* Mini progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${stagePercent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detail Section */}
      <div className="rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-8 space-y-8 shadow-xl">
        {/* Stage Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold font-mono">
                Stage {activeStage.stageNumber}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {activeStage.duration}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {stagePct}% Verified
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              {activeStage.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {activeStage.summary}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 text-xs space-y-1 shrink-0 md:max-w-xs">
            <div className="text-[10px] font-bold uppercase text-primary font-mono flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span>Core Law</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed italic">
              "{activeStage.corePhilosophy}"
            </p>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-4">
          {visibleMilestones.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No milestones in this stage match the selected specialization filter.
            </div>
          ) : (
            visibleMilestones.map((milestone, idx) => {
              const isChecked = !!completedMilestones[milestone.id];
              const isExpanded = expandedMilestoneId === milestone.id;

              return (
                <div
                  key={milestone.id}
                  className={cn(
                    'rounded-2xl border transition-all duration-200 overflow-hidden',
                    isChecked
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border/60 bg-card hover:border-border'
                  )}
                >
                  {/* Summary Bar */}
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleMilestone(milestone.id, milestone.title, milestone.xpPoints)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title={isChecked ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-6 h-6 text-border hover:text-muted-foreground" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono',
                            milestone.category === 'Risk'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : milestone.category === 'Psychology'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : milestone.category === 'Technical'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : milestone.category === 'Analytics'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          )}
                        >
                          {milestone.category}
                        </span>
                        <span className="text-[10px] font-mono text-primary font-bold">
                          +{milestone.xpPoints} XP
                        </span>
                      </div>

                      <h4
                        className={cn(
                          'text-base font-bold transition-colors',
                          isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {milestone.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {milestone.shortDesc}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {milestone.scenario && (
                        <button
                          type="button"
                          onClick={() => setActiveScenarioMilestone(milestone)}
                          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Test Scenario</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMilestoneId(isExpanded ? null : milestone.id)
                        }
                        className="p-1.5 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={isExpanded ? 'Collapse blueprint' : 'Expand blueprint'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Blueprint Drawer */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-4 text-xs animate-fade-in bg-muted/10">
                      {/* Detailed Execution Action */}
                      <div className="space-y-1.5">
                        <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">
                          Execution Blueprint:
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-xs">
                          {milestone.detailedAction}
                        </p>
                      </div>

                      {/* Formula Box if available */}
                      {milestone.formula && (
                        <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3 font-mono text-xs">
                          <div className="space-y-0.5">
                            <div className="text-[10px] uppercase font-bold text-primary font-mono">
                              Institutional Math / Formula
                            </div>
                            <div className="text-foreground">{milestone.formula}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyFormula(milestone.id, milestone.formula!)}
                            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Copy formula"
                          >
                            {copiedFormulaId === milestone.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Pitfall & Pro Tip Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {milestone.pitfall && (
                          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-300 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-rose-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Fatal Retail Trap</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              {milestone.pitfall}
                            </p>
                          </div>
                        )}

                        {milestone.proTip && (
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-primary">
                              <Lightbulb className="w-3 h-3" />
                              <span>Institutional Secret</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              {milestone.proTip}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tool Launch & Scenario Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                        <div className="sm:hidden">
                          {milestone.scenario && (
                            <button
                              type="button"
                              onClick={() => setActiveScenarioMilestone(milestone)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Test Scenario</span>
                            </button>
                          )}
                        </div>

                        <Link
                          href={milestone.toolHref}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold shadow-md shadow-primary/20 transition-all ml-auto"
                        >
                          <span>{milestone.toolLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Scenario Challenge Modal */}
      <RoadmapScenarioModal
        isOpen={!!activeScenarioMilestone}
        onClose={() => setActiveScenarioMilestone(null)}
        milestone={activeScenarioMilestone}
        onPass={handlePassScenario}
      />

      {/* Trader Credential Certificate Modal */}
      <TraderCredentialModal
        isOpen={credentialModalOpen}
        onClose={() => setCredentialModalOpen(false)}
        rankTitle={rankInfo.rank}
        rankBadge={rankInfo.badge}
        levelNumber={rankInfo.level}
        totalXp={totalEarnedXp}
        completedCount={totalCompletedCount}
        totalMilestones={totalMilestonesCount}
      />
    </div>
  );
}

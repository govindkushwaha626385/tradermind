// ──────────────────────────────────────────────
// TradeMind — P&L Calendar Heatmap
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface CalendarDay {
  date: string;
  grossPnl: number;
  netPnl: number;
  charges: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  sessions: {
    morning: { trades: number; pnl: number };
    midday:  { trades: number; pnl: number };
    afternoon: { trades: number; pnl: number };
  };
}

interface DayTrade {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  grossPnl: number;
  totalCharges: number;
  netPnl: number;
  openedAt: string;
  closedAt?: string;
  emotions: string[];
  mistakes: string[];
  notes?: string;
}

interface DayDetail {
  date: string;
  summary: {
    grossPnl: number;
    netPnl: number;
    charges: number;
    tradeCount: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
  };
  trades: DayTrade[];
  premarketPlan?: {
    marketBias?: string;
    keyLevels?: string;
    notes?: string;
  } | null;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getPnlColor(pnl: number, max: number): string {
  if (pnl === 0) return 'bg-muted/40 text-muted-foreground/60';
  const ratio = Math.min(Math.abs(pnl) / Math.max(max, 1), 1);
  if (pnl > 0) {
    if (ratio > 0.7) return 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30';
    if (ratio > 0.4) return 'bg-emerald-500/70 text-white';
    if (ratio > 0.15) return 'bg-emerald-500/40 text-emerald-800 dark:text-emerald-200';
    return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
  } else {
    if (ratio > 0.7) return 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/30';
    if (ratio > 0.4) return 'bg-red-500/70 text-white';
    if (ratio > 0.15) return 'bg-red-500/40 text-red-800 dark:text-red-200';
    return 'bg-red-500/20 text-red-700 dark:text-red-300';
  }
}

function CalendarHeatmapComponent() {
  const { currency } = useCurrency();
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentYear - 1, 0, 1).toISOString();
      const endDate = new Date(currentYear, 11, 31).toISOString();
      const res = await api.getCalendar({ startDate, endDate });
      if (res.success) {
        setCalendarData(res.data as CalendarDay[]);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      fetchCalendar();
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [fetchCalendar]);

  const openDayDetail = async (dateStr: string) => {
    setSelectedDay(dateStr);
    setDetailLoading(true);
    setDayDetail(null);
    try {
      const res = await api.getCalendarDayDetail(dateStr);
      if (res.success) {
        setDayDetail(res.data as DayDetail);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load day details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Build day-map for quick lookups
  const dayMap = new Map<string, CalendarDay>();
  for (const d of calendarData) dayMap.set(d.date, d);

  // All PnL values for color scaling
  const allPnls = calendarData.map((d) => Math.abs(d.netPnl));
  const maxPnl = allPnls.length > 0 ? Math.max(...allPnls) : 1;

  // Month statistics
  const monthDays = calendarData.filter((d) => {
    const date = new Date(d.date);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const monthNetPnl = monthDays.reduce((s, d) => s + d.netPnl, 0);
  const monthTrades = monthDays.reduce((s, d) => s + d.tradeCount, 0);
  const monthWins = monthDays.reduce((s, d) => s + d.winningTrades, 0);
  const monthLosses = monthDays.reduce((s, d) => s + d.losingTrades, 0);
  const tradingDays = monthDays.length;
  const greenDays = monthDays.filter((d) => d.netPnl > 0).length;
  const redDays = monthDays.filter((d) => d.netPnl < 0).length;

  // Build grid cells for month
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells: Array<{ date: string | null; data: CalendarDay | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, data: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, data: dayMap.get(dateStr) ?? null });
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className={cn(
              'text-sm font-semibold mt-0.5',
              monthNetPnl > 0 ? 'text-emerald-500' : monthNetPnl < 0 ? 'text-red-500' : 'text-muted-foreground',
            )}>
              {monthNetPnl >= 0 ? '+' : ''}{formatCurrency(monthNetPnl, currency)}
            </div>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Month Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 text-xs">
          {[
            { label: 'Trading Days', value: tradingDays, color: 'text-foreground' },
            { label: 'Green Days', value: greenDays, color: 'text-emerald-500' },
            { label: 'Red Days', value: redDays, color: 'text-red-500' },
            { label: 'Total Trades', value: monthTrades, color: 'text-blue-500' },
            { label: 'Win / Loss', value: `${monthWins}/${monthLosses}`, color: 'text-violet-500' },
          ].map((s) => (
            <div key={s.label} className="bg-accent/40 rounded-xl p-2 text-center">
              <div className={cn('font-bold text-sm', s.color)}>{s.value}</div>
              <div className="text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scrollable container for mobile touch/pinch */}
        <div className="overflow-x-auto scrollbar-thin pb-1">
          <div className="min-w-[300px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-accent/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  if (!cell.date) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }
                  const day = parseInt(cell.date.split('-')[2]!);
                  const isToday = cell.date === new Date().toISOString().split('T')[0];
                  const isSelected = cell.date === selectedDay;

                  if (!cell.data) {
                    return (
                      <div
                        key={cell.date}
                        className={cn(
                          'aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] cursor-default',
                          'bg-muted/20 text-muted-foreground/40',
                          isToday && 'ring-1 ring-primary/40',
                        )}
                      >
                        {day}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={cell.date}
                      onClick={() => openDayDetail(cell.date!)}
                      title={`${cell.date}: ${formatCurrency(cell.data.netPnl, currency)} (${cell.data.tradeCount} trades)`}
                      className={cn(
                        'aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] transition-all duration-150',
                        'hover:scale-105 hover:shadow-md cursor-pointer',
                        getPnlColor(cell.data.netPnl, maxPnl),
                        isToday && 'ring-2 ring-primary',
                        isSelected && 'ring-2 ring-white/60 scale-105',
                      )}
                      aria-label={`${cell.date} P&L: ${formatCurrency(cell.data.netPnl, currency)}`}
                    >
                      <span className="font-semibold">{day}</span>
                      {cell.data.tradeCount > 0 && (
                        <span className="text-[8px] opacity-75">
                          {cell.data.tradeCount}T
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          {['bg-red-500/20','bg-red-500/50','bg-red-500','bg-emerald-500/20','bg-emerald-500/50','bg-emerald-500'].map((cls, i) => (
            <div key={i} className={cn('w-4 h-4 rounded', cls)} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div
            className="w-full max-w-lg glass-card rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base">{selectedDay}</h3>
                {dayDetail && (
                  <p className={cn(
                    'text-sm font-semibold',
                    dayDetail.summary.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}>
                    {dayDetail.summary.netPnl >= 0 ? '+' : ''}{formatCurrency(dayDetail.summary.netPnl, currency)} net P&L
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 rounded-xl hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dayDetail ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Gross P&L', value: formatCurrency(dayDetail.summary.grossPnl, currency), icon: TrendingUp, positive: dayDetail.summary.grossPnl >= 0 },
                    { label: 'Net P&L', value: formatCurrency(dayDetail.summary.netPnl, currency), icon: Activity, positive: dayDetail.summary.netPnl >= 0 },
                    { label: 'Charges', value: formatCurrency(dayDetail.summary.charges, currency), icon: Zap, positive: false },
                    { label: 'Win Rate', value: `${(dayDetail.summary.winRate * 100).toFixed(0)}%`, icon: TrendingDown, positive: dayDetail.summary.winRate >= 0.5 },
                  ].map((s) => (
                    <div key={s.label} className="bg-accent/40 rounded-xl p-2.5 flex items-center gap-2">
                      <s.icon className={cn('w-3.5 h-3.5 flex-shrink-0', s.positive ? 'text-emerald-500' : 'text-muted-foreground')} />
                      <div>
                        <div className="text-muted-foreground">{s.label}</div>
                        <div className={cn('font-bold text-sm', s.positive ? 'text-emerald-500' : s.label === 'Net P&L' || s.label === 'Gross P&L' ? 'text-red-500' : 'text-foreground')}>
                          {s.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Session Breakdown */}
                {dayDetail && (
                  <div className="bg-accent/30 rounded-xl p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Session Breakdown (IST)
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {([
                        { key: 'morning', label: 'Morning', time: '9:15–11:00' },
                        { key: 'midday',  label: 'Midday',  time: '11:00–13:30' },
                        { key: 'afternoon', label: 'Afternoon', time: '13:30–15:30' },
                      ] as const).map((s) => {
                        const data = (dayDetail as any)?.sessions?.[s.key] ?? dayDetail.trades.reduce((acc: any, t) => {
                          // If the API returns sessions on summary, use that
                          return acc;
                        }, { trades: 0, pnl: 0 });
                        return (
                          <div key={s.key} className="text-center">
                            <div className="font-medium">{s.label}</div>
                            <div className="text-muted-foreground text-[9px]">{s.time}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Premarket Plan */}
                {dayDetail.premarketPlan && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs">
                    <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Pre-Market Plan</div>
                    {dayDetail.premarketPlan.marketBias && (
                      <div><span className="text-muted-foreground">Bias: </span>{dayDetail.premarketPlan.marketBias}</div>
                    )}
                    {dayDetail.premarketPlan.notes && (
                      <div className="mt-1 text-muted-foreground">{dayDetail.premarketPlan.notes}</div>
                    )}
                  </div>
                )}

                {/* Trade List */}
                {dayDetail.trades.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      {dayDetail.trades.length} Trade{dayDetail.trades.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-1.5">
                      {dayDetail.trades.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-accent/40 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-bold',
                              t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600',
                            )}>
                              {t.direction}
                            </span>
                            <span className="font-medium">{t.symbol}</span>
                            <span className="text-muted-foreground">×{t.quantity}</span>
                          </div>
                          <div className="text-right">
                            <div className={cn('font-bold', t.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {t.netPnl >= 0 ? '+' : ''}{formatCurrency(t.netPnl, currency)}
                            </div>
                            {t.emotions.length > 0 && (
                              <div className="text-muted-foreground text-[10px] truncate max-w-24">
                                {t.emotions.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data for this day</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const CalendarHeatmap = memo(CalendarHeatmapComponent);

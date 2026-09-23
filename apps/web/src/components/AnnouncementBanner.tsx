// ──────────────────────────────────────────────
// TradeMind — Dynamic Global Announcement Banner
// Driven entirely by DB / Admin Config (admin_configs table)
// Supports info, success, warning, alert styles & call-to-actions
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface BannerData {
  enabled: boolean;
  text: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  link: string;
  linkText: string;
  maintenanceMode: boolean;
}

export function AnnouncementBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getAnnouncementBanner()
      .then((res) => {
        if (!isMounted || !res?.data) return;
        const data = res.data;
        setBanner(data);

        // Check if user already dismissed this specific banner message
        if (data.text) {
          const dismissedText = localStorage.getItem('trademind_dismissed_banner');
          if (dismissedText === data.text && !data.maintenanceMode) {
            setDismissed(true);
          }
        }
      })
      .catch(() => {
        // Silently degrade if API is unreachable or offline
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!banner) return null;

  // Maintenance mode takes precedence and cannot be dismissed
  if (banner.maintenanceMode) {
    return (
      <div
        role="alert"
        className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2.5 shadow-md border-b border-amber-500/30 z-50 sticky top-0"
      >
        <span className="inline-block animate-pulse text-base">⚠️</span>
        <span>
          <strong>System Maintenance Scheduled:</strong> Some automated broker sync and AI services may be temporarily paused for upgrades.
        </span>
      </div>
    );
  }

  // Regular announcement banner
  if (!banner.enabled || !banner.text || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (banner.text) {
      localStorage.setItem('trademind_dismissed_banner', banner.text);
    }
  };

  const styleConfig = {
    info: {
      bg: 'bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-cyan-800/40 text-cyan-200',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      btn: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
      icon: '📢',
    },
    success: {
      bg: 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-800/40 text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      btn: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
      icon: '✨',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border-amber-800/40 text-amber-200',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btn: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
      icon: '⚡',
    },
    alert: {
      bg: 'bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 border-rose-800/40 text-rose-200',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      btn: 'bg-rose-500 text-white hover:bg-rose-400',
      icon: '🚨',
    },
  }[banner.type] ?? {
    bg: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-slate-200',
    badge: 'bg-slate-700/50 text-slate-300 border-slate-600',
    btn: 'bg-primary-500 text-white hover:bg-primary-400',
    icon: 'ℹ️',
  };

  return (
    <div
      role="banner"
      className={`w-full ${styleConfig.bg} border-b px-4 py-2.5 text-xs sm:text-sm shadow-md transition-all duration-300 relative z-40`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-sm select-none">{styleConfig.icon}</span>
          <span className="font-medium truncate sm:whitespace-normal">
            {banner.text}
          </span>
          {banner.link && (
            banner.link.startsWith('http') ? (
              <a
                href={banner.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-xs transition-colors shrink-0 ${styleConfig.btn}`}
              >
                {banner.linkText || 'Learn More'} →
              </a>
            ) : (
              <Link
                href={banner.link}
                className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-xs transition-colors shrink-0 ${styleConfig.btn}`}
              >
                {banner.linkText || 'Learn More'} →
              </Link>
            )
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors shrink-0 text-base leading-none focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

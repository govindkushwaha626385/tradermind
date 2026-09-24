// ──────────────────────────────────────────────
// TradeMind — Landing Navbar (Client Island)
//
// Features:
// - Scroll-aware: intensifies backdrop-blur + shadow on scroll
// - Active section tracking via IntersectionObserver
// - Smooth animated mobile menu slide-down
// - CTA button with gradient + hover lift
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, TrendingUp } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';

const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Brokers', href: '#brokers' },
  { label: 'Calculators', href: '/calculators' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Reviews', href: '#testimonials' },
  { label: 'Store', href: '/store' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Intensify glass on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track active section with IntersectionObserver
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((n) => n.href.replace('#', '')).filter((h) => !h.startsWith('/'));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.4 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(10, 10, 20, 0.85)'
          : 'rgba(10, 10, 20, 0.4)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: scrolled
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(255,255,255,0.04)',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base text-white tracking-tight">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const sectionId = item.href.replace('#', '');
            const isActive = activeSection === sectionId;
            return (
              <a
                key={item.href}
                href={item.href}
                className="relative px-3 py-1.5 text-sm transition-colors rounded-lg"
                style={{
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#fff')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = isActive
                    ? '#fff'
                    : 'rgba(255,255,255,0.55)')
                }
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
                    }}
                  />
                )}
              </a>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
            }
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                '0 6px 20px rgba(124,58,237,0.4)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                '0 4px 14px rgba(124,58,237,0.3)')
            }
          >
            Get Started Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: mobileMenuOpen ? '600px' : '0',
          opacity: mobileMenuOpen ? 1 : 0,
          borderTop: mobileMenuOpen
            ? '1px solid rgba(255,255,255,0.06)'
            : 'none',
        }}
      >
        <div className="px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block text-sm py-2.5 px-3 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onClick={closeMobile}
            >
              {item.label}
            </a>
          ))}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06] mt-3">
            <Link
              href="/login"
              onClick={closeMobile}
              className="text-center px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors text-white/70"
              style={{ borderColor: 'rgba(255,255,255,0.12)' }}
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={closeMobile}
              className="text-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

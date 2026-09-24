// ──────────────────────────────────────────────
// TradeMind — Global Hotkeys Hook (Power-User Suite)
// Listens for single-key jumps (J, R, C, T, A, D) and modifier keys (Cmd+K, ?, Shift+T)
// Safely ignores inputs, textareas, and active form controls.
// ──────────────────────────────────────────────

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GlobalHotkeysOptions {
  onToggleCommandPalette: () => void;
  onToggleShortcutsModal: () => void;
  onToggleTourModal: () => void;
  onOpenPremarket?: () => void;
  onOpenEodReview?: () => void;
  onTriggerSync?: () => void;
}

export function useGlobalHotkeys({
  onToggleCommandPalette,
  onToggleShortcutsModal,
  onToggleTourModal,
  onOpenPremarket,
  onOpenEodReview,
  onTriggerSync,
}: GlobalHotkeysOptions) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const tagName = activeElement?.tagName?.toUpperCase();
      const isEditable = activeElement?.isContentEditable;

      // Do NOT trigger single-key hotkeys if the user is typing in an input, textarea, or contentEditable
      const isInputActive = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || isEditable;

      // 1. Command Palette: Cmd+K / Ctrl+K (Works even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      // 2. Broker Sync: Cmd+S / Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onTriggerSync?.();
        return;
      }

      // If user is currently typing in an input field, do NOT intercept single-letter typing!
      if (isInputActive) {
        return;
      }

      // Do not trigger single-key navigation if modifier keys (Cmd/Ctrl/Alt) are pressed
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // 3. Question mark / Help: '?' or 'h'
      if (e.key === '?' || (e.shiftKey && e.key.toLowerCase() === 'h')) {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      // 4. Platform Tour: Shift + T
      if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        onToggleTourModal();
        return;
      }

      // If shift key is pressed for other keys, ignore
      if (e.shiftKey) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'j':
          e.preventDefault();
          router.push('/dashboard/journal');
          break;
        case 'r':
          e.preventDefault();
          router.push('/dashboard/replay');
          break;
        case 'c':
          e.preventDefault();
          router.push('/dashboard/calculators');
          break;
        case 't':
          e.preventDefault();
          router.push('/dashboard/trades');
          break;
        case 'a':
          e.preventDefault();
          router.push('/dashboard/analytics');
          break;
        case 'd':
          e.preventDefault();
          router.push('/dashboard');
          break;
        case 'b':
          e.preventDefault();
          router.push('/dashboard/brokers');
          break;
        case 'p':
          e.preventDefault();
          onOpenPremarket ? onOpenPremarket() : window.dispatchEvent(new CustomEvent('open-premarket-routine'));
          break;
        case 'e':
          e.preventDefault();
          onOpenEodReview ? onOpenEodReview() : window.dispatchEvent(new CustomEvent('open-eod-review'));
          break;
        case 's':
          e.preventDefault();
          onTriggerSync ? onTriggerSync() : window.dispatchEvent(new CustomEvent('trigger-broker-sync'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    router,
    onToggleCommandPalette,
    onToggleShortcutsModal,
    onToggleTourModal,
    onOpenPremarket,
    onOpenEodReview,
    onTriggerSync,
  ]);
}

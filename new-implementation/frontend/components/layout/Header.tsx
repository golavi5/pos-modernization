'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { findNavLabelKey } from '@/lib/navigation/nav-items';

export function Header() {
  const pathname = usePathname();
  const tNav = useTranslations('sidebar');
  const t = useTranslations('commandPalette');
  const labelKey = findNavLabelKey(pathname);
  const label = labelKey ? tNav(labelKey) : '';
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The badge promises ⌘K (Ctrl+K off macOS), so the shortcut is bound here —
  // the palette itself only exists while open and cannot listen for its own
  // opening keystroke.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="h-[52px] shrink-0 border-b border-border bg-card flex items-center px-4 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <span className="text-muted-foreground">POS</span>
        {label && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{label}</span>
          </>
        )}
      </div>

      {/* Search bar — opens the command palette */}
      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={paletteOpen}
          data-testid="command-palette-trigger"
          className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground w-full max-w-xs hover:border-primary/50 transition-colors"
        >
          <Search size={12} className="shrink-0" />
          <span>{t('placeholder')}</span>
          <kbd className="ml-auto bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <LanguageSwitcher />
        <NotificationBell />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

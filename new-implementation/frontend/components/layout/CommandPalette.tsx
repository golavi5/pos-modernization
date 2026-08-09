'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { buildCommandItems, filterCommandItems } from '@/lib/navigation/command-items';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const tNav = useTranslations('sidebar');
  const t = useTranslations('commandPalette');
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo(() => buildCommandItems(tNav, user?.roles), [tNav, user?.roles]);
  const results = useMemo(() => filterCommandItems(items, query), [items, query]);

  // Reset per opening so the palette never reopens onto a stale query.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Clamp instead of reset: as results shrink the highlight must stay on a real
  // row, or Enter would navigate to nothing.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(results.length - 1, 0)));
  }, [results.length]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[active];
      if (item) go(item.href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh] px-4"
      onClick={onClose}
      data-testid="command-palette-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
        className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        data-testid="command-palette"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            aria-controls="command-palette-results"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <ul
          id="command-palette-results"
          role="listbox"
          aria-label={t('ariaLabel')}
          className="max-h-72 overflow-y-auto py-1"
        >
          {results.map((item, i) => (
            <li key={item.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item.href)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  i === active ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span>{item.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{item.href}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t('noResults')}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

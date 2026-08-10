'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/types/i18n';

type Keys = Readonly<Record<'justNow' | 'minutesAgo' | 'hoursAgo' | 'daysAgo', MessageKey<'notifications'>>>;

/**
 * The bell dropdown is narrow, so it wants shorter wording than the full page
 * ("Ahora" vs "Ahora mismo", "hace {min}m" vs "hace {min} min"). Only those two
 * are forked; hours and days are shared. Both variants used to carry their own
 * copy of the bucketing below, which meant a threshold changed in one place
 * made the dropdown and the page disagree about the same notification's age.
 */
export const RELATIVE_TIME_KEYS = {
  full: { justNow: 'justNow', minutesAgo: 'minutesAgo', hoursAgo: 'hoursAgo', daysAgo: 'daysAgo' },
  compact: { justNow: 'bell.justNow', minutesAgo: 'bell.minutesAgo', hoursAgo: 'hoursAgo', daysAgo: 'daysAgo' },
} as const satisfies Record<string, Keys>;

/** Formats an ISO timestamp as an age ("hace 5 min"), in one of the key sets above. */
export function useRelativeTime(variant: keyof typeof RELATIVE_TIME_KEYS = 'full') {
  const t = useTranslations('notifications');
  const keys: Keys = RELATIVE_TIME_KEYS[variant];

  return useCallback(
    (dateStr: string): string => {
      const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
      if (min < 1) return t(keys.justNow);
      if (min < 60) return t(keys.minutesAgo, { min });
      const h = Math.floor(min / 60);
      if (h < 24) return t(keys.hoursAgo, { h });
      return t(keys.daysAgo, { d: Math.floor(h / 24) });
    },
    [t, keys],
  );
}

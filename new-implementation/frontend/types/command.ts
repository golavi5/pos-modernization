import type { MessageKey } from '@/types/i18n';

/**
 * Command palette (⌘K) — navigation entries.
 *
 * Scope is deliberately navigation-only: the palette jumps between panel
 * routes. Searching products/customers/sales through the API is the design
 * doc's larger "global search" pillar and is NOT implemented here.
 */

/** A route the palette can jump to, with its label already translated. */
export interface CommandItem {
  /** Panel route, e.g. `/sales`. Unique — used as the React key. */
  href: string;
  /** Translated, user-visible label, e.g. "Ventas". */
  label: string;
}

/** A palette route before translation: the i18n key is resolved at render. */
export interface CommandRoute {
  href: string;
  /** Key inside the `sidebar` i18n namespace. */
  labelKey: MessageKey<'sidebar'>;
}

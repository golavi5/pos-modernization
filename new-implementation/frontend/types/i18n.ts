/**
 * Helpers for carrying a translation key through a constant map or a prop
 * without losing the key checking that `global.ts` enables.
 *
 * A key stored as a plain `string` typechecks against nothing, which is how
 * `t('customers.table.emptyHint')` could survive a rename in both catalogs and
 * render the raw key to the user. Type the carrier with `MessageKey<'ns'>`
 * (or `Translate<'ns'>` when the translator itself is passed down) and a stale
 * key becomes a build error.
 */
import type { useTranslations } from 'next-intl';

/** A namespace accepted by `useTranslations`, e.g. `'sidebar'`. */
export type Namespace = NonNullable<Parameters<typeof useTranslations>[0]>;

/** The translator returned by `useTranslations(namespace)`. */
export type Translate<N extends Namespace> = ReturnType<typeof useTranslations<N>>;

/** A key valid inside `namespace`, e.g. `MessageKey<'sidebar'>`. */
export type MessageKey<N extends Namespace> = Parameters<Translate<N>>[0];

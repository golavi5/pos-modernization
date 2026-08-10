// Types every `t('…')` call against the default-locale catalog, so a key that
// does not resolve is a build error instead of a raw key string rendered to the
// user. The i18n CI checks compare the two catalogs to each other and scan for
// hardcoded literals — neither one can tell whether a key used in code exists.
//
// `es` is the default locale (see `i18n-request.ts`); `i18n-parity.cjs` keeps
// `en.json` in step with it.
import type messages from './messages/es.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'es' | 'en';
    Messages: typeof messages;
  }
}

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

// Supported locales
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'es';

// Get locale from various sources
async function getLocaleFromRequest(): Promise<Locale> {
  // Try to get locale from cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  // Try to get from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(preferredLocale as Locale)) {
      return preferredLocale as Locale;
    }
  }

  // Default to Spanish
  return defaultLocale;
}

export default getRequestConfig(async ({ locale }) => {
  // If no locale is provided, get it from request
  const requestLocale = locale || (await getLocaleFromRequest());

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(requestLocale as Locale)) notFound();

  return {
    locale: requestLocale,
    messages: (await import(`./messages/${requestLocale}.json`)).default,
  };
});

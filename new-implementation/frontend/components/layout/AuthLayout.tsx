'use client';

import { useTranslations } from 'next-intl';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('auth.layout');
  const tCommon = useTranslations('common');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Logo/Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg">
          <span className="text-2xl font-bold text-white">{tCommon('brand')}</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-secondary">
          {t('subtitle')}
        </p>
      </div>

      {/* Auth Content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-secondary">
        <p>{t('copyright')}</p>
      </div>
    </div>
  );
}

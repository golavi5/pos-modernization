'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageToolbarProps {
  title: string;
  showBackButton?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
}

const MAIN_SECTIONS = [
  '/dashboard',
  '/products',
  '/sales',
  '/customers',
  '/reports',
  '/settings',
  '/inventory',
  '/users',
  '/notifications',
];

export function PageToolbar({
  title,
  showBackButton,
  backHref = '/dashboard',
  actions,
}: PageToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const shouldShowBackButton = () => {
    if (showBackButton !== undefined) return showBackButton;

    const isExactMainSection = MAIN_SECTIONS.includes(pathname);
    const segmentCount = pathname.split('/').filter(Boolean).length;

    return segmentCount > 1 && !isExactMainSection;
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const handleHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        {shouldShowBackButton() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHome}
          className="gap-1"
        >
          <Home className="h-4 w-4" />
        </Button>

        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

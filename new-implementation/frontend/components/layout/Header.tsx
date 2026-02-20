'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, Settings, PanelTop, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useToolbar } from '@/components/layout/ToolbarContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';

export function Header() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();
  const { isHidden, toggleHidden, sidebarCollapsed, toggleSidebar } = useToolbar();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="border-b bg-surface-1 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="text-sm text-secondary">
            {t('header.welcomeBack', { name: user?.name || 'Usuario' })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHidden}
            title={isHidden ? t('header.showToolbar') : t('header.hideToolbar')}
          >
            <PanelTop className={`h-4 w-4 ${isHidden ? 'opacity-50' : ''}`} />
          </Button>
          <ThemeToggle />
          <LanguageSwitcher />
          <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-tertiary">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('auth.settings')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-error">
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
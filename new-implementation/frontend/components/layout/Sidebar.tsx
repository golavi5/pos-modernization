'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { canAccessRoute } from '@/lib/auth/roles';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from '@/lib/navigation/nav-items';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 h-9 w-full rounded-lg px-2.5 transition-colors whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const t = useTranslations('sidebar');

  const visibleNav = NAV_ITEMS.filter((item) =>
    canAccessRoute(item.href, user?.roles),
  );
  const canSeeSettings = canAccessRoute(SETTINGS_NAV_ITEM.href, user?.roles);

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-[52px] border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          P
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {visibleNav.map(({ href, icon, labelKey }) => (
          <NavItem
            key={href}
            href={href}
            icon={icon}
            label={t(labelKey)}
            active={pathname === href || pathname.startsWith(href + '/')}
          />
        ))}
      </nav>

      {/* Settings + Avatar */}
      <div className="p-2 border-t border-border flex flex-col gap-1">
        {canSeeSettings && (
          <NavItem
            href={SETTINGS_NAV_ITEM.href}
            icon={SETTINGS_NAV_ITEM.icon}
            label={t(SETTINGS_NAV_ITEM.labelKey)}
            active={pathname.startsWith(SETTINGS_NAV_ITEM.href)}
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 h-9 w-full rounded-lg px-2.5 transition-colors whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground">
              <Avatar className="h-[18px] w-[18px] shrink-0">
                <AvatarFallback className="text-[9px] font-bold bg-indigo-600 text-white">
                  {getInitials(user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate">
                {user?.name || 'Usuario'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
              <LogOut size={14} />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

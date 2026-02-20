import React from 'react';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { NavigationItem } from '@/types/common.types';
import { UserRole } from '@/types/auth.types';

interface SidebarProps {
  isAdmin?: boolean;
}

/**
 * Sidebar Component - Navigation menu with role-based items
 */
export function Sidebar({ isAdmin = false }: SidebarProps): React.ReactElement {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const location = useLocation();

  // Define navigation items based on roles
  const getNavItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'BarChart3',
      },
    ];

    if (!user) return baseItems;

    const userRoles = user.roles.map((r) => r.name);
    const allItems: NavigationItem[] = [...baseItems];

    // Add role-based items
    if (userRoles.includes(UserRole.CASHIER)) {
      allItems.push(
        {
          id: 'sales',
          label: 'Sales',
          path: '/dashboard/sales',
          icon: 'ShoppingCart',
        },
        {
          id: 'customers',
          label: 'Customers',
          path: '/dashboard/customers',
          icon: 'Users',
        }
      );
    }

    if (userRoles.includes(UserRole.MANAGER)) {
      allItems.push(
        {
          id: 'sales',
          label: 'Sales',
          path: '/dashboard/sales',
          icon: 'ShoppingCart',
        },
        {
          id: 'products',
          label: 'Products',
          path: '/dashboard/products',
          icon: 'Package',
        },
        {
          id: 'customers',
          label: 'Customers',
          path: '/dashboard/customers',
          icon: 'Users',
        },
        {
          id: 'reports',
          label: 'Reports',
          path: '/dashboard/reports',
          icon: 'FileText',
        }
      );
    }

    if (userRoles.includes(UserRole.ADMIN)) {
      allItems.push(
        {
          id: 'users',
          label: 'Usuarios',
          path: '/users',
          icon: 'Users',
        },
        {
          id: 'settings',
          label: 'Configuración',
          path: '/settings',
          icon: 'Settings',
        }
      );
    }

    return allItems;
  };

  const navItems = getNavItems();
  const iconMap: Record<string, React.ReactNode> = {
    BarChart3: <BarChart3 className="w-5 h-5" />,
    ShoppingCart: <ShoppingCart className="w-5 h-5" />,
    Package: <Package className="w-5 h-5" />,
    Users: <Users className="w-5 h-5" />,
    Settings: <Settings className="w-5 h-5" />,
    FileText: <FileText className="w-5 h-5" />,
    Home: <Home className="w-5 h-5" />,
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 fixed md:relative h-screen z-20 md:z-auto`}
    >
      {/* Logo / Brand */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!sidebarCollapsed && <span className="text-lg font-bold text-blue-600">POS</span>}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">
              {iconMap[item.icon || 'Home'] || <Home className="w-5 h-5" />}
            </span>
            {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

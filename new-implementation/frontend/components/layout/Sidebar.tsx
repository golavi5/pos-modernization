'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/sales', icon: ShoppingCart, label: 'Sales' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="px-4 py-2">
        <h1 className="text-lg font-bold text-gray-900">POS System</h1>
      </div>

      <nav className="space-y-1 px-2">
        {menuItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
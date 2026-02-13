'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit2,
  BarChart3,
  Download,
} from 'lucide-react';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function QuickActions() {
  const actions: QuickAction[] = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'New Sale',
      href: '/sales',
    },
    {
      icon: <Edit2 className="h-4 w-4" />,
      label: 'Add Product',
      href: '/products',
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: 'View Reports',
      href: '/reports',
    },
    {
      icon: <Download className="h-4 w-4" />,
      label: 'Export Data',
      onClick: () => console.log('Export clicked'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {actions.map((action, index) => (
            <div key={index}>
              {action.href ? (
                <Link href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    {action.icon}
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={action.onClick}
                >
                  {action.icon}
                  <span className="text-xs">{action.label}</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
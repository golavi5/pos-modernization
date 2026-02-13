import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * DashboardPage - Main dashboard with overview stats
 */
export default function DashboardPage(): React.ReactElement {
  const { user } = useAuthStore();

  const stats = [
    {
      label: 'Total Sales',
      value: '$24,500',
      change: '+12.5%',
      icon: DollarSign,
      color: 'blue',
    },
    {
      label: 'Total Orders',
      value: '1,234',
      change: '+8.2%',
      icon: BarChart3,
      color: 'green',
    },
    {
      label: 'Total Customers',
      value: '456',
      change: '+5.1%',
      icon: Users,
      color: 'purple',
    },
    {
      label: 'Revenue Growth',
      value: '28.5%',
      change: '+3.2%',
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = colorClasses[stat.color as keyof typeof colorClasses];

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </h3>
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stat.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Overview
          </h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
            <p className="text-gray-400 dark:text-gray-500">Chart placeholder</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Order #{1000 + item}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  2 hours ago
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

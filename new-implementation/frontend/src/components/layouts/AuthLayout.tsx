import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '@/utils/constants';

/**
 * AuthLayout - Layout for authentication pages (login, register, etc.)
 */
export function AuthLayout(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header with Logo */}
      <div className="p-4 md:p-6">
        <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {APP_NAME}
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 md:p-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <div className="space-y-2">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="space-x-4">
            <a href="#" className="hover:text-gray-800 dark:hover:text-gray-200">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-800 dark:hover:text-gray-200">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-800 dark:hover:text-gray-200">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

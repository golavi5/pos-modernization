import React from 'react';
import { APP_NAME, APP_VERSION } from '@/utils/constants';

/**
 * Footer Component - Bottom footer with info and links
 */
export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} {APP_NAME}. All rights reserved.
          </p>

          {/* Version */}
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Version {APP_VERSION}
          </p>

          {/* Links */}
          <div className="flex gap-4 text-sm">
            <a
              href="#"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <a
              href="#"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <a
              href="#"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

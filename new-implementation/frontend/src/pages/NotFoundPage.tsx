import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * NotFoundPage - 404 error page
 */
export default function NotFoundPage(): React.ReactElement {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white mb-2">
          404
        </h1>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. The page might have been removed
          or the URL might be incorrect.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-12">
          Need help? <a href="mailto:support@example.com" className="text-blue-600 dark:text-blue-400 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}

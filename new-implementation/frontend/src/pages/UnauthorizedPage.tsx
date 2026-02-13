import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Home } from 'lucide-react';

/**
 * UnauthorizedPage - 403 Forbidden page
 */
export default function UnauthorizedPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white mb-2">
          403
        </h1>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          You don't have permission to access this resource. If you believe this is a mistake,
          please contact your administrator.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-12 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Your Role:</span> You may need additional permissions to access this resource.
          </p>
        </div>

        {/* Support */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-8">
          Need help? <a href="mailto:support@example.com" className="text-blue-600 dark:text-blue-400 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}

'use client';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Logo/Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg">
          <span className="text-2xl font-bold text-white">POS</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">POS Modernization</h1>
        <p className="mt-2 text-sm text-gray-600">
          Modern Point of Sale System
        </p>
      </div>

      {/* Auth Content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        <p>&copy; 2024 POS System. All rights reserved.</p>
      </div>
    </div>
  );
}

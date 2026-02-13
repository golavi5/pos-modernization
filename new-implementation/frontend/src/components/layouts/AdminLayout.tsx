import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { Footer } from '@/components/common/Footer';
import { useUIStore } from '@/store/uiStore';
import { isMobile } from '@/utils/helpers';

/**
 * AdminLayout - Layout for admin features with enhanced header and sidebar
 */
export function AdminLayout(): React.ReactElement {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const [isMobileDevice, setIsMobileDevice] = React.useState(false);

  useEffect(() => {
    // Check if device is mobile on mount and on resize
    const checkMobile = () => setIsMobileDevice(isMobile());
    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    if (mobileMenuOpen && isMobileDevice) {
      setMobileMenuOpen(false);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isAdmin={true} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header isAdmin={true} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6">
            {/* Admin Notice */}
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <span className="font-semibold">Admin Mode:</span> You have full access to all features.
              </p>
            </div>

            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileDevice && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

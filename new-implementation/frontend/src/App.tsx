import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from '@/routes';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

/**
 * Root App Component
 */
function App(): React.ReactElement {
  const router = createBrowserRouter(routes);
  const { initializeAuth } = useAuthStore();
  const { initialize: initializeUI } = useUIStore();

  // Initialize auth and UI on mount
  useEffect(() => {
    initializeAuth();
    initializeUI();
  }, [initializeAuth, initializeUI]);

  return <RouterProvider router={router} />;
}

export default App;

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ToolbarConfig {
  title: string;
  showBackButton?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
}

interface ToolbarContextType {
  config: ToolbarConfig;
  setToolbar: (config: ToolbarConfig) => void;
  isHidden: boolean;
  toggleHidden: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const defaultConfig: ToolbarConfig = {
  title: '',
};

const ToolbarContext = createContext<ToolbarContextType>({
  config: defaultConfig,
  setToolbar: () => {},
  isHidden: false,
  toggleHidden: () => {},
  sidebarCollapsed: false,
  toggleSidebar: () => {},
});

export function useToolbar() {
  return useContext(ToolbarContext);
}

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ToolbarConfig>(defaultConfig);
  const [isHidden, setIsHidden] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const setToolbar = useCallback((config: ToolbarConfig) => {
    setConfig(config);
  }, []);

  const toggleHidden = useCallback(() => {
    setIsHidden(prev => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const value = useMemo(
    () => ({ config, setToolbar, isHidden, toggleHidden, sidebarCollapsed, toggleSidebar }),
    [config, setToolbar, isHidden, toggleHidden, sidebarCollapsed, toggleSidebar]
  );

  return (
    <ToolbarContext.Provider value={value}>
      {children}
    </ToolbarContext.Provider>
  );
}

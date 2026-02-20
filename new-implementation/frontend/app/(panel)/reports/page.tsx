'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Package, Users, Warehouse } from 'lucide-react';
import { SalesReportTab } from '@/components/reports/SalesReportTab';
import { ProductReportTab } from '@/components/reports/ProductReportTab';
import { CustomerReportTab } from '@/components/reports/CustomerReportTab';
import { InventoryReportTab } from '@/components/reports/InventoryReportTab';
import { useToolbar } from '@/components/layout/ToolbarContext';

type TabId = 'sales' | 'products' | 'customers' | 'inventory';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'sales', label: 'Ventas', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'products', label: 'Productos', icon: <Package className="h-4 w-4" /> },
  { id: 'customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  { id: 'inventory', label: 'Inventario', icon: <Warehouse className="h-4 w-4" /> },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sales');
  const { setToolbar } = useToolbar();

  useEffect(() => {
    setToolbar({ title: 'Reportes' });
  }, [setToolbar]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes y Analítica</h1>
        <p className="text-secondary mt-1">Visualiza métricas, tendencias y análisis de tu negocio</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-tertiary hover:text-secondary hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'sales' && <SalesReportTab />}
        {activeTab === 'products' && <ProductReportTab />}
        {activeTab === 'customers' && <CustomerReportTab />}
        {activeTab === 'inventory' && <InventoryReportTab />}
      </div>
    </div>
  );
}

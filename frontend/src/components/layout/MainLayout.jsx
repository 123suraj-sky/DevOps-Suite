import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // IDE and embedded admin tools need full-height flex — no scroll, no padding
  const isFullHeight = location.pathname.endsWith('/code')
    || location.pathname === '/grafana'
    || location.pathname === '/kibana';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {isFullHeight ? (
          // Full-height flex: IDE / Grafana / Kibana fill everything below the header
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Outlet />
          </main>
        ) : (
          // Normal scrollable padded container for every other page
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        )}
      </div>
    </div>
  );
};

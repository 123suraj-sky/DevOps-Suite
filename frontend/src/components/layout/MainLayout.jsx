import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { GrafanaPage } from '../../pages/Grafana';
import { KibanaPage } from '../../pages/Kibana';

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Track if Grafana or Kibana have been visited so we lazily mount and keep them persistent
  const [grafanaVisited, setGrafanaVisited] = useState(false);
  const [kibanaVisited, setKibanaVisited] = useState(false);

  const isGrafana = location.pathname === '/grafana';
  const isKibana = location.pathname === '/kibana';
  const isCode = location.pathname.endsWith('/code');

  if (isGrafana && !grafanaVisited) {
    setGrafanaVisited(true);
  }
  if (isKibana && !kibanaVisited) {
    setKibanaVisited(true);
  }

  // IDE and embedded admin tools need full-height flex — no scroll, no padding
  const isFullHeight = isCode || isGrafana || isKibana;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Persistent Grafana iframe view */}
        {isAdmin && grafanaVisited && (
          <div className={isGrafana ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'hidden'}>
            <GrafanaPage />
          </div>
        )}

        {/* Persistent Kibana iframe view */}
        {isAdmin && kibanaVisited && (
          <div className={isKibana ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'hidden'}>
            <KibanaPage />
          </div>
        )}

        {/* All other routes render via Outlet */}
        {!isGrafana && !isKibana && (
          isFullHeight ? (
            // Full-height flex: IDE fills everything below the header
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Outlet />
            </main>
          ) : (
            // Normal scrollable padded container for every other page
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              <Outlet />
            </main>
          )
        )}
      </div>
    </div>
  );
};

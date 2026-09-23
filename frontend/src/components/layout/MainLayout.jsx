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

  const [grafanaVisited, setGrafanaVisited] = useState(false);
  const [kibanaVisited,  setKibanaVisited]  = useState(false);

  const isGrafana = location.pathname === '/grafana';
  const isKibana  = location.pathname === '/kibana';
  const isCode    = location.pathname.endsWith('/code');
  const isTasks   = location.pathname.endsWith('/tasks');

  if (isGrafana && !grafanaVisited) setGrafanaVisited(true);
  if (isKibana  && !kibanaVisited)  setKibanaVisited(true);

  // Grafana/Kibana iframes need full-height flex — no inner padding/scroll.
  // Task board also needs full-height to prevent a scroll container sitting above
  // the Droppables, which breaks @hello-pangea/dnd drag detection.
  const isFullHeight = isGrafana || isKibana || isTasks;

  return (
    <div className="flex h-screen bg-[var(--surface-base)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Persistent Grafana iframe */}
        {isAdmin && grafanaVisited && (
          <div className={isGrafana ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'hidden'}>
            <GrafanaPage />
          </div>
        )}

        {/* Persistent Kibana iframe */}
        {isAdmin && kibanaVisited && (
          <div className={isKibana ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'hidden'}>
            <KibanaPage />
          </div>
        )}

        {/* All other routes */}
        {!isGrafana && !isKibana && (
          isFullHeight ? (
            // IDE / full-height routes: no padding, no scroll — layout handled inside
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden page-enter">
              <Outlet />
            </main>
          ) : (
            // Normal pages: padded scrollable container
            <main className="flex-1 overflow-y-auto page-enter">
              <div className="max-w-7xl mx-auto p-4 lg:p-6">
                <Outlet />
              </div>
            </main>
          )
        )}
      </div>
    </div>
  );
};

import { useState } from 'react';
import grafanaIcon from '../../assets/39_grafana.svg';

/**
 * GrafanaPage — embeds the Grafana dashboard as a full-height iframe.
 *
 * The iframe src points to the admin-proxy on port 8080. The proxy requires
 * HTTP Basic Auth; browsers cache the credential for the session once the
 * user has entered it in the prompt.
 *
 * Layout contract: MainLayout detects /grafana and gives this page the same
 * full-height, overflow-hidden treatment as the IDE page.
 */
export const GrafanaPage = () => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Use a relative URL so this works both in Docker (port 80) and local dev.
  // The nginx admin-proxy exposes Grafana on host port 8080.
  const grafanaUrl = 'http://localhost:8080';

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      {/* Thin header bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <img src={grafanaIcon} alt="" aria-hidden="true" className="w-4 h-4 invert opacity-80" />
        <span className="text-sm font-medium text-gray-200">Grafana — Metrics &amp; Dashboards</span>
        <span className="ml-auto text-xs text-gray-400">
          Login: <span className="text-gray-300 font-mono">admin / admin</span>
        </span>
        <a
          href={grafanaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 text-xs text-primary-400 hover:text-primary-300 underline"
        >
          Open in new tab ↗
        </a>
      </div>

      {/* Loading overlay */}
      {!loaded && !error && (
        <div className="absolute inset-0 top-10 flex flex-col items-center justify-center bg-gray-900 z-10 gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading Grafana…</span>
          <span className="text-xs text-gray-500 mt-1">
            If prompted, enter username <span className="font-mono text-gray-400">admin</span> and password{' '}
            <span className="font-mono text-gray-400">admin</span>
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-900">
          <img src={grafanaIcon} alt="" className="w-10 h-10 invert opacity-30" />
          <p className="text-gray-300 font-medium">Could not load Grafana</p>
          <p className="text-gray-500 text-sm max-w-sm text-center">
            Make sure the stack is running and Grafana is healthy at{' '}
            <span className="font-mono text-gray-400">{grafanaUrl}</span>
          </p>
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition-colors"
          >
            Open Grafana directly ↗
          </a>
        </div>
      )}

      {/* The iframe — fills everything below the header bar */}
      {!error && (
        <iframe
          src={grafanaUrl}
          title="Grafana Dashboards"
          className="flex-1 w-full border-0"
          style={{ display: loaded ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </div>
  );
};

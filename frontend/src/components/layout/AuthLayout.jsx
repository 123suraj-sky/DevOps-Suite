import logoIcon from '../../assets/42_logo.svg';

/**
 * Split-screen auth layout.
 * Left panel: dark brand surface with logo + product summary.
 * Right panel: the form content.
 * Collapses to single-column on mobile (left becomes a top strip).
 */
export const AuthLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col lg:flex-row">
    {/* ── Left brand panel ─────────────────────────────────────────── */}
    <div className="
      lg:w-[420px] xl:w-[480px] shrink-0
      bg-gray-900 dark:bg-gray-950
      flex flex-col items-center justify-center
      px-10 py-12 gap-8
      lg:min-h-screen
    ">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center">
          <img src={logoIcon} alt="DevOps Suite" className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">DevOps Suite</h1>
          <p className="text-sm text-gray-500 mt-1">Developer productivity platform</p>
        </div>
      </div>

      {/* Feature list — hidden on mobile, shown on lg+ */}
      <ul className="hidden lg:flex flex-col gap-3 w-full max-w-xs">
        {[
          { icon: '⚡', label: 'Sandboxed code execution' },
          { icon: '📋', label: 'Kanban project management' },
          { icon: '📡', label: 'Real-time log streaming' },
          { icon: '📊', label: 'System metrics & observability' },
        ].map(({ icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-sm text-gray-400">
            <span className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-base shrink-0" aria-hidden="true">
              {icon}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>

    {/* ── Right form panel ─────────────────────────────────────────── */}
    <div className="
      flex-1 flex items-center justify-center
      bg-[var(--surface-base)]
      px-6 py-12
      min-h-screen lg:min-h-0
    ">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  </div>
);

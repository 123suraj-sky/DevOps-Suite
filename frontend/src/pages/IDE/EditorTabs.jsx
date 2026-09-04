/**
 * EditorTabs — VS Code-style tab bar above the editor.
 *
 * Props:
 *   tabs        — Array<{ id, name, path, language, isDirty }>
 *   activeTabId — UUID of the currently visible tab
 *   onSelect    — (tabId) => void
 *   onClose     — (tabId) => void
 */
export function EditorTabs({ tabs = [], activeTabId, onSelect, onClose }) {
  if (tabs.length === 0) {
    return (
      <div className="flex items-center h-9 bg-[#1e1e1e] border-b border-[#252526] px-4">
        <span className="text-xs text-[#555]">No files open</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-end h-9 bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto
                 scrollbar-thin scrollbar-thumb-[#555] scrollbar-track-transparent"
      role="tablist"
      aria-label="Open editor tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            title={tab.path}
            className={`
              group relative flex items-center gap-1.5 h-full px-3 min-w-0 max-w-[180px]
              cursor-pointer text-xs border-t-2 shrink-0 select-none transition-colors
              ${isActive
                ? 'bg-[#1e1e1e] border-t-blue-500 text-white'
                : 'bg-[#2d2d2d] border-t-transparent text-[#969696] hover:bg-[#1e1e1e] hover:text-[#cccccc]'
              }
            `}
          >
            {/* Dirty indicator dot (shown instead of × when file has unsaved changes) */}
            <span
              className={`shrink-0 w-2 h-2 rounded-full transition-opacity
                ${tab.isDirty
                  ? 'bg-[#e8c070] opacity-100'    // amber dot = unsaved
                  : 'opacity-0 pointer-events-none'
                }`}
              aria-label={tab.isDirty ? 'unsaved changes' : undefined}
            />

            {/* File name — truncated */}
            <span className="truncate leading-none">{tab.name}</span>

            {/* Close button — always visible on active tab, shown on hover otherwise */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              aria-label={`Close ${tab.name}`}
              title={`Close ${tab.name}`}
              className={`
                shrink-0 ml-0.5 rounded p-0.5 transition-opacity
                hover:bg-[#505050] hover:text-white
                ${isActive
                  ? 'opacity-100 text-[#969696]'
                  : 'opacity-0 group-hover:opacity-100 text-[#969696]'
                }
              `}
            >
              {/* × icon */}
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M6.707 6l2.647-2.646a.5.5 0 00-.708-.708L6 5.293 3.354 2.646a.5.5 0 00-.708.708L5.293 6 2.646 8.646a.5.5 0 00.708.708L6 6.707l2.646 2.647a.5.5 0 00.708-.708L6.707 6z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

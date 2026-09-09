import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { ideFilesApi } from '../api/ideFilesApi';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';

// ── Channel name ──────────────────────────────────────────────────────────────
// All IDE tabs across the app share this channel for cross-tab file sync.
export const IDE_SYNC_CHANNEL = 'ide-sync';

// ── Context ───────────────────────────────────────────────────────────────────

const EditorContext = createContext(undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a Monaco language id from a file path extension. */
function langFromPath(path) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map = {
    py: 'python', js: 'javascript', mjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    java: 'java', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'c',
    go: 'go', rb: 'ruby', rs: 'rust', sh: 'shell',
    json: 'json', yaml: 'yaml', yml: 'yaml',
    xml: 'xml', html: 'html', css: 'css', md: 'markdown',
  };
  return map[ext] ?? 'plaintext';
}

/** sessionStorage key for the tab snapshot for a given project. */
const snapshotKey  = (projectId) => `editor_tabs_${projectId}`;
const activeTabKey = (projectId) => `editor_active_tab_${projectId}`;

/** Read lightweight tab metadata from sessionStorage (content not stored). */
function readSnapshot(projectId) {
  try {
    const raw = window.sessionStorage.getItem(snapshotKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readActiveTabId(projectId) {
  try {
    return window.sessionStorage.getItem(activeTabKey(projectId)) ?? null;
  } catch {
    return null;
  }
}

/** Persist lightweight metadata (no content) to sessionStorage. */
function writeSnapshot(projectId, tabs) {
  try {
    const snapshot = tabs.map(({ id, name, path, language }) => ({
      id, name, path, language,
    }));
    window.sessionStorage.setItem(snapshotKey(projectId), JSON.stringify(snapshot));
  } catch {
    // sessionStorage may be unavailable (private browsing quota) — fail silently
  }
}

function writeActiveTabId(projectId, tabId) {
  try {
    if (tabId == null) {
      window.sessionStorage.removeItem(activeTabKey(projectId));
    } else {
      window.sessionStorage.setItem(activeTabKey(projectId), tabId);
    }
  } catch {
    // fail silently
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * EditorProvider
 *
 * Manages the list of open editor tabs and which tab is active.
 * State survives route changes (navigating away from /code and back).
 * A lightweight snapshot (id/name/path/language only — no content) is
 * written to sessionStorage on every change, and restored on mount by
 * re-fetching the file content from the API.
 *
 * Usage:
 *   <EditorProvider>
 *     <App />
 *   </EditorProvider>
 *
 * In any component:
 *   const { tabs, activeTabId, openFile, closeTab, … } = useEditor();
 *
 * Because tabs are scoped per project, call `setProjectId(id)` from IDEPage
 * as soon as the projectId is known so the correct snapshot is loaded/saved.
 */
export function EditorProvider({ children }) {
  // The active project — tabs are scoped to this id
  const [projectId, setProjectIdState] = useState(null);

  // Tab state
  const [tabs, setTabsState]           = useState([]);
  const [activeTabId, setActiveTabIdState] = useState(null);

  // Track whether we have already restored the session for the current project
  const restoredForProject = useRef(null);

  // ── Internal setters that also persist to sessionStorage ──────────────────

  const setTabs = useCallback((updater) => {
    setTabsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Persisting is a side-effect; we defer it so it doesn't block the render
      return next;
    });
  }, []);

  // We need a ref to always have the latest projectId in the persistence effect
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  // Persist whenever tabs or activeTabId change
  useEffect(() => {
    if (!projectIdRef.current) return;
    writeSnapshot(projectIdRef.current, tabs);
  }, [tabs]);

  useEffect(() => {
    if (!projectIdRef.current) return;
    writeActiveTabId(projectIdRef.current, activeTabId);
  }, [activeTabId]);

  // ── Restore session when projectId changes ────────────────────────────────

  const setProjectId = useCallback((id) => {
    setProjectIdState(id);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    if (restoredForProject.current === projectId) return; // already restored

    restoredForProject.current = projectId;

    const snapshot = readSnapshot(projectId);
    const savedActiveTabId = readActiveTabId(projectId);

    if (snapshot.length === 0) return;

    // Re-fetch content for each persisted tab in parallel
    Promise.allSettled(snapshot.map((meta) => ideFilesApi.getFile(meta.id)))
      .then((results) => {
        const restored = [];
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            const detail = result.value;
            restored.push({
              id:       detail.id,
              name:     detail.name,
              path:     detail.path,
              language: detail.language || langFromPath(detail.path),
              content:  detail.content ?? '',
              isDirty:  false,
            });
          } else {
            // File was deleted server-side — skip it
            console.warn(`EditorContext: could not restore tab "${snapshot[idx].name}"`, result.reason);
          }
        });

        if (restored.length > 0) {
          setTabsState(restored);
          // Restore the previously active tab if it's still available
          const stillExists = restored.find((t) => t.id === savedActiveTabId);
          setActiveTabIdState(stillExists ? savedActiveTabId : restored[0].id);
        }
      });
  }, [projectId]);

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Open a file in the editor. If it is already open, just switch to it.
   * fileListItem: { id, name, path, isFolder }
   */
  const openFile = useCallback(async (fileListItem) => {
    if (fileListItem.isFolder) return;

    // Already open — just activate
    const existing = tabs.find((t) => t.id === fileListItem.id);
    if (existing) {
      setActiveTabIdState(fileListItem.id);
      return;
    }

    const detail = await ideFilesApi.getFile(fileListItem.id);
    const tab = {
      id:       detail.id,
      name:     detail.name,
      path:     detail.path,
      language: detail.language || langFromPath(detail.path),
      content:  detail.content ?? '',
      isDirty:  false,
    };
    setTabsState((prev) => [...prev, tab]);
    setActiveTabIdState(tab.id);
  }, [tabs]);

  /**
   * Open a freshly created file (content already known — no API fetch needed).
   * tab: { id, name, path, language, content }
   */
  const openNewFile = useCallback((tab) => {
    setTabsState((prev) => {
      // Guard against duplicates
      if (prev.find((t) => t.id === tab.id)) return prev;
      return [...prev, { ...tab, isDirty: false }];
    });
    setActiveTabIdState(tab.id);
  }, []);

  /** Switch the active tab. */
  const selectTab = useCallback((tabId) => {
    setActiveTabIdState(tabId);
  }, []);

  /**
   * Close a tab. Returns the tab object so the caller can flush dirty content
   * and dispose the Monaco model before calling this.
   */
  const closeTab = useCallback((tabId) => {
    setTabsState((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      setActiveTabIdState((cur) => {
        if (cur !== tabId) return cur;
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = remaining[idx] ?? remaining[idx - 1] ?? null;
        return next?.id ?? null;
      });
      return remaining;
    });
  }, []);

  /** Update the in-memory content of an open tab and mark it dirty. */
  const updateTabContent = useCallback((tabId, newContent) => {
    setTabsState((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, content: newContent, isDirty: true } : t
      )
    );
  }, []);

  /** Mark a tab as clean (saved). */
  const markTabClean = useCallback((tabId) => {
    setTabsState((prev) =>
      prev.map((t) => t.id === tabId ? { ...t, isDirty: false } : t)
    );
  }, []);

  /**
   * Update a tab's metadata (path/name/language) after a rename.
   */
  const updateTabMeta = useCallback((tabId, updates) => {
    setTabsState((prev) =>
      prev.map((t) => t.id === tabId ? { ...t, ...updates } : t)
    );
  }, []);

  /**
   * Close all tabs whose id matches any id in the given set.
   * Used when a file or folder is deleted.
   */
  const closeTabsById = useCallback((idSet) => {
    setTabsState((prev) => {
      const remaining = prev.filter((t) => !idSet.has(t.id));
      setActiveTabIdState((cur) => {
        if (!idSet.has(cur)) return cur;
        return remaining[0]?.id ?? null;
      });
      return remaining;
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // ── Cross-tab sync via BroadcastChannel ──────────────────────────────────
  //
  // When another browser tab saves a file, it broadcasts:
  //   { type: 'file_saved', fileId, content, path }
  //
  // We update the matching open tab's content in context.
  // IDEPage listens to `incomingSyncTab` and pushes the content into Monaco.

  // Holds the most-recent incoming sync event so IDEPage can react to it.
  const [incomingSyncTab, setIncomingSyncTab] = useState(null);

  const tabsRef2 = useRef(tabs);
  tabsRef2.current = tabs;

  const handleIncomingSync = useCallback((msg) => {
    if (msg?.type !== 'file_saved') return;
    const { fileId, content } = msg;

    setTabsState((prev) =>
      prev.map((t) =>
        t.id === fileId ? { ...t, content, isDirty: false } : t
      )
    );

    // Signal IDEPage that a sync arrived for this file
    setIncomingSyncTab({ fileId, content });
  }, []);

  const { postMessage: broadcastSave } = useBroadcastChannel(
    IDE_SYNC_CHANNEL,
    handleIncomingSync
  );

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    // State
    tabs,
    activeTabId,
    activeTab,
    projectId,

    // Project scoping
    setProjectId,

    // Tab operations
    openFile,
    openNewFile,
    selectTab,
    closeTab,
    updateTabContent,
    markTabClean,
    updateTabMeta,
    closeTabsById,

    // Cross-tab sync
    broadcastSave,      // (fileId, content, path) => void  — call after every save
    incomingSyncTab,    // { fileId, content } | null — latest sync received from another tab
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (ctx === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

import { ideFilesApi }       from '../../api/ideFilesApi';
import { codeExecutionApi }  from '../../api/codeExecutionApi';
import { FileExplorer }      from './FileExplorer';
import { EditorTabs }        from './EditorTabs';
import { IDEEditor, disposeEditorModel } from './IDEEditor';
import { IDEOutputPanel }    from './IDEOutputPanel';

// ── Constants ────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'TIMEOUT', 'OOM_KILLED']);

// Languages that can be run in the sandbox (matched against file.language)
const RUNNABLE_LANGUAGES = new Set(['python', 'javascript', 'java', 'cpp']);

// Debounce delay for auto-save (ms)
const AUTOSAVE_DELAY = 1500;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

/**
 * IDEPage — full IDE view for a project.
 *
 * Layout:
 *   [FileExplorer 220px] | [EditorTabs + IDEEditor flex-1] | [IDEOutputPanel 320px]
 */
export function IDEPage() {
  const { id: projectId } = useParams();
  const { project } = useOutletContext() ?? {};

  // ── File tree state ────────────────────────────────────────────────────────
  const [files, setFiles]         = useState([]);    // FileListItem[]
  const [loadingFiles, setLoadingFiles] = useState(true);
  const projectName = project?.name ?? 'Project';

  // ── Tab state ─────────────────────────────────────────────────────────────
  // tabs: Array<{ id, name, path, language, content, isDirty }>
  const [tabs, setTabs]             = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // ── Execution state ───────────────────────────────────────────────────────
  const [stdin, setStdin]           = useState('');
  const [running, setRunning]       = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [pollStatus, setPollStatus] = useState(null);
  const [result, setResult]         = useState(null);

  // Auto-save debounce timer per file
  const autoSaveTimers = useRef({});

  // ── Load file list ─────────────────────────────────────────────────────────

  const refreshFiles = useCallback(async () => {
    try {
      const data = await ideFilesApi.listFiles(projectId);
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
      toast.error('Failed to load project files.');
    }
  }, [projectId]);

  useEffect(() => {
    setLoadingFiles(true);
    refreshFiles().finally(() => setLoadingFiles(false));
  }, [refreshFiles]);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // ── Open a file (from explorer click) ─────────────────────────────────────

  const handleOpenFile = useCallback(async (fileListItem) => {
    if (fileListItem.isFolder) return;

    // If already open, just switch to it
    const existing = tabs.find((t) => t.id === fileListItem.id);
    if (existing) { setActiveTabId(fileListItem.id); return; }

    try {
      const detail = await ideFilesApi.getFile(fileListItem.id);
      const tab = {
        id:       detail.id,
        name:     detail.name,
        path:     detail.path,
        language: detail.language || langFromPath(detail.path),
        content:  detail.content ?? '',
        isDirty:  false,
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    } catch (err) {
      console.error('Failed to open file:', err);
      toast.error(`Failed to open "${fileListItem.name}".`);
    }
  }, [tabs]);

  // ── Editor content change (marks tab dirty, schedules auto-save) ───────────

  const handleEditorChange = useCallback((newContent) => {
    if (!activeTabId) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, content: newContent, isDirty: true } : t
      )
    );

    // Debounced auto-save
    clearTimeout(autoSaveTimers.current[activeTabId]);
    autoSaveTimers.current[activeTabId] = setTimeout(() => {
      setTabs((current) => {
        const tab = current.find((t) => t.id === activeTabId);
        if (tab?.isDirty) saveTab(tab);
        return current;
      });
    }, AUTOSAVE_DELAY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // ── Save a tab ─────────────────────────────────────────────────────────────

  const saveTab = useCallback(async (tab) => {
    try {
      await ideFilesApi.updateFile(tab.id, { content: tab.content });
      setTabs((prev) =>
        prev.map((t) => t.id === tab.id ? { ...t, isDirty: false } : t)
      );
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Silent fail for auto-save; manual save shows a toast
    }
  }, []);

  const handleManualSave = useCallback(async () => {
    if (!activeTab) return;
    try {
      await ideFilesApi.updateFile(activeTab.id, { content: activeTab.content });
      setTabs((prev) =>
        prev.map((t) => t.id === activeTab.id ? { ...t, isDirty: false } : t)
      );
      toast.success('Saved');
    } catch (err) {
      toast.error('Save failed.');
    }
  }, [activeTab]);

  // ── Close a tab ────────────────────────────────────────────────────────────

  const handleCloseTab = useCallback((tabId) => {
    clearTimeout(autoSaveTimers.current[tabId]);

    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.isDirty) {
      // Flush unsaved content synchronously before closing
      ideFilesApi.updateFile(tabId, { content: tab.content }).catch(console.error);
    }

    disposeEditorModel(tab?.path ?? '');

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        // Activate adjacent tab
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = remaining[idx] ?? remaining[idx - 1] ?? null;
        setActiveTabId(next?.id ?? null);
      }
      return remaining;
    });
  }, [tabs, activeTabId]);

  // ── Create file / folder ───────────────────────────────────────────────────

  const handleCreate = useCallback(async ({ path, isFolder }) => {
    try {
      const created = await ideFilesApi.createFile({
        projectId,
        path,
        isFolder,
        content: '',
      });
      await refreshFiles();

      if (!isFolder) {
        // Auto-open newly created file
        const tab = {
          id:       created.id,
          name:     created.name,
          path:     created.path,
          language: created.language || langFromPath(created.path),
          content:  '',
          isDirty:  false,
        };
        setTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
      }
      toast.success(`Created "${path.split('/').pop()}"`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to create file.';
      toast.error(msg);
    }
  }, [projectId, refreshFiles]);

  // ── Rename / move ──────────────────────────────────────────────────────────

  const handleRename = useCallback(async (fileListItem, newPath) => {
    try {
      await ideFilesApi.updateFile(fileListItem.id, { path: newPath });
      await refreshFiles();

      // Update tab if it's open
      setTabs((prev) =>
        prev.map((t) =>
          t.id === fileListItem.id
            ? { ...t, path: newPath, name: newPath.split('/').pop(), language: langFromPath(newPath) }
            : t
        )
      );
      toast.success('Renamed');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Rename failed.';
      toast.error(msg);
    }
  }, [refreshFiles]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (fileListItem) => {
    try {
      if (fileListItem.id) {
        // Real DB entry — single API call; backend cascade-deletes all children
        await ideFilesApi.deleteFile(fileListItem.id);

        // Close tabs for the deleted entry AND any open tabs that were inside it
        // (backend has already removed the rows, tabs would become ghost tabs)
        if (fileListItem.isFolder) {
          const prefix = fileListItem.path + '/';
          setTabs((prev) => {
            const toClose = prev.filter(
              (t) => t.id === fileListItem.id || t.path.startsWith(prefix)
            );
            toClose.forEach((t) => {
              clearTimeout(autoSaveTimers.current[t.id]);
              disposeEditorModel(t.path);
            });
            const remaining = prev.filter(
              (t) => t.id !== fileListItem.id && !t.path.startsWith(prefix)
            );
            setActiveTabId((cur) => {
              const stillOpen = remaining.find((t) => t.id === cur);
              return stillOpen ? cur : (remaining[0]?.id ?? null);
            });
            return remaining;
          });
        } else {
          // Single file — close its tab if open
          if (tabs.find((t) => t.id === fileListItem.id)) {
            handleCloseTab(fileListItem.id);
          }
        }
      } else if (fileListItem.isFolder) {
        // Virtual folder (no DB row) — delete all known children by their ids
        const prefix = fileListItem.path + '/';
        const children = files.filter(
          (f) => f.path === fileListItem.path || f.path.startsWith(prefix)
        );
        await Promise.all(children.map((f) => ideFilesApi.deleteFile(f.id)));

        // Close any open tabs that were inside this folder
        children.forEach((f) => {
          if (tabs.find((t) => t.id === f.id)) handleCloseTab(f.id);
        });
      }

      await refreshFiles();
      toast.success(`Deleted "${fileListItem.name}"`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Delete failed.';
      toast.error(msg);
    }
  }, [refreshFiles, tabs, files, handleCloseTab, autoSaveTimers]);

  // ── Execution polling ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!executionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await codeExecutionApi.getStatus(executionId);
        setPollStatus(res.status);

        if (TERMINAL_STATUSES.has(res.status)) {
          setResult(res);
          setRunning(false);
          setExecutionId(null);
          setPollStatus(null);
          clearInterval(interval);

          if (res.status === 'COMPLETED') toast.success('Execution completed!');
          else if (res.status === 'TIMEOUT')    toast.error('Execution timed out.');
          else if (res.status === 'OOM_KILLED') toast.error('Killed: out of memory.');
          else                                   toast.error('Execution failed.');
        }
      } catch (err) {
        console.error('Poll error:', err);
        setRunning(false);
        setExecutionId(null);
        setPollStatus(null);
        clearInterval(interval);
        toast.error('Lost connection while polling.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [executionId]);

  // ── Run active file ────────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (!activeTab) { toast.error('No file is open.'); return; }
    if (!RUNNABLE_LANGUAGES.has(activeTab.language)) {
      toast.error(`"${activeTab.language}" is not a runnable language.`);
      return;
    }

    // Flush unsaved changes before running
    if (activeTab.isDirty) {
      try {
        await ideFilesApi.updateFile(activeTab.id, { content: activeTab.content });
        setTabs((prev) =>
          prev.map((t) => t.id === activeTab.id ? { ...t, isDirty: false } : t)
        );
      } catch {
        toast.error('Could not save file before running.');
        return;
      }
    }

    setRunning(true);
    setResult(null);
    setPollStatus('QUEUED');

    try {
      const res = await codeExecutionApi.execute({
        file_id:     activeTab.id,
        language:    activeTab.language,
        stdin,
        maxTimeMs:   10000,
        maxMemoryMb: 256,
      });
      setExecutionId(res.execution_id);
      toast.success('Queued — running in sandbox…');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to submit execution.';
      toast.error(msg);
      setRunning(false);
      setPollStatus(null);
    }
  }, [activeTab, stdin]);

  // ── Resize handle state (explorer / output panel) ─────────────────────────

  const [explorerWidth, setExplorerWidth] = useState(220);
  const [outputWidth,   setOutputWidth]   = useState(320);
  const draggingExplorer = useRef(false);
  const draggingOutput   = useRef(false);

  const startDragExplorer = useCallback((e) => {
    e.preventDefault();
    draggingExplorer.current = true;
  }, []);
  const startDragOutput = useCallback((e) => {
    e.preventDefault();
    draggingOutput.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (draggingExplorer.current) {
        setExplorerWidth(Math.min(500, Math.max(140, e.clientX)));
      }
      if (draggingOutput.current) {
        setOutputWidth(Math.min(600, Math.max(200, window.innerWidth - e.clientX)));
      }
    };
    const onUp = () => {
      draggingExplorer.current = false;
      draggingOutput.current   = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const canRun = activeTab && RUNNABLE_LANGUAGES.has(activeTab.language) && !running;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden rounded-lg shadow-md">

      {/* ── Top toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#323233] border-b border-[#252526] shrink-0">
        <div className="flex items-center gap-2">
          {/* VS Code-style activity label */}
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H9v-2h3v2zm3-4H9v-2h6v2zm0-4H9V7h6v2z" />
          </svg>
          <span className="text-sm font-semibold text-[#cccccc]">IDE</span>
          {activeTab && (
            <span className="text-xs text-[#858585] font-mono ml-2 truncate max-w-[300px]">
              {activeTab.path}
              {activeTab.isDirty && <span className="text-[#e8c070] ml-1">●</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            onClick={handleManualSave}
            disabled={!activeTab || !activeTab.isDirty}
            title="Save (Ctrl+S)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded
                       text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
              <path d="M5 4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5z" />
            </svg>
            Save
          </button>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={!canRun}
            title={canRun ? 'Run active file' : running ? 'Running…' : 'No runnable file open'}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors
              ${canRun
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : running
                  ? 'bg-green-800 text-green-300 cursor-not-allowed animate-pulse'
                  : 'bg-[#3c3c3c] text-[#666] cursor-not-allowed'
              }`}
          >
            {running ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" />
                </svg>
                {pollStatus ?? 'Running…'}
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Run ▶
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main three-panel body ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Explorer panel */}
        <div style={{ width: explorerWidth }} className="flex flex-col shrink-0 overflow-hidden">
          {loadingFiles ? (
            <div className="flex-1 flex items-center justify-center bg-[#252526]">
              <span className="text-[#555] text-xs">Loading…</span>
            </div>
          ) : (
            <FileExplorer
              files={files}
              activeFileId={activeTab?.id}
              projectName={projectName}
              onOpenFile={handleOpenFile}
              onCreate={handleCreate}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Explorer resize handle */}
        <div
          onMouseDown={startDragExplorer}
          className="w-1 bg-[#3c3c3c] hover:bg-blue-500 cursor-col-resize shrink-0 transition-colors"
          title="Drag to resize explorer"
          role="separator"
          aria-orientation="vertical"
        />

        {/* Editor area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <EditorTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={setActiveTabId}
            onClose={handleCloseTab}
          />
          <IDEEditor
            activeTab={activeTab}
            onChange={handleEditorChange}
            onSave={handleManualSave}
          />
        </div>

        {/* Output panel resize handle */}
        <div
          onMouseDown={startDragOutput}
          className="w-1 bg-[#3c3c3c] hover:bg-blue-500 cursor-col-resize shrink-0 transition-colors"
          title="Drag to resize output"
          role="separator"
          aria-orientation="vertical"
        />

        {/* Output panel */}
        <div style={{ width: outputWidth }} className="flex flex-col shrink-0 overflow-hidden">
          <IDEOutputPanel
            running={running}
            pollStatus={pollStatus}
            result={result}
            stdin={stdin}
            onStdinChange={setStdin}
          />
        </div>
      </div>
    </div>
  );
}

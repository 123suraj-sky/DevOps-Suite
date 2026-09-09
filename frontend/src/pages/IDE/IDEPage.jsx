import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

import { ideFilesApi }       from '../../api/ideFilesApi';
import { codeExecutionApi }  from '../../api/codeExecutionApi';
import { useEditor }         from '../../context/EditorContext';
import { FileExplorer }      from './FileExplorer';
import { EditorTabs }        from './EditorTabs';
import { IDEEditor, disposeEditorModel } from './IDEEditor';
import { IDEOutputPanel }    from './IDEOutputPanel';
import circleDotIcon   from '../../assets/27_circle_dot.svg';
import playIcon        from '../../assets/28_play.svg';
import fullscreenIcon  from '../../assets/37_fullscreen.svg';

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
 *
 * Props:
 *   projectIdOverride — used by FullScreenIDEPage (no :id route param available)
 *   projectOverride   — project object passed by FullScreenIDEPage after it fetches it
 *   isFullScreen      — when true, hides the "open in full screen" button to avoid
 *                       opening a new full-screen tab from inside a full-screen tab
 */
export function IDEPage({ projectIdOverride, projectOverride, isFullScreen = false }) {
  // projectId comes from the route param (/projects/:id/code) normally,
  // or from the prop when rendered inside FullScreenIDEPage (/editor?project=).
  const { id: routeProjectId } = useParams();
  const projectId = projectIdOverride ?? routeProjectId;

  // OutletContext is only available in the normal route; full-screen has none.
  const outletCtx = useOutletContext() ?? {};
  const project = projectOverride ?? outletCtx.project;
  const projectName = project?.name ?? 'Project';

  // ── EditorContext — persistent tab state ───────────────────────────────────
  const {
    tabs,
    activeTabId,
    activeTab,
    setProjectId,
    openFile:       ctxOpenFile,
    openNewFile:    ctxOpenNewFile,
    selectTab:      ctxSelectTab,
    closeTab:       ctxCloseTab,
    updateTabContent,
    markTabClean,
    updateTabMeta,
    closeTabsById,
    broadcastSave,
    incomingSyncTab,
  } = useEditor();

  // Tell the context which project we are in so it loads/saves the right snapshot
  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  // ── File tree state ────────────────────────────────────────────────────────
  const [files, setFiles]               = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // ── Execution state ───────────────────────────────────────────────────────
  const [stdin, setStdin]               = useState('');
  const [running, setRunning]           = useState(false);
  const [executionId, setExecutionId]   = useState(null);
  const [pollStatus, setPollStatus]     = useState(null);
  const [result, setResult]             = useState(null);

  // Auto-save debounce timer per file (keyed by tab id)
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

  // ── Open a file (from explorer click) ─────────────────────────────────────

  const handleOpenFile = useCallback(async (fileListItem) => {
    if (fileListItem.isFolder) return;
    try {
      await ctxOpenFile(fileListItem);
    } catch (err) {
      console.error('Failed to open file:', err);
      toast.error(`Failed to open "${fileListItem.name}".`);
    }
  }, [ctxOpenFile]);

  // ── Editor content change (marks tab dirty, schedules auto-save) ───────────

  const handleEditorChange = useCallback((newContent) => {
    if (!activeTabId) return;

    updateTabContent(activeTabId, newContent);

    // Debounced auto-save
    clearTimeout(autoSaveTimers.current[activeTabId]);
    autoSaveTimers.current[activeTabId] = setTimeout(() => {
      // Read tabs directly from context via ref to avoid stale closure
      // We use a functional approach: grab the current tab from the context
      // by calling the API directly if it is still dirty.
      // The context always has the latest content so we reach into it via
      // a stable callback pattern.
      autoSaveCurrentTab(activeTabId);
    }, AUTOSAVE_DELAY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, updateTabContent]);

  // Stable ref to the tabs array so the auto-save timeout can read current state
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Ref to the IDEEditor instance — used to push content on cross-tab sync
  const editorRef = useRef(null);

  // ── Incoming cross-tab sync (BroadcastChannel) ────────────────────────────
  // EditorContext sets `incomingSyncTab` whenever another tab broadcasts a save.
  // The context has already updated the tab's content in state; here we push it
  // into the live Monaco editor if that file is currently active.
  const lastSyncRef = useRef(null);
  useEffect(() => {
    if (!incomingSyncTab) return;
    // Deduplicate — same object reference means we already handled it
    if (lastSyncRef.current === incomingSyncTab) return;
    lastSyncRef.current = incomingSyncTab;

    const { fileId, content } = incomingSyncTab;
    if (fileId === activeTabId) {
      editorRef.current?.pushContent(content);
    }
  }, [incomingSyncTab, activeTabId]);

  const autoSaveCurrentTab = useCallback(async (tabId) => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab?.isDirty) return;
    try {
      await ideFilesApi.updateFile(tab.id, { content: tab.content });
      markTabClean(tab.id);
      // Notify other open tabs (e.g. the full-screen IDE) about the saved content
      broadcastSave({ type: 'file_saved', fileId: tab.id, content: tab.content, path: tab.path });
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Silent fail for auto-save; manual save shows a toast
    }
  }, [markTabClean, broadcastSave]);

  // ── Manual save ───────────────────────────────────────────────────────────

  const handleManualSave = useCallback(async () => {
    if (!activeTab) return;
    try {
      await ideFilesApi.updateFile(activeTab.id, { content: activeTab.content });
      markTabClean(activeTab.id);
      broadcastSave({ type: 'file_saved', fileId: activeTab.id, content: activeTab.content, path: activeTab.path });
      toast.success('Saved');
    } catch (err) {
      toast.error('Save failed.');
    }
  }, [activeTab, markTabClean, broadcastSave]);

  // ── Close a tab ────────────────────────────────────────────────────────────

  const handleCloseTab = useCallback((tabId) => {
    clearTimeout(autoSaveTimers.current[tabId]);

    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (tab?.isDirty) {
      // Flush unsaved content synchronously before closing
      ideFilesApi.updateFile(tabId, { content: tab.content }).catch(console.error);
    }

    disposeEditorModel(tab?.path ?? '');
    ctxCloseTab(tabId);
  }, [ctxCloseTab]);

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
        ctxOpenNewFile({
          id:       created.id,
          name:     created.name,
          path:     created.path,
          language: created.language || langFromPath(created.path),
          content:  '',
        });
      }
      toast.success(`Created "${path.split('/').pop()}"`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to create file.';
      toast.error(msg);
    }
  }, [projectId, refreshFiles, ctxOpenNewFile]);

  // ── Rename / move ──────────────────────────────────────────────────────────

  const handleRename = useCallback(async (fileListItem, newPath) => {
    try {
      await ideFilesApi.updateFile(fileListItem.id, { path: newPath });
      await refreshFiles();

      updateTabMeta(fileListItem.id, {
        path:     newPath,
        name:     newPath.split('/').pop(),
        language: langFromPath(newPath),
      });
      toast.success('Renamed');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Rename failed.';
      toast.error(msg);
    }
  }, [refreshFiles, updateTabMeta]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (fileListItem) => {
    try {
      if (fileListItem.id) {
        // Real DB entry — single API call; backend cascade-deletes all children
        await ideFilesApi.deleteFile(fileListItem.id);

        if (fileListItem.isFolder) {
          // Close all tabs inside the deleted folder
          const prefix = fileListItem.path + '/';
          const toClose = tabsRef.current.filter(
            (t) => t.id === fileListItem.id || t.path.startsWith(prefix)
          );
          toClose.forEach((t) => {
            clearTimeout(autoSaveTimers.current[t.id]);
            disposeEditorModel(t.path);
          });
          closeTabsById(new Set(toClose.map((t) => t.id)));
        } else {
          // Single file — flush and close its tab if open
          const tab = tabsRef.current.find((t) => t.id === fileListItem.id);
          if (tab) {
            clearTimeout(autoSaveTimers.current[tab.id]);
            disposeEditorModel(tab.path);
            closeTabsById(new Set([tab.id]));
          }
        }
      } else if (fileListItem.isFolder) {
        // Virtual folder (no DB row) — delete all known children by their ids
        const prefix = fileListItem.path + '/';
        const children = files.filter(
          (f) => f.path === fileListItem.path || f.path.startsWith(prefix)
        );
        await Promise.all(children.map((f) => ideFilesApi.deleteFile(f.id)));

        const childIds = new Set(children.map((f) => f.id));
        const toClose = tabsRef.current.filter((t) => childIds.has(t.id));
        toClose.forEach((t) => {
          clearTimeout(autoSaveTimers.current[t.id]);
          disposeEditorModel(t.path);
        });
        closeTabsById(childIds);
      }

      await refreshFiles();
      toast.success(`Deleted "${fileListItem.name}"`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Delete failed.';
      toast.error(msg);
    }
  }, [refreshFiles, files, closeTabsById]);

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

          if (res.status === 'COMPLETED')     toast.success('Execution completed!');
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
        markTabClean(activeTab.id);
        broadcastSave({ type: 'file_saved', fileId: activeTab.id, content: activeTab.content, path: activeTab.path });
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
  }, [activeTab, stdin, markTabClean]);

  // ── Full-screen handler ────────────────────────────────────────────────────

  const handleOpenFullScreen = useCallback(() => {
    window.open(`/editor?project=${projectId}`, '_blank', 'noopener,noreferrer');
  }, [projectId]);

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
              {activeTab.isDirty && (
                <img
                  src={circleDotIcon}
                  alt="unsaved"
                  className="w-2 h-2 inline-block ml-1"
                  style={{ filter: 'invert(85%) sepia(30%) saturate(500%) hue-rotate(5deg)' }}
                />
              )}
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
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
              <path d="M5 4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5z" />
            </svg>
            Save
          </button>

          {/* Open in full-screen button — hidden when already in full-screen */}
          {!isFullScreen && (
            <button
              onClick={handleOpenFullScreen}
              title="Open IDE in full screen (new tab)"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded
                         text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              <img src={fullscreenIcon} alt="" className="w-3.5 h-3.5 invert opacity-70" aria-hidden="true" />
              Full screen
            </button>
          )}

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
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" />
                </svg>
                {pollStatus ?? 'Running…'}
              </>
            ) : (
              <>
                <img src={playIcon} alt="" className="w-3.5 h-3.5" aria-hidden="true" />
                Run
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
            onSelect={ctxSelectTab}
            onClose={handleCloseTab}
          />
          <IDEEditor
            ref={editorRef}
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

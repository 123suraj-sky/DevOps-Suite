import { useState, useRef, useEffect, useCallback } from 'react';

// ── Icons (inline SVG — zero extra deps) ────────────────────────────────────

const ChevronRight = ({ open }) => (
  <svg
    className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
  >
    <path fillRule="evenodd" clipRule="evenodd"
      d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
  </svg>
);

const FolderIcon = ({ open }) => (
  <svg className="w-4 h-4 shrink-0 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    {open
      ? <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      : <path fillRule="evenodd" clipRule="evenodd"
          d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    }
  </svg>
);

const FileIcon = ({ language }) => {
  const colours = {
    python:     'text-blue-400',
    javascript: 'text-yellow-300',
    java:       'text-orange-400',
    cpp:        'text-purple-400',
    typescript: 'text-blue-500',
    html:       'text-red-400',
    css:        'text-pink-400',
    json:       'text-green-300',
    markdown:   'text-gray-400',
  };
  const colour = colours[language] ?? 'text-gray-400';
  return (
    <svg className={`w-4 h-4 shrink-0 ${colour}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
    </svg>
  );
};

// ── Tree builder ─────────────────────────────────────────────────────────────

/**
 * Converts a flat list of FileListItem objects into a nested tree.
 * Each node: { id, name, path, language, isFolder, children[] }
 */
function buildTree(files) {
  const root = { children: {} };

  for (const file of files) {
    const parts = file.path.split('/');
    let node = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children[part]) {
        node.children[part] = { children: {} };
      }
      if (i === parts.length - 1) {
        // Leaf — attach file metadata
        Object.assign(node.children[part], {
          id:       file.id,
          name:     file.name,
          path:     file.path,
          language: file.language,
          isFolder: file.isFolder,
        });
      } else {
        // Intermediate folder node — may not have a DB entry (virtual)
        if (!node.children[part].path) {
          node.children[part].isFolder = true;
          node.children[part].name     = part;
          node.children[part].path     = parts.slice(0, i + 1).join('/');
        }
      }
      node = node.children[part];
    }
  }

  return root;
}

/** Sort tree nodes: folders first, then files, both alphabetically. */
function sortedChildren(node) {
  return Object.values(node.children).sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Context menu ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, node, onNewFile, onNewFolder, onRename, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const item = (label, action, danger = false) => (
    <button
      key={label}
      onMouseDown={(e) => { e.stopPropagation(); action(); onClose(); }}
      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#2a2d2e] rounded
        ${danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300'}`}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="fixed z-50 bg-[#1e1e1e] border border-[#3c3c3c] rounded shadow-xl py-1 min-w-[160px]"
      role="menu"
    >
      {node?.isFolder && item('New File…',   () => onNewFile(node))}
      {node?.isFolder && item('New Folder…', () => onNewFolder(node))}
      {/* Rename available for any node that has a DB id (real file or real folder) */}
      {node?.id && item('Rename…', () => onRename(node))}
      {/* Delete available for all nodes — virtual folders are deleted by path prefix */}
      {(node?.id || node?.isFolder) && item('Delete', () => onDelete(node), true)}
    </div>
  );
}

// ── Inline rename/create input ───────────────────────────────────────────────

function InlineInput({ defaultValue = '', placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const confirm = () => { const v = value.trim(); if (v) onConfirm(v); else onCancel(); };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={confirm}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      placeholder={placeholder}
      className="w-full bg-[#3c3c3c] text-gray-100 text-xs px-1.5 py-0.5 rounded outline-none
                 border border-blue-500 focus:ring-1 focus:ring-blue-500"
      aria-label="file name input"
    />
  );
}

// ── Tree node ────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  activeFileId,
  openFolders,
  pendingCreate,
  renamingId,
  onOpenFile,
  onToggleFolder,
  onContextMenu,
  onConfirmCreate,
  onCancelCreate,
  onConfirmRename,
  onCancelRename,
  onDelete,
}) {
  const isOpen    = openFolders.has(node.path);
  const isActive  = !node.isFolder && node.id === activeFileId;
  const isRenaming = renamingId === node.id;
  const children  = sortedChildren(node);

  const paddingLeft = depth * 12 + 6;

  return (
    <div>
      {/* Row */}
      <div
        role={node.isFolder ? 'button' : 'option'}
        aria-selected={isActive}
        style={{ paddingLeft }}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
        onClick={() => node.isFolder ? onToggleFolder(node.path) : onOpenFile(node)}
        className={`group flex items-center gap-1.5 py-0.5 pr-1 cursor-pointer rounded-sm text-xs select-none
          ${isActive ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
      >
        {node.isFolder
          ? <><ChevronRight open={isOpen} /><FolderIcon open={isOpen} /></>
          : <><span className="w-3" /><FileIcon language={node.language} /></>
        }

        {isRenaming
          ? <InlineInput
              defaultValue={node.name}
              onConfirm={(v) => onConfirmRename(node, v)}
              onCancel={onCancelRename}
            />
          : <span className="truncate leading-5 flex-1 min-w-0">{node.name}</span>
        }

        {/* Delete button — visible on hover, shown for all nodes */}
        {!isRenaming && (
          <button
            title={`Delete ${node.isFolder ? 'folder' : 'file'}`}
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="shrink-0 opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded
                       text-[#858585] hover:text-red-400 hover:bg-[#3c3c3c] transition-opacity"
            aria-label={`Delete ${node.name}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
          </button>
        )}
      </div>

      {/* Children */}
      {node.isFolder && isOpen && (
        <div>
          {/* Pending create input inside this folder */}
          {pendingCreate?.parentPath === node.path && (
            <div style={{ paddingLeft: paddingLeft + 18 }} className="py-0.5 pr-2">
              <InlineInput
                placeholder={pendingCreate.type === 'folder' ? 'folder name' : 'file name'}
                onConfirm={(name) => onConfirmCreate(name, pendingCreate)}
                onCancel={onCancelCreate}
              />
            </div>
          )}
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              openFolders={openFolders}
              pendingCreate={pendingCreate}
              renamingId={renamingId}
              onOpenFile={onOpenFile}
              onToggleFolder={onToggleFolder}
              onContextMenu={onContextMenu}
              onConfirmCreate={onConfirmCreate}
              onCancelCreate={onCancelCreate}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main FileExplorer ────────────────────────────────────────────────────────

/**
 * Props:
 *   files        — FileListItem[] from API (flat list)
 *   activeFileId — UUID of currently open file (for highlighting)
 *   projectName  — displayed as the root label
 *   onOpenFile   — (fileListItem) => void
 *   onCreate     — ({ path, isFolder }) => Promise<void>
 *   onRename     — (fileListItem, newName) => Promise<void>
 *   onDelete     — (fileListItem) => Promise<void>
 */
export function FileExplorer({
  files = [],
  activeFileId,
  projectName = 'Project',
  onOpenFile,
  onCreate,
  onRename,
  onDelete,
}) {
  const tree = buildTree(files);
  const rootChildren = sortedChildren(tree);

  const [openFolders, setOpenFolders]   = useState(new Set());
  const [contextMenu, setContextMenu]   = useState(null); // { x, y, node }
  const [pendingCreate, setPendingCreate] = useState(null); // { parentPath, type }
  const [renamingId, setRenamingId]     = useState(null);

  // Auto-expand root on first load
  useEffect(() => {
    if (rootChildren.some((n) => n.isFolder)) {
      setOpenFolders(new Set(rootChildren.filter((n) => n.isFolder).map((n) => n.path)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length === 0]);

  const toggleFolder = useCallback((path) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleRootContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: { isFolder: true, path: '', name: projectName } });
  }, [projectName]);

  // ── Create ────────────────────────────────────────────────────────────────

  const startCreate = useCallback((parentNode, type) => {
    if (!parentNode.path && parentNode.path !== '') return;
    // Ensure parent folder is open
    setOpenFolders((prev) => new Set([...prev, parentNode.path]));
    setPendingCreate({ parentPath: parentNode.path, type });
  }, []);

  const confirmCreate = useCallback(async (name, pending) => {
    setPendingCreate(null);
    const path = pending.parentPath ? `${pending.parentPath}/${name}` : name;
    await onCreate({ path, isFolder: pending.type === 'folder' });
    if (pending.type === 'folder') {
      setOpenFolders((prev) => new Set([...prev, path]));
    }
  }, [onCreate]);

  // ── Rename ────────────────────────────────────────────────────────────────

  const startRename  = useCallback((node) => setRenamingId(node.id), []);
  const cancelRename = useCallback(() => setRenamingId(null), []);

  const confirmRename = useCallback(async (node, newName) => {
    setRenamingId(null);
    if (newName === node.name) return;
    const dirPart = node.path.includes('/')
      ? node.path.substring(0, node.path.lastIndexOf('/') + 1)
      : '';
    const newPath = dirPart + newName;
    await onRename(node, newPath);
  }, [onRename]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (node) => {
    const label = node.isFolder
      ? `Delete folder "${node.name}" and all its contents? This cannot be undone.`
      : `Delete "${node.name}"? This cannot be undone.`;
    if (!window.confirm(label)) return;
    await onDelete(node);
  }, [onDelete]);

  // ── Toolbar buttons (new file / new folder at root) ───────────────────────

  return (
    <div className="flex flex-col h-full bg-[#252526] select-none" onContextMenu={handleRootContextMenu}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
          {projectName}
        </span>
        <div className="flex gap-1">
          <button
            title="New File"
            onClick={() => startCreate({ path: '', name: projectName, isFolder: true }, 'file')}
            className="text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded p-0.5"
            aria-label="New file"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 10-2 0v6H3a1 1 0 100 2h6v6a1 1 0 102 0v-6h6a1 1 0 100-2h-6V3z" />
            </svg>
          </button>
          <button
            title="New Folder"
            onClick={() => startCreate({ path: '', name: projectName, isFolder: true }, 'folder')}
            className="text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded p-0.5"
            aria-label="New folder"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v1H2V6zm0 3h16v5a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 text-sm">
        {/* Root-level pending create */}
        {pendingCreate?.parentPath === '' && (
          <div className="px-3 py-0.5">
            <InlineInput
              placeholder={pendingCreate.type === 'folder' ? 'folder name' : 'file name'}
              onConfirm={(name) => confirmCreate(name, pendingCreate)}
              onCancel={() => setPendingCreate(null)}
            />
          </div>
        )}

        {rootChildren.length === 0 && !pendingCreate && (
          <p className="text-[#666] text-xs px-3 py-2 italic">
            No files yet. Click + to create one.
          </p>
        )}

        {rootChildren.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            openFolders={openFolders}
            pendingCreate={pendingCreate}
            renamingId={renamingId}
            onOpenFile={onOpenFile}
            onToggleFolder={toggleFolder}
            onContextMenu={handleContextMenu}
            onConfirmCreate={confirmCreate}
            onCancelCreate={() => setPendingCreate(null)}
            onConfirmRename={confirmRename}
            onCancelRename={cancelRename}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onNewFile={(n)    => startCreate(n, 'file')}
          onNewFolder={(n)  => startCreate(n, 'folder')}
          onRename={(n)     => startRename(n)}
          onDelete={(n)     => handleDelete(n)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

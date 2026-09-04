I now have everything needed for a thorough answer.Now I have a complete picture of everything. Let me also check the docs for any relevant design notes and check what frontend components exist.Good. Now I have everything I need. Let me give you a thorough answer.

---

## Is it possible to do it for free?

**Yes, completely.** Everything you need is open-source and already compatible with your stack:

| What you need | Free solution | Notes |
|---|---|---|
| File tree / explorer UI | Custom React component | Simple recursive tree, no library needed |
| Full IDE-like editor | `@monaco-editor/react` | Already in your project. It's the same engine as VS Code |
| File system storage | PostgreSQL (already running) | Store files as rows: `(id, project_id, path, content, language)` |
| Multi-file execution | Your existing `DockerSandbox` | Needs to write multiple files instead of one |
| Tab management | React state | Pure frontend logic, no library needed |
| Terminal output panel | Already built | Your existing output console |

The only constraint: **there's no real filesystem for users** — files live in your database. That's the correct approach for a web-based IDE anyway (it's how Replit, CodeSandbox, etc. work).

---

## Implementation Plan

Here's the full plan, organized into phases.

---

### Phase 1 — Backend: File Storage

**New Flyway migration** (`V3__ide_files.sql`):
```sql
CREATE TABLE ide_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  path         TEXT NOT NULL,           -- e.g. "src/main.py"
  name         TEXT NOT NULL,           -- just the filename
  content      TEXT NOT NULL DEFAULT '',
  language     TEXT NOT NULL DEFAULT 'plaintext',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
```

**New REST endpoints** under `/api/ide-files`:
| Method | Path | Action |
|---|---|---|
| `GET` | `/api/ide-files?projectId=` | List all files (path + id only, no content) |
| `GET` | `/api/ide-files/{id}` | Get a single file with content |
| `POST` | `/api/ide-files` | Create a file `{ projectId, path, name, content, language }` |
| `PUT` | `/api/ide-files/{id}` | Update content/name/path |
| `DELETE` | `/api/ide-files/{id}` | Delete a file |

These are standard Spring Data JPA CRUD — a `IdeFile` entity, `IdeFileRepository`, `IdeFileService`, `IdeFileController`. Nothing new architecturally.

**Multi-file execution change** in `DockerSandbox`: Instead of writing a single `code.<ext>` file, accept a `List<IdeFileEntry>` (path → content pairs) and write all of them into the workspace directory before creating the container. The entry point file is passed separately. This lets you run a project with multiple files.

A new `SubmitRequest` field `fileId` (optional) — when provided, the backend fetches the file from DB and runs it instead of an inline `sourceCode`.

---

### Phase 2 — Frontend: IDE Shell

Replace `CodeEditorPage.jsx` with a proper IDE layout. The structure:

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [Project name]  [New File] [New Folder] [Run ▶]│
├──────────┬──────────────────────────────┬────────────────┤
│          │  Tabs: [main.py ×] [utils.py]│                │
│  File    ├──────────────────────────────┤   Output       │
│  Explorer│                              │   Console      │
│  (tree)  │   Monaco Editor              │                │
│          │   (active tab content)       ├────────────────┤
│          │                              │   stdin        │
└──────────┴──────────────────────────────┴────────────────┘
```

**New components to create:**

1. **`FileExplorer.jsx`** — Recursive file tree. Shows folders and files. Right-click context menu (or icon buttons) for New File, Rename, Delete. Clicking a file opens it in a tab.

2. **`EditorTabs.jsx`** — Tab bar above the Monaco editor. Each tab shows filename, a close button. Tracks which tabs are open and which is active. Marks unsaved tabs with a dot `●`.

3. **`IDEEditor.jsx`** — The Monaco editor instance. Receives `file` prop, renders content, calls `onChange` on edit. Language is derived from the file extension (`.py → python`, `.js → javascript`, `.java → java`, `.cpp → cpp`).

4. **`IDEOutputPanel.jsx`** — Same output panel from the current implementation, extracted into its own component.

5. **`IDEPage.jsx`** — The top-level page that orchestrates state: file list, open tabs, active file, execution state.

**State management in `IDEPage`:**
```
files[]          ← fetched from /api/ide-files?projectId=
openTabs[]       ← [{ fileId, path, content, isDirty }]
activeTabId      ← UUID of the currently visible tab
executionState   ← { running, executionId, pollStatus, result }
```

Key behaviours:
- Opening a file fetches its content (lazy load) and adds it to `openTabs`
- Editing marks the tab as `isDirty` (the dot)
- `Ctrl+S` / Save button PUTs the content to `/api/ide-files/{id}`
- Auto-save on a 2s debounce (optional, easy to add)
- Run button uses the active tab's `fileId` and language
- The Monaco editor gets a separate model per file (use `monaco.editor.createModel` keyed by file path) so switching tabs preserves cursor position/undo history

**New API client file** `frontend/src/api/ideFilesApi.js`:
```js
getFiles(projectId)       → GET /api/ide-files?projectId=
getFile(id)               → GET /api/ide-files/{id}
createFile(data)          → POST /api/ide-files
updateFile(id, data)      → PUT /api/ide-files/{id}
deleteFile(id)            → DELETE /api/ide-files/{id}
```

---

### Phase 3 — Multi-file Execution

Update `SubmitRequest` to accept `fileId` alongside the existing `sourceCode`. When `fileId` is present:
1. Backend fetches the file + all sibling files in the same project
2. Writes all of them into the sandbox workspace (preserving relative paths)
3. Entry point is still determined by language (the selected file)

This is a backend-only change — frontend just passes the `fileId` instead of raw source code.

---

### Phase 4 — Quality-of-life Features

These are optional but complete the IDE feel:

- **Folder support**: Add `is_folder` boolean to `ide_files`. The file explorer renders folders as collapsible nodes. Folders have no content.
- **Rename in-place**: Double-click a filename in the explorer to rename it inline
- **Keyboard shortcuts**: `Ctrl+S` saves, `Ctrl+W` closes tab — Monaco has a `addCommand` API for this
- **Language detection**: Auto-detect `language` from file extension on create (mapping table in frontend)
- **New file dialog**: Small modal asking for filename — validate no duplicate paths
- **Unsaved-changes guard**: Warn before closing a tab or navigating away if `isDirty`

---

### What doesn't need to change

The entire backend execution pipeline is untouched: `DockerSandbox`, `ExecutionQueueWorker`, `ExecutionService`, the queue, the polling API — all stays the same. You're only adding a file storage layer and a new frontend layout.

---

### Effort estimate

| Phase | Backend work | Frontend work |
|---|---|---|
| Phase 1 (file storage) | ~4 hours | ~1 hour (API client) |
| Phase 2 (IDE shell) | None | ~6-8 hours |
| Phase 3 (multi-file run) | ~2 hours | ~1 hour |
| Phase 4 (QoL) | ~1 hour | ~3-4 hours |

Total realistic effort: **~2-3 focused days** for a polished result.

Want me to start implementing? I'd suggest beginning with Phase 1 (the migration + backend CRUD) since everything else depends on it.
import { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { taskApi }    from '../../api/taskApi';
import { projectApi } from '../../api/projectApi';
import { useWebSocket } from '../../context/WebSocketContext';
import { subscribe }  from '../../services/websocketService';
import { Button }     from '../../components/common/Button';
import { Modal }      from '../../components/common/Modal';
import { Input }      from '../../components/common/Input';
import { Select }     from '../../components/common/Select';
import { Skeleton }   from '../../components/common/Skeleton';
import { TaskCard }   from './TaskCard';
import { TaskContextMenu }  from './TaskContextMenu';
import { TaskDetailModal }  from './TaskDetailModal';
import toast from 'react-hot-toast';
import plusIcon from '../../assets/20_plus.svg';

// Column definitions — top-border accent drives visual identity
const COLUMNS = [
  { id: 'BACKLOG',     title: 'Backlog',     topBorder: 'border-t-gray-400 dark:border-t-gray-500',   badge: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]' },
  { id: 'TODO',        title: 'To Do',       topBorder: 'border-t-gray-400 dark:border-t-gray-500',   badge: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]' },
  { id: 'IN_PROGRESS', title: 'In Progress', topBorder: 'border-t-amber-400 dark:border-t-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
  { id: 'DONE',        title: 'Done',        topBorder: 'border-t-green-500 dark:border-t-green-400', badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
];

const normalizeStatusKey = (value) => {
  const key = (value || '').trim().replace(/\s+/g, '_').toUpperCase();
  return key === 'TO_DO' ? 'TODO' : key;
};

const EMPTY_TASK = { title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' };

// ── KanbanColumn — defined outside TasksPage to keep a stable component identity
const KanbanColumn = ({
  col,
  columnTasks,
  visible = true,
  isAdminOrOwner,
  deletingTaskId,
  onAddClick,
  onDelete,
  onEdit,
  onContextMenu,
  onOpenDetail,
}) => (
  <div
    className={`flex flex-col ${visible ? '' : 'hidden lg:flex'} bg-[var(--surface-sunken)] border border-[var(--border-subtle)] border-t-2 ${col.topBorder} rounded-lg min-w-[240px] lg:min-w-0 w-[240px] lg:w-auto`}
  >
    {/* Column header */}
    <div className="flex items-center justify-between px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{col.title}</span>
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${col.badge}`}>
          {columnTasks.length}
        </span>
      </div>
      {isAdminOrOwner && (
        <button
          onClick={() => onAddClick(col.id)}
          title={`Add task to ${col.title}`}
          className="p-1 rounded hover:bg-[var(--border-subtle)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label={`Add task to ${col.title}`}
        >
          <img src={plusIcon} alt="" className="w-3.5 h-3.5 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
        </button>
      )}
    </div>

    {/* Task list */}
    <div className="flex-1 space-y-2 px-3 pb-3 min-h-[64px] rounded-b-lg">
      {columnTasks.map((task) => (
        <TaskCard
          key={String(task.id)}
          task={task}
          isDeleting={deletingTaskId === task.id}
          isAdminOrOwner={isAdminOrOwner}
          onDelete={onDelete}
          onEdit={onEdit}
          onContextMenu={(x, y, t) => onContextMenu(x, y, t)}
          onOpenDetail={(t) => onOpenDetail(t)}
        />
      ))}
    </div>
  </div>
);

// ── Priority indicator dot — maps priority value → Tailwind bg color class
const PRIORITY_INDICATOR = {
  LOW:    'bg-[var(--status-neutral)]',
  MEDIUM: 'bg-amber-400',
  HIGH:   'bg-[var(--status-danger)]',
};

// ── Status indicator dot — maps status value → color class
const STATUS_INDICATOR = {
  BACKLOG:     'bg-[var(--status-neutral)]',
  TODO:        'bg-[var(--status-neutral)]',
  IN_PROGRESS: 'bg-amber-400',
  DONE:        'bg-[var(--status-success)]',
};

// ── TaskFormFields — defined at module scope so its identity is stable across
// re-renders of TasksPage. Defining it inside the parent component causes React
// to see a NEW component type on every render (because the const is recreated),
// which unmounts + remounts the subtree and drops focus after every keystroke.
const TaskFormFields = ({ data, setData, showStatus = false, members = [] }) => (
  <div className="space-y-4">
    <Input label="Title" value={data.title} onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))} required />
    <Input label="Description" value={data.description} onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))} />
    <div className="grid grid-cols-2 gap-3">
      {showStatus && (
        <Select
          label="Status"
          value={data.status}
          onChange={(e) => setData((p) => ({ ...p, status: e.target.value }))}
          indicator={STATUS_INDICATOR[data.status]}
        >
          {COLUMNS.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
        </Select>
      )}
      <Select
        label="Priority"
        value={data.priority}
        onChange={(e) => setData((p) => ({ ...p, priority: e.target.value }))}
        indicator={PRIORITY_INDICATOR[data.priority]}
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </Select>
      <Select
        label="Assignee"
        value={data.assigneeId}
        onChange={(e) => setData((p) => ({ ...p, assigneeId: e.target.value }))}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{m.displayName || m.email} ({m.role})</option>
        ))}
      </Select>
    </div>
    <Input label="Due Date (optional)" type="date" value={data.dueDate} onChange={(e) => setData((p) => ({ ...p, dueDate: e.target.value }))} />
  </div>
);

export const TasksPage = () => {
  const { id: projectId }       = useParams();
  const { project }             = useOutletContext();
  const { user: currentUser, isAdmin: isGlobalAdmin } = useAuth();

  const userProjectRole = project?.members?.find(
    (m) => m.userId === currentUser?.id || m.email === currentUser?.email
  )?.role ?? 'MEMBER';
  const isAdminOrOwner = userProjectRole === 'OWNER' || userProjectRole === 'ADMIN';

  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);

  // Mobile: which column tab is active
  const [mobileCol, setMobileCol] = useState('TODO');

  // Add modal
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('TODO');
  const [taskData,       setTaskData]       = useState(EMPTY_TASK);
  const [saving,         setSaving]         = useState(false);

  // Edit modal
  const [editingTask,  setEditingTask]  = useState(null);
  const [editTaskData, setEditTaskData] = useState(EMPTY_TASK);
  const [updating,     setUpdating]     = useState(false);

  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [columnIdMap,    setColumnIdMap]    = useState({});
  const [contextMenu,    setContextMenu]    = useState(null);
  const [detailTask,     setDetailTask]     = useState(null);

  const { connected } = useWebSocket();

  // ── Data loading ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [taskList, boards] = await Promise.all([
        projectApi.getTasks(projectId).catch(() => []),
        projectApi.getBoards(projectId).catch(() => []),
      ]);
      setTasks(taskList || []);
      if (boards?.length > 0) {
        const first = boards[0];
        const map = {};
        (first.columns || []).forEach((col) => {
          map[normalizeStatusKey(col.name)] = col.id || col.column_id;
        });
        if (Object.keys(map).length === 0 && taskList?.length > 0) {
          taskList.forEach((t) => {
            const key = normalizeStatusKey(t.status);
            if (key && !map[key]) map[key] = t.column_id || t.columnId;
          });
        }
        setColumnIdMap(map);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── WebSocket live updates ────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !projectId) return;
    const unsub = subscribe(`/topic/tasks/${projectId}`, (update) => {
      const action   = update?.action;
      const incoming = update?.task;
      if (!action) { fetchData(); return; }
      setTasks((prev) => {
        const getId = (t) => t?.id || t?.taskId || t?.task_id;
        switch (action) {
          case 'CREATED': {
            const id = getId(incoming);
            if (!id || prev.some((t) => getId(t) === id)) return prev;
            return [...prev, incoming];
          }
          case 'UPDATED': case 'STATUS_CHANGED': case 'MOVED': {
            const id = getId(incoming);
            if (!id) return prev;
            return prev.map((t) => getId(t) === id ? incoming : t);
          }
          case 'DELETED': {
            const id = update.task_id || update.taskId || getId(incoming);
            if (!id) return prev;
            return prev.filter((t) => getId(t) !== id);
          }
          default: return prev;
        }
      });
      if ((action === 'UPDATED' || action === 'STATUS_CHANGED') && incoming) {
        setDetailTask((prev) => prev?.id === incoming.id ? incoming : prev);
      }
      if (action === 'DELETED') {
        const id = update.task_id || update.taskId;
        setDetailTask((prev) => prev?.id === id ? null : prev);
      }
    });
    return () => unsub();
  }, [connected, projectId, fetchData]);

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = async (taskId, newStatus) => {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const updated = await taskApi.updateStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t));
    } catch (err) {
      const rawMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        '';
      const lower = rawMsg.toLowerCase();
      const userMsg =
        lower.includes('wip') || lower.includes('limit')
          ? 'Cannot move task: column WIP limit reached'
          : rawMsg || 'Failed to update status';
      toast.error(userMsg);
      setTasks(previous);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteTask = async (e, taskId) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeletingTaskId(taskId);
    try {
      await taskApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = async (task) => {
    try {
      const created = await taskApi.duplicate(task.id);
      const id = created?.id || created?.taskId || created?.task_id;
      setTasks((prev) => {
        if (id && prev.some((t) => (t.id || t.taskId || t.task_id) === id)) return prev;
        return [...prev, created];
      });
      toast.success('Task duplicated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate task');
    }
  };

  // ── Add task ──────────────────────────────────────────────────────────────
  const handleAddTask = async (e) => {
    e.preventDefault();
    const columnId = columnIdMap[selectedColumn];
    if (!columnId) { toast.error(`Column "${selectedColumn}" not found.`); return; }
    setSaving(true);
    try {
      const payload = {
        columnId,
        title:       taskData.title,
        description: taskData.description,
        status:      selectedColumn,
        priority:    taskData.priority,
        assigneeId:  taskData.assigneeId || null,
        ...(taskData.dueDate && { dueDate: taskData.dueDate }),
      };
      const created = await taskApi.create(payload);
      const id = created?.id || created?.taskId || created?.task_id;
      setTasks((prev) => {
        if (id && prev.some((t) => (t.id || t.taskId || t.task_id) === id)) return prev;
        return [...prev, created];
      });
      setShowAddModal(false);
      setTaskData(EMPTY_TASK);
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = (colId) => { setSelectedColumn(colId); setTaskData(EMPTY_TASK); setShowAddModal(true); };

  // ── Edit task ─────────────────────────────────────────────────────────────
  const openEditModal = (task) => {
    setEditingTask(task);
    setEditTaskData({
      title:       task.title || '',
      description: task.description || '',
      priority:    task.priority || 'MEDIUM',
      status:      task.status || 'TODO',
      assigneeId:  task.assignee_id || task.assigneeId || '',
      dueDate:     task.due_date || task.dueDate || '',
    });
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setUpdating(true);
    try {
      const targetColumn   = editTaskData.status || editingTask.status;
      const targetColumnId = columnIdMap[targetColumn] || editingTask.column_id || editingTask.columnId;
      const payload = {
        columnId:    targetColumnId,
        title:       editTaskData.title,
        description: editTaskData.description,
        status:      targetColumn,
        priority:    editTaskData.priority,
        assigneeId:  editTaskData.assigneeId || null,
        dueDate:     editTaskData.dueDate || null,
      };
      const updated = await taskApi.update(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated : t));
      setDetailTask((prev) => prev?.id === editingTask.id ? updated : prev);
      setEditingTask(null);
      toast.success('Task updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => <Skeleton.KanbanColumn key={col.id} />)}
      </div>
      <div className="lg:hidden">
        <Skeleton.KanbanColumn />
      </div>
    </div>
  );

  const assignableMembers = project?.members || [];

  const getColumnTasks = (colId) => {
    const seen = new Set();
    return tasks
      .filter((t) => {
        if (t.status !== colId) return false;
        const tid = t.id || t.taskId || t.task_id;
        if (!tid || seen.has(tid)) return false;
        seen.add(tid);
        return true;
      })
      .sort((a, b) => (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0));
  };

  // ── Column shared props ──────────────────────────────────────────────────
  const colCallbacks = {
    isAdminOrOwner,
    deletingTaskId,
    onAddClick:    openAddModal,
    onDelete:      handleDeleteTask,
    onEdit:        openEditModal,
    onContextMenu: (x, y, t) => setContextMenu({ x, y, task: t }),
    onOpenDetail:  (t) => setDetailTask(t),
  };

  return (
    <div className="flex flex-col space-y-4 overflow-y-auto flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Task Board</h2>
        {isGlobalAdmin && (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
            <span className="text-xs text-[var(--text-muted)]">{connected ? 'Live' : 'Offline'}</span>
          </div>
        )}
      </div>

      {/* Mobile: column tab switcher */}
      <div className="flex lg:hidden gap-1 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] p-0.5 rounded-md overflow-x-auto">
        {COLUMNS.map((col) => {
          const count = getColumnTasks(col.id).length;
          return (
            <button
              key={col.id}
              onClick={() => setMobileCol(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                mobileCol === col.id
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-pressed={mobileCol === col.id}
            >
              {col.title}
              <span className={`text-2xs px-1 py-0.5 rounded-full font-semibold ${col.badge}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Kanban board */}
      {/* Desktop: all 4 columns side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} columnTasks={getColumnTasks(col.id)} visible {...colCallbacks} />
        ))}
      </div>

      {/* Mobile: single column shown based on tab */}
      <div className="lg:hidden">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            columnTasks={getColumnTasks(col.id)}
            visible={mobileCol === col.id}
            {...colCallbacks}
          />
        ))}
      </div>

      {/* Task detail modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columns={COLUMNS}
          onClose={() => setDetailTask(null)}
          onEdit={isAdminOrOwner ? openEditModal : null}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          columns={COLUMNS}
          isAdminOrOwner={isAdminOrOwner}
          onMoveToColumn={(task, colId) => { handleStatusChange(task.id, colId); setContextMenu(null); }}
          onEdit={(task) => { openEditModal(task); setContextMenu(null); }}
          onDuplicate={(task) => { handleDuplicate(task); setContextMenu(null); }}
          onDelete={(taskId) => { handleDeleteTask(null, taskId); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Add task modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setTaskData(EMPTY_TASK); }}
        title={`Add Task — ${COLUMNS.find((c) => c.id === selectedColumn)?.title ?? selectedColumn}`}
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <TaskFormFields data={taskData} setData={setTaskData} members={assignableMembers} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => { setShowAddModal(false); setTaskData(EMPTY_TASK); }}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Task</Button>
          </div>
        </form>
      </Modal>

      {/* Edit task modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <TaskFormFields data={editTaskData} setData={setEditTaskData} showStatus members={assignableMembers} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button type="submit" loading={updating}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

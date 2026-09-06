import { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { taskApi } from '../../api/taskApi';
import { projectApi } from '../../api/projectApi';
import { useWebSocket } from '../../context/WebSocketContext';
import { subscribe } from '../../services/websocketService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { TaskCard } from './TaskCard';
import { TaskContextMenu } from './TaskContextMenu';
import { TaskDetailModal } from './TaskDetailModal';
import toast from 'react-hot-toast';

// ── Column definitions ─────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'BACKLOG',     title: 'Backlog',     bg: 'bg-gray-100 text-gray-800'    },
  { id: 'TODO',        title: 'To Do',       bg: 'bg-blue-100 text-blue-800'    },
  { id: 'IN_PROGRESS', title: 'In Progress', bg: 'bg-yellow-100 text-yellow-800' },
  { id: 'DONE',        title: 'Done',        bg: 'bg-green-100 text-green-800'  },
];

const normalizeStatusKey = (value) => {
  const key = (value || '').trim().replace(/\s+/g, '_').toUpperCase();
  return key === 'TO_DO' ? 'TODO' : key;
};

const EMPTY_TASK = { title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' };

// ── Component ──────────────────────────────────────────────────────────────
export const TasksPage = () => {
  const { id: projectId }       = useParams();
  const { project }             = useOutletContext();
  const { user: currentUser, isAdmin: isGlobalAdmin } = useAuth();

  // Derive project-level role (OWNER/ADMIN → can create/delete tasks)
  const userProjectRole = project?.members?.find(
    (m) => m.userId === currentUser?.id || m.email === currentUser?.email
  )?.role ?? 'MEMBER';
  const isAdminOrOwner = userProjectRole === 'OWNER' || userProjectRole === 'ADMIN';

  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Add-task modal
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('TODO');
  const [taskData,       setTaskData]       = useState(EMPTY_TASK);
  const [saving,         setSaving]         = useState(false);

  // Edit-task modal
  const [editingTask,    setEditingTask]    = useState(null);
  const [editTaskData,   setEditTaskData]   = useState(EMPTY_TASK);
  const [updating,       setUpdating]       = useState(false);

  // Per-card delete tracking
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // Board / column mapping
  const [columnIdMap, setColumnIdMap] = useState({});
  const [boardId,     setBoardId]     = useState(null);

  // Context menu  { x, y, task } | null
  const [contextMenu, setContextMenu] = useState(null);

  // Task detail modal  task | null
  const [detailTask, setDetailTask] = useState(null);

  const { connected } = useWebSocket();

  // ── Data loading ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [taskList, boards] = await Promise.all([
        projectApi.getTasks(projectId).catch(() => []),
        projectApi.getBoards(projectId).catch(() => []),
      ]);

      setTasks(taskList || []);

      if (boards && boards.length > 0) {
        const firstBoard = boards[0];
        setBoardId(firstBoard.id || firstBoard.board_id);
        const map = {};
        (firstBoard.columns || []).forEach((col) => {
          map[normalizeStatusKey(col.name)] = col.id || col.column_id;
        });
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

  // ── WebSocket live updates ─────────────────────────────────────────────
  useEffect(() => {
    if (connected && projectId) {
      const unsub = subscribe(`/topic/tasks/${projectId}`, (updated) => {
        if (Array.isArray(updated)) setTasks(updated);
        else fetchData();
      });
      return () => unsub();
    }
  }, [connected, projectId, fetchData]);

  // ── Drag & drop ────────────────────────────────────────────────────────
  const onDragStart = () => setIsDragging(true);

  const onDragEnd = async (result) => {
    setIsDragging(false);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destColId = columnIdMap[destination.droppableId];
    if (!boardId || !destColId) {
      toast.error('Task board is still loading. Please try again.');
      return;
    }

    const previousTasks = tasks;
    const byStatus = COLUMNS.reduce((acc, col) => {
      acc[col.id] = tasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0));
      return acc;
    }, {});

    const srcList  = [...byStatus[source.droppableId]];
    const dstList  = source.droppableId === destination.droppableId
      ? srcList
      : [...byStatus[destination.droppableId]];

    const si = srcList.findIndex((t) => t.id === draggableId);
    if (si === -1) return;

    const [moved] = srcList.splice(si, 1);
    const updMoved = { ...moved, status: destination.droppableId, columnId: destColId, column_id: destColId };

    if (source.droppableId === destination.droppableId) {
      srcList.splice(destination.index, 0, updMoved);
      byStatus[source.droppableId] = srcList;
    } else {
      dstList.splice(destination.index, 0, updMoved);
      byStatus[source.droppableId]      = srcList;
      byStatus[destination.droppableId] = dstList;
    }

    const reordered = COLUMNS.flatMap((col) =>
      byStatus[col.id].map((t, idx) => ({ ...t, sortOrder: idx, sort_order: idx }))
    );
    setTasks(reordered);

    try {
      await taskApi.reorder(projectId, boardId, reordered.map((t) => ({
        id: t.id,
        columnId: t.columnId || t.column_id,
        sortOrder: t.sortOrder ?? t.sort_order ?? 0,
      })));
      toast.success('Task board updated');
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      toast.error('Failed to save task move. Rolling back…');
      setTasks(previousTasks);
    }
  };

  // ── Status change ──────────────────────────────────────────────────────
  const handleStatusChange = async (taskId, newStatus) => {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const updated = await taskApi.updateStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t));
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update status';
      toast.error(msg);
      setTasks(previous);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteTask = async (e, taskId) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeletingTaskId(taskId);
    try {
      await taskApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete task';
      toast.error(msg);
    } finally {
      setDeletingTaskId(null);
    }
  };

  // ── Duplicate ──────────────────────────────────────────────────────────
  const handleDuplicate = async (task) => {
    try {
      const created = await taskApi.duplicate(task.id);
      setTasks((prev) => [...prev, created]);
      toast.success('Task duplicated');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to duplicate task';
      toast.error(msg);
    }
  };

  // ── Add task ───────────────────────────────────────────────────────────
  const handleAddTask = async (e) => {
    e.preventDefault();
    const columnId = columnIdMap[selectedColumn];
    if (!columnId) {
      toast.error(`No column found for "${selectedColumn}". Please set up the project board first.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        columnId,
        title:       taskData.title,
        description: taskData.description,
        status:      selectedColumn,
        priority:    taskData.priority,
        assigneeId:  taskData.assigneeId || null,
        ...(taskData.dueDate && { dueDate: taskData.dueDate }),    // nullable
      };
      const created = await taskApi.create(payload);
      setTasks((prev) => [...prev, created]);
      setShowAddModal(false);
      setTaskData(EMPTY_TASK);
      toast.success('Task created successfully');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create task';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = (colId) => {
    setSelectedColumn(colId);
    setTaskData(EMPTY_TASK);
    setShowAddModal(true);
  };

  // ── Edit task ──────────────────────────────────────────────────────────
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
      const targetColumn = editTaskData.status || editingTask.status;
      const targetColumnId = columnIdMap[targetColumn] || editingTask.column_id || editingTask.columnId;
      const payload = {
        columnId:    targetColumnId,
        title:       editTaskData.title,
        description: editTaskData.description,
        status:      targetColumn,
        priority:    editTaskData.priority,
        assigneeId:  editTaskData.assigneeId || null,
        ...(editTaskData.dueDate ? { dueDate: editTaskData.dueDate } : { dueDate: null }),
      };
      const updated = await taskApi.update(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      // If the detail modal is also open for this task, update it too
      setDetailTask((prev) => (prev && prev.id === editingTask.id ? updated : prev));
      setEditingTask(null);
      toast.success('Task updated successfully');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update task';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  // ── Context menu ───────────────────────────────────────────────────────
  const handleOpenContextMenu  = (x, y, task) => setContextMenu({ x, y, task });
  const handleCloseContextMenu = () => setContextMenu(null);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <Spinner size="lg" className="mt-20" />;

  // All project members are assignable, including the current user
  const assignableMembers = project?.members || [];

  return (
    <div className="space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Task Board</h2>
        <div className="flex items-center space-x-2">
          {isGlobalAdmin && (
            <>
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-500">{connected ? 'Live updates enabled' : 'Offline Mode'}</span>
            </>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0));

            return (
              <div key={col.id} className="bg-gray-50 p-4 rounded-lg flex flex-col min-w-[250px]">
                {/* Column header */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${col.bg}`}>
                    {col.title} ({columnTasks.length})
                  </span>
                  {/* Only admins/owners see the + button */}
                  {isAdminOrOwner && (
                    <button
                      onClick={() => openAddModal(col.id)}
                      className="text-gray-500 hover:text-indigo-600 font-bold text-lg leading-none"
                      title={`Add task to ${col.title}`}
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 space-y-3 overflow-y-auto min-h-[32px]"
                    >
                      {columnTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="group"
                            >
                              <TaskCard
                                task={task}
                                isDeleting={deletingTaskId === task.id}
                                isAdminOrOwner={isAdminOrOwner}
                                onDelete={handleDeleteTask}
                                onEdit={openEditModal}
                                onContextMenu={handleOpenContextMenu}
                                onOpenDetail={(t) => setDetailTask(t)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task detail modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columns={COLUMNS}
          onClose={() => setDetailTask(null)}
          onEdit={isAdminOrOwner ? openEditModal : null}
        />
      )}

      {/* Context menu — portal, so it's never clipped by DragDropContext */}
      {contextMenu && (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          columns={COLUMNS}
          isAdminOrOwner={isAdminOrOwner}
          onMoveToColumn={(task, colId) => {
            handleStatusChange(task.id, colId);
            handleCloseContextMenu();
          }}
          onEdit={(task) => {
            openEditModal(task);
            handleCloseContextMenu();
          }}
          onDuplicate={(task) => {
            handleDuplicate(task);
            handleCloseContextMenu();
          }}
          onDelete={(taskId) => {
            handleDeleteTask(null, taskId);
            handleCloseContextMenu();
          }}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Add-task modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setTaskData(EMPTY_TASK); }}
        title={`Add Task — ${COLUMNS.find((c) => c.id === selectedColumn)?.title ?? selectedColumn}`}
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <Input
            label="Task Title"
            value={taskData.title}
            onChange={(e) => setTaskData((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <Input
            label="Description"
            value={taskData.description}
            onChange={(e) => setTaskData((p) => ({ ...p, description: e.target.value }))}
          />
          <Select
            label="Priority"
            value={taskData.priority}
            onChange={(e) => setTaskData((p) => ({ ...p, priority: e.target.value }))}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>

          {/* Assigned To */}
          <Select
            label="Assign To"
            value={taskData.assigneeId}
            onChange={(e) => setTaskData((p) => ({ ...p, assigneeId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {assignableMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName || m.email} ({m.role})
              </option>
            ))}
          </Select>

          {/* Due Date */}
          <Input
            label="Due Date (optional)"
            type="date"
            value={taskData.dueDate}
            onChange={(e) => setTaskData((p) => ({ ...p, dueDate: e.target.value }))}
          />

          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => { setShowAddModal(false); setTaskData(EMPTY_TASK); }}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit-task modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <Input
            label="Task Title"
            value={editTaskData.title}
            onChange={(e) => setEditTaskData((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <Input
            label="Description"
            value={editTaskData.description}
            onChange={(e) => setEditTaskData((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={editTaskData.status}
              onChange={(e) => setEditTaskData((p) => ({ ...p, status: e.target.value }))}
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </Select>

            <Select
              label="Priority"
              value={editTaskData.priority}
              onChange={(e) => setEditTaskData((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>

          {/* Assigned To */}
          <Select
            label="Assign To"
            value={editTaskData.assigneeId}
            onChange={(e) => setEditTaskData((p) => ({ ...p, assigneeId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {assignableMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName || m.email} ({m.role})
              </option>
            ))}
          </Select>

          {/* Due Date */}
          <Input
            label="Due Date (optional)"
            type="date"
            value={editTaskData.dueDate}
            onChange={(e) => setEditTaskData((p) => ({ ...p, dueDate: e.target.value }))}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={updating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

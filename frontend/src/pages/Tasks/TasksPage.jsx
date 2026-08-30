import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { projectApi } from '../../api/projectApi';
import { taskApi } from '../../api/taskApi';
import { useWebSocket } from '../../context/WebSocketContext';
import { subscribe } from '../../services/websocketService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { ProjectHeaderNav } from '../../components/layout/ProjectHeaderNav';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog', bg: 'bg-gray-100 text-gray-800' },
  { id: 'TODO', title: 'To Do', bg: 'bg-blue-100 text-blue-800' },
  { id: 'IN_PROGRESS', title: 'In Progress', bg: 'bg-yellow-100 text-yellow-800' },
  { id: 'DONE', title: 'Done', bg: 'bg-green-100 text-green-800' },
];

export const TasksPage = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('TODO');
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'MEDIUM' });
  const [saving, setSaving] = useState(false);
  const { connected } = useWebSocket();

  // Load initial tasks and project details
  const fetchData = async () => {
    try {
      const [projectData, taskList] = await Promise.all([
        projectApi.getById(projectId).catch(() => null),
        projectApi.getTasks(projectId).catch(() => [])
      ]);
      setProject(projectData);
      setTasks(taskList || []);
    } catch (err) {
      console.error('Failed to load project/tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Subscribe to WebSocket live updates
  useEffect(() => {
    if (connected && projectId) {
      const unsubscribe = subscribe(`/topic/tasks/${projectId}`, (updatedTasks) => {
        if (Array.isArray(updatedTasks)) {
          setTasks(updatedTasks);
        } else {
          // If a single task event is broadcasted, re-fetch
          fetchTasks();
        }
      });
      return () => unsubscribe();
    }
  }, [connected, projectId]);

  // Handle Drag & Drop status updates
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the task we are updating
    const updatedTask = tasks.find((t) => t.id === draggableId);
    if (!updatedTask) return;

    const oldStatus = updatedTask.status;
    const newStatus = destination.droppableId;

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    try {
      await taskApi.updateStatus(draggableId, newStatus);
      toast.success(`Task status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error('Failed to save task move. Rolling back...');
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === draggableId ? { ...t, status: oldStatus } : t))
      );
    }
  };

  // Add new task
  const handleAddTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await taskApi.create({
        projectId,
        title: taskData.title,
        description: taskData.description,
        status: selectedColumn,
        priority: taskData.priority,
      });

      setTasks((prev) => [...prev, created]);
      setShowAddModal(false);
      setTaskData({ title: '', description: '', priority: 'MEDIUM' });
      toast.success('Task created successfully');
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-8rem)]">
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project?.name}
        projectDescription={project?.description}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Task Board</h2>
        <div className="flex items-center space-x-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">{connected ? 'Live updates enabled' : 'Offline Mode'}</span>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="bg-gray-50 p-4 rounded-lg flex flex-col min-w-[250px]">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${col.bg}`}>
                    {col.title} ({columnTasks.length})
                  </span>
                  <button
                    onClick={() => {
                      setSelectedColumn(col.id);
                      setShowAddModal(true);
                    }}
                    className="text-gray-500 hover:text-indigo-600 font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 space-y-3 overflow-y-auto min-h-[150px]"
                    >
                      {columnTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(providedDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                            >
                              <Card className="hover:shadow cursor-grab active:cursor-grabbing p-3 space-y-2 bg-white">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{task.title}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                              </Card>
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`Add Task - ${selectedColumn}`}>
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
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

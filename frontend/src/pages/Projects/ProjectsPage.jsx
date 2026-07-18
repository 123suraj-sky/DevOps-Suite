import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { formatDate } from '../../utils/formatters';

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await projectApi.getAll();
      setProjects(data.content);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const project = await projectApi.create(newProject);
      setProjects((prev) => [project, ...prev]);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setShowCreateModal(true)}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">No projects yet. Create your first project!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-400">{formatDate(project.createdAt)}</span>
                  <span className="text-xs text-gray-500">{project.members.length} members</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project Name" value={newProject.name} onChange={(e) => setNewProject((prev) => ({ ...prev, name: e.target.value }))} required />
          <Input label="Description" value={newProject.description} onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))} />
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

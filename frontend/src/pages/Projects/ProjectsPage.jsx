import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../../api';
import { useProjects } from '../../context/ProjectsContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { Skeleton } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/formatters';
import folderIcon  from '../../assets/08_folder.svg';
import plusIcon    from '../../assets/20_plus.svg';
import arrowRight  from '../../assets/24_arrow_right.svg';

export const ProjectsPage = () => {
  const { refresh: refreshSidebar } = useProjects();
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');

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

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const project = await projectApi.create(newProject);
      setProjects((prev) => [project, ...prev]);
      refreshSidebar();
      setShowModal(false);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="border-b border-[var(--border-subtle)] last:border-0 px-5 py-4">
            <Skeleton.Row />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Projects</h1>
          {projects.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <img src={plusIcon} alt="" className="w-4 h-4" aria-hidden="true" />
          New Project
        </Button>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
            <img src={folderIcon} alt="" className="w-7 h-7 dark:brightness-0 dark:invert opacity-40" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No projects yet</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
            Create your first project to start managing tasks, running code, and streaming logs.
          </p>
          <Button variant="primary" onClick={() => setShowModal(true)} className="mt-5">
            <img src={plusIcon} alt="" className="w-4 h-4" aria-hidden="true" />
            Create project
          </Button>
        </div>
      ) : (
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <ul role="list" className="divide-y divide-[var(--border-subtle)]">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-sunken)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                      <img src={folderIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-50" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="hidden sm:block text-xs text-[var(--text-muted)]">
                      {project.members?.length ?? 0} member{(project.members?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="hidden md:block text-xs text-[var(--text-muted)]">
                      {formatDate(project.createdAt)}
                    </span>
                    <img src={arrowRight} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-30 group-hover:opacity-60 transition-opacity" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setCreateError(''); }} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {createError}
            </div>
          )}
          <Input
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
            placeholder="My awesome project"
            required
          />
          <Input
            label="Description"
            value={newProject.description}
            onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => { setShowModal(false); setCreateError(''); }}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

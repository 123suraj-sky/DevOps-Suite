import { useState, useEffect } from 'react';
import { useParams, useLocation, Outlet } from 'react-router-dom';
import { projectApi } from '../../api/projectApi';
import { ProjectHeaderNav } from './ProjectHeaderNav';
import { Spinner } from '../common/Spinner';

/**
 * Persistent layout wrapper for all project sub-routes.
 *
 * Two rendering modes:
 *  - Normal pages (Overview, Task Board, Logs): padded scrollable container
 *  - IDE page (/code): full-height flex container, no padding, no scroll
 *    so the IDE can fill the entire viewport below the header.
 */
export const ProjectLayout = () => {
  const { id: projectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const isIDE = location.pathname.endsWith('/code');

  const fetchProject = async () => {
    try {
      const data = await projectApi.getById(projectId);
      setProject(data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isIDE) {
    // Full-height layout: header nav + IDE fills remaining space, no scroll
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full">
        <div className="px-4 lg:px-6 pt-4 lg:pt-4 pb-0 shrink-0 bg-gray-50">
          <ProjectHeaderNav
            projectId={projectId}
            projectName={project?.name}
            projectDescription={project?.description}
          />
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 lg:p-6 pt-4">
          <Outlet context={{ project, refreshProject: fetchProject }} />
        </div>
      </div>
    );
  }

  // Normal scrollable layout for all other project sub-pages
  return (
    <div className="space-y-6">
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project?.name}
        projectDescription={project?.description}
      />
      <Outlet context={{ project, refreshProject: fetchProject }} />
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useParams, useLocation, Outlet } from 'react-router-dom';
import { projectApi } from '../../api/projectApi';
import { ProjectHeaderNav } from './ProjectHeaderNav';
import { Spinner } from '../common/Spinner';

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
    // IDE layout: ProjectHeaderNav at top, then the IDE panel fills all remaining
    // height with equal padding on all four sides — no page scroll.
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <ProjectHeaderNav
          projectId={projectId}
          projectName={project?.name}
          projectDescription={project?.description}
        />
        {/* p-4/p-6 gives equal spacing on all sides around the IDE panel.
            flex-1 min-h-0 ensures the container stretches to fill available
            height without triggering a scrollbar. */}
        <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden">
          <div className="h-full">
            <Outlet context={{ project, refreshProject: fetchProject }} />
          </div>
        </div>
      </div>
    );
  }

  // Normal scrollable layout for Overview, Task Board, Logs
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project?.name}
        projectDescription={project?.description}
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        <Outlet context={{ project, refreshProject: fetchProject }} />
      </div>
    </div>
  );
};

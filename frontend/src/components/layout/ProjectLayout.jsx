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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project?.name}
        projectDescription={project?.description}
      />
      <div className={`flex-1 ${isIDE ? 'min-h-0 overflow-hidden' : 'overflow-y-auto'} p-4 lg:p-6 space-y-5 flex flex-col`}>
        <Outlet context={{ project, refreshProject: fetchProject }} />
      </div>
    </div>
  );
};

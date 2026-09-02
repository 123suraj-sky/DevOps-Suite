import { useState, useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { projectApi } from '../../api/projectApi';
import { ProjectHeaderNav } from './ProjectHeaderNav';
import { Spinner } from '../common/Spinner';

/**
 * Persistent layout wrapper for all project sub-routes.
 * Fetches the project once and keeps ProjectHeaderNav mounted across
 * tab switches (Overview / Task Board / Code Editor / Logs).
 * Child pages receive { project, refreshProject } via Outlet context.
 */
export const ProjectLayout = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-6">
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project?.name}
        projectDescription={project?.description}
      />

      {/* Tab content — child routes render here */}
      <Outlet context={{ project, refreshProject: fetchProject }} />
    </div>
  );
};

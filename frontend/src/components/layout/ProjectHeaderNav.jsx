import { Link, useLocation } from 'react-router-dom';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

export const ProjectHeaderNav = ({ projectId, projectName, projectDescription }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isOverview = location.pathname === `/projects/${projectId}`;
  const isTasks = location.pathname === `/projects/${projectId}/tasks`;
  const isCode = location.pathname === `/projects/${projectId}/code`;
  const isLogs = location.pathname === `/projects/${projectId}/logs`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${projectId}`}
              className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
            >
              {projectName || 'Project'}
            </Link>
          </div>
          {projectDescription && (
            <p className="text-sm text-gray-500 mt-1">{projectDescription}</p>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Link to={`/projects/${projectId}`} className="inline-flex">
            <Button variant={isOverview ? 'primary' : 'ghost'} size="sm">
              Overview
            </Button>
          </Link>
          <Link to={`/projects/${projectId}/tasks`} className="inline-flex">
            <Button variant={isTasks ? 'primary' : 'ghost'} size="sm">
              Task Board
            </Button>
          </Link>
          <Link to={`/projects/${projectId}/code`} className="inline-flex">
            <Button variant={isCode ? 'primary' : 'ghost'} size="sm">
              Code Editor
            </Button>
          </Link>
          {isAdmin && (
            <Link to={`/projects/${projectId}/logs`} className="inline-flex">
              <Button variant={isLogs ? 'primary' : 'ghost'} size="sm">
                Logs
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

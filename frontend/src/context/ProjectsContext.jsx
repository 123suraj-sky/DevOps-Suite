import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { projectApi } from '../api/projectApi';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext(undefined);

/**
 * ProjectsProvider
 *
 * Fetches the full project list once on mount (after auth is ready) and caches
 * it for the lifetime of the session. Components that mutate projects (create,
 * delete, rename) should call `refresh()` so the sidebar stays in sync.
 *
 * Exposes:
 *   projects  — full list, sorted by updatedAt desc
 *   recent    — top 5 of that list (ready to render in sidebar)
 *   loading   — true while the first fetch is in flight
 *   refresh() — re-fetches the list from the API
 */
export function ProjectsProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      // Fetch a generous page — sidebar only needs the top 5 but we store all
      // so callers can use the full list if needed.
      const data = await projectApi.getAll(0, 100);
      const list = Array.isArray(data) ? data : (data?.content ?? []);

      // Sort by updatedAt descending (most recently active first)
      list.sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.updated_at ?? a.createdAt ?? a.created_at ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.updated_at ?? b.createdAt ?? b.created_at ?? 0).getTime();
        return tb - ta;
      });

      setProjects(list);
    } catch (err) {
      console.error('ProjectsContext: failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once auth is ready
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchProjects();
    } else if (!authLoading && !isAuthenticated) {
      setProjects([]);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchProjects]);

  const recent = projects.slice(0, 5);
  const hasMore = projects.length > 5;

  const value = {
    projects,
    recent,
    hasMore,
    loading,
    refresh: fetchProjects,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (ctx === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return ctx;
}

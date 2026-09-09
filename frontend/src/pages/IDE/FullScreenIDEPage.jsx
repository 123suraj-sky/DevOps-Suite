import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { projectApi } from '../../api/projectApi';
import { IDEPage } from './IDEPage';

/**
 * FullScreenIDEPage
 *
 * Renders the IDE without the main sidebar/navbar, filling the entire viewport.
 * Opened via window.open('/editor?project=<projectId>', '_blank') from the
 * "Open in full screen" toolbar button in IDEPage.
 *
 * No chrome bar — the user closes the tab normally via the browser.
 *
 * Query params:
 *   project — the projectId to load (required)
 */
export function FullScreenIDEPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  // Fetch the project so we can pass the real name down to IDEPage / FileExplorer
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    projectApi.getById(projectId)
      .then(setProject)
      .catch((err) => console.error('FullScreenIDEPage: failed to load project', err));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-[#858585] text-sm">
        No project specified. Please open this page via the IDE toolbar.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] overflow-hidden">
      <IDEPage
        projectIdOverride={projectId}
        projectOverride={project}
        isFullScreen
      />
    </div>
  );
}

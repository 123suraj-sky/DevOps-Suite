import apiClient from './client';

const normaliseFile = (file) => {
  if (!file) return file;

  return {
    ...file,
    projectId: file.projectId ?? file.project_id,
    userId: file.userId ?? file.user_id,
    isFolder: file.isFolder ?? file.is_folder ?? false,
    createdAt: file.createdAt ?? file.created_at,
    updatedAt: file.updatedAt ?? file.updated_at,
  };
};

/**
 * API client for the IDE file system (/api/ide/files).
 *
 * All methods return the inner `data` payload from the API envelope
 * { status, message, data }.
 */
export const ideFilesApi = {
  /**
   * GET /api/ide/files?projectId=
   * Returns a flat list of FileListItem objects (no content).
   * The IDE page builds the tree from path strings.
   */
  listFiles: async (projectId) => {
    const res = await apiClient.get('/ide/files', { params: { projectId } });
    return (res.data.data ?? []).map(normaliseFile);
  },

  /**
   * GET /api/ide/files/{id}
   * Returns a single FileDetail including full content.
   */
  getFile: async (fileId) => {
    const res = await apiClient.get(`/ide/files/${fileId}`);
    return normaliseFile(res.data.data);
  },

  /**
   * POST /api/ide/files
   * Creates a new file or folder.
   * @param {{ projectId: string, path: string, content?: string, language?: string, isFolder?: boolean }} data
   */
  createFile: async (data) => {
    const res = await apiClient.post('/ide/files', {
      project_id: data.projectId,
      path:       data.path,
      content:    data.content    ?? '',
      language:   data.language   ?? null,
      is_folder:  data.isFolder   ?? false,
    });
    return normaliseFile(res.data.data);
  },

  /**
   * PUT /api/ide/files/{id}
   * Updates content and/or renames/moves the file.
   * @param {string} fileId
   * @param {{ content?: string, path?: string, language?: string }} data
   */
  updateFile: async (fileId, data) => {
    const res = await apiClient.put(`/ide/files/${fileId}`, data);
    return res.data.data;
  },

  /**
   * DELETE /api/ide/files/{id}
   * Deletes a file. Folders cascade-delete all children.
   */
  deleteFile: async (fileId) => {
    const res = await apiClient.delete(`/ide/files/${fileId}`);
    return res.data;
  },
};

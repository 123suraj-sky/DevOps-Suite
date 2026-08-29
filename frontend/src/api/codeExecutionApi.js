import apiClient from './client';

export const codeExecutionApi = {
  /**
   * POST /api/code-execution/run
   * Submits source code for sandboxed execution.
   * Returns { executionId, status: "QUEUED" }
   */
  execute: async (data) => {
    const response = await apiClient.post('/code-execution/run', {
      language:       data.language,
      source_code:    data.sourceCode,
      stdin:          data.stdin || '',
      max_time_ms:    data.maxTimeMs,
      max_memory_mb:  data.maxMemoryMb,
    });
    return response.data.data;
  },

  /**
   * GET /api/code-execution/{id}
   * Polls for execution status and result.
   */
  getStatus: async (id) => {
    const response = await apiClient.get(`/code-execution/${id}`);
    return response.data.data;
  },

  /**
   * GET /api/code-execution/history?page=&size=
   * Returns the current user's paginated execution history.
   */
  getHistory: async (page = 0, size = 20) => {
    const response = await apiClient.get('/code-execution/history', {
      params: { page, size },
    });
    return response.data.data;
  },
};

import apiClient from './client';

export const codeExecutionApi = {
  /**
   * POST /api/code-execution/run
   * Submits source code for sandboxed execution.
   *
   * Classic mode: pass { language, sourceCode, stdin, maxTimeMs, maxMemoryMb }
   * IDE mode:     pass { file_id, language?, stdin, maxTimeMs, maxMemoryMb }
   *
   * Returns { execution_id, status: "QUEUED" }
   */
  execute: async (data) => {
    const body = {
      language:      data.language     ?? undefined,
      stdin:         data.stdin        || '',
      max_time_ms:   data.maxTimeMs,
      max_memory_mb: data.maxMemoryMb,
    };

    // IDE mode — file_id takes precedence over inline source_code
    if (data.file_id) {
      body.file_id = data.file_id;
    } else {
      body.source_code = data.sourceCode;
    }

    const response = await apiClient.post('/code-execution/run', body);
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

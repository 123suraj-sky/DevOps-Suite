import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codeExecutionApi } from '../../api/codeExecutionApi';
import toast from 'react-hot-toast';
import clockIcon from '../../assets/14_clock.svg';
import skullIcon from '../../assets/15_skull.svg';

// Terminal statuses — stop polling when reached
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'TIMEOUT', 'OOM_KILLED']);

// Maps status → display label + colour
const STATUS_CONFIG = {
  QUEUED:    { label: 'Queued',       color: 'text-yellow-400' },
  RUNNING:   { label: 'Running…',     color: 'text-blue-400 animate-pulse' },
  COMPLETED: { label: 'Completed',    color: 'text-green-400' },
  FAILED:    { label: 'Failed',       color: 'text-red-400' },
  TIMEOUT:   { label: 'Timed Out',    color: 'text-orange-400' },
  OOM_KILLED:{ label: 'Out of Memory',color: 'text-red-500' },
};

const DEFAULT_CODE = {
  python:     'print("Hello from DevOps Suite!")',
  javascript: 'console.log("Hello from DevOps Suite!");',
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from DevOps Suite!");
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from DevOps Suite!" << endl;
    return 0;
}`,
};

const MONACO_LANG = { python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp' };

export const CodeEditorPage = () => {
  const { id: projectId } = useParams();
  const [language, setLanguage]       = useState('python');
  const [sourceCode, setSourceCode]   = useState(DEFAULT_CODE.python);
  const [stdin, setStdin]             = useState('');
  const [running, setRunning]         = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [result, setResult]           = useState(null);
  const [pollStatus, setPollStatus]   = useState(null);

  // Update template when language changes
  useEffect(() => {
    setSourceCode(DEFAULT_CODE[language] || '');
  }, [language]);

  // Poll for job status every second
  useEffect(() => {
    if (!executionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await codeExecutionApi.getStatus(executionId);
        setPollStatus(res.status);

        if (TERMINAL_STATUSES.has(res.status)) {
          setResult(res);
          setRunning(false);
          setExecutionId(null);
          setPollStatus(null);
          clearInterval(interval);

          if (res.status === 'COMPLETED') {
            toast.success('Execution completed!');
          } else if (res.status === 'TIMEOUT') {
            toast.error('Execution timed out.');
          } else if (res.status === 'OOM_KILLED') {
            toast.error('Execution killed: out of memory.');
          } else {
            toast.error('Execution failed.');
          }
        }
      } catch (err) {
        console.error('Poll failed:', err);
        setRunning(false);
        setExecutionId(null);
        setPollStatus(null);
        clearInterval(interval);
        toast.error('Lost connection while polling for results.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [executionId]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResult(null);
    setPollStatus('QUEUED');
    try {
      const res = await codeExecutionApi.execute({
        language,
        sourceCode,
        stdin,
        maxTimeMs:   10000,
        maxMemoryMb: 256,
      });
      setExecutionId(res.execution_id);
      toast.success('Job queued — running in sandbox…');
    } catch (err) {
      console.error('Submit failed:', err);
      const msg = err.response?.data?.message || 'Failed to submit execution request.';
      toast.error(msg);
      setRunning(false);
      setPollStatus(null);
    }
  }, [language, sourceCode, stdin]);

  // ── Output panel rendering ────────────────────────────────────────────────────
  const renderOutput = () => {
    if (running && pollStatus) {
      const cfg = STATUS_CONFIG[pollStatus] || { label: pollStatus, color: 'text-gray-400' };
      return (
        <div className={`flex items-center gap-2 ${cfg.color}`}>
          <span className="inline-block w-2 h-2 rounded-full bg-current" />
          {cfg.label}
        </div>
      );
    }

    if (!result) {
      return <div className="text-gray-500">Run code to see stdout and stderr.</div>;
    }

    const statusCfg = STATUS_CONFIG[result.status] || { label: result.status, color: 'text-gray-400' };
    return (
      <div className="space-y-2">
        {/* Status badge */}
        <div className={`text-xs font-semibold uppercase tracking-wider ${statusCfg.color}`}>
          ● {statusCfg.label}
        </div>

        {/* Timeout / OOM banners */}
        {result.timed_out   && <div className="flex items-center gap-2 text-orange-400 font-bold"><img src={clockIcon} alt="Timed out" className="w-4 h-4 object-contain" /> Execution timed out.</div>}
        {result.oom_killed  && <div className="flex items-center gap-2 text-red-500 font-bold"><img src={skullIcon} alt="OOM killed" className="w-4 h-4 object-contain" /> Killed: out of memory.</div>}

        {/* stdout */}
        {result.stdout && (
          <div>
            <div className="text-gray-500 text-xs mb-1">stdout</div>
            <div className="text-green-400 whitespace-pre-wrap">{result.stdout}</div>
          </div>
        )}

        {/* stderr */}
        {result.stderr && (
          <div>
            <div className="text-gray-500 text-xs mb-1">stderr</div>
            <div className="text-red-400 whitespace-pre-wrap">{result.stderr}</div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-gray-500 border-t border-gray-800 pt-2 mt-2 text-xs">
          Exit code: <span className={result.exit_code === 0 ? 'text-green-400' : 'text-red-400'}>
            {result.exit_code ?? '—'}
          </span>
          {result.execution_time_ms != null && (
            <span className="ml-4">Time: {result.execution_time_ms} ms</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] space-y-4">
      {/* Control Panel */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900">Sandbox Code Runner</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={running}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="python">Python 3</option>
            <option value="javascript">Node.js (JavaScript)</option>
            <option value="java">Java 21</option>
            <option value="cpp">C++ (g++)</option>
          </select>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            running ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {running ? (STATUS_CONFIG[pollStatus]?.label || 'Running…') : 'Run Code ▶'}
        </button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Code</span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={MONACO_LANG[language] || 'plaintext'}
              value={sourceCode}
              onChange={(val) => setSourceCode(val || '')}
              theme="vs-light"
              options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-96 flex flex-col space-y-4">
          {/* Stdin */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col h-40">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Standard Input (stdin)
            </label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="flex-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none font-mono"
              placeholder="Provide stdin inputs here…"
            />
          </div>

          {/* Output Console */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Output Console
            </span>
            <div className="flex-1 bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-y-auto whitespace-pre-wrap">
              {renderOutput()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

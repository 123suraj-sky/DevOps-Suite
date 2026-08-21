import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codeExecutionApi } from '../../api/codeExecutionApi';
import toast from 'react-hot-toast';

export const CodeEditorPage = () => {
  const { id: projectId } = useParams();
  const [language, setLanguage] = useState('python');
  const [sourceCode, setSourceCode] = useState('print("Hello from DevOps Suite!")');
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [result, setResult] = useState(null);

  // Set default templates when language changes
  useEffect(() => {
    if (language === 'python') {
      setSourceCode('print("Hello from DevOps Suite!")');
    } else if (language === 'javascript') {
      setSourceCode('console.log("Hello from DevOps Suite!");');
    } else if (language === 'java') {
      setSourceCode(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from DevOps Suite!");
    }
}`);
    } else if (language === 'cpp') {
      setSourceCode(`#include <iostream>
using namespace std;

int main() {
    cout << "Hello from DevOps Suite!" << endl;
    return 0;
}`);
    }
  }, [language]);

  // Poll for job status
  useEffect(() => {
    let intervalId;
    if (executionId) {
      intervalId = setInterval(async () => {
        try {
          const res = await codeExecutionApi.getStatus(executionId);
          if (res.status === 'COMPLETED' || res.status === 'FAILED') {
            setResult(res);
            setRunning(false);
            setExecutionId(null);
            clearInterval(intervalId);
            toast.success('Execution completed!');
          }
        } catch (error) {
          console.error('Failed to query status:', error);
          setRunning(false);
          setExecutionId(null);
          clearInterval(intervalId);
          toast.error('Failed to get execution status');
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [executionId]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await codeExecutionApi.execute({
        language,
        sourceCode,
        stdin,
        maxTimeMs: 10000,
        maxMemoryMb: 256,
      });
      setExecutionId(res.executionId);
      toast.success('Job queued successfully');
    } catch (error) {
      console.error('Execution failed:', error);
      toast.error(error.response?.data?.message || 'Failed to submit execution request');
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Control Panel */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">Sandbox Code Runner</h1>
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
          {running ? 'Running...' : 'Run Code'}
        </button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Editor Box */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Code</span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'javascript' ? 'javascript' : 'python'}
              value={sourceCode}
              onChange={(value) => setSourceCode(value || '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Inputs/Output Sidebar */}
        <div className="w-96 flex flex-col space-y-4">
          {/* Stdin Panel */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col h-40">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Standard Input (stdin)</label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="flex-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none font-mono"
              placeholder="Provide stdin inputs here..."
            />
          </div>

          {/* Console / Output Panel */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Output Console</span>
            <div className="flex-1 bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-y-auto whitespace-pre-wrap">
              {running && <div className="text-yellow-400">Executing sandbox code...</div>}
              {result && (
                <div className="space-y-2">
                  {result.stdout && <div className="text-green-400">{result.stdout}</div>}
                  {result.stderr && <div className="text-red-400">{result.stderr}</div>}
                  {result.timedOut && <div className="text-red-500 font-bold">Execution timed out.</div>}
                  {result.oomKilled && <div className="text-red-500 font-bold">Execution terminated due to Out Of Memory.</div>}
                  <div className="text-gray-500 border-t border-gray-800 pt-2 mt-2">
                    Exit Code: {result.exitCode} | Time: {result.executionTimeMs}ms
                  </div>
                </div>
              )}
              {!running && !result && <div className="text-gray-500">Run code to see stdout and stderr.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

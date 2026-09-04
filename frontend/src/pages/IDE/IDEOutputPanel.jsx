/**
 * IDEOutputPanel — execution output console for the IDE.
 *
 * Props:
 *   running    — boolean: a job is in-flight
 *   pollStatus — string | null: live status while polling (QUEUED, RUNNING, …)
 *   result     — QueryResponse | null: terminal result from the sandbox
 *   stdin      — string: current stdin value
 *   onStdinChange — (value: string) => void
 */

import clockIcon from '../../assets/14_clock.svg';
import skullIcon from '../../assets/15_skull.svg';

const TERMINAL_STATUS_CONFIG = {
  QUEUED:    { label: 'Queued…',       colour: 'text-yellow-400' },
  RUNNING:   { label: 'Running…',      colour: 'text-blue-400 animate-pulse' },
  COMPLETED: { label: 'Completed',     colour: 'text-green-400' },
  FAILED:    { label: 'Failed',        colour: 'text-red-400' },
  TIMEOUT:   { label: 'Timed Out',     colour: 'text-orange-400' },
  OOM_KILLED:{ label: 'Out of Memory', colour: 'text-red-500' },
};

export function IDEOutputPanel({ running, pollStatus, result, stdin, onStdinChange }) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#3c3c3c]">

      {/* ── Stdin ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-b border-[#3c3c3c]" style={{ height: '120px' }}>
        <div className="px-3 py-1.5 flex items-center border-b border-[#3c3c3c]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
            stdin
          </span>
        </div>
        <textarea
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Provide stdin here…"
          className="flex-1 w-full bg-transparent text-[#d4d4d4] text-xs font-mono px-3 py-2
                     resize-none outline-none placeholder-[#555]"
          aria-label="standard input"
        />
      </div>

      {/* ── Output console ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-1.5 border-b border-[#3c3c3c] flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
            output
          </span>
          {/* Live status badge while running */}
          {running && pollStatus && (() => {
            const cfg = TERMINAL_STATUS_CONFIG[pollStatus] ?? { label: pollStatus, colour: 'text-gray-400' };
            return (
              <span className={`text-[10px] font-semibold flex items-center gap-1 ${cfg.colour}`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                {cfg.label}
              </span>
            );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-xs px-3 py-2 min-h-0">
          {!running && !result && (
            <span className="text-[#555]">Run a file to see output here.</span>
          )}

          {result && renderResult(result)}
        </div>
      </div>
    </div>
  );
}

function renderResult(result) {
  const cfg = TERMINAL_STATUS_CONFIG[result.status] ?? { label: result.status, colour: 'text-gray-400' };

  return (
    <div className="space-y-2">
      {/* Status badge */}
      <div className={`text-[10px] font-bold uppercase tracking-wider ${cfg.colour}`}>
        ● {cfg.label}
      </div>

      {/* Timeout / OOM banners */}
      {result.timed_out && (
        <div className="flex items-center gap-2 text-orange-400 font-semibold text-xs">
          <img src={clockIcon} alt="" className="w-4 h-4" aria-hidden="true" />
          Execution timed out.
        </div>
      )}
      {result.oom_killed && (
        <div className="flex items-center gap-2 text-red-500 font-semibold text-xs">
          <img src={skullIcon} alt="" className="w-4 h-4" aria-hidden="true" />
          Killed: out of memory.
        </div>
      )}

      {/* stdout */}
      {result.stdout && (
        <div>
          <div className="text-[#858585] text-[10px] mb-0.5 uppercase tracking-wider">stdout</div>
          <pre className="text-green-400 whitespace-pre-wrap break-words">{result.stdout}</pre>
        </div>
      )}

      {/* stderr */}
      {result.stderr && (
        <div>
          <div className="text-[#858585] text-[10px] mb-0.5 uppercase tracking-wider">stderr</div>
          <pre className="text-red-400 whitespace-pre-wrap break-words">{result.stderr}</pre>
        </div>
      )}

      {/* Metadata footer */}
      <div className="text-[#555] border-t border-[#3c3c3c] pt-2 mt-2 text-[10px] space-x-4">
        <span>
          Exit:{' '}
          <span className={result.exit_code === 0 ? 'text-green-400' : 'text-red-400'}>
            {result.exit_code ?? '—'}
          </span>
        </span>
        {result.execution_time_ms != null && (
          <span className="text-[#858585]">{result.execution_time_ms} ms</span>
        )}
      </div>
    </div>
  );
}

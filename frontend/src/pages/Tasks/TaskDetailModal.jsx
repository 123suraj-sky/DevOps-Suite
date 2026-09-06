import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { taskApi } from '../../api/taskApi';

/**
 * Task detail modal with full immutable audit-history timeline.
 *
 * Props:
 *   task     — task object from local state (all current fields + audit fields)
 *   columns  — COLUMNS constant [{ id, title, bg }]
 *   onClose  — close handler
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

const priorityVariant = (p) => {
  if (!p) return 'default';
  const u = p.toUpperCase();
  if (u === 'HIGH' || u === 'CRITICAL') return 'danger';
  if (u === 'MEDIUM') return 'warning';
  return 'info';
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const ACTION_META = {
  CREATED:        { label: 'Created',        color: 'bg-green-500',  icon: '✚' },
  UPDATED:        { label: 'Updated',        color: 'bg-blue-500',   icon: '✎' },
  STATUS_CHANGED: { label: 'Status changed', color: 'bg-yellow-500', icon: '↔' },
  DUPLICATED:     { label: 'Duplicated',     color: 'bg-purple-500', icon: '⎘' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const formatStatusName = (status, columns = []) => {
  if (!status) return '—';
  const col = columns.find((c) => c.id === status);
  if (col) return col.title;
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const SnapshotDiff = ({ snap, action, columns = [] }) => {
  if (!snap || typeof snap !== 'object') return null;

  // For status change, highlight the transition specifically
  if (action === 'STATUS_CHANGED') {
    const fromStatus = snap.previous_status ? formatStatusName(snap.previous_status, columns) : null;
    const toStatus = formatStatusName(snap.status, columns);
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-100 text-xs text-amber-900">
        {fromStatus ? (
          <>
            <span className="font-semibold text-gray-700">{fromStatus}</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="font-bold text-amber-800">{toStatus}</span>
          </>
        ) : (
          <>
            <span className="text-gray-500">New status:</span>
            <span className="font-bold text-amber-800">{toStatus}</span>
          </>
        )}
      </div>
    );
  }

  const rows = [
    { key: 'title',       label: 'Title'       },
    { key: 'status',      label: 'Status',     format: (v) => formatStatusName(v, columns) },
    { key: 'priority',    label: 'Priority'    },
    { key: 'due_date',    label: 'Due date'    },
    { key: 'description', label: 'Description' },
  ];

  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      {rows.map(({ key, label, format }) => {
        const val = snap[key];
        if (val === null || val === undefined || val === '') return null;
        const displayVal = format ? format(val) : String(val);
        return [
          <dt key={`l-${key}`} className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide self-start pt-0.5">
            {label}
          </dt>,
          <dd key={`v-${key}`} className="text-[11px] text-gray-700 break-words">
            {displayVal}
          </dd>,
        ];
      })}
    </dl>
  );
};

const HistoryEntry = ({ entry, isLast, columns = [] }) => {
  const meta = ACTION_META[entry.action] ?? { label: entry.action, color: 'bg-gray-400', icon: '•' };
  const actorName = entry.changed_by_name || entry.changedByName || 'Unknown';
  const timestamp = entry.changed_at || entry.changedAt;

  // Custom sentence for status change
  let actionTitle = meta.label;
  if (entry.action === 'STATUS_CHANGED' && entry.snapshot?.status) {
    const toStatus = formatStatusName(entry.snapshot.status, columns);
    const fromStatus = entry.snapshot.previous_status ? formatStatusName(entry.snapshot.previous_status, columns) : null;
    actionTitle = fromStatus 
      ? `Changed status from ${fromStatus} to ${toStatus}`
      : `Changed status to ${toStatus}`;
  }

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${meta.color}`}>
          {meta.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Entry body */}
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-800">
            {entry.action === 'STATUS_CHANGED' ? (
              <span>
                <span className="font-semibold text-gray-900">{actorName}</span>{' '}
                <span className="font-normal text-gray-600">changed status</span>
                {entry.snapshot?.previous_status && (
                  <> from <span className="font-medium text-gray-800">{formatStatusName(entry.snapshot.previous_status, columns)}</span></>
                )}
                {entry.snapshot?.status && (
                  <> to <span className="font-medium text-gray-800">{formatStatusName(entry.snapshot.status, columns)}</span></>
                )}
              </span>
            ) : (
              <>
                {meta.label}
                <span className="text-xs text-gray-500 font-normal ml-1">
                  by <span className="font-medium text-gray-700">{actorName}</span>
                </span>
              </>
            )}
          </span>
          <span className="text-[11px] text-gray-500 font-mono ml-auto whitespace-nowrap">
            {fmt(timestamp)}
          </span>
        </div>
        {entry.action !== 'STATUS_CHANGED' && (
          <SnapshotDiff snap={entry.snapshot} action={entry.action} columns={columns} />
        )}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export const TaskDetailModal = ({ task, columns, onClose, onEdit }) => {
  const [history, setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError,   setHistError]   = useState(null);

  useEffect(() => {
    if (!task?.id) return;
    setHistLoading(true);
    setHistError(null);
    taskApi.getHistory(task.id)
      .then((data) => {
        const list = Array.isArray(data) ? [...data] : [];
        // Sort newest first or detect transitions if previous_status is not stored
        for (let i = 0; i < list.length; i++) {
          const curr = list[i];
          // If previous_status wasn't explicitly saved, infer it from next older item in history
          if (curr.action === 'STATUS_CHANGED' && curr.snapshot && !curr.snapshot.previous_status) {
            const older = list.slice(i + 1).find((e) => e.snapshot?.status && e.snapshot.status !== curr.snapshot.status);
            if (older) {
              curr.snapshot = { ...curr.snapshot, previous_status: older.snapshot.status };
            }
          }
        }
        setHistory(list);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg    = err?.response?.data?.message || err?.response?.data?.error || '';
        // 404 means the task was deleted mid-session — just show empty
        if (status === 404) {
          setHistory([]);
        } else if (status === 500 && (msg.includes('task_audit_history') || msg.includes('relation') || msg.includes('table'))) {
          // Migration not yet applied on this deployment — show informational note, not an error
          setHistory([]);
          setHistError('History tracking is pending a database migration. No entries yet.');
        } else {
          setHistError(`Could not load history${msg ? ': ' + msg : '.'}`);
        }
      })
      .finally(() => setHistLoading(false));
  }, [task?.id]);

  if (!task) return null;

  const currentCol = columns.find((c) => c.id === task.status);
  const creatorName  = task.created_by_name  || task.createdByName  || 'Unknown';
  const createdAt    = task.created_at        || task.createdAt;
  const assigneeName = task.assignee_name     || task.assigneeName   || null;

  return (
    <Modal isOpen={!!task} onClose={onClose} title="Task Detail">
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">

        {/* ── Title + Edit Button ────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 leading-snug flex-1">{task.title}</h3>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex-shrink-0"
              title="Edit this task"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          )}
        </div>

        {/* ── Creator & Timestamp Banner ────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            👤
          </span>
          <div>
            <span>Created by <strong className="text-gray-800">{creatorName}</strong></span>
            {createdAt && (
              <span className="text-gray-500"> on <strong className="text-gray-700">{fmt(createdAt)}</strong></span>
            )}
          </div>
        </div>

        {/* ── Assigned To ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            🎯
          </span>
          <div>
            <span>Assigned to{' '}</span>
            {assigneeName ? (
              <strong className="text-gray-800">{assigneeName}</strong>
            ) : (
              <span className="text-gray-400 italic">Unassigned</span>
            )}
          </div>
        </div>

        {/* ── Badges ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentCol?.bg ?? 'bg-gray-100 text-gray-700'}`}>
            {currentCol?.title ?? task.status}
          </span>
          <Badge variant={priorityVariant(task.priority)}>{task.priority ?? 'MEDIUM'}</Badge>
          {task.due_date && (
            <Badge variant="default">📅 Due {fmtDate(task.due_date)}</Badge>
          )}
        </div>

        {/* ── Description ────────────────────────────────────────────────── */}
        {task.description && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          </div>
        )}

        <hr className="border-gray-100" />

        {/* ── Audit history timeline ──────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Change History
          </p>

          {histLoading && <Spinner size="sm" className="my-4" />}

          {histError && (
            <p className="text-xs text-amber-500 py-2">{histError}</p>
          )}

          {!histLoading && !histError && history.length === 0 && (
            <p className="text-xs text-gray-400 py-2">No history recorded yet.</p>
          )}

          {!histLoading && !histError && history.length > 0 && (
            <div>
              {history.map((entry, idx) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  isLast={idx === history.length - 1}
                  columns={columns}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Task ID ────────────────────────────────────────────────────── */}
        <p className="text-[10px] text-gray-300 font-mono break-all">ID: {task.id}</p>
      </div>
    </Modal>
  );
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/common/Spinner';
import { getDefaultAvatar } from '../../utils';
import toast from 'react-hot-toast';

import usersIcon    from '../../assets/41_users.svg';
import checkIcon    from '../../assets/11_check.svg';
import xIcon        from '../../assets/26_x.svg';
import arrowRightIcon from '../../assets/24_arrow_right.svg';
import googleIcon   from '../../assets/45_google.svg';
import githubIcon   from '../../assets/46_github.svg';
import folderIcon   from '../../assets/08_folder.svg';

// ── Helper classnames ─────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const s = status?.toUpperCase();
  if (s === 'DONE' || s === 'COMPLETED')
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'IN_REVIEW')
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700';
  return 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
};

const priorityBadge = (priority) => {
  const p = priority?.toUpperCase();
  if (p === 'CRITICAL' || p === 'HIGH')
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
  if (p === 'MEDIUM')
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700';
  return 'text-[var(--text-muted)] bg-[var(--surface-sunken)] border-[var(--border-subtle)]';
};

const httpStatusColor = (status) => {
  const code = Number(status);
  if (code >= 200 && code < 300) return 'text-green-500';
  if (code >= 400 && code < 500) return 'text-amber-500';
  if (code >= 500) return 'text-red-500';
  return 'text-[var(--text-secondary)]';
};

const methodColor = (method) => {
  if (method === 'GET')    return 'text-sky-400';
  if (method === 'POST')   return 'text-emerald-400';
  if (method === 'PUT')    return 'text-amber-400';
  if (method === 'DELETE') return 'text-red-400';
  return 'text-[var(--text-secondary)]';
};

// ── User avatar renderer ───────────────────────────────────────────────────────
const UserAvatar = ({ user, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const cls = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
  const genderAvatar = getDefaultAvatar(user?.gender);

  if (user?.avatarUrl && !imgError) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName || 'User'}
        className={`${cls} rounded-full object-cover border border-[var(--border-subtle)] shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }
  if (genderAvatar) {
    return (
      <img src={genderAvatar} alt="User" className={`${cls} rounded-full object-cover border border-[var(--border-subtle)] shrink-0`} />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 select-none`}>
      <span className="font-semibold text-[var(--accent-text)]">{initial}</span>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const AdminUsersPage = () => {
  const [users,            setUsers]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [providerFilter,   setProviderFilter]   = useState(null);
  const [totalUsers,       setTotalUsers]       = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  const [selectedUser,  setSelectedUser]  = useState(null);
  const [activeTab,     setActiveTab]     = useState('tasks');
  const [tasksLoading,  setTasksLoading]  = useState(false);
  const [userTasks,     setUserTasks]     = useState([]);
  const [taskStats,     setTaskStats]     = useState({ total: 0, created: 0, assigned: 0 });
  const [logsLoading,   setLogsLoading]   = useState(false);
  const [userLogs,      setUserLogs]      = useState([]);
  const [logQuery,      setLogQuery]      = useState('');

  useEffect(() => {
    adminApi.getAllUsers()
      .then((res) => {
        if (res?.data) {
          setUsers(res.data);
          setTotalUsers(res.totalUsers || res.data.length);
          setActiveUsersCount(res.activeUsersCount || 0);
        }
      })
      .catch(() => toast.error('Failed to load user directory'))
      .finally(() => setLoading(false));
  }, []);

  const loadUserTasks = (userId) => {
    setTasksLoading(true);
    adminApi.getUserTasks(userId)
      .then((res) => {
        if (res?.data) {
          setUserTasks(res.data);
          setTaskStats({ total: res.totalTasks || res.data.length, created: res.createdCount || 0, assigned: res.assignedCount || 0 });
        }
      })
      .catch(() => toast.error('Failed to fetch tasks'))
      .finally(() => setTasksLoading(false));
  };

  const loadUserLogs = (userId, query = '') => {
    setLogsLoading(true);
    adminApi.getUserLogs(userId, { query, size: 100 })
      .then((res) => { if (res?.data) setUserLogs(res.data); })
      .catch(() => toast.error('Failed to fetch logs'))
      .finally(() => setLogsLoading(false));
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setActiveTab('tasks');
    loadUserTasks(user.id);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!selectedUser) return;
    if (tab === 'logs')  loadUserLogs(selectedUser.id, logQuery);
    if (tab === 'tasks') loadUserTasks(selectedUser.id);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    if (searchTerm && !u.email?.toLowerCase().includes(q) && !u.displayName?.toLowerCase().includes(q)) return false;
    if (!providerFilter) return true;
    const p = u.oauthProvider?.toLowerCase() ?? null;
    if (providerFilter === 'email') return !p;
    return p === providerFilter;
  });

  const providerCounts = users.reduce((acc, u) => {
    const p = u.oauthProvider?.toLowerCase();
    if (p === 'google') acc.google += 1;
    else if (p === 'github') acc.github += 1;
    else acc.email += 1;
    return acc;
  }, { email: 0, google: 0, github: 0 });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
          <img src={usersIcon} alt="" className="w-6 h-6 dark:brightness-0 dark:invert opacity-70" aria-hidden="true" />
          User Activity
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Audit users, monitor tasks across all projects, and inspect activity logs.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total users */}
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-5 flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Total Users</p>
            <p className="text-3xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">{totalUsers}</p>
          </div>
          <div className="p-3 bg-[var(--surface-sunken)] rounded-lg">
            <img src={usersIcon} alt="" className="w-6 h-6 dark:brightness-0 dark:invert opacity-60" aria-hidden="true" />
          </div>
        </div>

        {/* Active */}
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-5 flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Active (last 5 min)</p>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <p className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums">{activeUsersCount}</p>
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <img src={checkIcon} alt="" className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>

        {/* Sign-up method filter */}
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Sign-up Method</p>
            {providerFilter && (
              <button onClick={() => setProviderFilter(null)} className="text-2xs text-[var(--accent-text)] hover:underline">
                Clear
              </button>
            )}
          </div>
          <div className="space-y-1">
            {[
              { key: 'email',  label: 'Email / Password', icon: <span className="w-4 h-4 rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center text-2xs font-bold text-[var(--text-muted)]">@</span>, count: providerCounts.email },
              { key: 'google', label: 'Google',            icon: <img src={googleIcon} alt="" className="w-4 h-4 shrink-0" />, count: providerCounts.google },
              { key: 'github', label: 'GitHub',            icon: <img src={githubIcon} alt="" className="w-4 h-4 shrink-0 dark:invert" />, count: providerCounts.github },
            ].map(({ key, label, icon, count }) => {
              const active = providerFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setProviderFilter(active ? null : key)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
                    active
                      ? 'bg-[var(--accent-subtle)] border border-[var(--accent-border)]'
                      : 'hover:bg-[var(--surface-sunken)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className={`text-xs ${active ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${active ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* User directory */}
        <div className={`${selectedUser ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {/* Search bar */}
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {providerFilter
                  ? `${providerFilter === 'email' ? 'Email' : providerFilter.charAt(0).toUpperCase() + providerFilter.slice(1)} Users (${filteredUsers.length})`
                  : `Users (${filteredUsers.length})`}
              </h2>
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25 w-full sm:w-56"
              />
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-sm text-[var(--text-muted)]">No users found.</div>
            ) : (
              <ul role="list" className="divide-y divide-[var(--border-subtle)] max-h-[60vh] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <li
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectUser(user)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectUser(user)}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-[var(--surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                        isSelected ? 'bg-[var(--accent-subtle)] border-l-2 border-l-[var(--accent)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar user={user} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{user.displayName || 'Unnamed'}</span>
                            {user.activeRecently && (
                              <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {user.roles?.map((role) => (
                              <span
                                key={role}
                                className={`text-2xs px-1.5 py-0.5 rounded font-medium ${
                                  role === 'ROLE_ADMIN' || role === 'ROLE_OWNER'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                    : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]'
                                }`}
                              >
                                {role.replace('ROLE_', '')}
                              </span>
                            ))}
                            {user.oauthProvider === 'google' ? (
                              <span className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                <img src={googleIcon} alt="" className="w-3 h-3" /> Google
                              </span>
                            ) : user.oauthProvider === 'github' ? (
                              <span className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                <img src={githubIcon} alt="" className="w-3 h-3 dark:invert" /> GitHub
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <img src={arrowRightIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert opacity-30 shrink-0" aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedUser && (
          <div className="lg:col-span-7">
            <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] flex flex-col max-h-[75vh]">
              {/* Panel header */}
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-sunken)]">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar user={selectedUser} size="lg" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{selectedUser.displayName || 'No Name'}</h3>
                    <p className="text-xs text-[var(--text-muted)] truncate">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/users/${selectedUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)] transition-colors"
                  >
                    Profile
                    <span aria-hidden="true">↗</span>
                  </Link>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 rounded-md hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Close detail panel"
                  >
                    <img src={xIcon} alt="" className="w-4 h-4 dark:brightness-0 dark:invert" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-[var(--border-subtle)] flex px-4 gap-5" role="tablist">
                {[
                  { id: 'tasks', label: 'Tasks', count: taskStats.total },
                  { id: 'logs',  label: 'Audit Logs', count: null },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-[var(--accent)] text-[var(--accent-text)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                    {tab.count != null && (
                      <span className="bg-[var(--surface-sunken)] text-[var(--text-muted)] text-2xs px-1.5 py-0.5 rounded-full font-medium">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tasks tab */}
              {activeTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-subtle)]">
                    <span>Created: <strong className="text-[var(--text-primary)]">{taskStats.created}</strong> &nbsp; Assigned: <strong className="text-[var(--text-primary)]">{taskStats.assigned}</strong></span>
                    <span>All projects</span>
                  </div>
                  {tasksLoading ? (
                    <div className="p-10 flex justify-center"><Spinner size="md" /></div>
                  ) : userTasks.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--text-muted)]">No tasks found for this user.</div>
                  ) : (
                    userTasks.map((task) => (
                      <div
                        key={task.taskId}
                        className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border-strong)] transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{task.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.isCreator && (
                              <span className="text-2xs bg-[var(--surface-raised)] text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">Creator</span>
                            )}
                            {task.isAssignee && (
                              <span className="text-2xs bg-[var(--accent-subtle)] text-[var(--accent-text)] px-1.5 py-0.5 rounded border border-[var(--accent-border)]">Assignee</span>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            <img src={folderIcon} alt="" className="w-3 h-3 dark:brightness-0 dark:invert opacity-50" aria-hidden="true" />
                            {task.projectName}
                          </span>
                          <span className="text-[var(--text-muted)] text-2xs">{task.boardName} &gt; {task.columnName}</span>
                          <span className={`px-1.5 py-0.5 text-2xs font-medium rounded border ${statusBadge(task.status)}`}>{task.status}</span>
                          {task.priority && (
                            <span className={`px-1.5 py-0.5 text-2xs font-medium rounded border ${priorityBadge(task.priority)}`}>{task.priority}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Logs tab */}
              {activeTab === 'logs' && (
                <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
                  <form onSubmit={(e) => { e.preventDefault(); loadUserLogs(selectedUser.id, logQuery); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Filter by URI, method, or status..."
                      value={logQuery}
                      onChange={(e) => setLogQuery(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25"
                    />
                    <button
                      type="submit"
                      disabled={logsLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] disabled:opacity-50 transition-colors"
                    >
                      Search
                    </button>
                  </form>

                  {logsLoading ? (
                    <div className="p-10 flex justify-center"><Spinner size="md" /></div>
                  ) : userLogs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--text-muted)]">No logs found in Elasticsearch.</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs">
                      {userLogs.map((log, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--border-subtle)] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-bold ${methodColor(log.method)}`}>{log.method}</span>
                            <span className="text-[var(--text-primary)] truncate">{log.uri}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-semibold ${httpStatusColor(log.status)}`}>{log.status}</span>
                            {log.durationMs !== undefined && <span className="text-[var(--text-muted)]">{log.durationMs}ms</span>}
                            <span className="text-[var(--text-muted)] text-2xs">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

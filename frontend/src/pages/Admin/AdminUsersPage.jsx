import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/common/Spinner';
import { getDefaultAvatar } from '../../utils';
import toast from 'react-hot-toast';

import usersIcon from '../../assets/41_users.svg';
import maleUserIcon from '../../assets/01_male_user.svg';
import femaleUserIcon from '../../assets/02_female_user.svg';
import checkIcon from '../../assets/11_check.svg';
import clockIcon from '../../assets/14_clock.svg';
import xIcon from '../../assets/26_x.svg';
import arrowRightIcon from '../../assets/24_arrow_right.svg';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  // Selected user detail drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'logs'
  const [tasksLoading, setTasksLoading] = useState(false);
  const [userTasks, setUserTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, created: 0, assigned: 0 });

  // Logs state
  const [logsLoading, setLogsLoading] = useState(false);
  const [userLogs, setUserLogs] = useState([]);
  const [logQuery, setLogQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllUsers();
      if (res && res.data) {
        setUsers(res.data);
        setTotalUsers(res.totalUsers || res.data.length);
        setActiveUsersCount(res.activeUsersCount || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setActiveTab('tasks');
    loadUserTasks(user.id);
  };

  const loadUserTasks = async (userId) => {
    try {
      setTasksLoading(true);
      const res = await adminApi.getUserTasks(userId);
      if (res && res.data) {
        setUserTasks(res.data);
        setTaskStats({
          total: res.totalTasks || res.data.length,
          created: res.createdCount || 0,
          assigned: res.assignedCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user tasks:', err);
      toast.error('Failed to fetch tasks for user');
    } finally {
      setTasksLoading(false);
    }
  };

  const loadUserLogs = async (userId, query = '') => {
    try {
      setLogsLoading(true);
      const res = await adminApi.getUserLogs(userId, { query, size: 100 });
      if (res && res.data) {
        setUserLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user logs:', err);
      toast.error('Failed to fetch audit logs for user');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'logs' && selectedUser) {
      loadUserLogs(selectedUser.id, logQuery);
    } else if (tab === 'tasks' && selectedUser) {
      loadUserTasks(selectedUser.id);
    }
  };

  const handleSearchLogs = (e) => {
    e.preventDefault();
    if (selectedUser) {
      loadUserLogs(selectedUser.id, logQuery);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const emailMatch = u.email?.toLowerCase().includes(q);
    const nameMatch = u.displayName?.toLowerCase().includes(q);
    return emailMatch || nameMatch;
  });

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
      case 'IN PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHttpStatusBadge = (status) => {
    const code = Number(status);
    if (code >= 200 && code < 300) return 'bg-green-100 text-green-800 border-green-200';
    if (code >= 300 && code < 400) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (code >= 400 && code < 500) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const renderUserAvatar = (user, sizeClass = 'w-10 h-10 text-sm') => {
    const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
    const genderAvatar = getDefaultAvatar(user?.gender);

    if (user?.avatarUrl) {
      return (
        <img
          src={user.avatarUrl}
          alt={user.displayName || 'User Avatar'}
          className={`${sizeClass} rounded-full object-cover border border-gray-200 bg-white shrink-0`}
          onError={(e) => {
            e.target.onerror = null;
            if (genderAvatar) {
              e.target.src = genderAvatar;
            } else {
              e.target.style.display = 'none';
              e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
            }
          }}
        />
      );
    }

    if (genderAvatar) {
      return (
        <img
          src={genderAvatar}
          alt={user?.gender === 'FEMALE' ? 'Female User' : 'Male User'}
          className={`${sizeClass} rounded-full object-cover border border-gray-200 bg-white shrink-0`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-primary-100 text-primary-700 font-bold border border-primary-200 flex items-center justify-center shrink-0`}
      >
        {initial}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={usersIcon} alt="" className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Activity & Task Explorer</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Audit platform users, monitor tasks created across all projects, and inspect user activity logs.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Registered Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <img src={usersIcon} alt="" className="w-6 h-6 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active In Last 5 Min</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <p className="text-2xl font-bold text-gray-900">{activeUsersCount}</p>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <img src={checkIcon} alt="" className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Elasticsearch Audit</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Rolling Logs Active</p>
            <p className="text-xs text-gray-400 mt-0.5">devopssuite-logs-*</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <img src={clockIcon} alt="" className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: User Table + User Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Directory Column */}
        <div className={`${selectedUser ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Registered Users ({filteredUsers.length})</h2>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No users found matching "{searchTerm}".
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-primary-50/50 border-l-4 border-primary-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderUserAvatar(user, 'w-10 h-10 text-sm')}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {user.displayName || 'No Name'}
                            </span>
                            {user.activeRecently && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {user.roles?.map((role) => (
                              <span
                                key={role}
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                                  role === 'ROLE_ADMIN' || role === 'ROLE_OWNER'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {role.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <img src={arrowRightIcon} alt="" className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected User Activity & Tasks Panel */}
        {selectedUser && (
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  {renderUserAvatar(selectedUser, 'w-11 h-11 text-base')}
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{selectedUser.displayName || 'No Name'}</h3>
                    <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/users/${selectedUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-300 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors shadow-xs"
                    title="View public profile in new tab"
                  >
                    <span>View Profile</span>
                    <span className="text-[11px]">↗</span>
                  </Link>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <img src={xIcon} alt="Close" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 flex px-4 gap-6 bg-white shrink-0">
                <button
                  onClick={() => handleTabChange('tasks')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'tasks'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>Tasks in Projects</span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {taskStats.total}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange('logs')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'logs'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>Activity / Audit Logs</span>
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    ES Logs
                  </span>
                </button>
              </div>

              {/* Tab 1: Tasks */}
              {activeTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs text-gray-500">
                    <span>
                      Created: <strong className="text-gray-700">{taskStats.created}</strong> | Assigned:{' '}
                      <strong className="text-gray-700">{taskStats.assigned}</strong>
                    </span>
                    <span>Across all registered boards</span>
                  </div>

                  {tasksLoading ? (
                    <div className="p-12 flex justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : userTasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      This user has not created or been assigned any tasks yet.
                    </div>
                  ) : (
                    userTasks.map((task) => (
                      <div
                        key={task.taskId}
                        className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-all shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight">{task.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.isCreator && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded border border-indigo-100">
                                Creator
                              </span>
                            )}
                            {task.isAssignee && (
                              <span className="text-[10px] bg-teal-50 text-teal-700 font-medium px-1.5 py-0.5 rounded border border-teal-100">
                                Assignee
                              </span>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {/* Project Tag */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            📁 {task.projectName}
                          </span>

                          {/* Board / Column */}
                          <span className="text-gray-500 text-[11px]">
                            {task.boardName} &gt; {task.columnName}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 text-[11px] font-medium rounded border ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>

                          {/* Priority Badge */}
                          {task.priority && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getPriorityBadgeClass(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          )}

                          {task.dueDate && (
                            <span className="text-gray-400 text-[11px] ml-auto">
                              Due: {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Activity / Audit Logs */}
              {activeTab === 'logs' && (
                <div className="flex-1 overflow-hidden flex flex-col p-4">
                  {/* Search Bar */}
                  <form onSubmit={handleSearchLogs} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Filter by URI or method (e.g. /tasks, POST, 200)..."
                      value={logQuery}
                      onChange={(e) => setLogQuery(e.target.value)}
                      className="flex-1 rounded-lg border-gray-300 text-xs focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      type="submit"
                      disabled={logsLoading}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      Search
                    </button>
                  </form>

                  {logsLoading ? (
                    <div className="p-12 flex justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : userLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No logs found for this user in Elasticsearch.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {userLogs.map((log, index) => (
                        <div
                          key={index}
                          className="p-2.5 rounded border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                                log.method === 'GET'
                                  ? 'bg-blue-100 text-blue-800'
                                  : log.method === 'POST'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.method === 'PUT'
                                  ? 'bg-amber-100 text-amber-800'
                                  : log.method === 'DELETE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {log.method}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getHttpStatusBadge(
                                log.status
                              )}`}
                            >
                              {log.status}
                            </span>
                            <span className="text-gray-800 truncate font-semibold">{log.uri}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-gray-500 text-[11px]">
                            {log.durationMs !== undefined && (
                              <span>{log.durationMs}ms</span>
                            )}
                            <span className="text-gray-400">
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

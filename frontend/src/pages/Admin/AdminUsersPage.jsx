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
import xIcon from '../../assets/26_x.svg';
import arrowRightIcon from '../../assets/24_arrow_right.svg';
import googleIcon from '../../assets/45_google.svg';
import githubIcon from '../../assets/46_github.svg';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState(null); // null | 'email' | 'google' | 'github'
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
    const textMatch = emailMatch || nameMatch;

    if (!textMatch) return false;
    if (!providerFilter) return true;
    const p = u.oauthProvider?.toLowerCase() ?? null;
    if (providerFilter === 'email') return p === null || p === undefined;
    return p === providerFilter;
  });

  const providerCounts = users.reduce(
    (acc, u) => {
      const p = u.oauthProvider?.toLowerCase();
      if (p === 'google') acc.google += 1;
      else if (p === 'github') acc.github += 1;
      else acc.email += 1;
      return acc;
    },
    { email: 0, google: 0, github: 0 }
  );

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'COMPLETED':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
      case 'IN_PROGRESS':
      case 'IN PROGRESS':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700';
      case 'IN_REVIEW':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
      case 'MEDIUM':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700';
      case 'LOW':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getHttpStatusBadge = (status) => {
    const code = Number(status);
    if (code >= 200 && code < 300) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
    if (code >= 300 && code < 400) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    if (code >= 400 && code < 500) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700';
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
  };

  const renderUserAvatar = (user, sizeClass = 'w-10 h-10 text-sm') => {
    const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
    const genderAvatar = getDefaultAvatar(user?.gender);

    const fallbackDiv = (
      <div
        className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold border border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 select-none`}
      >
        {initial}
      </div>
    );

    const handleImgError = (e) => {
      e.target.onerror = null;
      if (genderAvatar) {
        e.target.src = genderAvatar;
      } else {
        // Hide the broken image and show the sibling fallback div
        e.target.style.display = 'none';
        const sibling = e.target.nextElementSibling;
        if (sibling) sibling.style.display = 'flex';
      }
    };

    if (user?.avatarUrl) {
      return (
        <span className="shrink-0 inline-flex">
          <img
            src={user.avatarUrl}
            alt={user.displayName || 'User Avatar'}
            className={`${sizeClass} rounded-full object-cover border border-gray-200 bg-white shrink-0`}
            onError={handleImgError}
          />
          <div
            style={{ display: 'none' }}
            className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold border border-gray-300 dark:border-gray-600 items-center justify-center shrink-0 select-none`}
          >
            {initial}
          </div>
        </span>
      );
    }

    if (genderAvatar) {
      return (
        <img
          src={genderAvatar}
          alt={user?.gender === 'FEMALE' ? 'Female User' : 'Male User'}
          className={`${sizeClass} rounded-full object-cover border border-gray-200 bg-white shrink-0`}
          onError={handleImgError}
        />
      );
    }

    return fallbackDiv;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={usersIcon} alt="" className="w-7 h-7 dark:brightness-0 dark:invert" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Activity & Task Explorer</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Audit platform users, monitor tasks created across all projects, and inspect user activity logs.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Registered Users</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalUsers}</p>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <img src={usersIcon} alt="" className="w-8 h-8 dark:brightness-0 dark:invert" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active In Last 5 Min</p>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{activeUsersCount}</p>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <img src={checkIcon} alt="" className="w-8 h-8" />
          </div>
        </div>

        {/* Auth Provider Breakdown — clickable filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sign-up Method</p>
            {providerFilter && (
              <button
                onClick={() => setProviderFilter(null)}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="space-y-1">
            {[
              { key: 'email', label: 'Email / Password', icon: <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-gray-400 shrink-0">@</span>, count: providerCounts.email },
              { key: 'google', label: 'Google', icon: <img src={googleIcon} alt="" className="w-4 h-4 shrink-0" />, count: providerCounts.google },
              { key: 'github', label: 'GitHub', icon: <img src={githubIcon} alt="" className="w-4 h-4 shrink-0 dark:invert" />, count: providerCounts.github },
            ].map(({ key, label, icon, count }) => {
              const isActive = providerFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setProviderFilter(isActive ? null : key)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-600 ring-1 ring-gray-300 dark:ring-gray-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className={`text-xs ${isActive ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                      {label}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Layout: User Table + User Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Directory Column */}
        <div className={`${selectedUser ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {providerFilter
                  ? `${providerFilter === 'email' ? 'Email / Password' : providerFilter.charAt(0).toUpperCase() + providerFilter.slice(1)} Users (${filteredUsers.length})`
                  : `Registered Users (${filteredUsers.length})`}
              </h2>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm px-3 py-1.5 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                No users found matching "{searchTerm}".
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        isSelected ? 'bg-gray-50 dark:bg-gray-700/60 border-l-4 border-gray-400 dark:border-gray-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderUserAvatar(user, 'w-10 h-10 text-sm')}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate min-w-0">
                              {user.displayName || 'No Name'}
                            </span>
                            {user.activeRecently && (
                              <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {user.roles?.map((role) => (
                              <span
                                key={role}
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                                  role === 'ROLE_ADMIN' || role === 'ROLE_OWNER'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                              >
                                {role.replace('ROLE_', '')}
                              </span>
                            ))}
                            {/* Auth provider badge */}
                            {user.oauthProvider === 'google' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 font-medium shrink-0">
                                <img src={googleIcon} alt="" className="w-3 h-3" />
                                Google
                              </span>
                            ) : user.oauthProvider === 'github' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-medium shrink-0">
                                <img src={githubIcon} alt="" className="w-3 h-3 dark:invert" />
                                GitHub
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 font-medium shrink-0">
                                @ Email
                              </span>
                            )}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[75vh]">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3 min-w-0">
                  {renderUserAvatar(selectedUser, 'w-11 h-11 text-base')}
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{selectedUser.displayName || 'No Name'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/users/${selectedUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-xs"
                    title="View public profile in new tab"
                  >
                    <span>View Profile</span>
                    <span className="text-[11px]">↗</span>
                  </Link>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <img src={xIcon} alt="Close" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 flex px-4 gap-6 bg-white dark:bg-gray-800 shrink-0">
                <button
                  onClick={() => handleTabChange('tasks')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'tasks'
                      ? 'border-gray-700 dark:border-gray-200 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span>Tasks in Projects</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {taskStats.total}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange('logs')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'logs'
                      ? 'border-gray-700 dark:border-gray-200 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span>Activity / Audit Logs</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                    ES Logs
                  </span>
                </button>
              </div>

              {/* Tab 1: Tasks */}
              {activeTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Created: <strong className="text-gray-700 dark:text-gray-300">{taskStats.created}</strong> | Assigned:{' '}
                      <strong className="text-gray-700 dark:text-gray-300">{taskStats.assigned}</strong>
                    </span>
                    <span>Across all registered boards</span>
                  </div>

                  {tasksLoading ? (
                    <div className="p-12 flex justify-center"><Spinner size="md" /></div>
                  ) : userTasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      This user has not created or been assigned any tasks yet.
                    </div>
                  ) : (
                    userTasks.map((task) => (
                      <div
                        key={task.taskId}
                        className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{task.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.isCreator && (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                                Creator
                              </span>
                            )}
                            {task.isAssignee && (
                              <span className="text-[10px] bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium px-1.5 py-0.5 rounded border border-teal-100 dark:border-teal-700">
                                Assignee
                              </span>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                            📁 {task.projectName}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                            {task.boardName} &gt; {task.columnName}
                          </span>
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded border ${getStatusBadgeClass(task.status)}`}>
                            {task.status}
                          </span>
                          {task.priority && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="text-gray-400 dark:text-gray-500 text-[11px] ml-auto">
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
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-xs px-3 py-1.5 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={logsLoading}
                      className="px-3 py-1.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Search
                    </button>
                  </form>

                  {logsLoading ? (
                    <div className="p-12 flex justify-center"><Spinner size="md" /></div>
                  ) : userLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No logs found for this user in Elasticsearch.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {userLogs.map((log, index) => (
                        <div
                          key={index}
                          className="p-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                              log.method === 'GET'    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                              log.method === 'POST'   ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' :
                              log.method === 'PUT'    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                              log.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {log.method}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getHttpStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{log.uri}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-gray-500 dark:text-gray-400 text-[11px]">
                            {log.durationMs !== undefined && <span>{log.durationMs}ms</span>}
                            <span className="text-gray-400 dark:text-gray-500">
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

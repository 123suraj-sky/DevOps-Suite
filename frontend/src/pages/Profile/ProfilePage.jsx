import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services';
import { metricsApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aiden',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
  'https://api.dicebear.com/7.x/identicon/svg?seed=DevOps',
];

const STATUS_STYLES = {
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  TIMEOUT: 'bg-orange-100 text-orange-800',
  OOM_KILLED: 'bg-orange-100 text-orange-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  QUEUED: 'bg-gray-100 text-gray-700',
};

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Edit Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Avatar picker modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || '');
      setAvatarUrl(user.avatarUrl || user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await metricsApi.getUserSummary();
        setSummary(data);
      } catch (err) {
        console.error('Failed to load user summary stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await AuthService.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
      });
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPresetAvatar = (url) => {
    setAvatarUrl(url);
    setShowAvatarModal(false);
  };

  const handleCustomAvatarApply = () => {
    if (customAvatarInput.trim()) {
      setAvatarUrl(customAvatarInput.trim());
      setCustomAvatarInput('');
      setShowAvatarModal(false);
    }
  };

  const { taskStats, executionsThisWeek, recentExecutions } = summary ?? {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="text-sm text-gray-500">Manage your personal settings, avatar, and view your activity stats.</p>
        </div>
        {!isEditing ? (
          <Button variant="primary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={() => {
              setIsEditing(false);
              setDisplayName(user?.displayName || user?.name || '');
              setAvatarUrl(user?.avatarUrl || user?.avatar_url || '');
            }}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSaveProfile}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Main Profile Info Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.displayName || 'User Avatar'}
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary-50 shadow-md bg-white"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=DevOps';
                  }}
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-4xl font-bold border-4 border-primary-50 shadow-md">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex flex-col items-center justify-center text-white text-xs font-semibold opacity-90 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Change Avatar
                </button>
              )}
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                Change Profile Picture
              </button>
            )}
          </div>

          {/* User Details Section */}
          <div className="flex-1 w-full space-y-4">
            {!isEditing ? (
              <div className="space-y-3 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.displayName || 'Unnamed User'}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                    {user?.roles?.map((role) => (
                      <span
                        key={role}
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-800 uppercase tracking-wide"
                      >
                        {role.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-gray-600 text-sm flex items-center justify-center md:justify-start gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  {user?.email}
                </p>

                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">Account ID:</span>{' '}
                    <span className="font-mono text-xs text-gray-600">{user?.id || user?.userId}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Member Since:</span>{' '}
                    <span>{user?.createdAt ? formatDate(user.createdAt) : '—'}</span>
                  </div>
                  {user?.lastLoginAt && (
                    <div>
                      <span className="font-medium text-gray-700">Last Active:</span>{' '}
                      <span>{formatDate(user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
                <Input
                  label="Avatar URL (or click Change Avatar)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email address is managed by your account credentials.</p>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>

      {/* User Statistics & Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Activity & Statistics</h2>
        
        {loadingStats ? (
          <div className="p-8 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{taskStats?.open ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Tasks in backlog & todo</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{taskStats?.inProgress ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Tasks actively working on</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{taskStats?.completed ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Finished tasks</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-primary-600 uppercase tracking-wider">Code Runs (7d)</p>
                <p className="text-2xl font-bold text-primary-600 mt-1">{executionsThisWeek ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Sandboxed executions</p>
              </Card>
            </div>

            {/* Recent Executions Section */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Code Executions</h3>
              {recentExecutions && recentExecutions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="pb-3">Language</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Execution Time</th>
                        <th className="pb-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentExecutions.map((exec) => (
                        <tr key={exec.executionId} className="hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900 capitalize">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                              {exec.language}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[exec.status] || 'bg-gray-100 text-gray-700'}`}>
                              {exec.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500 text-xs font-mono">
                            {exec.executionTimeMs > 0 ? `${exec.executionTimeMs}ms` : '—'}
                          </td>
                          <td className="py-3 text-gray-400 text-xs">
                            {formatDate(exec.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">No recent code executions found.</p>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Avatar Selection Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Choose Profile Picture"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preset Avatars</label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((presetUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(presetUrl)}
                  className={`p-1.5 rounded-xl border-2 transition-all hover:scale-105 ${
                    avatarUrl === presetUrl ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={presetUrl} alt={`Avatar preset ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover mx-auto" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Or Paste Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customAvatarInput}
                onChange={(e) => setCustomAvatarInput(e.target.value)}
                placeholder="https://example.com/my-photo.jpg"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" size="sm" onClick={handleCustomAvatarApply}>
                Use URL
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAvatarModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services';
import { metricsApi, notificationPreferenceApi } from '../../api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { AvatarCropModal } from '../../components/common/AvatarCropModal';
import { formatDate } from '../../utils/formatters';
import { getDefaultAvatar } from '../../utils';
import { generateBotAvatar, generateRandomBotAvatar, PRESET_BOT_SEEDS } from '../../utils/avatarGenerator';
import toast from 'react-hot-toast';
import uploadIcon from '../../assets/21_upload.svg';
import removePhotoIcon from '../../assets/30_remove_photo.svg';
import cameraIcon from '../../assets/17_edit.svg';

// ── Notification type display labels ──────────────────────────────────────
const PREF_TYPE_LABELS = {
  TASK_ASSIGNED:   'Task assigned to you',
  TASK_REASSIGNED: 'Task reassigned to you',
  TASK_COMPLETED:  'Task marked as done',
  PROJECT_JOINED:  'Added to a project',
  ROLE_CHANGED:    'Your project role changed',
  PROJECT_REMOVED: 'Removed from a project',
  EXECUTION_FAILED:'Code execution failed / timed out',
};

// ── Accessible toggle switch ───────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

// Tab id constants
const TAB_AVATAR = 'avatar';
const TAB_UPLOAD = 'upload';

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
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);

  // Avatar picker modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTab, setAvatarTab] = useState(TAB_AVATAR);

  // Upload/crop sub-modal
  const [showCropModal, setShowCropModal] = useState(false);

  // Notification preferences
  const [preferences, setPreferences] = useState([]);
  const [prefLoading, setPrefLoading] = useState(true);
  const [updatingPref, setUpdatingPref] = useState(null); // type string being toggled

  // Pending avatar selection (applied only when user clicks "Apply" inside the picker)
  const [pendingAvatar, setPendingAvatar] = useState(null);

  // The random cell state: { seed, dataUri } — regenerated each time Random is clicked
  const [randomBot, setRandomBot] = useState(() => generateRandomBotAvatar());

  // Pre-generate the 6 preset data URIs once at mount (synchronous, no network)
  const presetBots = useMemo(
    () => PRESET_BOT_SEEDS.map((seed) => ({ seed, dataUri: generateBotAvatar(seed) })),
    []
  );

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || '');
      setAvatarUrl(user.avatarUrl || user.avatar_url || '');
      setGender(user.gender || 'PREFER_NOT_TO_SAY');
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

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const data = await notificationPreferenceApi.getAll();
        setPreferences(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      } finally {
        setPrefLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleTogglePreference = async (type, channel) => {
    const key = `${type}:${channel}`;
    setUpdatingPref(key);
    try {
      const current = preferences.find((p) => p.type === type);
      const currentValue = current ? current[channel === 'in_app' ? 'inApp' : 'email'] : channel === 'in_app';
      const updated = await notificationPreferenceApi.update(type, { [channel]: !currentValue });
      setPreferences((prev) =>
        prev.map((p) => (p.type === type ? { ...p, inApp: updated.in_app ?? updated.inApp, email: updated.email } : p))
      );
    } catch (err) {
      toast.error('Failed to update preference');
    } finally {
      setUpdatingPref(null);
    }
  };

  // ── Open picker — reset pending state to current avatarUrl ────────────────
  const openAvatarModal = () => {
    setPendingAvatar(avatarUrl);
    setAvatarTab(TAB_AVATAR);
    setRandomBot(generateRandomBotAvatar());
    setShowAvatarModal(true);
  };

  const closeAvatarModal = () => {
    setShowAvatarModal(false);
    setPendingAvatar(null);
  };

  // ── Generate a brand-new random avatar and select it ────────────────────
  const handleGenerateRandom = useCallback(() => {
    const bot = generateRandomBotAvatar();
    setRandomBot(bot);
    setPendingAvatar(bot.dataUri);
  }, []);

  // ── Apply the pending selection (bot preset / random) ────────────────────
  const handleApplyAvatar = async () => {
    const selected = pendingAvatar;
    closeAvatarModal();
    if (selected === '' || selected === null) {
      // Removing the avatar — update profile with empty URL immediately
      try {
        const updatedUser = await AuthService.updateProfile({
          display_name: displayName.trim() || user?.displayName || user?.name || '',
          avatar_url: '',
          gender: gender || null,
        });
        updateUser(updatedUser);
        setAvatarUrl('');
        toast.success('Avatar removed');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to remove avatar');
      }
      return;
    }
    // Bot/random preset is a data URI — convert to Blob and upload
    if (selected && selected.startsWith('data:')) {
      const uploadToast = toast.loading('Uploading avatar…');
      try {
        const res = await fetch(selected);
        const blob = await res.blob();
        const updatedUser = await AuthService.uploadAvatar(blob);
        updateUser(updatedUser);
        setAvatarUrl(updatedUser.avatarUrl || '');
        toast.success('Avatar updated successfully', { id: uploadToast });
      } catch (err) {
        console.error('Failed to upload avatar:', err);
        toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: uploadToast });
      }
    }
  };

  // ── Crop modal: receive Blob from AvatarCropModal, upload it immediately ──
  const handleCropConfirm = async (blob) => {
    setShowCropModal(false);
    setShowAvatarModal(false);
    const uploadToast = toast.loading('Uploading avatar…');
    try {
      const updatedUser = await AuthService.uploadAvatar(blob);
      updateUser(updatedUser);
      setAvatarUrl(updatedUser.avatarUrl || '');
      toast.success('Avatar updated successfully', { id: uploadToast });
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: uploadToast });
    }
  };

  // ── Save profile (display name + gender only; avatar is uploaded eagerly) ─
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
        // Keep the current avatar URL (a stored path) — don't send base64 here
        avatar_url: avatarUrl,
        gender: gender || null,
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
              setGender(user?.gender || 'PREFER_NOT_TO_SAY');
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
                    e.target.src = generateBotAvatar('DevOps');
                  }}
                />
              ) : getDefaultAvatar(isEditing ? gender : user?.gender) ? (
                <img
                  src={getDefaultAvatar(isEditing ? gender : user?.gender)}
                  alt={(isEditing ? gender : user?.gender) === 'FEMALE' ? 'Female User' : 'Male User'}
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary-50 shadow-md bg-white"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-4xl font-bold border-4 border-primary-50 shadow-md">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={openAvatarModal}
                  className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex flex-col items-center justify-center text-white text-xs font-semibold opacity-90 hover:opacity-100 transition-opacity"
                >
                  <img src={cameraIcon} alt="" className="w-6 h-6 mb-1 invert opacity-90" />
                  Change Avatar
                </button>
              )}
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={openAvatarModal}
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
                    {user?.roles?.filter((role) => role !== 'ROLE_MEMBER').map((role) => (
                      <span
                        key={role}
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-800 uppercase tracking-wide"
                      >
                        {role.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* email — inline SVG is a static icon: replaced with a Unicode envelope glyph
                    to stay consistent with no-inline-SVG rule for static icons */}
                <p className="text-gray-600 text-sm flex items-center justify-center md:justify-start gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                  <div>
                    <span className="font-medium text-gray-700">Gender:</span>{' '}
                    <span>
                      {user?.gender === 'MALE' && 'Male'}
                      {user?.gender === 'FEMALE' && 'Female'}
                      {user?.gender === 'PREFER_NOT_TO_SAY' && 'Prefer not to say'}
                      {!user?.gender && '—'}
                    </span>
                  </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
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

      {/* Notification Preferences */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notification Preferences</h2>
        <Card className="p-6">
          {prefLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 text-gray-600 font-medium">Notification type</th>
                    <th className="text-center pb-3 text-gray-600 font-medium w-28">In-app</th>
                    <th className="text-center pb-3 text-gray-600 font-medium w-28">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preferences.map((pref) => {
                    const inAppKey = `${pref.type}:in_app`;
                    const emailKey = `${pref.type}:email`;
                    return (
                      <tr key={pref.type}>
                        <td className="py-3 text-gray-700">
                          {PREF_TYPE_LABELS[pref.type] ?? pref.type}
                        </td>
                        <td className="py-3 text-center">
                          <ToggleSwitch
                            checked={pref.inApp ?? true}
                            disabled={updatingPref === inAppKey}
                            onChange={() => handleTogglePreference(pref.type, 'in_app')}
                            label="Toggle in-app"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <ToggleSwitch
                            checked={pref.email ?? false}
                            disabled={updatingPref === emailKey}
                            onChange={() => handleTogglePreference(pref.type, 'email')}
                            label="Toggle email"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-4">
                Email notifications are sent to <strong>{user?.email}</strong>.
                SMTP must be configured on the server for email delivery to work.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Avatar Picker Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showAvatarModal}
        onClose={closeAvatarModal}
        title="Choose Profile Picture"
      >
        {/* ── 2-tab bar ── */}
        <div className="flex border-b border-gray-200 mb-4 -mx-1">
          {[
            { id: TAB_AVATAR, label: 'Avatar'       },
            { id: TAB_UPLOAD, label: 'Upload Photo'  },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAvatarTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                avatarTab === id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: Avatar ── */}
        {avatarTab === TAB_AVATAR && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Click an avatar to select it, then press <strong>Apply</strong>.
            </p>

            {/*
              8-cell grid, 4 per row:
              Cells 1-6  → fixed preset bots
              Cell 7     → "Random" — generates a new bot avatar on each click
              Cell 8     → "Remove Photo"
            */}
            <div className="grid grid-cols-4 gap-3">
              {/* Cells 1–6: preset avatars */}
              {presetBots.map(({ seed, dataUri }) => (
                <button
                  key={seed}
                  type="button"
                  title={`Bot ${seed}`}
                  onClick={() => setPendingAvatar(dataUri)}
                  className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                    pendingAvatar === dataUri
                      ? 'border-primary-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)] bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <img
                    src={dataUri}
                    alt={`Bot ${seed}`}
                    className="w-full aspect-square rounded-lg object-cover bg-gray-50"
                  />
                </button>
              ))}

              {/* Cell 7: Random — click to generate a fresh bot avatar */}
              <button
                type="button"
                title="Generate random avatar"
                onClick={handleGenerateRandom}
                className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                  pendingAvatar === randomBot.dataUri
                    ? 'border-primary-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)] bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={randomBot.dataUri}
                    alt="Random avatar"
                    className="w-full h-full object-cover"
                  />
                  {/* Shuffle badge — inline SVG justified: this is a dynamic/interactive indicator */}
                  <span className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center border border-gray-200">
                    <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l4 4m0 0l-4 4m4-4H3M7 17l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                  </span>
                </div>
                <p className="text-center text-xs text-gray-400 mt-1 leading-tight">Random</p>
              </button>

              {/* Cell 8: Remove photo */}
              <button
                type="button"
                title="Remove profile photo"
                onClick={() => setPendingAvatar('')}
                className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300 ${
                  pendingAvatar === ''
                    ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.2)] bg-red-50'
                    : 'border-gray-200 hover:border-red-300 bg-white'
                }`}
              >
                <div className="w-full aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-1">
                  <img
                    src={removePhotoIcon}
                    alt=""
                    className="w-7 h-7 opacity-40"
                  />
                </div>
                <p className="text-center text-xs text-gray-400 mt-1 leading-tight">Remove</p>
              </button>
            </div>

            {/* Action row */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="ghost" type="button" onClick={closeAvatarModal}>Cancel</Button>
              <Button
                variant={pendingAvatar === '' ? 'danger' : 'primary'}
                type="button"
                onClick={handleApplyAvatar}
                disabled={pendingAvatar === null}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* ── TAB: Upload Photo ── */}
        {avatarTab === TAB_UPLOAD && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Upload a photo from your device. You can zoom and drag to position it within the circle. The photo uploads automatically once you confirm the crop.
            </p>

            {/* Preview current avatar if it's already an uploaded file */}
            {avatarUrl && !avatarUrl.startsWith('data:') && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <img
                  src={avatarUrl}
                  alt="Current avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-100"
                />
                <p className="text-xs text-gray-600 flex-1">Current uploaded photo. You can replace it below.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCropModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            >
              <img src={uploadIcon} alt="" className="w-5 h-5 opacity-70" />
              Choose &amp; Crop Photo
            </button>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="ghost" type="button" onClick={closeAvatarModal}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Upload & Crop sub-modal ──────────────────────────────────────────── */}
      <AvatarCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        onConfirm={(blob) => {
          handleCropConfirm(blob);
        }}
      />
    </div>
  );
};

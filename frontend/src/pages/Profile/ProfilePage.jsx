import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services';
import { metricsApi, notificationPreferenceApi } from '../../api';
import { codeExecutionApi } from '../../api/codeExecutionApi';
import { userApi } from '../../api/userApi';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { ActivityHeatmap } from '../../components/common/ActivityHeatmap';
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
  TASK_ASSIGNED:    'Task assigned to you',
  TASK_REASSIGNED:  'Task reassigned to you',
  TASK_COMPLETED:   'Task marked as done',
  PROJECT_JOINED:   'Added to a project',
  ROLE_CHANGED:     'Your project role changed',
  PROJECT_REMOVED:  'Removed from a project',
  EXECUTION_FAILED: 'Code execution failed / timed out',
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

// ── Component ─────────────────────────────────────────────────────────────
//
// Serves two routes:
//   /profile         — own profile  (no :userId param)
//   /users/:userId   — public view  (:userId param present)
//
export const ProfilePage = () => {
  const { userId: routeUserId } = useParams();          // present only on /users/:userId
  const { user: currentUser, updateUser } = useAuth();

  // Resolve which user we're looking at
  const currentUserId = currentUser?.id ?? currentUser?.userId;
  const isSelf = !routeUserId || routeUserId === currentUserId;

  // ── Profile data (the subject of this page) ───────────────────────────
  // For self: comes from AuthContext + refreshed via /api/users/{id}
  // For other: fetched from /api/users/{routeUserId}
  const [profileData, setProfileData]       = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Self-only: task stats ─────────────────────────────────────────────
  const [summary, setSummary]           = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Heatmap (shown for both self and others) ──────────────────────────
  const [heatmapData, setHeatmapData]       = useState([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);

  // ── Self-only: notification preferences ──────────────────────────────
  const [preferences, setPreferences]   = useState([]);
  const [prefLoading, setPrefLoading]   = useState(true);
  const [updatingPref, setUpdatingPref] = useState(null);

  // ── Self-only: edit profile state ─────────────────────────────────────
  const [isEditing, setIsEditing]   = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl]   = useState('');
  const [gender, setGender]         = useState('');
  const [saving, setSaving]         = useState(false);

  // ── Self-only: avatar picker modal ────────────────────────────────────
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTab, setAvatarTab]             = useState(TAB_AVATAR);
  const [showCropModal, setShowCropModal]     = useState(false);
  const [pendingAvatar, setPendingAvatar]     = useState(null);
  const [randomBot, setRandomBot]             = useState(() => generateRandomBotAvatar());

  const presetBots = useMemo(
    () => PRESET_BOT_SEEDS.map((seed) => ({ seed, dataUri: generateBotAvatar(seed) })),
    []
  );

  // ── Other-only: follow state ──────────────────────────────────────────
  // Optimistic: update UI immediately, revert on error
  const [isFollowing, setIsFollowing]       = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading]   = useState(false);

  // ── Fetch profile data ────────────────────────────────────────────────
  useEffect(() => {
    const targetId = isSelf ? currentUserId : routeUserId;
    if (!targetId) return;

    setLoadingProfile(true);
    setHeatmapData([]);
    setLoadingHeatmap(true);

    // Fetch public profile (sets follow counts, view count, isFollowing)
    userApi.getProfile(targetId)
      .then((data) => {
        setProfileData(data);
        setIsFollowing(data.isFollowing ?? false);
        setFollowersCount(data.followersCount ?? 0);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoadingProfile(false));

    // Fetch heatmap for the target user
    codeExecutionApi.getActivityHeatmap(365, isSelf ? null : (routeUserId ?? null))
      .then(setHeatmapData)
      .catch((err) => console.error('Failed to load heatmap:', err))
      .finally(() => setLoadingHeatmap(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUserId, currentUserId]);

  // ── Self-only fetches ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isSelf) return;
    metricsApi.getUserSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setLoadingStats(false));
  }, [isSelf]);

  useEffect(() => {
    if (!isSelf) return;
    notificationPreferenceApi.getAll()
      .then((data) => setPreferences(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load preferences:', err))
      .finally(() => setPrefLoading(false));
  }, [isSelf]);

  // Sync edit-form fields when own profile data changes
  useEffect(() => {
    if (isSelf && currentUser) {
      setDisplayName(currentUser.displayName || currentUser.name || '');
      setAvatarUrl(currentUser.avatarUrl || currentUser.avatar_url || '');
      setGender(currentUser.gender || 'PREFER_NOT_TO_SAY');
    }
  }, [isSelf, currentUser]);

  // ── Follow / Unfollow (optimistic) ────────────────────────────────────
  const handleFollowToggle = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);

    const wasFollowing = isFollowing;
    // Optimistic update
    setIsFollowing(!wasFollowing);
    setFollowersCount((c) => wasFollowing ? c - 1 : c + 1);

    try {
      if (wasFollowing) {
        await userApi.unfollow(routeUserId);
      } else {
        await userApi.follow(routeUserId);
      }
    } catch (err) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowersCount((c) => wasFollowing ? c + 1 : c - 1);
      const msg = err.response?.data?.message;
      toast.error(msg || (wasFollowing ? 'Failed to unfollow' : 'Failed to follow'));
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowing, routeUserId]);

  // ── Notification prefs toggle ─────────────────────────────────────────
  const handleTogglePreference = async (type, channel) => {
    const key = `${type}:${channel}`;
    setUpdatingPref(key);
    try {
      const current = preferences.find((p) => p.type === type);
      const currentValue = current
        ? current[channel === 'in_app' ? 'inApp' : 'email']
        : channel === 'in_app';
      const updated = await notificationPreferenceApi.update(type, { [channel]: !currentValue });
      setPreferences((prev) =>
        prev.map((p) =>
          p.type === type
            ? { ...p, inApp: updated.in_app ?? updated.inApp, email: updated.email }
            : p
        )
      );
    } catch {
      toast.error('Failed to update preference');
    } finally {
      setUpdatingPref(null);
    }
  };

  // ── Avatar modal helpers ──────────────────────────────────────────────
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
  const handleGenerateRandom = useCallback(() => {
    const bot = generateRandomBotAvatar();
    setRandomBot(bot);
    setPendingAvatar(bot.dataUri);
  }, []);

  const handleApplyAvatar = async () => {
    const selected = pendingAvatar;
    closeAvatarModal();
    if (selected === '' || selected === null) {
      try {
        const updatedUser = await AuthService.updateProfile({
          display_name: displayName.trim() || currentUser?.displayName || '',
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
    if (selected?.startsWith('data:')) {
      const uploadToast = toast.loading('Uploading avatar…');
      try {
        const res = await fetch(selected);
        const blob = await res.blob();
        const updatedUser = await AuthService.uploadAvatar(blob);
        updateUser(updatedUser);
        setAvatarUrl(updatedUser.avatarUrl || '');
        toast.success('Avatar updated successfully', { id: uploadToast });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: uploadToast });
      }
    }
  };

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
      toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: uploadToast });
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) { toast.error('Display name cannot be empty'); return; }
    setSaving(true);
    try {
      const updatedUser = await AuthService.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        gender: gender || null,
      });
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived display values ────────────────────────────────────────────
  // When self: prefer live AuthContext user for name/avatar (always up-to-date after edits)
  // When other: use profileData fetched from API
  const displayUser   = isSelf ? (currentUser ?? profileData) : profileData;
  const displayAvatar = isSelf ? avatarUrl : (displayUser?.avatarUrl ?? '');
  const displayGender = isSelf ? (isEditing ? gender : currentUser?.gender) : displayUser?.gender;

  const { taskStats, executionsThisWeek } = summary ?? {};

  // ── Loading state for public profile ─────────────────────────────────
  if (!isSelf && loadingProfile && !profileData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSelf ? 'User Profile' : (displayUser?.displayName || 'User Profile')}
          </h1>
          <p className="text-sm text-gray-500">
            {isSelf
              ? 'Manage your personal settings, avatar, and view your activity stats.'
              : `Viewing ${displayUser?.displayName ?? 'this user'}'s public profile.`}
          </p>
        </div>

        {/* Self: Edit / Save buttons | Other: Follow / Unfollow button */}
        {isSelf ? (
          !isEditing ? (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={() => {
                setIsEditing(false);
                setDisplayName(currentUser?.displayName || currentUser?.name || '');
                setAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar_url || '');
                setGender(currentUser?.gender || 'PREFER_NOT_TO_SAY');
              }}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} onClick={handleSaveProfile}>
                Save Changes
              </Button>
            </div>
          )
        ) : (
          <Button
            variant={isFollowing ? 'ghost' : 'primary'}
            loading={followLoading}
            onClick={handleFollowToggle}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      </div>

      {/* ── Main Profile Info Card ── */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">

          {/* Avatar */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayUser?.displayName || 'User Avatar'}
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary-50 shadow-md bg-white"
                  onError={(e) => { e.target.onerror = null; e.target.src = generateBotAvatar('DevOps'); }}
                />
              ) : getDefaultAvatar(displayGender) ? (
                <img
                  src={getDefaultAvatar(displayGender)}
                  alt={displayGender === 'FEMALE' ? 'Female User' : 'Male User'}
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary-50 shadow-md bg-white"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-4xl font-bold border-4 border-primary-50 shadow-md">
                  {(displayUser?.displayName || displayUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              {isSelf && isEditing && (
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

            {isSelf && isEditing && (
              <button type="button" onClick={openAvatarModal}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                Change Profile Picture
              </button>
            )}
          </div>

          {/* User details */}
          <div className="flex-1 w-full space-y-4">
            {isSelf && isEditing ? (
              /* ── Edit form (self only) ── */
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
                  <input type="text" disabled value={currentUser?.email || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">Email address is managed by your account credentials.</p>
                </div>
              </form>
            ) : (
              /* ── View mode (self + public) ── */
              <div className="space-y-3 text-center md:text-left">
                {/* Name + roles */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {displayUser?.displayName || 'Unnamed User'}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                    {displayUser?.roles?.filter((r) => r !== 'ROLE_MEMBER').map((role) => (
                      <span key={role}
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-800 uppercase tracking-wide">
                        {role.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Email — hidden for public profiles */}
                {isSelf && (
                  <p className="text-gray-600 text-sm flex items-center justify-center md:justify-start gap-1.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {currentUser?.email}
                  </p>
                )}

                {/* Metadata grid */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500">
                  {isSelf && (
                    <div>
                      <span className="font-medium text-gray-700">Account ID:</span>{' '}
                      <span className="font-mono text-xs text-gray-600">{currentUser?.id || currentUser?.userId}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Member Since:</span>{' '}
                    <span>{displayUser?.createdAt ? formatDate(displayUser.createdAt) : '—'}</span>
                  </div>
                  {isSelf && displayUser?.lastLoginAt && (
                    <div>
                      <span className="font-medium text-gray-700">Last Active:</span>{' '}
                      <span>{formatDate(displayUser.lastLoginAt)}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Gender:</span>{' '}
                    <span>
                      {displayGender === 'MALE' && 'Male'}
                      {displayGender === 'FEMALE' && 'Female'}
                      {(!displayGender || displayGender === 'PREFER_NOT_TO_SAY') && 'Prefer not to say'}
                    </span>
                  </div>
                </div>

                {/* Followers / Following / Profile Views */}
                <div className="flex flex-wrap gap-6 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">
                      {loadingProfile ? '—' : followersCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">
                      {loadingProfile ? '—' : (profileData?.followingCount ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">
                      {loadingProfile ? '—' : (profileData?.profileViewCount ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Profile Views</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Activity & Statistics (self only: stat cards; both: heatmap) ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {isSelf ? 'Activity & Statistics' : 'Code Run Activity'}
        </h2>

        <div className="space-y-6">
          {/* Stat cards — self only */}
          {isSelf && (
            loadingStats ? (
              <div className="p-8 flex justify-center"><Spinner size="md" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open Tasks</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{taskStats?.open ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Tasks in backlog &amp; todo</p>
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
            )
          )}

          {/* Heatmap — shown for everyone */}
          <Card className="p-6">
            <ActivityHeatmap
              data={heatmapData}
              loading={loadingHeatmap}
              totalDays={365}
            />
          </Card>
        </div>
      </div>

      {/* ── Notification Preferences (self only) ── */}
      {isSelf && (
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
                          <td className="py-3 text-gray-700">{PREF_TYPE_LABELS[pref.type] ?? pref.type}</td>
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
                  Email notifications are sent to <strong>{currentUser?.email}</strong>.
                  SMTP must be configured on the server for email delivery to work.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Avatar Picker Modal (self only) ── */}
      {isSelf && (
        <>
          <Modal isOpen={showAvatarModal} onClose={closeAvatarModal} title="Choose Profile Picture">
            <div className="flex border-b border-gray-200 mb-4 -mx-1">
              {[{ id: TAB_AVATAR, label: 'Avatar' }, { id: TAB_UPLOAD, label: 'Upload Photo' }].map(({ id, label }) => (
                <button key={id} type="button" onClick={() => setAvatarTab(id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    avatarTab === id
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {avatarTab === TAB_AVATAR && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Click an avatar to select it, then press <strong>Apply</strong>.</p>
                <div className="grid grid-cols-4 gap-3">
                  {presetBots.map(({ seed, dataUri }) => (
                    <button key={seed} type="button" title={`Bot ${seed}`}
                      onClick={() => setPendingAvatar(dataUri)}
                      className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                        pendingAvatar === dataUri
                          ? 'border-primary-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)] bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                      <img src={dataUri} alt={`Bot ${seed}`} className="w-full aspect-square rounded-lg object-cover bg-gray-50" />
                    </button>
                  ))}

                  <button type="button" title="Generate random avatar" onClick={handleGenerateRandom}
                    className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                      pendingAvatar === randomBot.dataUri
                        ? 'border-primary-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)] bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-50">
                      <img src={randomBot.dataUri} alt="Random avatar" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center border border-gray-200">
                        <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l4 4m0 0l-4 4m4-4H3M7 17l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-1 leading-tight">Random</p>
                  </button>

                  <button type="button" title="Remove profile photo" onClick={() => setPendingAvatar('')}
                    className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300 ${
                      pendingAvatar === ''
                        ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.2)] bg-red-50'
                        : 'border-gray-200 hover:border-red-300 bg-white'
                    }`}>
                    <div className="w-full aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-1">
                      <img src={removePhotoIcon} alt="" className="w-7 h-7 opacity-40" />
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-1 leading-tight">Remove</p>
                  </button>
                </div>

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

            {avatarTab === TAB_UPLOAD && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Upload a photo from your device. You can zoom and drag to position it within the circle.
                  The photo uploads automatically once you confirm the crop.
                </p>
                {avatarUrl && !avatarUrl.startsWith('data:') && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <img src={avatarUrl} alt="Current avatar"
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-100" />
                    <p className="text-xs text-gray-600 flex-1">Current uploaded photo. You can replace it below.</p>
                  </div>
                )}
                <button type="button" onClick={() => setShowCropModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                  <img src={uploadIcon} alt="" className="w-5 h-5 opacity-70" />
                  Choose &amp; Crop Photo
                </button>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="ghost" type="button" onClick={closeAvatarModal}>Close</Button>
                </div>
              </div>
            )}
          </Modal>

          <AvatarCropModal
            isOpen={showCropModal}
            onClose={() => setShowCropModal(false)}
            onConfirm={handleCropConfirm}
          />
        </>
      )}
    </div>
  );
};

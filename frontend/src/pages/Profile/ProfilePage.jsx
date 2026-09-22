import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import uploadIcon     from '../../assets/21_upload.svg';
import removePhotoIcon from '../../assets/30_remove_photo.svg';
import cameraIcon     from '../../assets/17_edit.svg';

// ── Notification preference labels ────────────────────────────────────────────
const PREF_LABELS = {
  TASK_ASSIGNED:    'Task assigned to you',
  TASK_REASSIGNED:  'Task reassigned to you',
  TASK_COMPLETED:   'Task marked as done',
  PROJECT_JOINED:   'Added to a project',
  ROLE_CHANGED:     'Your project role changed',
  PROJECT_REMOVED:  'Removed from a project',
  EXECUTION_FAILED: 'Code execution failed / timed out',
};

// ── Accessible toggle switch ──────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

const TAB_AVATAR = 'avatar';
const TAB_UPLOAD = 'upload';

// ── Component ─────────────────────────────────────────────────────────────────
export const ProfilePage = () => {
  const { userId: routeUserId }     = useParams();
  const { user: currentUser, updateUser } = useAuth();

  const currentUserId = currentUser?.id ?? currentUser?.userId;
  const isSelf        = !routeUserId || routeUserId === currentUserId;

  // Profile data
  const [profileData,    setProfileData]    = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Self-only: stats
  const [summary,      setSummary]      = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Heatmap (both self + other)
  const [heatmapData,    setHeatmapData]    = useState([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);

  // Self-only: notification prefs
  const [preferences,  setPreferences]  = useState([]);
  const [prefLoading,  setPrefLoading]  = useState(true);
  const [updatingPref, setUpdatingPref] = useState(null);

  // Self-only: edit state
  const [isEditing,    setIsEditing]    = useState(false);
  const [displayName,  setDisplayName]  = useState('');
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [gender,       setGender]       = useState('');
  const [saving,       setSaving]       = useState(false);

  // Avatar picker
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTab,       setAvatarTab]       = useState(TAB_AVATAR);
  const [showCropModal,   setShowCropModal]   = useState(false);
  const [pendingAvatar,   setPendingAvatar]   = useState(null);
  const [randomBot,       setRandomBot]       = useState(() => generateRandomBotAvatar());

  const presetBots = useMemo(
    () => PRESET_BOT_SEEDS.map((seed) => ({ seed, dataUri: generateBotAvatar(seed) })),
    []
  );

  // Other user: follow state
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading,  setFollowLoading]  = useState(false);

  // Followers / following modal
  const [followModal,        setFollowModal]        = useState(null);
  const [followModalList,    setFollowModalList]    = useState([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const targetId = isSelf ? currentUserId : routeUserId;
    if (!targetId) return;

    setLoadingProfile(true);
    setHeatmapData([]);
    setLoadingHeatmap(true);

    userApi.getProfile(targetId)
      .then((data) => {
        setProfileData(data);
        setIsFollowing(data.isFollowing ?? false);
        setFollowersCount(data.followersCount ?? 0);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoadingProfile(false));

    codeExecutionApi.getActivityHeatmap(365, isSelf ? null : (routeUserId ?? null))
      .then(setHeatmapData)
      .catch((err) => console.error('Failed to load heatmap:', err))
      .finally(() => setLoadingHeatmap(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUserId, currentUserId]);

  // Self-only fetches
  useEffect(() => {
    if (!isSelf) return;
    metricsApi.getUserSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, [isSelf]);

  useEffect(() => {
    if (!isSelf) return;
    notificationPreferenceApi.getAll()
      .then((data) => setPreferences(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setPrefLoading(false));
  }, [isSelf]);

  // Sync edit fields from currentUser
  useEffect(() => {
    if (isSelf && currentUser) {
      setDisplayName(currentUser.displayName || currentUser.name || '');
      setAvatarUrl(currentUser.avatarUrl || currentUser.avatar_url || '');
      setGender(currentUser.gender || 'PREFER_NOT_TO_SAY');
    }
  }, [isSelf, currentUser]);

  // ── Follow ────────────────────────────────────────────────────────────────
  const handleFollowToggle = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowersCount((c) => was ? c - 1 : c + 1);
    try {
      if (was) await userApi.unfollow(routeUserId);
      else     await userApi.follow(routeUserId);
    } catch (err) {
      setIsFollowing(was);
      setFollowersCount((c) => was ? c + 1 : c - 1);
      toast.error(err.response?.data?.message || (was ? 'Failed to unfollow' : 'Failed to follow'));
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowing, routeUserId]);

  const openFollowModal = useCallback(async (type) => {
    const targetId = isSelf ? currentUserId : routeUserId;
    if (!targetId) return;
    setFollowModal(type);
    setFollowModalList([]);
    setFollowModalLoading(true);
    try {
      const list = type === 'followers'
        ? await userApi.getFollowers(targetId)
        : await userApi.getFollowing(targetId);
      setFollowModalList(list);
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
    } finally {
      setFollowModalLoading(false);
    }
  }, [isSelf, currentUserId, routeUserId]);

  // ── Notification prefs ────────────────────────────────────────────────────
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

  // ── Avatar modal ──────────────────────────────────────────────────────────
  const openAvatarModal = () => {
    setPendingAvatar(avatarUrl);
    setAvatarTab(TAB_AVATAR);
    setRandomBot(generateRandomBotAvatar());
    setShowAvatarModal(true);
  };
  const closeAvatarModal = () => { setShowAvatarModal(false); setPendingAvatar(null); };

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
      const t = toast.loading('Uploading avatar...');
      try {
        const res     = await fetch(selected);
        const blob    = await res.blob();
        const updated = await AuthService.uploadAvatar(blob);
        updateUser(updated);
        setAvatarUrl(updated.avatarUrl || '');
        toast.success('Avatar updated', { id: t });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: t });
      }
    }
  };

  const handleCropConfirm = async (blob) => {
    setShowCropModal(false);
    setShowAvatarModal(false);
    const t = toast.loading('Uploading avatar...');
    try {
      const updated = await AuthService.uploadAvatar(blob);
      updateUser(updated);
      setAvatarUrl(updated.avatarUrl || '');
      toast.success('Avatar updated', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: t });
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) { toast.error('Display name cannot be empty'); return; }
    setSaving(true);
    try {
      const updated = await AuthService.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        gender: gender || null,
      });
      updateUser(updated);
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const displayUser   = isSelf ? (currentUser ?? profileData) : profileData;
  const displayAvatar = isSelf ? avatarUrl : (displayUser?.avatarUrl ?? '');
  const displayGender = isSelf ? (isEditing ? gender : currentUser?.gender) : displayUser?.gender;

  const { taskStats, executionsThisWeek, totalExecutions } = summary ?? {};

  if (!isSelf && loadingProfile && !profileData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* ── Section 1: Profile header ── */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative group">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayUser?.displayName || 'User Avatar'}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--border-subtle)] shadow-sm bg-[var(--surface-sunken)]"
                  onError={(e) => { e.target.onerror = null; e.target.src = generateBotAvatar('DevOps'); }}
                />
              ) : getDefaultAvatar(displayGender) ? (
                <img
                  src={getDefaultAvatar(displayGender)}
                  alt="User Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--border-subtle)] shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] border-2 border-[var(--accent-border)] flex items-center justify-center text-3xl font-bold text-[var(--accent-text)]">
                  {(displayUser?.displayName || displayUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isSelf && isEditing && (
                <button
                  type="button"
                  onClick={openAvatarModal}
                  className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Change avatar"
                >
                  <img src={cameraIcon} alt="" className="w-5 h-5 mb-1 invert" aria-hidden="true" />
                  Change
                </button>
              )}
            </div>
            {isSelf && isEditing && (
              <button
                type="button"
                onClick={openAvatarModal}
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                Change Photo
              </button>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 w-full">
            {isSelf && isEditing ? (
              /* Edit form */
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25"
                  >
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.email || ''}
                    className="block w-full px-3 py-2 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)] cursor-not-allowed"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Email is managed by your account credentials.</p>
                </div>
              </form>
            ) : (
              /* View mode */
              <div className="space-y-3 text-center sm:text-left">
                {/* Name + roles */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {displayUser?.displayName || 'Unnamed User'}
                  </h2>
                  {displayUser?.roles?.filter((r) => r !== 'ROLE_MEMBER').map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 text-2xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 uppercase tracking-wide"
                    >
                      {role.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>

                {/* Email (self only) */}
                {isSelf && (
                  <p className="text-sm text-[var(--text-secondary)] flex items-center justify-center sm:justify-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {currentUser?.email}
                  </p>
                )}

                {/* Meta */}
                <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]">
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">Member since</span>
                    <p className="mt-0.5">{displayUser?.createdAt ? formatDate(displayUser.createdAt) : '--'}</p>
                  </div>
                  {isSelf && displayUser?.lastLoginAt && (
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Last active</span>
                      <p className="mt-0.5">{formatDate(displayUser.lastLoginAt)}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">Gender</span>
                    <p className="mt-0.5">
                      {displayGender === 'MALE' ? 'Male' : displayGender === 'FEMALE' ? 'Female' : 'Prefer not to say'}
                    </p>
                  </div>
                  {isSelf && (
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Account ID</span>
                      <p className="mt-0.5 font-mono text-[var(--text-muted)] truncate">
                        {currentUser?.id || currentUser?.userId}
                      </p>
                    </div>
                  )}
                </div>

                {/* Followers / Following / Views */}
                <div className="flex flex-wrap gap-6 pt-3 border-t border-[var(--border-subtle)] justify-center sm:justify-start">
                  {[
                    { label: 'Followers', value: loadingProfile ? '--' : followersCount.toLocaleString(), onClick: () => openFollowModal('followers') },
                    { label: 'Following', value: loadingProfile ? '--' : (profileData?.followingCount ?? 0).toLocaleString(), onClick: () => openFollowModal('following') },
                    { label: 'Profile Views', value: loadingProfile ? '--' : (profileData?.profileViewCount ?? 0).toLocaleString(), onClick: null },
                  ].map(({ label, value, onClick }) => (
                    onClick ? (
                      <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        className="text-center group focus:outline-none focus-visible:underline"
                      >
                        <p className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">{value}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
                      </button>
                    ) : (
                      <div key={label} className="text-center">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isSelf ? (
              !isEditing ? (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setIsEditing(false);
                    setDisplayName(currentUser?.displayName || '');
                    setAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar_url || '');
                    setGender(currentUser?.gender || 'PREFER_NOT_TO_SAY');
                  }}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" loading={saving} onClick={handleSaveProfile}>
                    Save
                  </Button>
                </>
              )
            ) : (
              <Button
                variant={isFollowing ? 'ghost' : 'accent'}
                size="sm"
                loading={followLoading}
                onClick={handleFollowToggle}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Section 2: Activity & Stats ── */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {isSelf ? 'Activity & Statistics' : 'Code Run Activity'}
        </h2>

        <div className="space-y-4">
          {/* Stat cards — self only (reduced to 3) */}
          {isSelf && (
            loadingStats ? (
              <div className="p-6 flex justify-center"><Spinner size="md" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Active Tasks</p>
                  <p className="text-3xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                    {((taskStats?.open ?? 0) + (taskStats?.inProgress ?? 0))}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {taskStats?.open ?? 0} backlog, {taskStats?.inProgress ?? 0} in progress
                  </p>
                </Card>
                <Card>
                  <p className="text-2xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest">Completed</p>
                  <p className="text-3xl font-semibold text-green-600 dark:text-green-400 mt-1 tabular-nums">
                    {taskStats?.completed ?? 0}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Tasks finished</p>
                </Card>
                <Card>
                  <p className="text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Code Runs</p>
                  <p className="text-3xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                    {executionsThisWeek ?? 0}
                    <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/ week</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{totalExecutions ?? 0} all-time</p>
                </Card>
              </div>
            )
          )}

          {/* Heatmap */}
          <Card>
            <ActivityHeatmap data={heatmapData} loading={loadingHeatmap} totalDays={365} />
          </Card>
        </div>
      </div>

      {/* ── Section 3: Notification Preferences (self only) ── */}
      {isSelf && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Notification Preferences</h2>
          <Card>
            {prefLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left pb-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Notification type</th>
                      <th className="text-center pb-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide w-20">In-app</th>
                      <th className="text-center pb-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide w-20">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {preferences.map((pref) => {
                      const inAppKey = `${pref.type}:in_app`;
                      const emailKey = `${pref.type}:email`;
                      return (
                        <tr key={pref.type}>
                          <td className="py-3 text-sm text-[var(--text-secondary)]">
                            {PREF_LABELS[pref.type] ?? pref.type}
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
                <p className="text-xs text-[var(--text-muted)] mt-4">
                  Email notifications are sent to <strong className="text-[var(--text-secondary)]">{currentUser?.email}</strong>.
                  SMTP must be configured on the server for email delivery.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Avatar picker modal ── */}
      {isSelf && (
        <>
          <Modal isOpen={showAvatarModal} onClose={closeAvatarModal} title="Choose Profile Picture">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] mb-4 -mx-5 px-5">
              {[{ id: TAB_AVATAR, label: 'Avatar' }, { id: TAB_UPLOAD, label: 'Upload Photo' }].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarTab(id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                    avatarTab === id
                      ? 'border-[var(--accent)] text-[var(--accent-text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {avatarTab === TAB_AVATAR && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-muted)]">Click an avatar to select it, then press Apply.</p>
                <div className="grid grid-cols-4 gap-3">
                  {presetBots.map(({ seed, dataUri }) => (
                    <button
                      key={seed}
                      type="button"
                      title={`Bot ${seed}`}
                      onClick={() => setPendingAvatar(dataUri)}
                      className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        pendingAvatar === dataUri
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--surface-sunken)]'
                      }`}
                    >
                      <img src={dataUri} alt={`Bot ${seed}`} className="w-full aspect-square rounded-lg object-cover" />
                    </button>
                  ))}

                  <button
                    type="button"
                    title="Generate random avatar"
                    onClick={handleGenerateRandom}
                    className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      pendingAvatar === randomBot.dataUri
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                      <img src={randomBot.dataUri} alt="Random avatar" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-[var(--surface-raised)] rounded-full shadow flex items-center justify-center border border-[var(--border-subtle)]">
                        <svg className="w-3 h-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l4 4m0 0l-4 4m4-4H3M7 17l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-center text-2xs text-[var(--text-muted)] mt-1">Random</p>
                  </button>

                  <button
                    type="button"
                    title="Remove profile photo"
                    onClick={() => setPendingAvatar('')}
                    className={`relative p-1.5 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                      pendingAvatar === ''
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-[var(--border-subtle)] hover:border-red-300 bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg bg-[var(--surface-sunken)] flex flex-col items-center justify-center gap-1">
                      <img src={removePhotoIcon} alt="" className="w-6 h-6 opacity-40 dark:brightness-0 dark:invert" aria-hidden="true" />
                    </div>
                    <p className="text-center text-2xs text-[var(--text-muted)] mt-1">Remove</p>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
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
                <p className="text-xs text-[var(--text-muted)]">
                  Upload a photo from your device. Crop it to fit the circle, then confirm.
                </p>
                {avatarUrl && !avatarUrl.startsWith('data:') && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-subtle)]">
                    <img src={avatarUrl} alt="Current avatar" className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]" />
                    <p className="text-xs text-[var(--text-secondary)]">Current photo. Upload a new one to replace it.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--border-strong)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)] transition-colors"
                >
                  <img src={uploadIcon} alt="" className="w-4 h-4 opacity-60 dark:brightness-0 dark:invert" aria-hidden="true" />
                  Choose &amp; Crop Photo
                </button>
                <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <Button variant="ghost" type="button" onClick={closeAvatarModal}>Close</Button>
                </div>
              </div>
            )}
          </Modal>

          {showCropModal && (
            <AvatarCropModal
              onConfirm={handleCropConfirm}
              onClose={() => setShowCropModal(false)}
            />
          )}
        </>
      )}

      {/* ── Followers / Following modal ── */}
      <Modal
        isOpen={!!followModal}
        onClose={() => setFollowModal(null)}
        title={followModal === 'followers' ? 'Followers' : 'Following'}
      >
        {followModalLoading ? (
          <div className="py-8 flex justify-center"><Spinner size="md" /></div>
        ) : followModalList.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            {followModal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] max-h-80 overflow-y-auto" role="list">
            {followModalList.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-[var(--border-subtle)]" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-sm font-semibold text-[var(--accent-text)]">
                    {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    to={`/users/${u.id}`}
                    onClick={() => setFollowModal(null)}
                    className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
                  >
                    {u.displayName || 'User'}
                  </Link>
                  <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};

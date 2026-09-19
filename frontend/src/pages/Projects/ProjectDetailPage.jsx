import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { projectApi } from '../../api/projectApi';

// ── Role-colour config ────────────────────────────────────────────────────────
const ROLE_STYLES = {
  OWNER:  'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  ADMIN:  'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
  MEMBER: 'bg-gray-100  dark:bg-gray-700       text-gray-600  dark:text-gray-300   border-gray-200  dark:border-gray-600',
};

const ROLE_OPTION_HOVER = {
  ADMIN:  'hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
  MEMBER: 'hover:bg-gray-100  dark:hover:bg-gray-700',
};

// ── Custom pill dropdown ──────────────────────────────────────────────────────
const RolePillDropdown = ({ value, disabled, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const options = ['MEMBER', 'ADMIN'];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger pill */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold
          transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400
          disabled:opacity-50 disabled:cursor-not-allowed
          ${ROLE_STYLES[value] ?? ROLE_STYLES.MEMBER}`}
      >
        {value}
        {/* Chevron */}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" clipRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-32 rounded-xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { setOpen(false); if (opt !== value) onChange(opt); }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold
                transition-colors
                ${opt === value
                  ? `${ROLE_STYLES[opt]} cursor-default`
                  : `text-gray-700 dark:text-gray-200 ${ROLE_OPTION_HOVER[opt]}`
                }`}
            >
              {opt}
              {opt === value && (
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProjectDetailPage = () => {
  const { id: projectId } = useParams();
  const { project, refreshProject } = useOutletContext();
  const { user: currentUser } = useAuth();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);
  const [userNotFoundEmail, setUserNotFoundEmail] = useState(null);
  const [changingRoleFor, setChangingRoleFor] = useState(null);

  const handleCloseModal = () => {
    setShowAddMemberModal(false);
    setUserNotFoundEmail(null);
    setMemberEmail('');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddingMember(true);
    setUserNotFoundEmail(null);
    try {
      await projectApi.addMember(projectId, { email: memberEmail, role: memberRole });
      toast.success('Member added successfully');
      handleCloseModal();
      refreshProject();
    } catch (err) {
      console.error('Failed to add member:', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data?.error || '';
      
      if (status === 404 || message.toLowerCase().includes('not registered') || message.toLowerCase().includes('not found')) {
        setUserNotFoundEmail(memberEmail);
      } else {
        toast.error(message || 'Failed to add member to project');
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleSendEmailInvite = () => {
    if (!userNotFoundEmail) return;
    const inviterName = currentUser?.displayName || currentUser?.display_name || currentUser?.name || '';
    const projectName = project?.name || 'our project';
    const registerUrl = `${window.location.origin}/register`;
    const subject = encodeURIComponent(`Invitation to join ${projectName} on DevOps Suite`);
    const body = encodeURIComponent(
      `Hi,\n\nI would like to invite you to join and collaborate on "${projectName}" on DevOps Suite.\n\nPlease create an account at ${registerUrl} using this email address to get access.\n\nBest regards,\n${inviterName}`
    );
    window.location.href = `mailto:${userNotFoundEmail}?subject=${subject}&body=${body}`;
    toast.success('Opened your email client with invite draft');
    handleCloseModal();
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await projectApi.removeMember(projectId, userId);
      toast.success('Member removed successfully');
      refreshProject();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    setChangingRoleFor(memberId);
    try {
      await projectApi.changeMemberRole(projectId, memberId, newRole);
      toast.success('Role updated successfully');
      refreshProject();
    } catch (err) {
      console.error('Failed to change role:', err);
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to update role';
      toast.error(message);
    } finally {
      setChangingRoleFor(null);
    }
  };

  const userRole = project?.members?.find((m) => m.userId === currentUser?.id || m.email === currentUser?.email)?.role || 'MEMBER';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Members</h2>
            {isOwnerOrAdmin && (
              <Button onClick={() => setShowAddMemberModal(true)} size="sm">
                Add Member
              </Button>
            )}
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {project?.members?.map((member) => {
              const isSelf = member.userId === currentUser?.id || member.email === currentUser?.email;
              const isTargetOwner = member.role === 'OWNER';

              // OWNER can change anyone's role except their own and the owner row
              // ADMIN can only change MEMBER-level users
              const canChangeRole =
                (userRole === 'OWNER' && !isTargetOwner && !isSelf) ||
                (userRole === 'ADMIN' && member.role === 'MEMBER' && !isSelf);

              // Only OWNER can remove — not self, not the owner row
              const canRemove = userRole === 'OWNER' && !isTargetOwner && !isSelf;

              return (
                <div key={member.userId} className="flex justify-between items-center py-3">
                  <div>
                    {isSelf ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.displayName || member.email}</p>
                    ) : (
                      <Link
                        to={`/users/${member.userId}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                      >
                        {member.displayName || member.email}
                      </Link>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {canChangeRole ? (
                      <RolePillDropdown
                        value={member.role}
                        disabled={changingRoleFor === member.userId}
                        onChange={(newRole) => handleChangeRole(member.userId, newRole)}
                      />
                    ) : (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${ROLE_STYLES[member.role] ?? ROLE_STYLES.MEMBER}`}>
                        {member.role}
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-xs font-semibold px-3 py-1 rounded-full border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2">Project Info</h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <span className="font-semibold block">Owner ID</span>
              <span>{project?.ownerId}</span>
            </div>
            <div>
              <span className="font-semibold block">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                {project?.status || 'ACTIVE'}
              </span>
            </div>
            <div>
              <span className="font-semibold block">Created At</span>
              <span>{project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showAddMemberModal} onClose={handleCloseModal} title="Add Project Member">
        {userNotFoundEmail ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
              <p className="font-semibold mb-1">User Not Registered</p>
              <p>
                No user was found with the email <strong className="underline">{userNotFoundEmail}</strong>. Would you like to send them an email invitation to join DevOps Suite and collaborate on this project?
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="ghost" onClick={() => setUserNotFoundEmail(null)}>
                Try Another Email
              </Button>
              <Button variant="primary" onClick={handleSendEmailInvite}>
                Send Email Invitation
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAddMember} className="space-y-4">
            <Input
              label="User Email"
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
              placeholder="member@example.com"
            />
            <Select
              label="Role"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </Select>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" loading={addingMember}>Add</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

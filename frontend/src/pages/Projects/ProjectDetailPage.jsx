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
import { formatDate } from '../../utils/formatters';

const ROLE_STYLES = {
  OWNER:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  ADMIN:  'bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent-border)]',
  MEMBER: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
};

const RolePillDropdown = ({ value, disabled, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium
          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${ROLE_STYLES[value] ?? ROLE_STYLES.MEMBER}`}
      >
        {value}
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-overlay)] shadow-dark-md overflow-hidden">
          {['MEMBER', 'ADMIN'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { setOpen(false); if (opt !== value) onChange(opt); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors
                ${opt === value
                  ? `${ROLE_STYLES[opt]} cursor-default`
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]'
                }`}
            >
              {opt}
              {opt === value && (
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
  const [memberRole, setMemberRole]   = useState('MEMBER');
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
      toast.success('Member added');
      handleCloseModal();
      refreshProject();
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data?.error || '';
      if (status === 404 || message.toLowerCase().includes('not registered') || message.toLowerCase().includes('not found')) {
        setUserNotFoundEmail(memberEmail);
      } else {
        toast.error(message || 'Failed to add member');
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleSendEmailInvite = () => {
    if (!userNotFoundEmail) return;
    const inviterName = currentUser?.displayName || '';
    const projectName = project?.name || 'our project';
    const registerUrl = `${window.location.origin}/register`;
    const subject = encodeURIComponent(`Invitation to join ${projectName} on DevOps Suite`);
    const body = encodeURIComponent(`Hi,\n\nI'd like to invite you to collaborate on "${projectName}" on DevOps Suite.\n\nCreate an account at ${registerUrl} using this email address.\n\nBest,\n${inviterName}`);
    window.location.href = `mailto:${userNotFoundEmail}?subject=${subject}&body=${body}`;
    toast.success('Opened your email client');
    handleCloseModal();
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectApi.removeMember(projectId, userId);
      toast.success('Member removed');
      refreshProject();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    setChangingRoleFor(memberId);
    try {
      await projectApi.changeMemberRole(projectId, memberId, newRole);
      toast.success('Role updated');
      refreshProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setChangingRoleFor(null);
    }
  };

  const userRole = project?.members?.find(
    (m) => m.userId === currentUser?.id || m.email === currentUser?.email
  )?.role || 'MEMBER';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Members panel */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Members
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  {project?.members?.length ?? 0}
                </span>
              </h2>
              {isOwnerOrAdmin && (
                <Button variant="secondary" size="sm" onClick={() => setShowAddMemberModal(true)}>
                  Add Member
                </Button>
              )}
            </div>

            <div role="list" className="divide-y divide-[var(--border-subtle)]">
              {project?.members?.map((member) => {
                const isSelf = member.userId === currentUser?.id || member.email === currentUser?.email;
                const isTargetOwner = member.role === 'OWNER';
                const canChangeRole =
                  (userRole === 'OWNER' && !isTargetOwner && !isSelf) ||
                  (userRole === 'ADMIN' && member.role === 'MEMBER' && !isSelf);
                const canRemove = userRole === 'OWNER' && !isTargetOwner && !isSelf;

                return (
                  <div key={member.userId} role="listitem" className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      {isSelf ? (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {member.displayName || member.email}
                          <span className="ml-1.5 text-xs text-[var(--text-muted)]">(you)</span>
                        </p>
                      ) : (
                        <Link
                          to={`/users/${member.userId}`}
                          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
                        >
                          {member.displayName || member.email}
                        </Link>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {canChangeRole ? (
                        <RolePillDropdown
                          value={member.role}
                          disabled={changingRoleFor === member.userId}
                          onChange={(newRole) => handleChangeRole(member.userId, newRole)}
                        />
                      ) : (
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${ROLE_STYLES[member.role] ?? ROLE_STYLES.MEMBER}`}>
                          {member.role}
                        </span>
                      )}
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Project info */}
        <div>
          <Card>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--border-subtle)]">
              Project Info
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    {project?.status || 'ACTIVE'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {project?.createdAt ? formatDate(project.createdAt) : '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Members</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {project?.members?.length ?? 0} member{(project?.members?.length ?? 0) !== 1 ? 's' : ''}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Add member modal */}
      <Modal isOpen={showAddMemberModal} onClose={handleCloseModal} title="Add Member">
        {userNotFoundEmail ? (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">User not registered</p>
              <p>
                No account found for <strong>{userNotFoundEmail}</strong>. Send them an invitation?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setUserNotFoundEmail(null)}>
                Try Another Email
              </Button>
              <Button variant="primary" onClick={handleSendEmailInvite}>
                Send Email Invite
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
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" loading={addingMember}>Add Member</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

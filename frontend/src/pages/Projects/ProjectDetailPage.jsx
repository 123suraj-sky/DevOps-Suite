import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectApi } from '../../api/projectApi';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const ProjectDetailPage = () => {
  const { id: projectId } = useParams();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      const data = await projectApi.getById(projectId);
      setProject(data);
    } catch (err) {
      console.error('Failed to get project details:', err);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddingMember(true);
    try {
      // Typically addMember expects a userId. Here we mock search or assume API resolves email or maps userId.
      // For monolith API compatibility, let's use memberEmail as target.
      await projectApi.addMember(projectId, memberEmail, memberRole);
      toast.success('Member added successfully');
      setShowAddMemberModal(false);
      setMemberEmail('');
      fetchProjectDetails();
    } catch (err) {
      console.error('Failed to add member:', err);
      toast.error(err.response?.data?.message || 'Failed to add member to project');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await projectApi.removeMember(projectId, userId);
      toast.success('Member removed successfully');
      fetchProjectDetails();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error('Failed to remove member');
    }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!project) return <div className="text-center mt-20 text-red-500">Project not found</div>;

  const userRole = project.members.find((m) => m.userId === currentUser?.id || m.email === currentUser?.email)?.role || 'MEMBER';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Detail card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-2">{project.description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link to={`/projects/${projectId}/tasks`}>
              <Button>Task Board</Button>
            </Link>
            <Link to={`/projects/${projectId}/code`}>
              <Button variant="ghost">Code Editor</Button>
            </Link>
            <Link to={`/projects/${projectId}/logs`}>
              <Button variant="ghost">Logs</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Project Members</h2>
            {isOwnerOrAdmin && (
              <Button onClick={() => setShowAddMemberModal(true)} size="sm">
                Add Member
              </Button>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {project.members.map((member) => (
              <div key={member.userId} className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.displayName || member.email}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                    member.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role}
                  </span>
                  {isOwnerOrAdmin && member.role !== 'OWNER' && member.userId !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Project Info</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <span className="font-semibold block">Owner ID</span>
              <span>{project.ownerId}</span>
            </div>
            <div>
              <span className="font-semibold block">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {project.status || 'ACTIVE'}
              </span>
            </div>
            <div>
              <span className="font-semibold block">Created At</span>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Add Project Member">
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
            <Button variant="ghost" onClick={() => setShowAddMemberModal(false)}>Cancel</Button>
            <Button type="submit" loading={addingMember}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamAPI, taskAPI } from '../services/api';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import { Plus, Users, Mail, UserPlus, Trash2, Edit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamPage = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTasks, setTeamTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamTasks(selectedTeam._id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getAll();
      setTeams(response.data.teams);
      if (response.data.teams.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data.teams[0]);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamTasks = async (teamId) => {
    try {
      const response = await taskAPI.getAll({ team: teamId });
      setTeamTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to fetch team tasks:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-2">Manage your teams and members</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary mt-4 sm:mt-0 inline-flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Create Team</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-600 mb-6">Create your first team to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Create Team</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Teams List */}
            <div className="lg:col-span-1">
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Your Teams</h3>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => setSelectedTeam(team)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedTeam?._id === team._id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: team.color + '20' }}
                        >
                          <Users size={20} style={{ color: team.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{team.name}</h4>
                          <p className="text-sm text-gray-500">{team.members.length} members</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Details */}
            {selectedTeam && (
              <div className="lg:col-span-2 space-y-6">
                {/* Team Info */}
                <div className="card">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: selectedTeam.color + '20' }}
                      >
                        <Users size={32} style={{ color: selectedTeam.color }} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedTeam.name}</h2>
                        <p className="text-gray-600 mt-1">{selectedTeam.description || 'No description'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="btn btn-primary inline-flex items-center space-x-2"
                    >
                      <UserPlus size={18} />
                      <span>Add Member</span>
                    </button>
                  </div>

                  {/* Members */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Team Members ({selectedTeam.members.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedTeam.members.map((member) => (
                        <div key={member._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{member.name}</p>
                            <p className="text-sm text-gray-500 truncate">{member.email}</p>
                          </div>
                          <span className="badge bg-gray-200 text-gray-700 capitalize">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team Tasks */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Team Tasks ({teamTasks.length})</h3>
                    <button
                      onClick={() => navigate('/tasks/new')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Create Task
                    </button>
                  </div>
                  {teamTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No tasks yet for this team</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {teamTasks.slice(0, 5).map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onClick={() => navigate(`/tasks/${task._id}/workspace`)}
                        />
                      ))}
                      {teamTasks.length > 5 && (
                        <button
                          onClick={() => navigate('/board')}
                          className="text-center py-3 text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View all {teamTasks.length} tasks →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTeams();
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTeam && (
        <AddMemberModal
          team={selectedTeam}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => {
            setShowAddMemberModal(false);
            fetchTeams();
          }}
        />
      )}
    </Layout>
  );
};

// Create Team Modal Component
const CreateTeamModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await teamAPI.create({ name, description, color });
      toast.success('Team created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error(error.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Team</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Engineering Team"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                placeholder="Team description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Team'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// Add Member Modal Component
const AddMemberModal = ({ team, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await teamAPI.addMember(team._id, { email });
      toast.success('Member added successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Team Member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="member@example.com"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                User must have an existing account
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default TeamPage;

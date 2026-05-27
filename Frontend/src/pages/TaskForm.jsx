import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { taskAPI, teamAPI } from '../services/api';
import Layout from '../components/Layout';
import { Save, ArrowLeft, Trash2, Loader2, Plus, X, UploadCloud, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    team: '',
    assignee: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    tags: ''
  });

  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [checklist, setChecklist] = useState([{ text: '', completed: false }]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTeams();
    if (isEdit) {
      fetchTask();
    }
  }, [id]);

  useEffect(() => {
    if (formData.team) {
      fetchTeamMembers(formData.team);
    }
  }, [formData.team]);

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const fetchTask = async () => {
    try {
      const response = await taskAPI.getById(id);
      const task = response.data.task;
      setFormData({
        title: task.title,
        description: task.description || '',
        team: task.team._id,
        assignee: task.assignee?._id || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        tags: task.tags?.join(', ') || ''
      });
      setChecklist(
        task.checklist?.length
          ? task.checklist.map((item) => ({
              text: item.text || '',
              completed: Boolean(item.completed)
            }))
          : [{ text: '', completed: false }]
      );
    } catch (error) {
      console.error('Failed to fetch task:', error);
      toast.error('Failed to load task');
      navigate('/dashboard');
    }
  };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await teamAPI.getById(teamId);
      setTeamMembers(response.data.team.members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        team: formData.team,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        checklist: checklist
          .map((item) => ({ text: item.text.trim(), completed: item.completed }))
          .filter((item) => item.text)
      };

      if (formData.assignee) {
        taskData.assignee = formData.assignee;
      }

      if (formData.dueDate) {
        taskData.dueDate = formData.dueDate;
      }

      let savedTaskId = id;

      if (isEdit) {
        await taskAPI.update(id, taskData);
        toast.success('Task updated successfully');
      } else {
        const response = await taskAPI.create(taskData);
        savedTaskId = response.data.task._id;
        toast.success('Task created successfully');
      }

      if (selectedFiles.length > 0 && savedTaskId) {
        const uploadData = new FormData();
        selectedFiles.forEach((file) => uploadData.append('files', file));
        await taskAPI.uploadAttachments(savedTaskId, uploadData);
        toast.success('Documents uploaded successfully');
      }

      navigate(savedTaskId ? `/tasks/${savedTaskId}/workspace` : '/dashboard');
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error(error.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = (index, updates) => {
    setChecklist((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      )
    );
  };

  const addChecklistItem = () => {
    setChecklist((items) => [...items, { text: '', completed: false }]);
  };

  const removeChecklistItem = (index) => {
    setChecklist((items) =>
      items.length === 1 ? [{ text: '', completed: false }] : items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setSelectedFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const next = [...current];

      files.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existing.has(key)) {
          next.push(file);
        }
      });

      return next;
    });

    event.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    setDeleting(true);
    try {
      await taskAPI.delete(id);
      toast.success('Task deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-0 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {isEdit ? 'Update Task' : 'New Task Intake'}
              </p>
              <h1 className="text-3xl font-semibold text-gray-900">
                {isEdit ? formData.title || 'Untitled Task' : 'Create a Task Brief'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Align scope, ownership, and timelines so your team can ship with confidence.
              </p>
            </div>
          </div>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Delete task</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <div className="card space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">Task title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input mt-2"
                    placeholder="eg. Launch billing experiments for Q4"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Narrative & requirements</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input mt-2 min-h-[160px]"
                    placeholder="Share the problem context, definition of done, blockers, and linked specs."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="card space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Team *</label>
                    <select
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value, assignee: '' })}
                      className="input mt-2"
                      required
                    >
                      <option value="">Select delivery team</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Assignee</label>
                    <select
                      value={formData.assignee}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                      className="input mt-2"
                      disabled={!formData.team}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="card space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input mt-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input mt-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="card space-y-2">
                  <label className="text-sm font-medium text-gray-700">Due date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input"
                  />
                  <p className="text-xs text-gray-500">Used to surface the task in timeline & reminders.</p>
                </div>
                <div className="card space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="input"
                    placeholder="frontend, billing, hotfix"
                  />
                  <p className="text-xs text-gray-500">Comma separate multiple tags for reporting.</p>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="card space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Checklist</p>
                  <p className="text-xs text-gray-500">Ensure the brief is actionable before publishing.</p>
                </div>
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => updateChecklistItem(index, { completed: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label="Checklist item completed"
                      />
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                        className="input py-2 text-sm"
                        placeholder="Add checklist item"
                      />
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        aria-label="Remove checklist item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="btn btn-secondary w-full inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>Add checklist item</span>
                </button>
              </div>

              <div className="card bg-gray-50 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Upload documents</p>
                  <p className="text-sm text-gray-600">Attach PDFs, images, docs, or code files while creating this task.</p>
                </div>
                <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300 rounded-2xl px-4 py-6 cursor-pointer bg-white hover:border-gray-400">
                  <UploadCloud size={22} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Choose files</span>
                  <span className="text-xs text-gray-500">Up to 25MB per file</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-200 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-gray-500 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              {isEdit ? 'Last updated moments ago · changes auto-tracked' : 'Draft tasks stay in pending until scheduled'}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary inline-flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEdit ? 'Update task' : 'Create task'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TaskForm;

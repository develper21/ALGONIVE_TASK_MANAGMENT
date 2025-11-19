import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { taskAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  UploadCloud,
  Download,
  FileCode,
  FileText,
  FileImage,
  FileArchive,
  Loader2,
  Users,
  Activity,
  ShieldCheck,
  GitBranch
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeIcon = (fileType) => {
  switch (fileType) {
    case 'code':
      return <FileCode size={18} className="text-emerald-500" />;
    case 'document':
      return <FileText size={18} className="text-indigo-500" />;
    case 'pdf':
      return <FileText size={18} className="text-red-500" />;
    case 'image':
      return <FileImage size={18} className="text-amber-500" />;
    default:
      return <FileArchive size={18} className="text-gray-500" />;
  }
};

const TaskWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const [taskRes, attachmentsRes, activityRes] = await Promise.all([
        taskAPI.getById(id),
        taskAPI.getAttachments(id),
        taskAPI.getActivityFeed({ limit: 40 })
      ]);

      setTask(taskRes.data.task);
      setAttachments(attachmentsRes.data.attachments || []);
      const filteredActivity = (activityRes.data.activities || []).filter((item) => item.task?._id === id);
      setActivity(filteredActivity);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      toast.error('Unable to load task workspace');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || !files.length) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      setUploading(true);
      await taskAPI.uploadAttachments(id, formData);
      toast.success('Attachments uploaded');
      fetchWorkspace();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await taskAPI.downloadAttachment(attachment._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Unable to download file');
    }
  };

  const handlePreview = async (attachment) => {
    try {
      const response = await taskAPI.downloadAttachment(attachment._id);
      const blob = response.data;
      if (attachment.fileType === 'pdf' || attachment.mimeType === 'application/pdf') {
        const url = window.URL.createObjectURL(blob);
        setPreview({ type: 'pdf', url, attachment });
      } else if (attachment.fileType === 'image' || attachment.mimeType?.startsWith('image/')) {
        const url = window.URL.createObjectURL(blob);
        setPreview({ type: 'image', url, attachment });
      } else {
        const text = await blob.text();
        setPreview({ type: 'code', content: text, attachment });
      }
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error('Unable to preview file');
    }
  };

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const statusBadgeClasses = useMemo(() => {
    switch (task?.status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }, [task?.status]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!task) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={18} /> Back
          </button>
          <span>/</span>
          <span>Workspace</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{task.title}</span>
        </div>

        <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70 mb-3">Task Workspace</p>
              <h1 className="text-4xl font-semibold">{task.title}</h1>
              <p className="text-white/70 mt-2 max-w-3xl">{task.description || 'No description provided.'}</p>
              <div className="flex flex-wrap gap-3 mt-6 text-xs">
                <span className={`badge ${statusBadgeClasses}`}>Status: {task.status?.replace('_', ' ')}</span>
                <span className="badge bg-white/10 text-white border-white/20">Priority: {task.priority}</span>
                {task.dueDate && (
                  <span className="badge bg-white/10 text-white border-white/20">
                    Due {format(new Date(task.dueDate), 'PP')}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3 min-w-[220px]">
              <button
                onClick={() => navigate(`/tasks/${task._id}`)}
                className="w-full rounded-2xl bg-white text-gray-900 font-semibold py-3 shadow-lg shadow-gray-900/20"
              >
                Open Edit View
              </button>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs uppercase text-white/70 tracking-wide">Team</p>
                <p className="text-lg font-semibold">{task.team?.name || 'Team workspace'}</p>
                <p className="text-white/60 text-sm">{task.team?.members?.length || 0} collaborators</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Artifacts</p>
                <h2 className="text-2xl font-semibold">Repository Files</h2>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-2xl cursor-pointer text-gray-600 hover:border-gray-400">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <span>{uploading ? 'Uploading...' : 'Add Files'}</span>
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-500">
                Drop assets here or use the "Add Files" control to bring your code, PDFs, and docs into this workspace.
              </div>
            ) : (
              <div className="space-y-4">
                {attachments.map((attachment) => (
                  <div key={attachment._id} className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                        {fileTypeIcon(attachment.fileType)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{attachment.originalName}</p>
                        <p className="text-sm text-gray-500">
                          {formatBytes(attachment.size)} · Uploaded {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">by {attachment.uploadedBy?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePreview(attachment)} className="btn btn-secondary text-sm">Preview</button>
                      <button onClick={() => handleDownload(attachment)} className="btn btn-primary text-sm inline-flex items-center gap-1">
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Overview</p>
              <h2 className="text-2xl font-semibold">Release Checklist</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-500" size={18} />
                <div>
                  <p className="text-gray-900 font-medium">Access Control</p>
                  <p>Only teammates assigned to {task.team?.name} can contribute here.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="text-indigo-500" size={18} />
                <div>
                  <p className="text-gray-900 font-medium">Revision Stream</p>
                  <p>Every upload is tracked with author, time, and file diff context.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-amber-500" size={18} />
                <div>
                  <p className="text-gray-900 font-medium">Stakeholders</p>
                  <p>{task.team?.members?.length || 0} collaborators notified on change events.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Activity Log</p>
              <h2 className="text-2xl font-semibold">Recent Movements</h2>
            </div>
            <Activity className="text-primary-500" />
          </div>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity captured for this task yet.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item._id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-semibold">
                    {item.actor?.name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{item.actor?.name || 'Someone'}</span> {item.action.replace('_', ' ')} ·{' '}
                      <span className="text-gray-500">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    </p>
                    <p className="text-xs text-gray-500">{task.team?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {preview && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <p className="font-semibold text-gray-900">{preview.attachment.originalName}</p>
                  <p className="text-xs text-gray-500">Preview mode</p>
                </div>
                <button onClick={() => setPreview(null)} className="text-sm text-gray-500 hover:text-gray-900">Close</button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-50">
                {preview.type === 'code' && (
                  <pre className="bg-white rounded-2xl p-4 text-xs text-gray-800 overflow-auto">
                    {preview.content}
                  </pre>
                )}
                {preview.type === 'pdf' && (
                  <iframe src={preview.url} title="PDF Preview" className="w-full h-[70vh] rounded-2xl bg-white" />
                )}
                {preview.type === 'image' && (
                  <img src={preview.url} alt={preview.attachment.originalName} className="max-h-[70vh] mx-auto rounded-2xl" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TaskWorkspace;

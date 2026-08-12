import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services';
import { ArrowLeft, Code, Users, Clock, CheckCircle, Circle, AlertCircle, Plus, Trash2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ongoing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_ICONS: Record<string, any> = {
  low: Circle,
  medium: AlertCircle,
  high: AlertCircle,
  urgent: AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [interestLoading, setInterestLoading] = useState(false);
  const [isInterested, setIsInterested] = useState(false);

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await projectService.getById(projectId!);
      setProject(res.data.project);
      setIsInterested(Boolean(res.data.project?.is_interested_by_me));
    } catch (err: any) {
      toast.error('Failed to load project');
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await projectService.createTask(projectId!, { title: newTaskTitle });
      setNewTaskTitle('');
      toast.success('Task added');
      loadProject();
    } catch { toast.error('Failed to add task'); }
  };

  const handleToggleTask = async (task: any) => {
    try {
      await projectService.updateTask(projectId!, task.id, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      });
      loadProject();
    } catch { toast.error('Failed to update task'); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await projectService.deleteTask(projectId!, taskId);
      toast.success('Task deleted');
      loadProject();
    } catch { toast.error('Failed to delete task'); }
  };

  const handleInterest = async () => {
    if (!project || isInterested || project.owner?.id === authUser?.id || interestLoading) return;
    setInterestLoading(true);
    try {
      await projectService.expressInterest(project.id);
      setIsInterested(true);
      toast.success('Interest saved');
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        setIsInterested(true);
      } else {
        toast.error(err.response?.data?.detail || 'Failed to save interest');
      }
    } finally {
      setInterestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!project) return null;

  const isOwner = authUser?.id === project.owner?.id;
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');
  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const canExpressInterest = Boolean(authUser && authUser.id !== project.owner?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20 lg:pb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-2xl font-bold text-white">
            {project.name?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] || STATUS_COLORS.planning}`}>
                {project.status}
              </span>
              {isInterested && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Interested ✓
                </span>
              )}
            </div>
            {project.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{project.description}</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {project.members?.length || 0} members</span>
          <span className="flex items-center gap-1"><Code className="h-3.5 w-3.5" /> {project.category || 'Uncategorized'}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}</span>
        </div>

        {project.tech_stack && Array.isArray(project.tech_stack) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tech_stack.map((tech: string) => (
              <span key={tech} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {tech}
              </span>
            ))}
          </div>
        )}

        {canExpressInterest && (
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleInterest}
              disabled={interestLoading || isInterested}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                isInterested
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <Heart className={`h-4 w-4 ${isInterested ? 'fill-current' : ''}`} />
              {isInterested ? 'Interested ✓' : interestLoading ? 'Saving...' : 'Interested'}
            </button>
            {project.owner && (
              <span className="text-xs text-gray-500">Owned by {project.owner.full_name}</span>
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-semibold">Progress</h2>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">{completedTasks.length}/{tasks.length} tasks completed</span>
          <span className="font-bold text-[#0095f6]">{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-gradient-to-r from-[#0095f6] to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold">Tasks ({tasks.length})</h2>

        {(isOwner || project.my_role) && (
          <div className="mb-4 flex gap-2">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add a new task..."
              className="input flex-1"
            />
            <button onClick={handleAddTask} className="btn-primary shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No tasks yet. Add your first task!</p>
          )}
          {tasks.map((task: any) => {
            const PriorityIcon = PRIORITY_ICONS[task.priority] || Circle;
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  task.status === 'completed'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button onClick={() => handleToggleTask(task)} className="shrink-0">
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : ''}`}>
                    {task.title}
                  </p>
                  {task.assignee_name && (
                    <p className="text-xs text-gray-400">Assigned to: {task.assignee_name}</p>
                  )}
                </div>
                <PriorityIcon className={`h-4 w-4 shrink-0 ${PRIORITY_COLORS[task.priority] || 'text-gray-400'}`} />
                {(isOwner || project.my_role === 'admin') && (
                  <button onClick={() => handleDeleteTask(task.id)} className="shrink-0 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold">Members ({project.members?.length || 0})</h2>
        <div className="space-y-2">
          {project.members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0095f6] to-indigo-500 text-xs font-bold text-white">
                {m.full_name?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services';
import { Code, ChevronRight, Plus, Loader2 } from 'lucide-react';

interface ProjectsTabProps {
  userId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ongoing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function ProjectsTab({ userId }: ProjectsTabProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectService.myProjects();
      setProjects(res.data?.projects || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-16 text-center">
        <Code className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm font-medium text-gray-500">No projects yet</p>
        <p className="mb-4 text-xs text-gray-400">Create or join a project to get started</p>
        <button
          onClick={() => navigate('/projects/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0095f6] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1877f2]"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => navigate('/projects/new')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-3 text-sm font-semibold text-gray-500 transition-all hover:border-[#0095f6] hover:text-[#0095f6] hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10"
      >
        <Plus className="h-5 w-5" /> Create New Project
      </button>
      {projects.map((p: any) => (
        <div
          key={p.id}
          onClick={() => navigate(`/projects/${p.id}`)}
          className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-[#0095f6] hover:shadow-sm dark:border-gray-700"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-white">
            {p.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{p.name}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.planning}`}>
                {p.status}
              </span>
            </div>
            {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{p.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span>{p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
              <span>{p.completed_task_count || 0}/{p.task_count || 0} tasks</span>
              <span className="capitalize">Role: {p.my_role}</span>
            </div>
            {p.tech_stack && Array.isArray(p.tech_stack) && p.tech_stack.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.tech_stack.slice(0, 3).map((tech: string) => (
                  <span key={tech} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {tech}
                  </span>
                ))}
                {p.tech_stack.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{p.tech_stack.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-gray-400" />
        </div>
      ))}
    </div>
  );
}

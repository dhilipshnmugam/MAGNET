import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Technology', 'Research', 'Education', 'Business', 'Engineering', 'Media', 'Social Service', 'Environment', 'Arts & Culture', 'Sports', 'Other'];

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    status: 'planning',
    tech_stack: [] as string[],
  });
  const [techInput, setTechInput] = useState('');

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.tech_stack.includes(t)) {
      setForm({ ...form, tech_stack: [...form.tech_stack, t] });
    }
    setTechInput('');
  };

  const removeTech = (idx: number) => {
    setForm({ ...form, tech_stack: form.tech_stack.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await projectService.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        status: form.status || 'planning',
        tech_stack: form.tech_stack.length > 0 ? form.tech_stack : null,
      });
      toast.success('Project created!');
      navigate(`/projects/${res.data.project_id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create project';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20 lg:pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-6">
        <h1 className="text-xl font-bold">Create New Project</h1>
        <p className="mt-1 text-sm text-gray-500">Start a new collaborative project</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Project Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Enter project name" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input resize-none" placeholder="Describe your project..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                <option value="planning">Planning</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tech Stack</label>
            <div className="flex gap-2">
              <input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())} className="input flex-1" placeholder="Add a technology..." />
              <button onClick={addTech} type="button" className="btn-secondary shrink-0"><Plus className="h-4 w-4" /></button>
            </div>
            {form.tech_stack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tech_stack.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
                    {t}<button onClick={() => removeTech(i)} type="button" className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Project'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

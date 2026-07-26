import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFormValidation } from '../hooks';
import { departmentService } from '../services';
import { getApiError } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department_id: '',
    college_id: '',
    year_of_study: '',
    semester: '',
    section: '',
    phone: '',
    admission_year: '',
  });

  const registerRules = {
    full_name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true },
    password: { required: true, minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, patternMessage: 'Must contain uppercase, lowercase, and a number.' },
    confirmPassword: { required: true, match: 'password' },
  };

  const { errors, validateForm, validateField } = useFormValidation(registerRules);

  useEffect(() => {
    departmentService.list().then((res) => {
      setDepartments(res.data.data || []);
    }).catch(() => {});
  }, []);

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const payload: any = {
      full_name: form.full_name,
      email: form.email,
      password: form.password,
    };

    if (form.department_id) payload.department_id = form.department_id;

    if (!form.college_id) {
      toast.error('Register number is required for students.');
      return;
    }
    payload.college_id = form.college_id;
    if (form.year_of_study) payload.year_of_study = parseInt(form.year_of_study);
    if (form.semester) payload.semester = parseInt(form.semester);
    if (form.section) payload.section = form.section;
    if (form.phone) payload.phone = form.phone;
    if (form.admission_year) payload.admission_year = parseInt(form.admission_year);

    try {
      await register(payload);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      toast.error(getApiError(err) || 'Registration failed.');
    }
  };

  const inputCls = `input pl-10 text-xs`;
  const fieldCls = `relative`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4 py-8">
      <div className="w-full max-w-[400px] space-y-3">
        <div className="rounded-sm border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 text-center">
            <Zap className="mx-auto h-12 w-12 text-[#0095f6]" />
            <h1 className="mt-3 text-3xl font-semibold bg-gradient-to-r from-[#0095f6] via-[#833ab4] to-[#fd1d1d] bg-clip-text text-transparent">Magnet</h1>
            <p className="mt-2 text-sm font-semibold text-gray-500">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2" noValidate>
            {/* Full Name */}
            <div className={fieldCls}>
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} onBlur={() => validateField('full_name', form.full_name, form)} className={`${inputCls} ${errors.full_name ? 'border-red-500' : ''}`} placeholder="Full Name" />
              {errors.full_name && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.full_name}</p>}
            </div>

            {/* Email */}
            <div className={fieldCls}>
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} onBlur={() => validateField('email', form.email, form)} className={`${inputCls} ${errors.email ? 'border-red-500' : ''}`} placeholder="Email address" />
              {errors.email && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.email}</p>}
            </div>

            {/* Password */}
            <div className={fieldCls}>
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} onBlur={() => { validateField('password', form.password, form); if (form.confirmPassword) validateField('confirmPassword', form.confirmPassword, form); }} className={`${inputCls} pr-10 ${errors.password ? 'border-red-500' : ''}`} placeholder="Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              {errors.password && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className={fieldCls}>
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} onBlur={() => validateField('confirmPassword', form.confirmPassword, form)} className={`${inputCls} ${errors.confirmPassword ? 'border-red-500' : ''}`} placeholder="Confirm Password" />
              {errors.confirmPassword && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.confirmPassword}</p>}
            </div>

            {/* Department */}
            <div className={fieldCls}>
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select value={form.department_id} onChange={(e) => update('department_id', e.target.value)} className={inputCls}>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            {/* Student Fields */}
            <div className={fieldCls}>
              <input type="text" value={form.college_id} onChange={(e) => update('college_id', e.target.value)} className="input text-xs w-full" placeholder="Register Number *" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.year_of_study} onChange={(e) => update('year_of_study', e.target.value)} className="input text-xs">
                <option value="">Year</option>
                {[1,2,3,4,5].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
              <select value={form.semester} onChange={(e) => update('semester', e.target.value)} className="input text-xs">
                <option value="">Semester</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.section} onChange={(e) => update('section', e.target.value)} className="input text-xs" placeholder="Section" />
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input text-xs" placeholder="Phone" />
            </div>

            <p className="text-center text-[11px] text-gray-400">By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.</p>

            <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-[#0095f6] py-2.5 text-sm font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50">
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Have an account? <Link to="/login" className="font-semibold text-[#0095f6] hover:text-[#00376b]">Log in</Link></p>
        </div>
        <div className="text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-700">← Back to portal selection</Link>
        </div>
      </div>
    </div>
  );
}

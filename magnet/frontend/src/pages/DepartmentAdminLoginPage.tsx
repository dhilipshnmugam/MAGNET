import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFormValidation } from '../hooks';
import { getApiError } from '../services/api';
import toast from 'react-hot-toast';

interface Department {
  id: string;
  name: string;
  code: string;
}

const loginRules = {
  email: { required: true, email: true },
  password: { required: true, minLength: 6 },
};

export default function DepartmentAdminLoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = useRef(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deptError, setDeptError] = useState('');
  const { errors, validateForm, validateField } = useFormValidation(loginRules);

  useEffect(() => {
    import('../services').then(({ departmentService }) => {
      departmentService.list({ page_size: 100 }).then((res) => {
        setDepartments(res.data.data || []);
      }).catch(() => {});
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError('');

    if (!selectedDept) {
      setDeptError('Please select your department');
      return;
    }
    if (!validateForm({ email, password })) return;

    try {
      await login(email, password);
      toast.success('Welcome back!');
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        navigate('/department-admin');
      }
    } catch (err: any) {
      const apiMsg = getApiError(err);
      if (apiMsg && !apiMsg.toLowerCase().includes('invalid')) {
        toast.error(apiMsg);
      } else {
        toast.error('Invalid Department, Email or Password.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-[350px] space-y-3">
        <div className="rounded-sm border border-gray-200 bg-white p-10 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-3 text-2xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Magnet
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">Department Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2" noValidate>
            {/* Department Dropdown */}
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setDeptError(''); }}
                className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-xs dark:bg-gray-800 ${
                  deptError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              {deptError && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {deptError}</p>}
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateField('email', email, { email, password })}
                className={`input pl-10 text-xs ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Department email"
              />
              {errors.email && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.email}</p>}
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validateField('password', password, { email, password })}
                className={`input pl-10 pr-10 text-xs ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {errors.password && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.password}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-[#0095f6] py-2 text-sm font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50">
              {isLoading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-semibold text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <p className="text-center text-xs text-[#385185] font-semibold">Forgot password?</p>
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-700">← Back to portal selection</Link>
        </div>
      </div>
    </div>
  );
}

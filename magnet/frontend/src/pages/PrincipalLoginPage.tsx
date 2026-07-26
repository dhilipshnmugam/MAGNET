import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFormValidation } from '../hooks';
import { getApiError } from '../services/api';
import toast from 'react-hot-toast';

const loginRules = {
  email: { required: true, email: true },
  password: { required: true, minLength: 6 },
};

export default function PrincipalLoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { errors, validateForm, validateField } = useFormValidation(loginRules);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm({ email, password })) return;
    try {
      await login(email, password);
      toast.success('Welcome back, Principal!');
      navigate('/principal');
    } catch (err: any) {
      toast.error(getApiError(err) || 'Invalid email or password.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-[350px] space-y-3">
        <div className="rounded-sm border border-gray-200 bg-white p-10 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">Magnet</h1>
            <p className="mt-1 text-sm font-medium text-sky-600">Principal Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2" noValidate>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => validateField('email', email, { email, password })} className={`input pl-10 text-xs ${errors.email ? 'border-red-500' : ''}`} placeholder="Email address" />
              {errors.email && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.email}</p>}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => validateField('password', password, { email, password })} className={`input pl-10 pr-10 text-xs ${errors.password ? 'border-red-500' : ''}`} placeholder="Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              {errors.password && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {errors.password}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors">
              {isLoading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-semibold text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <p className="text-center text-xs text-gray-500 font-semibold">Forgot password?</p>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Don't have an account? <Link to="/register" className="font-semibold text-sky-600">Sign up</Link></p>
        </div>
        <div className="text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-700">← Back to portal selection</Link>
        </div>
      </div>
    </div>
  );
}

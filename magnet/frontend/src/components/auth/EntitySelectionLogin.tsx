import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CreditCard, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Loader2, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../services/api';
import toast from 'react-hot-toast';

export interface SelectionEntity {
  id: string;
  name: string;
  code?: string;
}

interface EntitySelectionLoginProps {
  title: string;
  heading: string;
  entityLabel: string;
  idCardLabel: string;
  searchPlaceholder: string;
  icon: LucideIcon;
  accent: string;
  iconColor: string;
  fetchItems: (search: string) => Promise<SelectionEntity[]>;
  onSubmit: (identifier: string, password: string, entity: SelectionEntity) => Promise<void>;
}

export default function EntitySelectionLogin({
  title,
  heading,
  entityLabel,
  idCardLabel,
  searchPlaceholder,
  icon: Icon,
  accent,
  iconColor,
  fetchItems,
  onSubmit,
}: EntitySelectionLoginProps) {
  const { isLoading } = useAuth();
  const [step, setStep] = useState<'select' | 'login'>('select');
  const [entities, setEntities] = useState<SelectionEntity[]>([]);
  const [selected, setSelected] = useState<SelectionEntity | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; selection?: string }>({});
  const fetchRef = useRef(fetchItems);
  fetchRef.current = fetchItems;

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchRef.current(search.trim())
        .then((items) => setEntities(items))
        .catch(() => setEntities([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const chooseEntity = (entity: SelectionEntity) => {
    setSelected(entity);
    setErrors({});
    setStep('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setErrors({ selection: `Please select a ${entityLabel}.` });
      setStep('select');
      return;
    }
    const nextErrors: typeof errors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Please enter your ID.';
    if (!password.trim()) nextErrors.password = 'Please enter your password.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    try {
      await onSubmit(identifier.trim(), password, selected);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(getApiError(err) || 'Invalid credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-[420px] space-y-3">
        <div className="rounded-sm border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <Icon className={`mx-auto h-12 w-12 ${iconColor}`} />
            <h1 className={`mt-3 bg-gradient-to-r ${accent} bg-clip-text text-2xl font-semibold text-transparent`}>
              Magnet
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">{title}</p>
          </div>

          {step === 'select' ? (
            <>
              <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{heading}</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="input pl-10 text-xs"
                />
              </div>
              {errors.selection && (
                <p className="mb-2 flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" /> {errors.selection}
                </p>
              )}
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : entities.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">No {entityLabel}s found.</p>
                ) : (
                  entities.map((entity) => (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => chooseEntity(entity)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left transition-all hover:border-gray-400 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-500"
                    >
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{entity.name}</p>
                        {entity.code && <p className="text-[10px] text-gray-400">{entity.code}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2" noValidate>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{selected?.name}</p>
                    {selected?.code && <p className="text-[10px] text-gray-400">{selected.code}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep('select'); setErrors({}); }}
                  className="shrink-0 text-[11px] font-semibold text-[#0095f6] hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  placeholder={idCardLabel}
                  className={`input pl-10 text-xs ${errors.identifier ? 'border-red-500' : ''}`}
                />
                {errors.identifier && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" /> {errors.identifier}
                  </p>
                )}
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Password"
                  className={`input pl-10 pr-10 text-xs ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {errors.password && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#0095f6] py-2 text-sm font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Log In'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3 w-3" /> Back to portal selection
          </Link>
        </div>
      </div>
    </div>
  );
}

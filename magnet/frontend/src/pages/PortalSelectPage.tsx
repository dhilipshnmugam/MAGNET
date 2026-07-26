import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Shield, Users, Zap, Crown } from 'lucide-react';

export default function PortalSelectPage() {
  const portals = [
    {
      title: 'Student',
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-600',
      link: '/login/student',
    },
    {
      title: 'Department Admin',
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      link: '/login/department-admin',
    },
    {
      title: 'Principal',
      icon: Crown,
      color: 'from-sky-500 to-blue-600',
      link: '/login/principal',
    },
    {
      title: 'Super Admin',
      icon: Shield,
      color: 'from-amber-500 to-orange-600',
      link: '/login/super-admin',
    },
    {
      title: 'Club Portal',
      icon: Users,
      color: 'from-rose-500 to-pink-600',
      link: '/login/club',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-[350px]">
        <div className="rounded-sm border border-gray-200 bg-white p-10 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <Zap className="mx-auto h-12 w-12 text-[#0095f6]" />
            <h1 className="mt-3 text-3xl font-semibold bg-gradient-to-r from-[#0095f6] via-[#833ab4] to-[#fd1d1d] bg-clip-text text-transparent">
              Magnet
            </h1>
          </div>

          <div className="space-y-3">
            {portals.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.title}
                  to={p.link}
                  className="group flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition-all hover:border-gray-400 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-500"
                >
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${p.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.title}</p>
                  </div>
                  <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">→</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-sm border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            Or use{' '}
            <Link to="/login" className="font-semibold text-[#0095f6] hover:text-[#00376b]">
              generic login
            </Link>
          </p>
        </div>

        <div className="mt-3 rounded-sm border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#0095f6] hover:text-[#00376b]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import {
  LayoutDashboard, CirclePlus, Trophy, Building2, Users, BarChart3, Settings,
} from 'lucide-react';

const sidebarItems = [
  { label: 'Dashboard', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'Create Club', to: '/super-admin/clubs/create', icon: CirclePlus },
  { label: 'Manage Clubs', to: '/super-admin/clubs', icon: Trophy },
  { label: 'Departments', to: '/super-admin/departments', icon: Building2 },
  { label: 'Users', to: '/super-admin/users', icon: Users },
  { label: 'Analytics', to: '/super-admin/analytics', icon: BarChart3 },
  { label: 'Settings', to: '/super-admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-[240px] border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <nav className="mt-4 space-y-1 px-3">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 font-bold text-sky-600 dark:bg-sky-900/20'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="ml-[240px] flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

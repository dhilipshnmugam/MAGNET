import { NavLink } from 'react-router-dom';
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

const desktopItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sky-50 font-bold text-sky-600 dark:bg-sky-900/20'
      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
  );

const mobileItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
    isActive
      ? 'bg-sky-500 text-white'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
  );

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] shrink-0 border-r border-gray-200 bg-white lg:block dark:border-gray-800 dark:bg-gray-900">
        <nav className="sticky top-[60px] max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto px-3 py-4">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={desktopItemClass}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Mobile nav */}
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <nav className="scrollbar-hide flex items-center gap-1 overflow-x-auto px-3 py-2">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={mobileItemClass}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <main className="min-w-0 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

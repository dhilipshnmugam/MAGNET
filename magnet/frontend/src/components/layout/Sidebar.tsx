import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Bell, MessageCircle, Users, Calendar,
  Trophy, Settings, Shield, GraduationCap, Search,
  LogOut, Zap, LayoutDashboard, UserCircle, Globe, CirclePlus,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../common/Avatar';
import { cn } from '../../utils/helpers';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  roles?: string[];
}

const coreNavItems: NavItem[] = [
  { to: '/feed', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/channels', icon: Users, label: 'Channels' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

const roleNavItems: NavItem[] = [
  { to: '/super-admin', icon: Shield, label: 'Super Admin', roles: ['super_admin'] },
  { to: '/department-admin', icon: GraduationCap, label: 'Dept Admin', roles: ['department_admin'] },
  { to: '/clubs', icon: LayoutDashboard, label: 'Clubs', roles: ['department_admin', 'super_admin', 'club_admin'] },
  { to: '/principal', icon: Crown, label: 'Principal', roles: ['principal'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredRoleItems = roleNavItems.filter(
    (item) => item.roles && user && item.roles.includes(user.role)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-[72px] border-r border-gray-200 bg-white transition-all duration-300 hover:w-[244px] group lg:block dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-[60px] items-center border-b border-gray-200 px-3 dark:border-gray-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center">
            <Zap className="h-8 w-8 text-[#0095f6]" />
          </div>
          <span className="hidden whitespace-nowrap text-xl font-semibold group-hover:block bg-gradient-to-r from-[#0095f6] to-[#833ab4] bg-clip-text text-transparent">
            Magnet
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex h-[calc(100vh-120px)] flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {coreNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-xl px-3 py-3 transition-all',
                  isActive
                    ? 'font-bold text-gray-900 dark:text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )
              }
              title={item.label}
            >
              <item.icon className="h-6 w-6 flex-shrink-0" strokeWidth={1.5} />
              <span className="hidden whitespace-nowrap group-hover:block">{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto hidden flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ed4956] px-1.5 text-[10px] font-bold text-white group-hover:flex">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}

          {filteredRoleItems.length > 0 && (
            <>
              <div className="my-4 border-t border-gray-200 dark:border-gray-800" />
              {filteredRoleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-4 rounded-xl px-3 py-3 transition-all',
                      isActive
                        ? 'font-bold text-gray-900 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    )
                  }
                  title={item.label}
                >
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span className="hidden whitespace-nowrap group-hover:block">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </div>

        {/* Bottom Section */}
        <div className="space-y-1">
          <button
            onClick={() => navigate('/settings')}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Settings className="h-6 w-6 flex-shrink-0" />
            <span className="hidden whitespace-nowrap group-hover:block">Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-6 w-6 flex-shrink-0" />
            <span className="hidden whitespace-nowrap group-hover:block">Log out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}

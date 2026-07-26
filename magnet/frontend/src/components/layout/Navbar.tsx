import { Sun, Moon, Menu, Home, Search, CirclePlus, Heart, Globe, MessageCircle, User, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../common/NotificationBell';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const navIcons = [
    { icon: Home, label: 'Home', path: '/feed' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Globe, label: 'Explore', path: '/search' },
  ];

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-full max-w-[975px] items-center justify-between px-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Logo */}
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2"
        >
          <Zap className="h-7 w-7 text-[#0095f6]" />
          <span className="hidden text-xl font-semibold sm:block bg-gradient-to-r from-[#0095f6] to-[#833ab4] bg-clip-text text-transparent">
            Magnet
          </span>
        </button>

        {/* Desktop Search */}
        <div className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              onClick={() => navigate('/search')}
              readOnly
              className="w-[268px] cursor-pointer rounded-lg border-none bg-gray-100 py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:bg-gray-800 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right Nav Icons */}
        <div className="flex items-center gap-1">
          {/* Desktop icons */}
          {navIcons.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="hidden rounded-lg p-2.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 sm:block"
              title={item.label}
            >
              <item.icon className="h-6 w-6" />
            </button>
          ))}

          <NotificationBell />

          <button
            onClick={toggle}
            className="rounded-lg p-2.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="ml-1 rounded-full transition-transform hover:scale-105"
          >
            <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="sm" />
          </button>
        </div>
      </div>
    </header>
  );
}

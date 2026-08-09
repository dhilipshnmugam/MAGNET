import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, MessageCircle, Heart, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessageContext';
import { cn } from '../../utils/helpers';

const items = [
  { to: '/feed', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Heart, label: 'Activity' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function MobileNav() {
  const { user } = useAuth();
  const { unreadCount } = useMessages();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      <div className="flex h-[50px] items-center justify-around">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex h-full w-full flex-col items-center justify-center text-gray-500 transition-colors',
                isActive && 'text-gray-900 dark:text-white'
              )
            }
          >
            <div className="relative">
              <item.icon className="h-6 w-6" />
              {item.label === 'Messages' && unreadCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0095f6] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

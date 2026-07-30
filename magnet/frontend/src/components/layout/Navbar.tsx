import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Menu, Home, Search, CirclePlus, Heart, Globe, MessageCircle, User, Zap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks';
import NotificationBell from '../common/NotificationBell';
import { searchService } from '../../services';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearch.length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    searchService.suggestions(debouncedSearch, 5)
      .then((res) => setSuggestions(res.data.data || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [debouncedSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSuggestionClick = (s: any) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (s.entity_type === 'user') navigate(`/profile/${s.entity_id}`);
    else if (s.entity_type === 'club') navigate(`/clubs/${s.entity_id}`);
    else navigate(`/search?q=${encodeURIComponent(s.text)}`);
  };

  const navIcons = [
    { icon: Home, label: 'Home', path: '/feed' },
    { icon: Globe, label: 'Explore', path: '/search' },
  ];

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-full max-w-[975px] items-center justify-between px-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2"
        >
          <Zap className="h-7 w-7 text-[#0095f6]" />
          <span className="hidden text-xl font-semibold sm:block bg-gradient-to-r from-[#0095f6] to-[#833ab4] bg-clip-text text-transparent">
            Magnet
          </span>
        </button>

        {/* Desktop Search with Suggestions */}
        <div ref={searchRef} className="hidden md:block relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-[268px] rounded-lg border-none bg-gray-100 py-2 pl-10 pr-9 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:bg-gray-800 dark:placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {searchOpen && (suggestions.length > 0 || loadingSuggestions) && (
            <div className="absolute top-full mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
              {loadingSuggestions ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
                  ))}
                </div>
              ) : (
                <>
                  {suggestions.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => handleSuggestionClick(s)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Avatar src={s.avatar_url} name={s.text} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.text}</p>
                        <p className="text-xs text-gray-400 truncate">{s.subtext}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm text-sky-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search for "{searchQuery}"</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
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

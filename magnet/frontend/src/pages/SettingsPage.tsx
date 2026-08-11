import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Settings, Moon, Sun, Bell, Lock, User } from 'lucide-react';

export default function SettingsPage() {
  const { isDark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-gray-500" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="card divide-y dark:divide-gray-700">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500">Toggle between light and dark themes</p>
            </div>
          </div>
          <button onClick={toggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-primary-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-5 w-5" />
            <p className="font-medium">Account</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Name:</span> {user?.full_name}</p>
            <p><span className="text-gray-500">Email:</span> {user?.email}</p>
            <p><span className="text-gray-500">Role:</span> <span className="capitalize">{user?.role}</span></p>
          </div>
        </div>

        <div className="p-5">
          <button onClick={() => { logout(); navigate('/login'); }} className="btn-danger">Log Out</button>
        </div>
      </div>
    </div>
  );
}

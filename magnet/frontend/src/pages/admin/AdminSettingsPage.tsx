import { Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminSettingsPage() {
  const { isDark, toggle } = useTheme();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* App Settings */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">App Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div>
              <p className="font-medium">App Name</p>
              <p className="text-sm text-gray-500">Magnet</p>
            </div>
            <span className="text-sm text-gray-400">Read-only</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div>
              <p className="font-medium">Version</p>
              <p className="text-sm text-gray-500">1.0.0</p>
            </div>
            <span className="text-sm text-gray-400">Read-only</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-gray-500 capitalize">{isDark ? 'dark' : 'light'}</p>
            </div>
            <button onClick={toggle}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
              Toggle Theme
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">More Settings</h2>
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400">Additional settings coming soon</p>
        </div>
      </div>
    </div>
  );
}

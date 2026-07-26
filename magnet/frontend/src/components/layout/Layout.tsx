import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="lg:ml-[72px]">
        {/* Desktop top navbar */}
        <div className="hidden lg:block">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {/* Page content */}
        <main className="pb-20 lg:pb-0 lg:pt-0 pt-[60px]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}

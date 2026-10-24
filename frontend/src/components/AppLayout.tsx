import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, Shield } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('securepm_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('securepm_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Global Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:pl-[72px]' : 'md:pl-64'
        }`}
      >
        {/* Mobile Top Header */}
        <header className="sticky top-0 z-30 flex md:hidden items-center justify-between h-14 px-4 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md">
          <button
            type="button"
            id="mobile-sidebar-toggle"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/projects" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">SecurePM</span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell dropdownPlacement="bottom-right" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full min-w-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

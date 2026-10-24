import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../stores/auth';
import { NotificationBell } from './NotificationBell';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isProjectsActive = location.pathname.startsWith('/projects');
  const isTeamActive = location.pathname.startsWith('/admin/users');
  const isProfileActive = location.pathname === '/profile';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        {/* Brand & Toggle Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80">
          <Link
            to="/projects"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
            title="SecurePM Workspace"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-sm shadow-emerald-500/10 group-hover:border-emerald-500/50 group-hover:scale-105 transition-all flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors truncate">
                  SecurePM
                </span>
                <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest leading-none">
                  Workspace
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            id="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex md:hidden p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {/* Projects & Dashboard Link */}
          <div className="relative group">
            <Link
              to="/projects"
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                isProjectsActive && !isTeamActive && !isProfileActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
              } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Projects</span>}
            </Link>

            {/* Floating Tooltip in Collapsed Rail */}
            {isCollapsed && !isMobileOpen && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Projects
              </div>
            )}
          </div>

          {/* Team Management Link (Admin only) */}
          {user?.role === 'ADMIN' && (
            <div className="relative group">
              <Link
                to="/admin/users"
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  isTeamActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex items-center justify-between w-full">
                    <span>Team</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Admin
                    </span>
                  </div>
                )}
              </Link>

              {/* Floating Tooltip in Collapsed Rail */}
              {isCollapsed && !isMobileOpen && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  Team Management
                </div>
              )}
            </div>
          )}

          {/* Notifications Item */}
          <div className="relative group">
            <div className={isCollapsed && !isMobileOpen ? 'flex justify-center' : ''}>
              <NotificationBell
                showLabel={!isCollapsed || isMobileOpen}
                dropdownPlacement="right-start"
              />
            </div>

            {/* Floating Tooltip in Collapsed Rail */}
            {isCollapsed && !isMobileOpen && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Notifications
              </div>
            )}
          </div>
        </div>

        {/* Footer / Account & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {/* User Profile */}
          <div className="relative group">
            <Link
              to="/profile"
              onClick={onCloseMobile}
              title="Profile Settings"
              className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                isProfileActive
                  ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                  : 'border-transparent text-slate-300 hover:bg-slate-800/60'
              } ${isCollapsed && !isMobileOpen ? 'justify-center p-2' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30 flex-shrink-0">
                {user?.fullName ? (
                  user.fullName.charAt(0).toUpperCase()
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-xs font-semibold text-slate-200 truncate leading-tight">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {user?.role}
                  </span>
                </div>
              )}
            </Link>

            {/* Floating Tooltip in Collapsed Rail */}
            {isCollapsed && !isMobileOpen && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Profile: {user?.fullName || user?.username}
              </div>
            )}
          </div>

          {/* Logout Action */}
          <div className="relative group">
            <button
              type="button"
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 p-2 rounded-xl border border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all text-xs font-medium active:scale-95 ${
                isCollapsed && !isMobileOpen ? 'justify-center p-2' : ''
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Log out</span>}
            </button>

            {/* Floating Tooltip in Collapsed Rail */}
            {isCollapsed && !isMobileOpen && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-rose-300 whitespace-nowrap shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                Log out
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isProjectsActive = location.pathname.startsWith('/projects');
  const isTeamActive = location.pathname.startsWith('/admin/users');
  const isProfileActive = location.pathname === '/profile';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Main Nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/projects"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-sm shadow-emerald-500/10 group-hover:border-emerald-500/50 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              SecurePM
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1.5">
            <Link
              to="/projects"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isProjectsActive && !isTeamActive && !isProfileActive
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Projects</span>
            </Link>

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin/users"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isTeamActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <NotificationBell />

              <Link
                to="/profile"
                title="View your profile settings"
                className={`flex items-center gap-3 pl-2.5 pr-3 py-1.5 rounded-xl border transition-all group ${
                  isProfileActive
                    ? 'bg-slate-800 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-semibold text-xs border border-emerald-500/30 group-hover:scale-105 transition-transform">
                  {user.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-emerald-400 transition-colors">
                    {user.fullName || user.username}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 leading-none mt-0.5">
                    {user.role}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

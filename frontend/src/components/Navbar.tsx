import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LogOut,
  Database,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'ADMIN':
        return {
          label: 'School Admin',
          bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400',
        };
      case 'TEACHER':
        return {
          label: 'Teacher',
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      default:
        return {
          label: 'Student',
          bg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400',
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                EduSecure
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              School Management & Security Suite
            </p>
          </div>
        </Link>

        {/* User state or navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              {/* User details pill */}
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                  {user.username.charAt(0)}
                </div>
                <div className="text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-200 flex items-center gap-1">
                    {user.username}
                    {user.isEmailVerified && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {user.email || 'No email registered'}
                  </div>
                </div>

                {badge && (
                  <span
                    className={`ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                )}
              </div>

              {/* Navigation links */}
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg transition ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg transition ${
                    location.pathname === '/admin'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-purple-300 hover:text-white hover:bg-purple-950/60 border border-purple-500/30'
                  }`}
                >
                  <Database className="w-4 h-4 text-purple-300" />
                  <span className="hidden sm:inline">Admin Panel & Backups</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm transition hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20 transition hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
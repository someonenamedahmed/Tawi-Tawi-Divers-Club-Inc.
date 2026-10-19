import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  User,
  LogOut,
  LogIn,
  SlidersHorizontal,
  Building2,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'user' | 'admin';
  onViewChange: (view: 'user' | 'admin') => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onOpenProfile,
}) => {
  const { user, userProfile, isSuperAdmin, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-950/50 border-b border-cyan-500/20 text-slate-100 shadow-lg shadow-cyan-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Official Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('user')}>
          <div className="w-10 h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-md shadow-cyan-500/20 flex-shrink-0">
            <img
              src="/src/assets/images/tawitawi_divers_logo_1792400280899.jpg"
              alt="Tawi-Tawi Divers Club Inc. Official Logo"
              className="w-full h-full rounded-full object-cover bg-slate-900"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                Tawi-Tawi Divers Club Inc.
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hidden sm:inline-block">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Dive Safety, Quality Audit &amp; Marine Operations
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center space-x-3">
          {user && (
            <>
              {isSuperAdmin && (
                <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700">
                  <button
                    onClick={() => onViewChange('user')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      currentView === 'user'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>My Audit Journal</span>
                  </button>
                  <button
                    onClick={() => onViewChange('admin')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      currentView === 'admin'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Super Admin Console</span>
                  </button>
                </div>
              )}

              {/* Super Admin Badge */}
              {isSuperAdmin && (
                <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </div>
              )}

              {/* Profile Card Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                title="Edit Professional Background"
              >
                {userProfile?.photoURL || user.photoURL || isSuperAdmin ? (
                  <img
                    src={userProfile?.photoURL || user.photoURL || '/src/assets/images/lead_diver_photo_1792400579018.jpg'}
                    alt={user.displayName || 'Divemaster'}
                    className="w-6 h-6 rounded-full object-cover border border-cyan-500/50 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || user.email || 'D')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <span className="block text-slate-200 truncate max-w-[120px]">
                    {userProfile?.role || 'Set Role'}
                  </span>
                </div>
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Sign Out */}
              <button
                onClick={signOutUser}
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 text-slate-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {!user && (
            <button
              onClick={signInWithGoogle}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

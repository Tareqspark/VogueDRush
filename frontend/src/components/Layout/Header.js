import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const PAGE_TITLES = {
  '/':            { title: 'Dashboard',    emoji: '📊' },
  '/orders':      { title: 'Orders',       emoji: '🛒' },
  '/kitchen':     { title: 'Kitchen',      emoji: '🔥' },
  '/tables':      { title: 'Tables',       emoji: '🪑' },
  '/menu':        { title: 'Menu',         emoji: '📖' },
  '/reservations':{ title: 'Reservations', emoji: '📅' },
  '/delivery':    { title: 'Delivery',     emoji: '🚚' },
  '/users':       { title: 'Users',        emoji: '👥' },
  '/reports':     { title: 'Reports',      emoji: '📈' },
  '/settings':    { title: 'Settings',     emoji: '⚙️' },
  '/profile':     { title: 'My Profile',   emoji: '👤' },
};

const ROLE_COLORS = {
  admin:   'bg-sky-100 text-sky-700',
  waiter:  'bg-amber-100 text-amber-700',
  kitchen: 'bg-emerald-100 text-emerald-700',
};

const Header = ({ onMenuClick }) => {
  const { user, logout, selectedBranch, selectBranch } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  const page = PAGE_TITLES[location.pathname] || { title: 'Page', emoji: '📄' };
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.waiter;

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-sky-100 h-16 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30"
      style={{ boxShadow: '0 2px 12px rgb(2 132 199 / 0.06)' }}>

      {/* Mobile menu toggle */}
      <button onClick={onMenuClick} className="lg:hidden btn btn-ghost btn-icon">
        <Bars3Icon className="h-5 w-5 text-slate-500" />
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-lg hidden sm:block">{page.emoji}</span>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-none">{page.title}</h1>
          <p className="text-[11px] text-slate-400 leading-none mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Branch badge */}
        {selectedBranch && (
          <button
            onClick={() => selectBranch(null)}
            title="Switch branch"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
          >
            <BuildingOffice2Icon className="h-3.5 w-3.5" />
            {selectedBranch.name}
            <ArrowsRightLeftIcon className="h-3 w-3 opacity-60" />
          </button>
        )}

        {/* Live status */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* Bell */}
        <button className="btn btn-ghost btn-icon relative">
          <BellIcon className="h-5 w-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-sky-500 rounded-full" />
        </button>

        {/* User avatar dropdown */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)}
            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer transition-all hover:scale-105 ${roleColor}`}>
            {initials}
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-2xl border border-sky-100 animate-fade-in"
                style={{ boxShadow: '0 12px 30px rgb(2 132 199 / 0.12)' }}>

                {/* Profile info */}
                <div className="p-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${roleColor}`}>
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user?.full_name}</p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor} uppercase tracking-wide`}>
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2">
                  <button onClick={() => { navigate('/profile'); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-700 rounded-xl transition-colors">
                    <UserCircleIcon className="h-4 w-4" /> Profile
                  </button>
                  <button onClick={() => { navigate('/settings'); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-700 rounded-xl transition-colors">
                    <Cog6ToothIcon className="h-4 w-4" /> Settings
                  </button>
                  <button onClick={() => { selectBranch(null); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    Switch Branch
                    {selectedBranch && <span className="ml-auto text-xs text-slate-400">{selectedBranch.name}</span>}
                  </button>
                  <div className="border-t border-slate-50 my-1" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                    <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;



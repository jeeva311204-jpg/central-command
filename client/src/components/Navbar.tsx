import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  UserCheck,
  LogOut,
  Layers,
  ChevronDown,
  Check,
  FileText,
  Cpu,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { NotificationItem } from '../types';

export function Navbar() {
  const { user, switchUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Load demo users for switcher
  useEffect(() => {
    api.getDemoUsers().then(setDemoUsers).catch(console.error);
  }, []);

  // Poll notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // ignore
    }
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchModal(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search handler
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.search(q);
      setSearchResults(res);
      setShowSearchModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-industrial-900 border-b border-industrial-200 dark:border-industrial-800 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-industrial-950 dark:text-white">
                ChangeFlow
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-industrial-400 leading-none">
              4M Change Management • CAPEX • Procurement
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div ref={searchRef} className="relative w-80 lg:w-96 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
            <input
              type="text"
              placeholder="Search proposals, assets, 4M changes, POs..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchModal(true)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-industrial-100/70 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Search dropdown modal */}
          {showSearchModal && searchResults && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto space-y-3">
              {searchResults.proposals?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">
                    Proposals
                  </div>
                  {searchResults.proposals.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        navigate(`/proposals/${p.id}`);
                        setShowSearchModal(false);
                      }}
                      className="p-2 rounded-lg hover:bg-industrial-50 dark:hover:bg-industrial-800 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400 mr-2">
                          {p.proposalNumber}
                        </span>
                        <span className="text-industrial-800 dark:text-industrial-200">{p.title}</span>
                      </div>
                      <span className="text-[10px] text-industrial-400">{p.department?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.assets?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">
                    Machinery Assets
                  </div>
                  {searchResults.assets.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        navigate(`/assets`);
                        setShowSearchModal(false);
                      }}
                      className="p-2 rounded-lg hover:bg-industrial-50 dark:hover:bg-industrial-800 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-emerald-600 mr-2">{a.assetCode}</span>
                        <span className="text-industrial-800 dark:text-industrial-200">{a.name}</span>
                      </div>
                      <span className="text-[10px] text-industrial-400">{a.department?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.changes4m?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">
                    4M Changes
                  </div>
                  {searchResults.changes4m.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        navigate(`/changes4m/${c.id}`);
                        setShowSearchModal(false);
                      }}
                      className="p-2 rounded-lg hover:bg-industrial-50 dark:hover:bg-industrial-800 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="text-industrial-800 dark:text-industrial-200 truncate">{c.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                        {c.changeCategory}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!searchResults.proposals?.length &&
                !searchResults.assets?.length &&
                !searchResults.changes4m?.length && (
                  <div className="text-center py-4 text-xs text-industrial-400">
                    No results matching "{searchQuery}"
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right: Demo Role Switcher, Notifications, Theme, User */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Role Switcher */}
          <div ref={roleRef} className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors"
              title="Switch demo role instantly for presentation"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Role: <strong>{typeof user?.role === 'object' ? user.role.name : (user?.role || 'Guest')}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl shadow-2xl p-2 z-50">
                <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-industrial-400 border-b border-industrial-100 dark:border-industrial-800 mb-1">
                  Instant Demo Persona Switcher
                </div>
                <div className="max-h-72 overflow-y-auto space-y-0.5">
                  {demoUsers.map((u) => {
                    const isCurrent = user?.email === u.email;
                    return (
                      <button
                        key={u.id}
                        onClick={async () => {
                          await switchUser(u.email);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-brand-500 text-white font-bold'
                            : 'hover:bg-industrial-100 dark:hover:bg-industrial-800 text-industrial-800 dark:text-industrial-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{u.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                isCurrent
                                  ? 'bg-white/20 text-white'
                                  : 'bg-industrial-200 dark:bg-industrial-700 text-industrial-700 dark:text-industrial-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <div className={`text-[10px] opacity-75 truncate`}>{u.department}</div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-industrial-500 hover:text-industrial-800 dark:hover:text-white hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-industrial-100 dark:border-industrial-800">
                  <span className="text-xs font-bold text-industrial-900 dark:text-industrial-100">
                    Notifications ({unreadCount} new)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-brand-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-industrial-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.linkUrl) navigate(n.linkUrl);
                          setShowNotifications(false);
                        }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          n.isRead
                            ? 'bg-white dark:bg-industrial-900 border-industrial-100 dark:border-industrial-800 opacity-75'
                            : 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800/50'
                        }`}
                      >
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100">
                          {n.title}
                        </div>
                        <p className="text-[11px] text-industrial-600 dark:text-industrial-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-industrial-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-industrial-500 hover:text-industrial-800 dark:hover:text-white hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors"
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-industrial-200 dark:border-industrial-800">
            <div className="w-7 h-7 rounded-full bg-industrial-800 dark:bg-industrial-700 text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.name ? user.name.slice(0, 2) : 'CF'}
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-industrial-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

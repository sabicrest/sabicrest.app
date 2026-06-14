/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, NotificationAlert } from '../types';
import { db } from '../db';
import { Bell, LogOut, CheckCircle, Shield, Menu, X, Terminal, Sparkles, AlertTriangle, MessageSquare, Search, Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import sabicrestLogo from '../assets/images/sabicrest_logo_1780580951205.png';

interface NavigationProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string; icon: any }[];
}

export default function Navigation({ currentUser, onLogout, activeTab, setActiveTab, tabs }: NavigationProps) {
  const [notifs, setNotifs] = useState<NotificationAlert[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Theme states & responsive bindings
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>(() => {
    const existing = localStorage.getItem('sabicrest_theme_mode');
    if (!existing) {
      try {
        localStorage.setItem('sabicrest_theme_mode', 'light');
      } catch (e) {}
      return 'light';
    }
    return existing as 'dark' | 'light' | 'system';
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const themeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleThemeUpdate = () => {
      const mode = (localStorage.getItem('sabicrest_theme_mode') as 'dark' | 'light' | 'system') || 'light';
      setThemeMode(mode);
    };
    window.addEventListener('sabicrest-theme-change', handleThemeUpdate);
    return () => {
      window.removeEventListener('sabicrest-theme-change', handleThemeUpdate);
    };
  }, []);

  useEffect(() => {
    function handleClickOutsideTheme(event: Event) {
      if (showThemeDropdown && themeContainerRef.current && !themeContainerRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideTheme);
    document.addEventListener('touchstart', handleClickOutsideTheme);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTheme);
      document.removeEventListener('touchstart', handleClickOutsideTheme);
    };
  }, [showThemeDropdown]);

  const handleThemeChange = (mode: 'dark' | 'light' | 'system') => {
    localStorage.setItem('sabicrest_theme_mode', mode);
    setThemeMode(mode);
    window.dispatchEvent(new CustomEvent('sabicrest-theme-change'));
  };

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (showNotifDropdown && notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifDropdown]);

  useEffect(() => {
    setNavSearchQuery('');
    setShowSearchInput(false);
    window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: '' }));
  }, [activeTab]);

  // Load and refresh notifications list
  const loadNotifications = () => {
    const alerts = db.getNotifications().filter(n => n.userId === currentUser.id || n.userId === 'all');
    setNotifs(alerts);
  };

  const loadChatCount = () => {
    const allMsgs = db.getMessages();
    let lastReadMap: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('sabicrest_last_read_map');
      if (saved) {
        lastReadMap = JSON.parse(saved);
      }
    } catch (e) {}

    let unreadTotal = 0;

    // 1. Unread from Channels
    const channels = ['team-general', 'team-collaboration', 'design-showcase', 'technical-support'];
    channels.forEach(chanId => {
      const channelMsgs = allMsgs.filter(m => m.channelId === chanId && m.senderId !== currentUser.id);
      if (channelMsgs.length > 0) {
        const lastReadId = lastReadMap[`channel-${chanId}`];
        if (!lastReadId) {
          unreadTotal += channelMsgs.length;
        } else {
          const idx = channelMsgs.findIndex(m => m.id === lastReadId);
          if (idx !== -1) {
            unreadTotal += channelMsgs.slice(idx + 1).length;
          } else {
            // Find message and check timestamp
            const lastReadMsg = allMsgs.find(m => m.id === lastReadId);
            if (lastReadMsg) {
              const lastReadTime = new Date(lastReadMsg.timestamp).getTime();
              unreadTotal += channelMsgs.filter(m => new Date(m.timestamp).getTime() > lastReadTime).length;
            } else {
              unreadTotal += channelMsgs.length;
            }
          }
        }
      }
    });

    // 2. Unread from DMs
    const unreadDMs = allMsgs.filter(m => m.receiverId === currentUser.id && m.senderId !== currentUser.id && m.read !== true);
    unreadTotal += unreadDMs.length;

    setChatCount(unreadTotal);
  };

  useEffect(() => {
    db.markMessagesDelivered(currentUser.id);
    loadNotifications();
    loadChatCount();
    const interval = setInterval(() => {
      db.markMessagesDelivered(currentUser.id);
      loadNotifications();
      loadChatCount();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead(currentUser.id);
    loadNotifications();
  };

  const handleDismissNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    db.clearNotification(id);
    loadNotifications();
  };

  return (
    <nav id="sabicrest-nav" className="bg-white border-b border-zinc-100 fixed top-0 left-0 right-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-10">
            <div id="nav-brand" className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(tabs[0].id)}>
              <div className="w-8 h-8 bg-zinc-100 border border-zinc-200 flex items-center justify-center rounded-none overflow-hidden shadow-xs">
                <img
                  src={sabicrestLogo}
                  alt="Sabicrest Logo"
                  className="w-full h-full rounded-none object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-black">
                Sabicrest
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex space-x-1.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-link-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-light tracking-wide transition-all uppercase cursor-pointer ${
                      isActive
                        ? 'bg-brand-black text-white font-medium'
                        : 'text-zinc-500 hover:text-brand-black hover:bg-zinc-50'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-brand-yellow' : 'text-zinc-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Settings & Notifications Panel */}
          <div className="flex items-center gap-3">
            
            {/* Functional Search Icon & Expandable Input Bar */}
            <div className="relative flex items-center">
              {showSearchInput ? (
                <div className="hidden md:flex items-center gap-1.5 animate-in slide-in-from-right-3 duration-150">
                  <input
                    type="text"
                    id="nav-search-bar-input"
                    placeholder="Search current view..."
                    value={navSearchQuery}
                    onChange={(e) => {
                      setNavSearchQuery(e.target.value);
                      window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: e.target.value }));
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-brand-black placeholder-zinc-400 focus:outline-hidden focus:border-brand-yellow font-light w-36 sm:w-48"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setNavSearchQuery('');
                      setShowSearchInput(false);
                      window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: '' }));
                    }}
                    className="text-zinc-400 hover:text-black p-1 cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
              
              <button
                id="nav-search-trigger-btn"
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`p-2 transition-all cursor-pointer rounded-xl ${
                  showSearchInput 
                    ? 'text-brand-yellow bg-zinc-900 md:hidden' 
                    : 'text-zinc-400 hover:text-brand-black hover:bg-zinc-50'
                }`}
                title={showSearchInput ? "Close Search" : "Search Current View"}
              >
                {showSearchInput ? <X size={18} /> : <Search size={18} />}
              </button>
            </div>

            {/* Realtime Chats Icon Badge */}
            <button
              id="header-chats-trigger"
              onClick={() => setActiveTab('messaging')}
              className={`hidden md:flex p-2 text-zinc-400 hover:text-brand-black hover:bg-zinc-50 rounded-xl transition-all relative cursor-pointer ${
                activeTab === 'messaging' ? 'text-black bg-zinc-100' : ''
              }`}
              title="Open Secure Chats"
            >
              <MessageSquare size={18} />
              {chatCount > 0 && (
                <span id="chat-count-counter" className="absolute top-1 right-1 w-4 h-4 bg-brand-yellow text-brand-black text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {chatCount}
                </span>
              )}
            </button>

            {/* Realtime Notification Bell Icon dropdown */}
            <div ref={notifContainerRef} className="relative">
              <button
                id="noti-bell-trigger"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 text-zinc-400 hover:text-brand-black hover:bg-zinc-50 rounded-xl transition-all relative cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span id="noti-unread-indicator" className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-yellow text-brand-black text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown menu */}
              {showNotifDropdown && (
                <div id="noti-dropdown-box" className="fixed sm:absolute top-16 sm:top-auto left-4 sm:left-auto right-4 sm:right-0 mx-auto sm:mx-0 mt-2 w-auto sm:w-80 max-w-[calc(100vw-2rem)] sm:max-w-none bg-white border border-zinc-100 rounded-2xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-150">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-50">
                    <span className="text-xs font-medium text-brand-black tracking-wide uppercase">Real-Time Alerts</span>
                    {unreadCount > 0 && (
                      <button
                        id="noti-mark-read-btn"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-brand-gray hover:text-brand-black transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
                    {notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-zinc-400 text-xs font-light">
                        No general or direct system threats detected. Safe.
                      </div>
                    ) : (
                      notifs.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 hover:bg-zinc-50/50 transition-all text-xs relative ${
                            !n.read ? 'bg-amber-50/10 border-l-2 border-brand-yellow' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-medium text-brand-black tracking-tight">{n.title}</span>
                            <button
                              onClick={(e) => handleDismissNotif(n.id, e)}
                              className="text-zinc-300 hover:text-zinc-600 font-bold px-1"
                              title="Dismiss"
                            >
                              &times;
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-500 font-light leading-relaxed">{n.message}</p>
                          <span className="text-[8px] text-zinc-300 font-mono italic block mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clickable Header Profile Icon (desktop/tablet/mobile) */}
            <button
              id="header-profile-icon"
              onClick={() => setActiveTab('profile')}
              className={`hidden md:flex w-7 h-7 rounded-full overflow-hidden border transition-all cursor-pointer shrink-0 ${
                activeTab === 'profile' ? 'border-brand-yellow ring-2 ring-brand-yellow/30' : 'border-zinc-200 hover:border-zinc-400'
              }`}
              title="Aesthetic Profile Settings"
            >
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt="Current workspace user" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold font-mono">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Interactive Theme Selector Dropdown */}
            <div className="relative flex items-center" ref={themeContainerRef}>
              <button
                id="theme-menu-trigger"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="p-2 text-zinc-400 hover:text-brand-black hover:bg-zinc-50 rounded-xl transition-all relative cursor-pointer flex items-center justify-center"
                title="Choose Theme Preset"
              >
                {themeMode === 'light' && <Sun size={17} />}
                {themeMode === 'dark' && <Moon size={17} />}
                {themeMode === 'system' && <Monitor size={17} />}
              </button>
              {showThemeDropdown && (
                <div 
                  id="theme-dropdown-box" 
                  className="absolute right-0 top-11 w-36 bg-white border border-zinc-100 rounded-2xl shadow-lg py-1.5 z-50 animate-in face-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-3 py-1 text-[9px] uppercase tracking-wider font-light text-brand-gray border-b border-zinc-50 mb-1 select-none">
                    Theme Mode
                  </div>
                  {[
                    { id: 'dark', label: 'Dark Style', icon: Moon },
                    { id: 'light', label: 'Light Style', icon: Sun },
                    { id: 'system', label: 'System Sync', icon: Monitor }
                  ].map(item => {
                    const ItemIcon = item.icon;
                    const isSelected = themeMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleThemeChange(item.id as any);
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer font-light ${
                          isSelected ? 'bg-zinc-50 font-medium text-brand-black' : 'text-zinc-650 hover:bg-zinc-50/50'
                        }`}
                      >
                        <ItemIcon size={13} className={isSelected ? 'text-brand-yellow' : 'text-zinc-400'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile Brief Badge clickable */}
            <div
              id="nav-profile-badge"
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex items-center gap-2.5 bg-zinc-50 border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-100/50 py-1.5 pl-2.5 pr-3.5 rounded-2xl cursor-pointer transition-all"
              title="View Profile Settings"
            >
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-zinc-200 referrerPolicy='no-referrer'" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="text-left leading-none">
                <div className="text-xs font-medium text-brand-black">{currentUser.name}</div>
                <div className="text-[9px] text-brand-gray font-mono uppercase mt-0.5 flex items-center gap-0.5">
                  {currentUser.verified ? (
                    <CheckCircle size={8} className="text-brand-yellow" />
                  ) : (
                    <Shield size={8} className="text-zinc-300" />
                  )}
                  {currentUser.role}
                </div>
              </div>
            </div>

            {/* Logout control button */}
            <button
              id="logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden md:flex p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50/40 rounded-xl transition-all cursor-pointer items-center justify-center"
              title="End Secure Session"
            >
              <LogOut size={16} />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden text-zinc-500 hover:text-brand-black rounded-xl transition-all cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Menu Draw Down Panel */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-links" className="md:hidden border-t border-zinc-100 bg-white px-4 py-3 space-y-1.5 animate-in slide-in-from-top-5 duration-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-light tracking-wide uppercase text-left transition-all ${
                  isActive ? 'bg-brand-black text-white font-medium' : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-brand-yellow' : 'text-zinc-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Mobile Theme Selector Settings */}
          <div className="pt-2 pb-1 border-t border-zinc-100 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider font-light text-brand-gray px-4">Workspace Theme</span>
            <div className="flex gap-1 bg-zinc-50 border border-zinc-100 p-1 rounded-2xl mx-2">
              {[
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'system', label: 'System', icon: Monitor }
              ].map(item => {
                const ItemIcon = item.icon;
                const isSelected = themeMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleThemeChange(item.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-light transition-all cursor-pointer ${
                      isSelected ? 'bg-brand-black text-white font-medium' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <ItemIcon size={12} className={isSelected ? 'text-brand-yellow' : 'text-zinc-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile & Tablet Logout Action Button Item */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setShowLogoutConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide uppercase text-left transition-all text-red-500 hover:bg-red-50 bg-red-50/10 cursor-pointer"
          >
            <LogOut size={14} className="text-red-500" />
            <span>Sign Out Session</span>
          </button>
        </div>
      )}

      {/* Logout Confirmation popover overlay modal */}
      {showLogoutConfirm && (
        <div 
          id="logout-confirm-overlay" 
          onClick={() => setShowLogoutConfirm(false)}
          className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200"
        >
          <div 
            id="logout-confirm-card" 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-zinc-100 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-brand-black">
                  Confirm Account Logout
                </h4>
                <p className="text-xs text-brand-gray font-light leading-relaxed">
                  Are you sure you want to end your secure session? You will need to authenticate again to access the Sabicrest dashboards.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                id="logout-confirm-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="logout-confirm-agree-btn"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Glassmorphic Search Interface - flapped just under the header */}
      <AnimatePresence>
        {showSearchInput && (
          <motion.div
            id="mobile-glass-search-panel"
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="md:hidden absolute top-[64px] left-0 right-0 bg-white/70 backdrop-blur-md border-b border-zinc-200/50 py-3.5 px-4 shadow-lg z-35 overflow-hidden"
          >
            <div className="flex items-center gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="nav-search-bar-input-mobile"
                  placeholder="Search current view..."
                  value={navSearchQuery}
                  onChange={(e) => {
                    setNavSearchQuery(e.target.value);
                    window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: e.target.value }));
                  }}
                  className="w-full bg-white/90 border border-zinc-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-brand-black placeholder-zinc-400 focus:outline-hidden focus:border-brand-yellow font-light shadow-2xs"
                  autoFocus
                />
                <Search size={14} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: navSearchQuery }));
                }}
                className="bg-brand-black hover:bg-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavSearchQuery('');
                  setShowSearchInput(false);
                  window.dispatchEvent(new CustomEvent('sabicrest-search', { detail: '' }));
                }}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center border border-zinc-100"
                title="Close Search"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

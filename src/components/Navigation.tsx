/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, NotificationAlert } from '../types';
import { db } from '../db';
import { Bell, LogOut, CheckCircle, Shield, Menu, X, Terminal, Sparkles, AlertTriangle, MessageSquare } from 'lucide-react';
// @ts-ignore
import sabicrestLogo from '../assets/images/sabicrest_logo_1780159096569.png';

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

  // Load and refresh notifications list
  const loadNotifications = () => {
    const alerts = db.getNotifications().filter(n => n.userId === currentUser.id || n.userId === 'all');
    setNotifs(alerts);
  };

  const loadChatCount = () => {
    const total = db.getMessages().filter(m => 
      !m.receiverId || 
      m.receiverId === currentUser.id || 
      m.senderId === currentUser.id
    ).length;
    setChatCount(total);
  };

  useEffect(() => {
    loadNotifications();
    loadChatCount();
    const interval = setInterval(() => {
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
            
            {/* Realtime Chats Icon Badge */}
            <button
              id="header-chats-trigger"
              onClick={() => setActiveTab('messaging')}
              className={`p-2 text-zinc-400 hover:text-brand-black hover:bg-zinc-50 rounded-xl transition-all relative cursor-pointer ${
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

            {/* Clickable Header Profile Icon (desktop/tablet/mobile) */}
            <button
              id="header-profile-icon"
              onClick={() => setActiveTab('profile')}
              className={`w-7 h-7 rounded-full overflow-hidden border transition-all cursor-pointer ${
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

            {/* Realtime Notification Bell Icon dropdown */}
            <div className="relative">
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
        <div id="logout-confirm-overlay" className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div id="logout-confirm-card" className="bg-white border border-zinc-100 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
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
    </nav>
  );
}

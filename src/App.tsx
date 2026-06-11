/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from './types';
import { db } from './db';
import LoginScreen from './components/LoginScreen';
import Navigation from './components/Navigation';
import DashboardStudent from './components/DashboardStudent';
import DashboardTrainer from './components/DashboardTrainer';
import DashboardAdmin from './components/DashboardAdmin';
import Messaging from './components/Messaging';
import Scheduling from './components/Scheduling';
import TeamCollaboration from './components/TeamCollaboration';
import StudentSettings from './components/StudentSettings';
import TrainerCourses from './components/TrainerCourses';
import SupabaseConsole from './components/SupabaseConsole';
import { LayoutDashboard, MessageSquare, CalendarDays, Users, ShieldAlert, Settings, Home, BookOpen, FileText, User as UserIcon } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sabicrest_current_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('sabicrest_active_tab') || 'dashboard';
  });

  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('sabicrest_theme_mode') as 'dark' | 'light' | 'system') || 'light';
  });

  // Keep saved theme mode synchronized and responsive to system preference shifts
  useEffect(() => {
    const applyTheme = () => {
      let active: 'dark' | 'light' = 'dark';
      if (themeMode === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        active = isSystemDark ? 'dark' : 'light';
      } else {
        active = themeMode;
      }

      const root = document.documentElement;
      if (active === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Sync browser accent theme-color with current mode background
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', active === 'dark' ? '#0a0a0b' : '#ffffff');
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Keep saved theme settings updated with standard custom custom-events
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

  // Keep saved user session state synchronized with store
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sabicrest_current_user', JSON.stringify(currentUser));
      if (currentUser.avatar) {
        localStorage.setItem('sabicrest_last_user_avatar', currentUser.avatar);
      }
    } else {
      localStorage.removeItem('sabicrest_current_user');
    }
  }, [currentUser]);

  // Keep saved active tab synchronized with store and history state
  useEffect(() => {
    localStorage.setItem('sabicrest_active_tab', activeTab);
    const currentHistoryState = window.history.state;
    if (!currentHistoryState || currentHistoryState.tab !== activeTab) {
      window.history.pushState({ tab: activeTab }, '', `#${activeTab}`);
    }
  }, [activeTab]);

  // Listen to popstate events to handle back button navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        // Fallback or default
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Replace the initial state with the default tab to initialize the stream
    if (!window.history.state) {
      window.history.replaceState({ tab: activeTab }, '', `#${activeTab}`);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Scroll to the very top of the page when the active tab/page mounts or changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const [chatCount, setChatCount] = useState(0);

  const loadChatCount = () => {
    if (!currentUser) return;
    const allMsgs = db.getMessages();
    let lastReadMap: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('sabicrest_last_read_map');
      if (saved) {
        lastReadMap = JSON.parse(saved);
      }
    } catch (e) {}

    let unreadTotal = 0;
    const channels = ['team-general', 'team-collaboration', 'design-showcase', 'technical-support'];
    channels.forEach(chanId => {
      const channelMsgs = allMsgs.filter(m => m.channelId === chanId && m.senderId !== currentUser.id);
      if (channelMsgs.length > 0) {
        const lastReadId = lastReadMap[`channel-${chanId}`];
        if (!lastReadId) {
          unreadTotal += channelMsgs.length;
        } else {
          const lastReadMsg = allMsgs.find(m => m.id === lastReadId);
          if (lastReadMsg) {
            const lastReadTime = new Date(lastReadMsg.timestamp).getTime();
            unreadTotal += channelMsgs.filter(m => new Date(m.timestamp).getTime() > lastReadTime).length;
          } else {
            unreadTotal += channelMsgs.length;
          }
        }
      }
    });

    const unreadDMs = allMsgs.filter(m => m.receiverId === currentUser.id && m.senderId !== currentUser.id && m.read !== true);
    unreadTotal += unreadDMs.length;

    setChatCount(unreadTotal);
  };

  useEffect(() => {
    if (currentUser) {
      loadChatCount();
      const interval = setInterval(loadChatCount, 2000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Maintain active user state and reflect admin modifications in real-time
  const syncUserState = () => {
    if (currentUser) {
      const refreshedUser = db.getUserById(currentUser.id);
      if (refreshedUser) {
        // If current session is verified admin, preserve the admin role state
        const synced = { ...refreshedUser };
        if (currentUser.role === 'admin') {
          synced.role = 'admin';
        }
        // If status changed or attributes updated, sync them immediately
        if (JSON.stringify(synced) !== JSON.stringify(currentUser)) {
          setCurrentUser(synced);
        }
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(syncUserState, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle successful secure login or session restoration
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    localStorage.removeItem('sabicrest_current_user');
    localStorage.removeItem('sabicrest_active_tab');
  };

  if (!currentUser) {
    return (
      <div id="sabicrest-unauth-frame" className="bg-white min-h-screen">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Suspended account block page (demonstrates real-time security governance in audits)
  if (currentUser.status === 'suspended') {
    return (
      <div id="suspended-security-panel" className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-white border border-red-100 rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <ShieldAlert size={32} className="animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-xl font-light tracking-tight text-zinc-900">
            Account <span className="font-semibold text-red-600">Access Suspended</span>
          </h2>
          
          <p className="text-xs font-light text-zinc-500 leading-relaxed">
            Your Sabicrest account has been suspended by the platform administrator. Access to the portal is temporarily disabled.
          </p>

          <button
            id="suspended-return-login"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Return to Sign-In Gateway
          </button>
        </div>
      </div>
    );
  }

  // Get active navigation tabs based on roles
  const getRoleTabs = (): { id: string; label: string; icon: any }[] => {
    switch (currentUser.role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Home', icon: Home },
          { id: 'courses', label: 'Courses', icon: BookOpen },
          { id: 'messaging', label: 'Chats', icon: MessageSquare },
          { id: 'tasks', label: 'Tasks', icon: FileText },
          { id: 'profile', label: 'Profile', icon: UserIcon }
        ];
      case 'trainer':
        return [
          { id: 'dashboard', label: 'Space', icon: LayoutDashboard },
          { id: 'messaging', label: 'Chats', icon: MessageSquare },
          { id: 'scheduling', label: 'My Courses', icon: BookOpen },
          { id: 'profile', label: 'Settings', icon: Settings }
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Space', icon: LayoutDashboard },
          { id: 'messaging', label: 'Chats', icon: MessageSquare },
          { id: 'scheduling', label: 'Schedules', icon: CalendarDays },
          { id: 'profile', label: 'Settings', icon: Settings }
        ];
      default:
        return [];
    }
  };

  const tabs = getRoleTabs();

  // Route screen rendering content based on the active state
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'courses':
      case 'tasks':
        if (currentUser.role === 'student') {
          return <DashboardStudent currentUser={currentUser} activeTab={activeTab} onNavigateChange={(tabId) => setActiveTab(tabId)} />;
        } else if (currentUser.role === 'trainer') {
          return <DashboardTrainer currentUser={currentUser} />;
        } else if (currentUser.role === 'admin') {
          return <DashboardAdmin currentUser={currentUser} />;
        }
        return null;

      case 'messaging':
        return <Messaging currentUser={currentUser} />;
      
      case 'scheduling':
        if (currentUser.role === 'trainer') {
          return <TrainerCourses currentUser={currentUser} />;
        }
        return <Scheduling currentUser={currentUser} />;
      
      case 'collaboration':
        if (currentUser.role === 'student') {
          return <TeamCollaboration currentUser={currentUser} />;
        }
        return <div className="p-8 text-center text-zinc-400">Collaboration panels restricted to students.</div>;

      case 'profile':
        return <StudentSettings currentUser={currentUser} onUserUpdate={setCurrentUser} />;

      default:
        return <div className="p-8 text-center text-zinc-400">View segment not found in compilation path.</div>;
    }
  };

  return (
    <div id="app-viewport-enclosure" className="min-h-screen bg-white pb-24 lg:pb-14 font-sans text-brand-black relative">
      
      {/* Top Header layout */}
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
      />

      {/* Main interactive section grid - pt-16 is added to prevent overlap behind fixed header */}
      <main id="app-workspace-body" className="pt-16 animate-in fade-in slide-in-from-bottom-2 duration-200">
        {renderActiveTabContent()}
      </main>

      {/* Mobile & Tablet Elegant Sticky Floating Glass Bottom Nav Bar */}
      {(currentUser.role === 'student' || currentUser.role === 'trainer') && (
        <div 
          id="sabicrest-mobile-bottom-nav" 
          className="lg:hidden fixed bottom-4 left-4 right-4 z-50 h-16 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl flex items-center justify-around px-2"
        >
          {(currentUser.role === 'student'
            ? [
                { id: 'dashboard', label: 'Home', icon: Home },
                { id: 'courses', label: 'Courses', icon: BookOpen },
                { id: 'messaging', label: 'Chats', icon: MessageSquare, badge: chatCount > 0 ? chatCount : 0 },
                { id: 'tasks', label: 'Tasks', icon: FileText },
                { id: 'profile', label: 'Profile', icon: UserIcon },
              ]
            : [
                { id: 'dashboard', label: 'Space', icon: LayoutDashboard },
                { id: 'messaging', label: 'Chats', icon: MessageSquare, badge: chatCount > 0 ? chatCount : 0 },
                { id: 'scheduling', label: 'My Courses', icon: BookOpen },
                { id: 'profile', label: 'Settings', icon: Settings },
              ]
          ).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (currentUser.role === 'student') {
                    if (item.id === 'courses') {
                      window.dispatchEvent(new CustomEvent('sabicrest-subtab-change', { detail: 'register' }));
                    } else if (item.id === 'tasks') {
                      window.dispatchEvent(new CustomEvent('sabicrest-subtab-change', { detail: 'assignments' }));
                    } else if (item.id === 'dashboard') {
                      window.dispatchEvent(new CustomEvent('sabicrest-subtab-change', { detail: 'assignments' }));
                    }
                  }
                }}
                className="flex-1 flex items-center justify-center h-full py-1 relative cursor-pointer"
              >
                <div 
                  className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-300 w-full max-w-[76px] h-[85%] ${
                    isActive 
                      ? 'bg-brand-yellow text-black font-semibold scale-105 active-nav-item' 
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-350 dark:hover:text-white inactive-nav-item'
                  }`}
                >
                  <div className="relative">
                    <Icon 
                      size={24} 
                      strokeWidth={1.5}
                      className={`transition-colors ${
                        isActive 
                          ? 'text-black' 
                          : 'text-zinc-500 dark:text-brand-yellow'
                      }`} 
                    />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-1 text-[8px] font-extrabold rounded-full flex items-center justify-center shadow-xs border ${
                        isActive 
                          ? 'bg-black text-brand-yellow border-brand-yellow/30' 
                          : 'bg-brand-yellow text-brand-black border-transparent'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span 
                    className={`text-[9px] tracking-tight font-medium mt-0.5 transition-colors leading-none select-none ${
                      isActive ? 'text-black font-bold' : 'text-zinc-500 dark:text-zinc-350 font-normal'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {currentUser.role === 'admin' && <SupabaseConsole />}

    </div>
  );
}

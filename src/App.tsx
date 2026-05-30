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
import SabicrestHub from './components/SabicrestHub';
import StudentSettings from './components/StudentSettings';
import { LayoutDashboard, MessageSquare, CalendarDays, Users, ShieldAlert, Compass, Settings } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Scroll to the very top of the page when the active tab/page mounts or changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Maintain active user state and reflect admin modifications in real-time
  const syncUserState = () => {
    if (currentUser) {
      const refreshedUser = db.getUserById(currentUser.id);
      if (refreshedUser) {
        // If status changed or attributes updated, sync them immediately
        if (JSON.stringify(refreshedUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(refreshedUser);
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
          { id: 'dashboard', label: 'Student Space', icon: LayoutDashboard },
          { id: 'hub', label: 'Sabicrest Hub', icon: Compass },
          { id: 'messaging', label: 'Secure Chat', icon: MessageSquare },
          { id: 'scheduling', label: 'Scheduling', icon: CalendarDays },
          { id: 'collaboration', label: 'Horizon Team', icon: Users },
          { id: 'profile', label: 'Profile Settings', icon: Settings }
        ];
      case 'trainer':
        return [
          { id: 'dashboard', label: 'Trainer Hub', icon: LayoutDashboard },
          { id: 'hub', label: 'Sabicrest Hub', icon: Compass },
          { id: 'messaging', label: 'Secure Chat', icon: MessageSquare },
          { id: 'scheduling', label: 'Scheduling', icon: CalendarDays }
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'System Admin', icon: LayoutDashboard },
          { id: 'hub', label: 'Sabicrest Hub', icon: Compass },
          { id: 'messaging', label: 'Secure Chat', icon: MessageSquare },
          { id: 'scheduling', label: 'Scheduling', icon: CalendarDays }
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
        if (currentUser.role === 'student') {
          return <DashboardStudent currentUser={currentUser} onNavigateChange={(tabId) => setActiveTab(tabId)} />;
        } else if (currentUser.role === 'trainer') {
          return <DashboardTrainer currentUser={currentUser} />;
        } else if (currentUser.role === 'admin') {
          return <DashboardAdmin currentUser={currentUser} />;
        }
        return null;
      
      case 'hub':
        return <SabicrestHub currentUser={currentUser} />;

      case 'messaging':
        return <Messaging currentUser={currentUser} />;
      
      case 'scheduling':
        return <Scheduling currentUser={currentUser} />;
      
      case 'collaboration':
        if (currentUser.role === 'student') {
          return <TeamCollaboration currentUser={currentUser} />;
        }
        return <div className="p-8 text-center text-zinc-400">Collaboration panels restricted to students.</div>;

      case 'profile':
        if (currentUser.role === 'student') {
          return <StudentSettings currentUser={currentUser} />;
        }
        return <div className="p-8 text-center text-zinc-400">Profile Settings restricted to students.</div>;

      default:
        return <div className="p-8 text-center text-zinc-400">View segment not found in compilation path.</div>;
    }
  };

  return (
    <div id="app-viewport-enclosure" className="min-h-screen bg-white pb-14 font-sans text-brand-black relative">
      
      {/* Top Header layout */}
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
      />

      {/* Main interactive section grid */}
      <main id="app-workspace-body" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
        {renderActiveTabContent()}
      </main>

    </div>
  );
}

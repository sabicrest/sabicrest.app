/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, NotificationAlert } from '../types';
import { db } from '../db';
import { Sliders, Bell, User as UserIcon, Mail, Phone, MapPin, Activity, SlidersHorizontal, BookOpen, UserCheck, ShieldAlert } from 'lucide-react';

interface StudentSettingsProps {
  currentUser: User;
}

export default function StudentSettings({ currentUser }: StudentSettingsProps) {
  // Profile fields state
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileSlack, setProfileSlack] = useState(currentUser.slackHandle || '');
  const [profileLoc, setProfileLoc] = useState(currentUser.location || '');
  const [profileBio, setProfileBio] = useState(currentUser.bio || '');
  const [profileSkillsText, setProfileSkillsText] = useState((currentUser.skills || []).join(', '));

  // Workspace settings switches
  const [prefEmailAlerts, setPrefEmailAlerts] = useState(true);
  const [prefSlackSync, setPrefSlackSync] = useState(true);
  const [prefSoundEffects, setPrefSoundEffects] = useState(true);
  const [workspaceAccent, setWorkspaceAccent] = useState<'gold' | 'emerald' | 'indigo'>('gold');

  // Notifications State
  const [studentNotifs, setStudentNotifs] = useState<NotificationAlert[]>([]);

  // Toast confirmation message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadNotifs = () => {
    setStudentNotifs(db.getNotifications().filter(n => n.userId === currentUser.id));
  };

  useEffect(() => {
    // Keep user state changes in sync if the profile matches
    setProfileName(currentUser.name);
    setProfilePhone(currentUser.phone || '');
    setProfileSlack(currentUser.slackHandle || '');
    setProfileLoc(currentUser.location || '');
    setProfileBio(currentUser.bio || '');
    setProfileSkillsText((currentUser.skills || []).join(', '));
  }, [currentUser]);

  useEffect(() => {
    reloadNotifs();
    const interval = setInterval(reloadNotifs, 2000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Error: Name field cannot be empty!');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: profileName,
      phone: profilePhone,
      slackHandle: profileSlack,
      location: profileLoc,
      bio: profileBio,
      skills: profileSkillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };

    db.updateUser(updatedUser);
    
    db.addNotification({
      userId: currentUser.id,
      title: 'Credentials Saved',
      message: 'Your personal workspace credentials, skills and contact details are synced.',
      type: 'grade'
    });

    showToast('✓ Profile updated successfully!');
  };

  const handleResetWorkspace = () => {
    // Clear only this student's notifications as a secure reset action
    const allNotifs = db.getNotifications();
    const otherNotifs = allNotifs.filter(n => n.userId !== currentUser.id);
    localStorage.setItem('sc_notifications', JSON.stringify(otherNotifs));
    
    setPrefEmailAlerts(true);
    setPrefSlackSync(true);
    setPrefSoundEffects(true);
    setWorkspaceAccent('gold');
    
    showToast('✓ Notifications log cleared and settings restored to system defaults.');
    reloadNotifs();
  };

  // Class helper for visual accent based on selected state
  const getAccentBorderClass = () => {
    if (workspaceAccent === 'gold') return 'border-brand-yellow';
    if (workspaceAccent === 'emerald') return 'border-emerald-500';
    return 'border-indigo-500';
  };

  const getAccentBgClass = () => {
    if (workspaceAccent === 'gold') return 'bg-brand-yellow';
    if (workspaceAccent === 'emerald') return 'bg-emerald-600';
    return 'bg-indigo-600';
  };

  const getAccentTextClass = () => {
    if (workspaceAccent === 'gold') return 'text-brand-yellow';
    if (workspaceAccent === 'emerald') return 'text-emerald-600';
    return 'text-indigo-600';
  };

  return (
    <div id="student-settings-page" className="max-w-7xl mx-auto px-4 py-8 select-none animate-in fade-in duration-300">
      
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-black text-white px-5 py-3.5 rounded-2xl border border-zinc-800 shadow-2xl z-50 flex items-center gap-2.5 max-w-sm animate-in slide-in-from-bottom duration-300 select-none">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span className="text-xs font-light">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div id="student-settings-header" className="bg-brand-black text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            Secure Personal Profile Gateway
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Account <span className="font-semibold text-brand-yellow">Settings & Profile</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Manage your public Sabicrest design portfolio metadata, connect social indicators (Slack and Mobile), and review cloud activity streams.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings & Profile form */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-brand-black mb-1 flex items-center gap-2">
              <UserIcon size={16} className={getAccentTextClass()} />
              Aesthetic Workspace Settings // <span className="font-light text-zinc-500">Student Profile</span>
            </h3>
            <p className="text-xs text-brand-gray font-light">
              Configure your display name, digital identifiers, contact handles, and academic background properties. Changes sync back directly in persistent database shards.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Primary Email Address</label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full text-xs font-light bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2.5 text-zinc-400 cursor-not-allowed"
                />
                <span className="text-[9px] text-zinc-400 italic mt-0.5 block">Email cannot be modified directly (managed via SSO Auth context).</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 019-2831"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Slack Handle</label>
                <input
                  type="text"
                  placeholder="e.g. @alex_rivera"
                  value={profileSlack}
                  onChange={(e) => setProfileSlack(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. SF Bay Area"
                  value={profileLoc}
                  onChange={(e) => setProfileLoc(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Brief Visual Design Bio</label>
              <textarea
                placeholder="Describe your design interest, spatial preferences, or cloud privacy experience..."
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="w-full min-h-20 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black resize-none transition-all"
              ></textarea>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Specific Design Skills (comma-separated list)</label>
              <input
                type="text"
                placeholder="Figma, Spatial Alignment, Micro-interactions, Typography"
                value={profileSkillsText}
                onChange={(e) => setProfileSkillsText(e.target.value)}
                className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-black transition-all"
              />
              {profileSkillsText.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profileSkillsText.split(',').map(s => s.trim()).filter(s => s.length > 0).map((skill, si) => (
                    <span key={si} className="text-[10px] font-mono tracking-wide bg-zinc-100 text-brand-black px-2 py-0.5 rounded-md uppercase">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-50 flex gap-3">
              <button
                type="submit"
                className="bg-brand-black hover:bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer font-light transition-colors"
              >
                Save workspace profile
              </button>
            </div>

          </form>
        </div>

        {/* Settings Panel Alerts list & Preferences switches */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Preference options widgets */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black border-b border-zinc-50 pb-2 flex items-center gap-1.5 font-light">
              <Sliders size={13} className="text-brand-yellow" /> System Preferences
            </h4>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-brand-black block leading-none">Email Alerts</span>
                  <span className="text-[9px] text-zinc-400 block">Deliver daily curriculum review schedules</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefEmailAlerts}
                  onChange={(e) => setPrefEmailAlerts(e.target.checked)}
                  className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-brand-black block leading-none">Slack Webhook Sync</span>
                  <span className="text-[9px] text-zinc-400 block">Publish milestone grades in workspace channels</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefSlackSync}
                  onChange={(e) => setPrefSlackSync(e.target.checked)}
                  className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-brand-black block leading-none">Notification Sound FX</span>
                  <span className="text-[9px] text-zinc-400 block">Acoustic chime triggers on new milestones</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefSoundEffects}
                  onChange={(e) => setPrefSoundEffects(e.target.checked)}
                  className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Accent choice block */}
            <div className="pt-3 border-t border-zinc-50 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider block">Visual Accent Palette</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setWorkspaceAccent('gold'); showToast('Workspace accent color switched to Gold.'); }}
                  className={`px-2 py-1 text-[9px] uppercase tracking-wider font-mono rounded cursor-pointer ${workspaceAccent === 'gold' ? 'bg-brand-yellow text-brand-black font-semibold' : 'bg-zinc-50 text-zinc-400'}`}
                >
                  Gold
                </button>
                <button 
                  onClick={() => { setWorkspaceAccent('emerald'); showToast('Workspace accent color switched to Emerald.'); }}
                  className={`px-2 py-1 text-[9px] uppercase tracking-wider font-mono rounded cursor-pointer ${workspaceAccent === 'emerald' ? 'bg-emerald-600 text-white font-semibold' : 'bg-zinc-50 text-zinc-400'}`}
                >
                  Emerald
                </button>
                <button 
                  onClick={() => { setWorkspaceAccent('indigo'); showToast('Workspace accent color switched to Indigo.'); }}
                  className={`px-2 py-1 text-[9px] uppercase tracking-wider font-mono rounded cursor-pointer ${workspaceAccent === 'indigo' ? 'bg-indigo-600 text-white font-semibold' : 'bg-zinc-50 text-zinc-400'}`}
                >
                  Indigo
                </button>
              </div>
            </div>
          </div>

          {/* Notification logs list */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black border-b border-zinc-50 pb-2 flex items-center justify-between font-light">
              <span className="flex items-center gap-1.5">
                <Bell size={13} className="text-brand-yellow" /> Security & Notification Alerts
              </span>
              <span className="text-[9px] text-zinc-400 font-mono font-light">({studentNotifs.length})</span>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentNotifs.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-[10px] italic">
                  No active notifications log.
                </div>
              ) : (
                studentNotifs.map((n, index) => (
                  <div key={n.id || index} className="p-2 border border-zinc-100 bg-zinc-50/50 rounded-lg text-[10px] leading-relaxed animate-in fade-in duration-150">
                    <div className="flex justify-between items-center text-brand-black font-semibold mb-0.5 animate-in slide-in-from-right-1">
                      <span className="truncate max-w-[130px]">{n.title}</span>
                      <span className="text-zinc-400 text-[8px] font-light">Just now</span>
                    </div>
                    <p className="text-zinc-500 font-light text-[9.5px]">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clear Database elements */}
          <div className="bg-red-50/30 border border-red-100 rounded-2xl p-5 space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Workspace Clean Reset</span>
              <span className="text-[9px] text-red-700/80 block leading-normal mt-0.5">
                Clear active layout changes, archived notification logs, and custom switches.
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 px-3 text-[10px] font-light uppercase tracking-wide transition-colors cursor-pointer"
            >
              Restore Workspace defaults
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

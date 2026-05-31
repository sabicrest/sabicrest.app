/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, NotificationAlert } from '../types';
import { db } from '../db';
import { 
  Sliders, 
  Bell, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Activity, 
  BookOpen, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Camera, 
  Upload 
} from 'lucide-react';

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
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || '');

  // File drop-zone state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workspace settings switches
  const [prefEmailAlerts, setPrefEmailAlerts] = useState(true);
  const [prefSlackSync, setPrefSlackSync] = useState(true);
  const [prefSoundEffects, setPrefSoundEffects] = useState(true);

  // Notifications State
  const [studentNotifs, setStudentNotifs] = useState<NotificationAlert[]>([]);

  // Toast confirmation state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Intense/Stressful deletion requisition state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleteVerifyText, setDeleteVerifyText] = useState('');
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);

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
    setProfileAvatar(currentUser.avatar || '');
  }, [currentUser]);

  useEffect(() => {
    reloadNotifs();
    const interval = setInterval(reloadNotifs, 2000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Countdown timer for stressful delete modal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeleteModal && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showDeleteModal, deleteCountdown]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Process selected profile avatar files
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Error: Please select a valid profile image file.');
      return;
    }
    // Limit to ~1.2MB for Appwrite/localStorage threshold boundaries
    if (file.size > 1.2 * 1024 * 1024) {
      showToast('Error: Selected image exceeds 1.2MB limit. Please provide a lighter image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileAvatar(event.target.result as string);
        showToast('✓ Loaded custom photo successfully.');
      }
    };
    reader.onerror = () => {
      showToast('Error processing selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
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
      avatar: profileAvatar,
      skills: profileSkillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };

    try {
      await db.updateUser(updatedUser);
      
      db.addNotification({
        userId: currentUser.id,
        title: 'Credentials Saved',
        message: 'Your personal workspace settings and public photo parameters are synchronized.',
        type: 'grade'
      });

      showToast('✓ Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Storage Failure: ${err.message || err}`);
    }
  };

  // Submit high stress deletion request to all administrative users on the platform
  const handleSubmitDeletionRequest = async () => {
    if (deleteCountdown > 0) return;
    const requiredPhrase = `CONFIRM DELETION OF ${currentUser.email.toUpperCase()}`;
    if (deleteVerifyText.trim().toUpperCase() !== requiredPhrase) {
      showToast('Error: Verification passphrase does not match exactly!');
      return;
    }
    if (!deleteCheckbox) {
      showToast('Error: You must check the hazard acknowledgment checkbox!');
      return;
    }

    try {
      // Find administrator accounts
      const admins = db.getUsers().filter(u => u.role === 'admin');
      const petitionId = `DEL-${Math.floor(100000 + Math.random() * 900000)}`;

      if (admins.length === 0) {
        // Fallback for safety logs
        db.addNotification({
          userId: currentUser.id,
          title: 'System Deletion Audit',
          message: `Audit reference ${petitionId} submitted. No active admin receivers connected on the grid.`,
          type: 'system'
        });
      } else {
        // Direct DM message and notification issued to each admin
        admins.forEach(admin => {
          db.addMessage({
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            receiverId: admin.id,
            content: `⚠️ VERIFIED ACCOUNT ERASURE PETITION [Ref: ${petitionId}] ⚠️\n\nI, ${currentUser.name} (E: ${currentUser.email}, Role: ${currentUser.role.toUpperCase()}), am filing a formal request to permanently strip my dashboard registers and files from Sabicrest Appwrite Servers.\n\nPlease approve or reject this request.`,
            timestamp: new Date().toISOString()
          });

          db.addNotification({
            userId: admin.id,
            title: '⚠️ Profile Erasure Petition',
            message: `Erasure petition requested by ${currentUser.name} under Reference ID ${petitionId}`,
            type: 'system'
          });
        });
      }

      // Add receipt notification for user themselves
      db.addNotification({
        userId: currentUser.id,
        title: 'Erasure Request Forwarded',
        message: `Your account delete request has been securely queued under Ref: ${petitionId} and dispatched with high priority.`,
        type: 'system'
      });

      setShowDeleteModal(false);
      showToast(`✓ Account deletion petition [ID: ${petitionId}] securely transmitted to Administrators!`);
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Petition Failed: ${err.message || err}`);
    }
  };

  return (
    <div id="student-settings-page" className="max-w-7xl mx-auto px-4 py-8 select-none animate-in fade-in duration-300">
      
      {/* Settings Alerts Toast Pop-up */}
      {toastMessage && (
        <div id="toast-modal-overlay-settings" className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mx-auto text-brand-yellow">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-brand-black">Settings Alert</h3>
              <p className="text-xs font-light text-zinc-650 leading-normal">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="bg-brand-black hover:bg-zinc-850 text-white text-xs font-light tracking-wide uppercase px-4 py-2.5 rounded-xl transition-all w-full cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Header Banner Section */}
      <div id="student-settings-header" className="bg-brand-black text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            About me
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Account <span className="font-semibold text-brand-yellow">Settings & Profile</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Manage your public Sabicrest design portfolio metadata, upload your photo, connect social identifiers (Slack and Mobile), and review cloud activity streams.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings & Profile form */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-brand-black mb-1 flex items-center gap-2">
              <UserIcon size={16} className="text-brand-yellow" />
              Aesthetic Workspace Settings // <span className="font-light text-zinc-500">Edit Profile</span>
            </h3>
            <p className="text-xs text-brand-gray font-light">
              Configure your display name, digital identifiers, contact handles, and academic background properties. Changes sync back directly in persistent database shards.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Custom Photo Avatar Settings */}
            <div className="border-b border-zinc-50 pb-6 space-y-4">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray">
                Public Identity Photo
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Custom active view */}
                <div className="md:col-span-3 flex justify-center">
                  <div className="relative group">
                    {profileAvatar ? (
                      <img 
                        src={profileAvatar} 
                        className="w-24 h-24 rounded-3xl object-cover border-2 border-zinc-100 shadow-sm transition-transform duration-200 group-hover:scale-102" 
                        alt="Active profile avatar" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-brand-black text-white flex items-center justify-center text-3xl font-light shadow-inner transition-transform duration-200 group-hover:scale-102">
                        {profileName ? profileName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-medium" onClick={() => fileInputRef.current?.click()}>
                      <Camera size={16} className="mb-0.5 mr-1" /> Edit
                    </div>
                  </div>
                </div>

                {/* Upload Action Drag and Drop Block */}
                <div className="md:col-span-9 space-y-3">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[80px] ${
                      isDragging 
                        ? 'border-brand-yellow bg-yellow-50/15' 
                        : 'border-zinc-250 hover:border-zinc-400 bg-zinc-50/50'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <Upload size={16} className="text-zinc-400 mb-1" />
                    <span className="text-[10px] text-zinc-650 font-medium">
                      Drag and drop your photo here or <span className="text-zinc-900 underline font-semibold">browse files</span>
                    </span>
                    <span className="text-[8px] text-zinc-400 font-light mt-0.5">
                      Recommended limits: PNG or JPG under 1.2MB.
                    </span>
                  </div>

                  {/* Visual Preset Alternatives */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Or select generic preselected portrait aesthetic:
                    </span>
                    <div className="flex gap-2">
                      {[
                        { title: 'Aesthetic 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
                        { title: 'Aesthetic 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
                        { title: 'Aesthetic 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
                        { title: 'Aesthetic 4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
                        { title: 'Aesthetic 5', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' }
                      ].map((preset, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => {
                            setProfileAvatar(preset.url);
                            showToast(`✓ Preset portrait selected.`);
                          }}
                          className={`w-8 h-8 rounded-full overflow-hidden border transition-all hover:scale-105 cursor-pointer ${
                            profileAvatar === preset.url ? 'border-brand-yellow ring-1 ring-brand-yellow' : 'border-zinc-200'
                          }`}
                        >
                          <img src={preset.url} alt="preset link" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Profile fields input card row */}
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
                <span className="text-[9px] text-zinc-450 italic mt-0.5 block">Email is locked and validated (managed via SSO OAuth identity).</span>
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
                Save profile
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
                  <span className="text-[9px] text-zinc-400 block">Publish assignment grades in workspace channels</span>
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
                  <span className="text-[9px] text-zinc-400 block">Acoustic chime triggers on new assignments</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefSoundEffects}
                  onChange={(e) => setPrefSoundEffects(e.target.checked)}
                  className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                />
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

          {/* Profile Reset Deletion Request Requisition Panel */}
          <div className="bg-red-50/20 border border-red-100 rounded-2xl p-5 space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Profile reset</span>
              <span className="text-[9px] text-red-700/80 block leading-normal mt-0.5">
                Initiate a stressful audit sequence and forward an irreversible erasure request to all Administrators.
              </span>
            </div>
            <button
              type="button"
              id="initiate-deletion-btn"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteCountdown(5);
                setDeleteVerifyText('');
                setDeleteCheckbox(false);
              }}
              className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl py-2 px-3 text-[10px] font-medium uppercase tracking-wide transition-colors cursor-pointer"
            >
              Request Account Deletion
            </button>
          </div>

        </div>

      </div>

      {/* Stressful Account Deletion Requisition Modal Overlay */}
      {showDeleteModal && (
        <div id="delete-request-modal-overlay" className="fixed inset-0 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div id="delete-request-card" className="bg-white border-2 border-red-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 space-y-5">
            
            {/* Stressful Visual Accent Warning Bars */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-repeating-linear bg-amber-500 text-brand-black flex animate-pulse" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b 0px, #f59e0b 10px, #000 10px, #000 20px)' }} />

            <div className="flex items-start gap-3.5 pt-2">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
                <ShieldAlert size={28} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-md font-bold tracking-tight text-red-950 uppercase">
                  ⚠ DANGER ZONE: ACCOUNT ERASURE REQUISITION ⚠
                </h4>
                <p className="text-[10px] font-mono tracking-wide text-zinc-400">
                  REF_AUDIT_CLASS: SECURE_DELETE_REQUEST
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-red-50/50 rounded-2xl p-4 border border-red-100 text-zinc-800 text-xs">
              <p className="font-semibold uppercase tracking-tight text-red-900 text-[11px]">
                Audited System Notice
              </p>
              <p className="font-light leading-relaxed text-zinc-700 text-[11px]">
                You are setting in motion a formal deletion requisition. Once authorized, this actions is wholly irreversible. All associated transcripts, submissions, chats, credential profiles, and records from Sabicrest Appwrite registers will be targeted for destruction.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Verification String Input Block */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-zinc-500">
                  Please type the following word-for-word to authenticate:
                </label>
                <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-205 select-all font-mono text-[10.5px] text-zinc-700 text-center font-bold tracking-wide">
                  CONFIRM DELETION OF {currentUser.email.toUpperCase()}
                </div>
                <input
                  type="text"
                  placeholder="Type the verification phrase exactly..."
                  value={deleteVerifyText}
                  onChange={(e) => setDeleteVerifyText(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-red-500 focus:bg-white transition-all text-center placeholder:font-light"
                />
              </div>

              {/* Stressful Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={deleteCheckbox}
                  onChange={(e) => setDeleteCheckbox(e.target.checked)}
                  className="mt-0.5 accent-red-600 focus:outline-hidden w-4 h-4 cursor-pointer shrink-0"
                />
                <span className="text-[10px] text-zinc-600 leading-normal font-light">
                  I solemnly swear that I intend to permanently erase my trace from this node and request my profile deletion from the Administrator board.
                </span>
              </label>
            </div>

            {/* Action Buttons Row with Countdown block */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-1/3 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Abort Action
              </button>
              
              <button
                type="button"
                disabled={
                  deleteCountdown > 0 || 
                  !deleteCheckbox || 
                  deleteVerifyText.trim().toUpperCase() !== `CONFIRM DELETION OF ${currentUser.email.toUpperCase()}`
                }
                onClick={handleSubmitDeletionRequest}
                className={`w-full sm:w-2/3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all ${
                  deleteCountdown > 0 || !deleteCheckbox || deleteVerifyText.trim().toUpperCase() !== `CONFIRM DELETION OF ${currentUser.email.toUpperCase()}`
                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-55'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-98 cursor-pointer'
                }`}
              >
                <Trash2 size={14} />
                {deleteCountdown > 0 
                  ? `Hazzard audit... (${deleteCountdown}s)` 
                  : 'Submit Deletion Requisition'
                }
              </button>
            </div>

            <p className="text-[9px] text-center text-zinc-400 font-mono">
              Note: This requisition will be securely cataloged and forwarded to all active platform Administrators under audit procedures. No direct deletion occurs here.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}

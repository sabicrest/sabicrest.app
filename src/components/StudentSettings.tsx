/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, NotificationAlert } from '../types';
import { db } from '../db';
import { audio } from '../utils/audio';
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
  Upload,
  Volume2,
  VolumeX,
  Play,
  LogOut
} from 'lucide-react';

interface StudentSettingsProps {
  currentUser: User;
  onUserUpdate?: (user: User) => void;
  onLogout?: () => void;
}

export default function StudentSettings({ currentUser, onUserUpdate, onLogout }: StudentSettingsProps) {
  const [showConfirmDropdown, setShowConfirmDropdown] = useState(false);
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

  // Msg sound cue preferences
  const [msgSoundEnabled, setMsgSoundEnabled] = useState(() => {
    return localStorage.getItem('sabicrest_msg_sound_enabled') !== 'false';
  });
  const [msgSoundId, setMsgSoundId] = useState(() => {
    return localStorage.getItem('sabicrest_msg_sound_id') || 'cosmic-chime';
  });

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
    // Limit to ~1.2MB for Supabase/localStorage threshold boundaries
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

      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

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
            content: `⚠️ VERIFIED ACCOUNT ERASURE PETITION [Ref: ${petitionId}] ⚠️\n\nI, ${currentUser.name} (E: ${currentUser.email}, Role: ${currentUser.role.toUpperCase()}), am filing a formal request to permanently strip my dashboard registers and files from Sabicrest Supabase Servers.\n\nPlease approve or reject this request.`,
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
        <div id="toast-modal-overlay-settings" className="fixed inset-0 bg-zinc-950/20 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/30 rounded-[24px] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.05)] max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-zinc-800 flex items-center justify-center mx-auto text-[#FFCC00]">
              <CheckCircle2 size={22} strokeWidth={1.3} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Settings Alert</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="bg-[#FFCC00] hover:bg-amber-400 text-zinc-950 text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-full transition-all w-full cursor-pointer border border-[#FFCC00]"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Header Banner Section */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-black dark:text-white leading-tight font-sans">
            Settings
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
            Update your visual design identity, profile details, and system sound preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings & Profile form */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-[24px] p-8 shadow-[0_15px_45px_rgba(0,0,0,0.02)] border border-zinc-200/20 space-y-8">
          <form onSubmit={handleSaveProfile} className="space-y-8">
            
            {/* Custom Photo Avatar Settings */}
            <div className="border-b border-zinc-100/50 pb-6 space-y-4">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                Profile Photo
              </span>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                {/* Profile Picture */}
                <div className="relative group shrink-0">
                  {profileAvatar ? (
                    <img 
                      src={profileAvatar} 
                      className="w-24 h-24 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/40 shadow-sm transition-transform duration-200 group-hover:scale-102" 
                      alt="Active profile avatar" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-805 text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-3.5xl font-extrabold shadow-inner transition-transform duration-200 group-hover:scale-102 select-none">
                      {profileName ? profileName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={14} strokeWidth={1.3} className="mr-1" /> Edit
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="flex-1 w-full">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-[24px] p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[96px] ${
                      isDragging 
                        ? 'border-[#FFCC00] bg-[#FFCC00]/5' 
                        : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <Upload size={16} strokeWidth={1.3} className="text-zinc-400 mb-1" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Drag or <span className="text-[#FFCC00] underline font-bold">browse</span> image file
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Profile fields input card row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  disabled
                  className="w-full text-xs font-medium bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/30 rounded-full px-5 py-3 text-zinc-400 cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Primary Email</label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full text-xs font-medium bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/30 rounded-full px-5 py-3 text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full text-xs font-medium bg-zinc-50/30 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-full px-5 py-3 focus:outline-hidden focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] text-zinc-850 dark:text-white transition-all w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Portfolio Link</label>
                <input
                  type="text"
                  value={profileSlack}
                  onChange={(e) => setProfileSlack(e.target.value)}
                  className="w-full text-xs font-medium bg-zinc-50/30 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-full px-5 py-3 focus:outline-hidden focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] text-zinc-850 dark:text-white transition-all w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Location</label>
                <input
                  type="text"
                  value={profileLoc}
                  onChange={(e) => setProfileLoc(e.target.value)}
                  className="w-full text-xs font-medium bg-zinc-50/30 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-full px-5 py-3 focus:outline-hidden focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] text-zinc-850 dark:text-white transition-all w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Bio</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="w-full min-h-24 text-xs font-medium bg-zinc-50/30 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-[24px] px-5 py-3 focus:outline-hidden focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] text-zinc-850 dark:text-white resize-none transition-all"
              ></textarea>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Design Skills (comma-separated)</label>
              <input
                type="text"
                value={profileSkillsText}
                onChange={(e) => setProfileSkillsText(e.target.value)}
                className="w-full text-xs font-medium bg-zinc-50/30 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-full px-5 py-3 focus:outline-hidden focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] text-zinc-850 dark:text-white transition-all w-full"
              />
              {profileSkillsText.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profileSkillsText.split(',').map(s => s.trim()).filter(s => s.length > 0).map((skill, si) => (
                    <span key={si} className="text-[9px] font-bold tracking-wider bg-[#FFCC00]/10 text-zinc-800 dark:text-[#FFCC00] px-3 py-1 rounded-full uppercase">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-150/40 flex gap-3">
              <button
                type="submit"
                className="bg-[#FFCC00] hover:bg-amber-400 text-zinc-950 font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 border border-[#FFCC00]"
              >
                Save Profile
              </button>
            </div>

          </form>
        </div>

        {/* Settings Panel Alerts list & Preferences switches */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Preference options widgets */}
          <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-[24px] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.02)] border border-zinc-200/20 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white border-b border-zinc-100/50 pb-2 flex items-center gap-1.5">
              <Sliders size={13} strokeWidth={1.3} className="text-[#FFCC00]" /> Preferences
            </h4>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-zinc-850 dark:text-zinc-200 block leading-none">Email Alerts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefEmailAlerts(!prefEmailAlerts)}
                  className="p-1 cursor-pointer"
                >
                  {prefEmailAlerts ? (
                    <span className="w-[18px] h-[18px] rounded-full border border-[#FFCC00] bg-[#FFCC00]/10 flex items-center justify-center animate-in zoom-in-75 duration-100">
                      <div className="w-[8px] h-[8px] rounded-full bg-[#FFCC00]" />
                    </span>
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-colors" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-zinc-850 dark:text-zinc-200 block leading-none">Webhook Sync</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefSlackSync(!prefSlackSync)}
                  className="p-1 cursor-pointer"
                >
                  {prefSlackSync ? (
                    <span className="w-[18px] h-[18px] rounded-full border border-[#FFCC00] bg-[#FFCC00]/10 flex items-center justify-center animate-in zoom-in-75 duration-100">
                      <div className="w-[8px] h-[8px] rounded-full bg-[#FFCC00]" />
                    </span>
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-colors" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-150/40 pt-3 mt-1">
                <div>
                  <span className="text-[11px] font-bold text-zinc-850 dark:text-zinc-200 block leading-none">Sound FX</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefSoundEffects(!prefSoundEffects)}
                  className="p-1 cursor-pointer"
                >
                  {prefSoundEffects ? (
                    <span className="w-[18px] h-[18px] rounded-full border border-[#FFCC00] bg-[#FFCC00]/10 flex items-center justify-center animate-in zoom-in-75 duration-100">
                      <div className="w-[8px] h-[8px] rounded-full bg-[#FFCC00]" />
                    </span>
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-colors" />
                  )}
                </button>
              </div>

              {/* Chat Message Sound Cues */}
              <div className="border-t border-zinc-150/40 pt-3 mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-zinc-850 dark:text-zinc-200 block leading-none flex items-center gap-1.5">
                      {msgSoundEnabled ? <Volume2 size={13} strokeWidth={1.3} className="text-[#FFCC00] animate-pulse" /> : <VolumeX size={13} strokeWidth={1.3} className="text-zinc-400" />}
                      Message Audio
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgSoundEnabled(!msgSoundEnabled);
                      localStorage.setItem('sabicrest_msg_sound_enabled', String(!msgSoundEnabled));
                      if (!msgSoundEnabled) {
                        audio.playSound(msgSoundId);
                      }
                    }}
                    className="p-1 cursor-pointer"
                  >
                    {msgSoundEnabled ? (
                      <span className="w-[18px] h-[18px] rounded-full border border-[#FFCC00] bg-[#FFCC00]/10 flex items-center justify-center animate-in zoom-in-75 duration-100">
                        <div className="w-[8px] h-[8px] rounded-full bg-[#FFCC00]" />
                      </span>
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-colors" />
                    )}
                  </button>
                </div>

                {msgSoundEnabled && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-150">
                    <div className="grid grid-cols-1 gap-1.5 bg-zinc-50/20 dark:bg-zinc-950/20 p-2 rounded-[16px] border border-zinc-200/20">
                      {[
                        { id: 'cosmic-chime', label: 'Cosmic Chime' },
                        { id: 'digital-bubble', label: 'Digital Bubble' },
                        { id: 'gentle-woodblock', label: 'Gentle Woodblock' },
                        { id: 'retro-pip', label: 'Retro Pip' },
                        { id: 'modern-synth', label: 'Modern Synth' }
                      ].map((sound) => {
                        const isSelected = msgSoundId === sound.id;
                        return (
                          <div 
                            key={sound.id}
                            onClick={() => {
                              setMsgSoundId(sound.id);
                              localStorage.setItem('sabicrest_msg_sound_id', sound.id);
                              audio.playSound(sound.id);
                            }}
                            className={`flex items-center justify-between p-2.5 px-3 rounded-[12px] cursor-pointer transition-all border ${
                              isSelected 
                                ? 'bg-white dark:bg-zinc-800 border-[#FFCC00]/40' 
                                : 'bg-transparent border-transparent hover:bg-zinc-100/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Volume2 size={13} strokeWidth={1.3} className={isSelected ? 'text-[#FFCC00]' : 'text-zinc-450'} />
                              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{sound.label}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                audio.playSound(sound.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                            >
                              <Play size={8} strokeWidth={1.3} className="fill-current" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification logs list */}
          <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-[24px] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.02)] border border-zinc-200/20 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white border-b border-zinc-100/50 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bell size={13} strokeWidth={1.3} className="text-[#FFCC00]" /> Alerts log
              </span>
              <span className="text-[9px] text-zinc-400 font-mono font-bold">({studentNotifs.length})</span>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentNotifs.length === 0 ? (
                <div className="text-center py-6 text-zinc-405 text-[10px] italic">
                  No active alerts.
                </div>
              ) : (
                studentNotifs.map((n, index) => (
                  <div key={n.id || index} className="p-3 border border-zinc-200/20 bg-zinc-50/30 dark:bg-zinc-950/30 rounded-[16px] text-[10px] leading-relaxed animate-in fade-in duration-150">
                    <div className="flex justify-between items-center text-zinc-800 dark:text-zinc-200 font-bold mb-0.5">
                      <span className="truncate max-w-[130px]">{n.title}</span>
                      <span className="text-zinc-400 text-[8px] font-medium">Just now</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-[9px]">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {onLogout && (
        <div className="mt-8 flex flex-col items-center justify-center pb-4 space-y-3">
          <button
            id="settings-logout-btn"
            onClick={() => setShowConfirmDropdown(!showConfirmDropdown)}
            className="flex items-center gap-2 px-10 py-3.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-150 cursor-pointer shadow-[0_4px_12px_rgba(239,68,68,0.25)]"
          >
            <LogOut size={14} strokeWidth={2.2} />
            <span>Logout Session</span>
          </button>

          {showConfirmDropdown && (
            <div className="flex flex-col items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl w-64 text-center space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg">
              <p className="text-[11px] text-zinc-650 dark:text-zinc-400 font-semibold uppercase tracking-wider font-mono">Confirm Logout?</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light leading-snug">Are you sure you want to end your secure session?</p>
              <div className="flex items-center justify-center gap-3 w-full pt-1">
                <button
                  id="settings-logout-yes-btn"
                  onClick={onLogout}
                  className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-transform active:scale-97 cursor-pointer"
                >
                  Yes
                </button>
                <button
                  id="settings-logout-no-btn"
                  onClick={() => setShowConfirmDropdown(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-transform active:scale-97 cursor-pointer"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

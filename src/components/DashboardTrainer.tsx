/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Assignment, Curriculum } from '../types';
import { db } from '../db';
import VerifiedBadge from './VerifiedBadge';
import { audio } from '../utils/audio';
import { getCourseImage } from '../utils/course';
import { 
  BookOpen, FileText, CheckCircle2, Award, ClipboardCheck, Sparkles, Plus, AlertCircle, 
  FileCheck, HelpCircle, Settings, Sliders, Bell, User as UserIcon, Mail, Phone, MapPin, Activity, X, Search, ArrowUpRight,
  Lock, Unlock, Laptop, Tractor, Camera, Check, Play, Upload, Globe, Compass, Shield, MessageSquare, Video as VideoIcon, Hourglass,
  Volume2, VolumeX, Pencil, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

interface DashboardTrainerProps {
  currentUser: User;
}

export default function DashboardTrainer({ currentUser }: DashboardTrainerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(
    db.getAssignments().filter(a => a.trainerId === currentUser.id)
  );
  const [curricula, setCurricula] = useState<Curriculum[]>(
    db.getCurricula().filter(c => c.trainerId === currentUser.id)
  );

  // Sub Tab Switch
  const [activeSubTab, setActiveSubTab] = useState<'work' | 'settings'>('work');

  // Trainer profile fields state
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileSlack, setProfileSlack] = useState(currentUser.slackHandle || '');
  const [profileBio, setProfileBio] = useState(currentUser.bio || '');
  const [profileSpecialty, setProfileSpecialty] = useState(currentUser.location || 'Senior Spatial UI Designer');
  const [profileBusinessName, setProfileBusinessName] = useState(currentUser.trainerBusinessName || '');
  const [useBusinessName, setUseBusinessName] = useState(currentUser.useBusinessName || false);
  const [profileSignature, setProfileSignature] = useState(currentUser.trainerSignature || '');
  const [trainerRole, setTrainerRole] = useState<'CEO' | 'Mentor'>(currentUser.trainerRole || 'Mentor');

  // Custom in-app dropdown toggle states
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Custom Preferences
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

  // Security and notification triggers
  const [trainerNotifs, setTrainerNotifs] = useState(db.getNotifications().filter(n => n.userId === currentUser.id));

  // Visual success feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Assignment Grading wizard
  const [activeGradingAss, setActiveGradingAss] = useState<Assignment | null>(null);
  const [gradeInput, setGradeInput] = useState('A');
  const [pointsInput, setPointsInput] = useState(95);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Curriculum Proposed System State
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [currTitle, setCurrTitle] = useState('');
  const [currDesc, setCurrDesc] = useState('');
  const [currCategory, setCurrCategory] = useState('Visual Design');
  const [customCategory, setCustomCategory] = useState('');
  const [currLevel, setCurrLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [currDuration, setCurrDuration] = useState(6);
  const [currPrice, setCurrPrice] = useState<number>(150000);
  const [currImageUrl, setCurrImageUrl] = useState('');
  const [newModuleText, setNewModuleText] = useState('');
  const [moduleList, setModuleList] = useState<string[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Assign Assignment System States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showGradedListModal, setShowGradedListModal] = useState(false);
  const [showStudentsListModal, setShowStudentsListModal] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignMaxPoints, setAssignMaxPoints] = useState(100);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [coursesSearchQuery, setCoursesSearchQuery] = useState('');

  // Interactive Trainer Verification Portal Step State
  const [showVerificationPortal, setShowVerificationPortal] = useState(false);
  const [verificationData, setVerificationData] = useState(() => {
    const saved = localStorage.getItem(`sabicrest_verification_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      category: null, // 'digital' | 'creative' | 'agricultural'
      step1Saved: false,
      step1Data: {
        links: '',
        lookbookLink: '',
        instagramLink: '',
        metrics: '50',
        farmPhotoUrl: ''
      },
      step2Saved: false,
      step2Data: '',
      step3Saved: false,
      step3Data: {
        videoUrl: '',
        recorded: false,
        durationSeconds: 0
      },
      status: currentUser.verified ? 'approved' : 'unstarted', // 'unstarted' | 'step1_complete'| 'step2_complete'| 'submitted' | 'approved'
    };
  });

  const [simulatedMediaState, setSimulatedMediaState] = useState<'idle' | 'recording' | 'uploading' | 'completed'>('idle');
  const [mediaProgress, setMediaProgress] = useState(0);

  // Split text into sentences to perform real-time verification
  const computeSentences = (text: string) => {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  };

  const warmToneWords = ["welcome", "simple", "easy", "let's", "together", "begin", "learn", "passion", "first", "hello", "basic", "step", "start", "understand", "friendly"];
  const checkWarmTone = (text: string) => {
    const norm = text.toLowerCase();
    const matches = warmToneWords.filter(w => norm.includes(w));
    return {
      matches,
      score: matches.length > 1 ? 'warm' : matches.length > 0 ? 'moderate' : 'formal'
    };
  };

  // Persistence side-effect
  useEffect(() => {
    localStorage.setItem(`sabicrest_verification_${currentUser.id}`, JSON.stringify(verificationData));
  }, [verificationData, currentUser.id]);

  // Keep state matching the system role DB state
  useEffect(() => {
    if (currentUser.verified && verificationData.status !== 'approved') {
      setVerificationData(prev => ({ ...prev, status: 'approved' }));
    } else if (!currentUser.verified && verificationData.status === 'approved') {
      setVerificationData(prev => ({ ...prev, status: 'unstarted' }));
    }
  }, [currentUser.verified]);

  const allStudents = db.getUsers().filter(u => u.role === 'student');

  // Pre-select first student on load if possible
  useEffect(() => {
    if (allStudents.length > 0 && !assignStudentId) {
      setAssignStudentId(allStudents[0].id);
    }
  }, [allStudents, assignStudentId]);

  const reloadTrainerData = () => {
    setAssignments(db.getAssignments().filter(a => a.trainerId === currentUser.id));
    setCurricula(db.getCurricula().filter(c => c.trainerId === currentUser.id));
    setTrainerNotifs(db.getNotifications().filter(n => n.userId === currentUser.id));
  };

  useEffect(() => {
    setProfileName(currentUser.name);
    setProfilePhone(currentUser.phone || '');
    setProfileSlack(currentUser.slackHandle || '');
    setProfileBio(currentUser.bio || '');
    setProfileSpecialty(currentUser.location || 'Senior Spatial UI Designer');
    setProfileBusinessName(currentUser.trainerBusinessName || '');
    setUseBusinessName(currentUser.useBusinessName || false);
    setProfileSignature(currentUser.trainerSignature || '');
    setTrainerRole(currentUser.trainerRole || 'Mentor');
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(reloadTrainerData, 2000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  useEffect(() => {
    const handleSearch = (e: any) => {
      setDashboardSearchQuery(e.detail || '');
      setCoursesSearchQuery(e.detail || '');
    };
    window.addEventListener('sabicrest-search', handleSearch);
    return () => window.removeEventListener('sabicrest-search', handleSearch);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSaveTrainerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Error: Coach display name cannot be blank!');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: profileName,
      phone: profilePhone,
      slackHandle: profileSlack,
      location: profileSpecialty,
      bio: profileBio,
      trainerBusinessName: profileBusinessName,
      useBusinessName: useBusinessName,
      trainerSignature: profileSignature,
      trainerRole: trainerRole
    };

    try {
      await db.updateUser(updatedUser);

      db.addNotification({
        userId: currentUser.id,
        title: 'Mentor Credentials Synchronized',
        message: 'Your public mentoring specialty, portfolio links and visual bio data was replicated successfully.',
        type: 'curriculum'
      });

      showToast('✓ Coach Profile updated successfully and propagated through cloud replication!');
      reloadTrainerData();
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Storage Failure: ${err.message || err}`);
    }
  };

  const handleResetTrainerWorkspace = () => {
    const allNotifs = db.getNotifications();
    const otherNotifs = allNotifs.filter(n => n.userId !== currentUser.id);
    localStorage.setItem('sc_notifications', JSON.stringify(otherNotifs));

    setPrefEmailAlerts(true);
    setPrefSlackSync(true);
    setPrefSoundEffects(true);

    showToast('✓ Coach notifications cleared and visual settings restored.');
    reloadTrainerData();
  };

  const handleAssignAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !assignTitle || !assignDesc || !assignDueDate) return;

    setAssigningInProgress(true);
    setTimeout(() => {
      const selectedStudent = allStudents.find(s => s.id === assignStudentId);
      if (selectedStudent) {
        db.addAssignment({
          title: assignTitle,
          description: assignDesc,
          dueDate: assignDueDate,
          maxPoints: Number(assignMaxPoints),
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          trainerId: currentUser.id,
          trainerName: currentUser.name
        });

        db.addNotification({
          userId: selectedStudent.id,
          title: 'New Assignment Assigned',
          message: `Your coach, ${currentUser.name}, has assigned you a new project: "${assignTitle}".`,
          type: 'grade'
        });

        reloadTrainerData();
      }

      setAssignTitle('');
      setAssignDesc('');
      setAssignDueDate('');
      setAssignMaxPoints(100);
      setAssigningInProgress(false);
      setShowAssignModal(false);
    }, 700);
  };

  const pendingGradingCount = assignments.filter(a => a.status === 'pending_review').length;
  const gradedCount = assignments.filter(a => a.status === 'graded').length;
  const coachedStudentsCount = Array.from(new Set(assignments.map(a => a.studentId))).length;

  const handleOpenGrading = (ass: Assignment) => {
    setActiveGradingAss(ass);
    setGradeInput(ass.grade || 'A');
    setPointsInput(ass.points || 95);
    setFeedbackInput(ass.feedback || '');
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGradingAss) return;

    setSavingGrade(true);
    setTimeout(() => {
      const updated: Assignment = {
        ...activeGradingAss,
        status: 'graded',
        grade: gradeInput,
        points: Number(pointsInput),
        feedback: feedbackInput,
        gradedAt: new Date().toISOString()
      };

      db.updateAssignment(updated);
      reloadTrainerData();

      // Trigger notification for successful grade evaluation
      db.addNotification({
        userId: activeGradingAss.studentId,
        title: 'Assignment Evaluated',
        message: `Your project "${activeGradingAss.title}" has been graded: ${gradeInput} by ${currentUser.name}.`,
        type: 'grade'
      });

      // Issue micro-degree certificate if the criteria are fully met (points above 90)
      if (Number(pointsInput) >= 90) {
        db.issueCertificate(
          activeGradingAss.studentId,
          activeGradingAss.studentName,
          activeGradingAss.title,
          currentUser.name
        );
        
        db.addNotification({
          userId: activeGradingAss.studentId,
          title: 'Certificate Issued!',
          message: `Congratulations! A certificate for "${activeGradingAss.title}" has been issued to your profile columns.`,
          type: 'grade'
        });
      }

      setSavingGrade(false);
      setActiveGradingAss(null);
    }, 850);
  };

  const handleAddModule = () => {
    if (!newModuleText.trim()) return;
    setModuleList([...moduleList, newModuleText.trim()]);
    setNewModuleText('');
  };

  const handleRemoveModule = (idx: number) => {
    setModuleList(moduleList.filter((_, i) => i !== idx));
  };

  const handleStartEditProposal = (curr: Curriculum) => {
    setEditingCurriculum(curr);
    setCurrTitle(curr.title);
    setCurrDesc(curr.description);
    
    const standardCategories = [
      "Business",
      "Marketing",
      "Design",
      "Tech",
      "Vocational (Hairmaking, Carpentry, etc.)",
      "Visual Design",
      "Cloud Architecture",
      "Security Engineering"
    ];
    if (standardCategories.includes(curr.category)) {
      setCurrCategory(curr.category);
      setCustomCategory('');
    } else {
      setCurrCategory('Other');
      setCustomCategory(curr.category);
    }
    
    setCurrLevel(curr.level);
    setCurrDuration(curr.durationWeeks);
    setCurrPrice(curr.price || 150000);
    setCurrImageUrl(curr.imageUrl || '');
    setModuleList(curr.modules || []);
    setShowCurriculumModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Only image files are allowed!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCurrImageUrl(event.target.result as string);
        showToast("Cover image loaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Only image files are allowed!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileSignature(event.target.result as string);
        showToast("Signature loaded successfully! Click Save Profile below to persist.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCurriculum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currTitle || !currDesc || moduleList.length === 0) return;

    const finalCategory = currCategory === 'Other' && customCategory.trim() ? customCategory.trim() : currCategory;

    if (editingCurriculum) {
      const updatedCurr: Curriculum = {
        ...editingCurriculum,
        title: currTitle,
        description: currDesc,
        category: finalCategory,
        level: currLevel,
        durationWeeks: Number(currDuration),
        modules: moduleList,
        price: Number(currPrice) || 0,
        imageUrl: currImageUrl || undefined
      };
      db.updateCurriculum(updatedCurr);
      showToast("Course proposal updated successfully!");
    } else {
      const newCurr: Omit<Curriculum, 'id' | 'status' | 'submittedAt'> = {
        trainerId: currentUser.id,
        trainerName: currentUser.name,
        title: currTitle,
        description: currDesc,
        category: finalCategory,
        level: currLevel,
        durationWeeks: Number(currDuration),
        modules: moduleList,
        price: Number(currPrice) || 0,
        imageUrl: currImageUrl || undefined
      };

      db.addCurriculum(newCurr);

      // Notify admins
      db.addNotification({
        userId: 'u-admin-1', // admin user id directly
        title: 'Curriculum Proposed for Review',
        message: `${currentUser.name} has submitted a new curriculum proposal: "${currTitle}".`,
        type: 'curriculum'
      });
      showToast("Course proposed for review successfully!");
    }

    reloadTrainerData();

    // Reset values
    setCurrTitle('');
    setCurrDesc('');
    setCustomCategory('');
    setCurrPrice(150000);
    setCurrImageUrl('');
    setModuleList([]);
    setEditingCurriculum(null);
    setShowCurriculumModal(false);
  };

  return (
    <div id="trainer-dashboard-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Header Banner - Upgraded to match Settings aesthetics */}
      <div id="trainer-hero-banner" className="bg-brand-black text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            Welcome back
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight flex items-center gap-1.5 flex-wrap">
            Trainer dashboard // <span className="font-semibold text-brand-yellow">{currentUser.name}</span>
            {currentUser.verified && <VerifiedBadge />}
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Propose core courses, review student submissions, and grade completed works.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="assign-assignment-trigger"
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl py-2.5 px-4 text-xs font-light tracking-wide uppercase transition-all cursor-pointer shadow-xs focus-ring"
          >
            <Plus size={14} className="text-zinc-400 font-normal" /> Assign Student Assignment
          </button>

          <button
            id="propose-curriculum-trigger"
            onClick={() => {
              if (!currentUser.verified) {
                setShowVerificationPortal(true);
                showToast("Verification Required! Complete the 3 interactive cards to unlock course proposals.");
              } else {
                setShowCurriculumModal(true);
              }
            }}
            className={`flex items-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer shadow-xs focus-ring ${
              currentUser.verified 
                ? 'bg-brand-yellow hover:bg-amber-400 text-brand-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
          >
            {currentUser.verified ? (
              <>
                <Plus size={14} className="text-brand-black font-semibold" /> Propose Curriculum
              </>
            ) : (
              <>
                <Lock size={14} className="text-brand-yellow font-semibold" /> Get Verified
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prominent Trainer Verification Journey Status Indicator */}
      {!currentUser.verified && (
        <div id="trainer-verification-status-banner" className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-5 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-left animate-in fade-in duration-250">
          <div className="space-y-1.5 max-w-4xl">
            <span className="text-[9px] uppercase font-mono tracking-widest bg-amber-100 text-amber-805 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block font-semibold">
              Verification Required
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-1.5">
              <Unlock size={14} className="text-amber-600" /> Unlock Course Propose Capabilities
            </h3>
            <p className="text-xs text-zinc-650 font-light leading-relaxed">
              To make sure standard students receive awesome training across Sabicrest, all trainers are asked to complete three quick steps. It takes less than 10 minutes.
            </p>
            
            {/* Horizontal step indicators tracking progress */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2.5 border-t border-amber-200/35">
              <div className="flex items-center gap-2 text-[10px] text-zinc-750">
                {verificationData.step1Saved ? (
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full"><Check size={10} className="stroke-[3]" /></span>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-amber-300 flex items-center justify-center text-[9px] text-amber-600 font-semibold bg-amber-100/50">1</div>
                )}
                <span className={verificationData.step1Saved ? "line-through text-zinc-400 font-light" : "font-semibold text-zinc-700"}>Step 1: Topic and Previous Work</span>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-zinc-750">
                {verificationData.step2Saved ? (
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full"><Check size={10} className="stroke-[3]" /></span>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-amber-300 flex items-center justify-center text-[9px] text-amber-600 font-semibold bg-amber-100/50">2</div>
                )}
                <span className={verificationData.step2Saved ? "line-through text-zinc-400 font-light" : "font-semibold text-zinc-700"}>Step 2: Sabicrest Explained Lesson</span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-750">
                {verificationData.step3Saved ? (
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full"><Check size={10} className="stroke-[3]" /></span>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-amber-300 flex items-center justify-center text-[9px] text-amber-600 font-semibold bg-amber-100/50">3</div>
                )}
                <span className={verificationData.step3Saved ? "line-through text-zinc-400 font-light" : "font-semibold text-zinc-700"}>Step 3: Quick Teaching Video</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowVerificationPortal(true)}
            className="bg-brand-black hover:bg-zinc-900 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 shrink-0 border border-brand-black hover:border-brand-yellow font-medium select-none"
          >
            <Sparkles size={13} className="text-brand-yellow" />
            <span>
              {verificationData.status === 'submitted' ? 'Check My Status' : verificationData.status === 'unstarted' ? 'Get Verified' : 'Finish Verification'}
            </span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      {/* Analytics Bento Cards Row */}
      <div id="trainer-stats-row" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div 
          onClick={() => {
            setActiveSubTab('work');
            setTimeout(() => {
              document.getElementById('trainer-main-grid')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          className="group bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Awaiting Evaluation</span>
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={16} className="text-brand-yellow" />
              <ArrowUpRight size={13} className="text-zinc-300 group-hover:text-brand-black transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150" />
            </div>
          </div>
          <div className="text-3xl font-light text-brand-black tracking-tight flex items-baseline gap-1.5">
            <span>{pendingGradingCount}</span>
            <span className="text-xs text-brand-gray font-light uppercase">submissions</span>
          </div>
          <p className="text-[10px] font-light text-brand-gray mt-2">Active student submissions currently waiting for review.</p>
        </div>

        <div 
          onClick={() => setShowGradedListModal(true)}
          className="group bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Assignments Graded</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-brand-yellow" />
              <ArrowUpRight size={13} className="text-zinc-300 group-hover:text-brand-black transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150" />
            </div>
          </div>
          <div className="text-3xl font-light text-brand-black tracking-tight cursor-pointer">
            <span>{gradedCount}</span>
            <span className="text-xs text-emerald-600 font-mono ml-2 font-light">Completed</span>
          </div>
          <p className="text-[10px] font-light text-brand-gray mt-2">Grading records are registered and saved securely.</p>
        </div>

        <div 
          onClick={() => setShowStudentsListModal(true)}
          className="group bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">My Students</span>
            <div className="flex items-center gap-1.5">
              <FileText size={16} className="text-brand-yellow" />
              <ArrowUpRight size={13} className="text-zinc-300 group-hover:text-brand-black transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150" />
            </div>
          </div>
          <div className="text-3xl font-light text-brand-black tracking-tight">
              <span>{coachedStudentsCount}</span>
              <span className="text-xs text-indigo-600 ml-2 font-light">Students</span>
            </div>
            <p className="text-[10px] font-light text-brand-gray mt-2">Connecting students and trainers together for learning and sharing work.</p>
        </div>

      </div>

      {/* Graded Assignments List Modal */}
      {showGradedListModal && (
        <div id="graded-list-modal" className="fixed inset-0 bg-brand-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-155">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-2xl w-full text-left space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Graded Submissions Ledger
              </h3>
              <button 
                onClick={() => setShowGradedListModal(false)}
                className="text-zinc-400 hover:text-brand-black cursor-pointer bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {assignments.filter(a => a.status === 'graded').length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-light text-xs bg-zinc-50 rounded-xl">
                  No graded assignments yet. Submit feedback and grades for pending student homework below.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {assignments.filter(a => a.status === 'graded').map(ass => (
                    <div key={ass.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-brand-black leading-tight">{ass.title}</h4>
                        <p className="text-[10px] text-zinc-400 font-light mt-0.5">
                          Student: <strong className="text-zinc-650">{ass.studentName}</strong> • Graded: {ass.gradedAt ? new Date(ass.gradedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        {ass.feedback && (
                          <p className="text-[10px] text-zinc-500 italic mt-1 bg-zinc-50 px-2 py-1 rounded w-fit">"{ass.feedback}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-bold">
                          Grade {ass.grade}
                        </span>
                        <span className="text-[9px] font-mono bg-zinc-50 text-zinc-600 border border-zinc-100 px-2 py-0.5 rounded font-medium">
                          {ass.points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGradedListModal(false)}
                className="bg-brand-black hover:bg-zinc-850 text-white text-xs font-light tracking-wide uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coached Students List Modal */}
      {showStudentsListModal && (
        <div id="coached-students-modal" className="fixed inset-0 bg-brand-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-155">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-2xl w-full text-left space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                <FileText size={16} className="text-brand-yellow" /> Coached Students Directory
              </h3>
              <button 
                onClick={() => setShowStudentsListModal(false)}
                className="text-zinc-400 hover:text-brand-black cursor-pointer bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {(() => {
                const uniqueStudentIds = Array.from(new Set(assignments.map(a => a.studentId)));
                if (uniqueStudentIds.length === 0) {
                  return (
                    <div className="text-center py-12 text-zinc-400 font-light text-xs bg-zinc-50 rounded-xl">
                      No active student assignments managed under your coaching profile yet.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-zinc-100">
                    {uniqueStudentIds.map(studentId => {
                      const studentObj = db.getUsers().find(u => u.id === studentId);
                      const studentName = studentObj?.name || assignments.find(a => a.studentId === studentId)?.studentName || 'Student';
                      const studentEmail = studentObj?.email || 'N/A';
                      const studentAssignments = assignments.filter(a => a.studentId === studentId);
                      const studentGraded = studentAssignments.filter(a => a.status === 'graded');
                      const studentPending = studentAssignments.filter(a => a.status === 'pending_review');

                      return (
                        <div key={studentId} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            {studentObj?.avatar ? (
                              <img src={studentObj.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-100 referrerPolicy='no-referrer'" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold">
                                {studentName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs font-semibold text-brand-black leading-tight">{studentName}</h4>
                              <p className="text-[10px] text-zinc-400 font-light mt-0.5">{studentEmail}</p>
                              {studentObj?.slackHandle && (
                                <span className="text-[9px] font-mono text-zinc-650 bg-zinc-50 border border-zinc-150 px-1.5 py-0.25 rounded-md mt-1 inline-block">
                                  {studentObj.slackHandle.startsWith('http') || studentObj.slackHandle.includes('.') ? (
                                    <a
                                      href={studentObj.slackHandle.startsWith('http') ? studentObj.slackHandle : `https://${studentObj.slackHandle}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-brand-yellow hover:underline"
                                    >
                                      Portfolio/Business Link
                                    </a>
                                  ) : (
                                    studentObj.slackHandle
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded">
                              {studentGraded.length} Graded
                            </span>
                            <span className="text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded">
                              {studentPending.length} Pending
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStudentsListModal(false)}
                className="bg-brand-black hover:bg-zinc-850 text-white text-xs font-light tracking-wide uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal for Alerts & Confirmations */}
      {toastMessage && (
        <div id="toast-modal-overlay-trainer" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-brand-yellow">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-brand-black">Mentor Alert</h3>
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

      {/* Internal Navigation Menu Tabs */}
      <div id="trainer-tab-bar" className="flex border-b border-zinc-100 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveSubTab('work')}
          className={`py-3 px-4 text-xs uppercase tracking-wider font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'work'
              ? 'border-brand-yellow text-brand-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <ClipboardCheck size={13} className={activeSubTab === 'work' ? 'text-brand-yellow font-bold' : 'text-zinc-400'} />
          Deliverables Queue & Assignments
        </button>
      </div>

      {activeSubTab === 'work' && (
        <div id="trainer-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          
          {/* Left Columns - Submissions grading stream */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <ClipboardCheck size={13} className="text-brand-yellow" /> Student Deliverables Review Queue
              </h3>

              {assignments.filter(a => a.status === 'pending_review').length === 0 ? (
                <div className="text-center p-12 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100 flex flex-col items-center gap-2">
                  <FileCheck size={28} className="text-zinc-300" />
                  <p>Perfect workflow state: No assignments pending check.</p>
                  <p className="text-[10px]">Previously graded deliverables are saved permanently.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments
                    .filter(a => a.status === 'pending_review')
                    .filter(a => 
                      a.title.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
                      a.studentName.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
                      a.description.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
                    )
                    .map(ass => (
                      <div key={ass.id} className="border border-zinc-50 rounded-xl p-4 bg-zinc-50/10 hover:bg-white transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[9px] font-mono tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded uppercase font-medium">Submitted for review</span>
                            <h4 className="text-sm font-semibold text-brand-black mt-1 leading-tight">{ass.title}</h4>
                            <span className="text-[10px] font-light text-zinc-500">Student: <strong>{ass.studentName}</strong></span>
                          </div>
                          
                          <button
                            id={`grade-trigger-${ass.id}`}
                            onClick={() => handleOpenGrading(ass)}
                            className="bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-[10px] tracking-wide uppercase px-3 py-2 font-light cursor-pointer shadow-xs transition-colors shrink-0"
                          >
                            Grade Assignment
                          </button>
                        </div>

                        <p className="text-xs text-brand-gray font-light leading-relaxed mb-3">{ass.description}</p>
                        
                        {ass.submissionContent && (
                          <div className="bg-zinc-100/60 p-3 rounded-xl text-xs font-mono font-light text-zinc-600 mb-2.5 break-all max-h-24 overflow-y-auto">
                            {ass.submissionContent}
                          </div>
                        )}

                        {ass.linkUrl && (
                          <a
                            id={`submission-link-view-${ass.id}`}
                            href={ass.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                          >
                            🔗 View Submitted Live Wireframe Portfolios
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Suggested courses tracker */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <BookOpen size={13} className="text-brand-yellow" /> Proposed curricula Reviews
              </h3>

              {/* Curriculum Search */}
              <div className="relative w-full mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Search size={12} />
                </span>
                <input
                  type="text"
                  placeholder="Filter key concepts/syllabi..."
                  value={coursesSearchQuery}
                  onChange={(e) => setCoursesSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-xs text-brand-black placeholder-zinc-400 focus:outline-hidden focus:border-brand-yellow font-light animate-in fade-in"
                />
                {coursesSearchQuery && (
                  <button 
                    onClick={() => setCoursesSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              <div className="space-y-5 flex-1 overflow-y-auto pr-1">
                {curricula
                  .filter(curr => 
                    curr.title.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
                    curr.description.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
                    curr.category.toLowerCase().includes(coursesSearchQuery.toLowerCase())
                  )
                  .map(curr => {
                  const isApproved = curr.status === 'approved';
                  const isPending = curr.status === 'pending';
                  const isRejected = curr.status === 'rejected';
                  const isExpanded = expandedCourseId === curr.id;
                  const coverImage = getCourseImage(curr.category, curr.title, curr.imageUrl);

                  return (
                    <div key={curr.id} className="border border-zinc-150 bg-white rounded-2xl overflow-hidden hover:shadow-xs transition-all duration-200">
                      {/* Visual Header Image */}
                      <div className="relative h-28 w-full bg-zinc-100 overflow-hidden">
                        <img 
                          src={coverImage} 
                          alt={curr.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                          <span className="bg-brand-black/75 backdrop-blur-xs text-[9px] text-white font-medium px-2 py-0.5 rounded-md uppercase font-mono">
                            {curr.category}
                          </span>
                          <span className="bg-white/85 backdrop-blur-xs text-[9px] text-zinc-800 font-mono px-2 py-0.5 rounded-md">
                            {curr.level || 'Intermediate'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[8.5px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md shadow-xs ${
                            isApproved ? 'bg-emerald-500 text-white' :
                            isRejected ? 'bg-red-500 text-white' : 'bg-amber-400 text-brand-black animate-pulse'
                          }`}>
                            {curr.status === 'pending' ? 'Pending' : curr.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3.5">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-brand-black leading-tight tracking-tight">
                            {curr.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400 font-mono">
                            <span>Duration: <strong className="text-zinc-700">{curr.durationWeeks} Weeks</strong></span>
                            <span>•</span>
                            <span>Tuition: <strong className="text-zinc-700">₦{(curr.price || 150000).toLocaleString()}</strong></span>
                          </div>
                        </div>

                        <p className="text-[11px] text-brand-gray font-light leading-relaxed">
                          {curr.description}
                        </p>

                        {isRejected && curr.rejectionReason && (
                          <div className="bg-red-50/70 border border-red-100 text-red-700 p-2.5 rounded-xl text-[10px] font-light leading-relaxed">
                            <span className="font-semibold block text-red-800 mb-0.5 uppercase text-[8px] tracking-wider">Rejection Reason:</span>
                            "{curr.rejectionReason}"
                          </div>
                        )}

                        {/* Expandable Module Syllabus Breakdown */}
                        <div className="pt-2.5 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => setExpandedCourseId(isExpanded ? null : curr.id)}
                            className="w-full flex items-center justify-between text-[10px] font-medium text-zinc-500 hover:text-brand-black transition-colors"
                          >
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[8.5px]">
                              <BookOpen size={10} className="text-brand-yellow" />
                              Syllabus Breakdown ({curr.modules.length} Modules)
                            </span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1 animate-in fade-in duration-200">
                              {curr.modules.map((m, idx) => (
                                <div key={idx} className="bg-zinc-50 border border-zinc-100 p-2 rounded-xl flex items-start gap-2">
                                  <span className="text-[9px] font-mono font-bold text-brand-black bg-zinc-200 px-1.5 py-0.5 rounded shrink-0">W{idx + 1}</span>
                                  <p className="text-[10.5px] text-zinc-600 leading-normal font-light">{m}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Edit Button for Pending Proposal */}
                        {isPending && (
                          <div className="pt-1 flex">
                            <button
                              id={`edit-proposal-btn-${curr.id}`}
                              onClick={() => handleStartEditProposal(curr)}
                              className="w-full flex items-center justify-center gap-1 bg-zinc-100 hover:bg-brand-yellow/15 border border-zinc-200 hover:border-brand-yellow/50 text-zinc-700 hover:text-brand-black transition-all rounded-xl py-2 text-[10px] uppercase tracking-wide font-medium cursor-pointer"
                            >
                              <Pencil size={10} /> Edit Course Proposal
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'settings' && (
        <div id="trainer-settings-workspace" className="hidden">
          
          {/* Settings & Profile form */}
          <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-light tracking-tight text-brand-black mb-1">
                Aesthetic Trainer workspace // <span className="font-semibold text-brand-yellow">Coach profile</span>
              </h3>
              <p className="text-xs text-brand-gray font-light">
                Configure your public trainer display name, digital identifiers, contact handles, and visual mentoring background layout.
              </p>
            </div>

            <form onSubmit={handleSaveTrainerProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Coach Display Name</label>
                  <input
                    type="text"
                    value={profileName}
                    disabled
                    className="w-full text-xs font-light bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2.5 text-zinc-400 cursor-not-allowed"
                    required
                  />
                  <span className="text-[9px] text-zinc-450 italic mt-0.5 block">Display name is locked (managed by your administrator).</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Coach Academic Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Spatial UI Designer"
                    value={profileSpecialty}
                    onChange={(e) => setProfileSpecialty(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Primary Email Address</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full text-xs font-light bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2.5 text-zinc-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">WhatsApp Number with Country Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 2348012345678 (numbers only)"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Portfolio or Business Link</label>
                  <input
                    type="text"
                    placeholder="e.g. portfolio.com or linkedin.com/in/username"
                    value={profileSlack}
                    onChange={(e) => setProfileSlack(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Trainer Visual Biography</label>
                <textarea
                  placeholder="Describe your design pedigree, visual methodologies, spatial rules, or industry guidelines..."
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full min-h-24 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                ></textarea>
              </div>

              <div id="sabicrest-branding-options-section" className="pt-6 border-t border-zinc-100 space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-black flex items-center gap-1.5">
                    <Award size={14} className="text-brand-yellow" /> Sabicrest Collaboration & Official Branding Settings
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                    Configure your verified registered business partnership and choose how your credentials/title display on student certificates.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Registered Business Name (If applicable)</label>
                    <input
                      type="text"
                      placeholder="e.g. DesignCrest Solutions Ltd."
                      value={profileBusinessName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileBusinessName(val);
                        if (!val) {
                          setUseBusinessName(false);
                          setTrainerRole('Mentor');
                        }
                      }}
                      className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                    />
                    <span className="text-[9px] text-zinc-400 font-light mt-1 block leading-snug">
                      Must be a registered business in the same line as your teaching skill to enable collaboration certificate mode.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1.5">Certificate Identity Mode</label>
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 text-xs font-light cursor-pointer select-none">
                        <input
                          type="radio"
                          name="certIdentityMode"
                          checked={!useBusinessName}
                          onChange={() => setUseBusinessName(false)}
                          className="accent-brand-yellow"
                        />
                        <span>Sabicrest in collaboration with <strong className="font-semibold">{profileName}</strong> (as Mentor)</span>
                      </label>
                      <label className={`flex items-center gap-2 text-xs font-light select-none ${profileBusinessName ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          name="certIdentityMode"
                          checked={useBusinessName}
                          disabled={!profileBusinessName}
                          onChange={() => setUseBusinessName(true)}
                          className="accent-brand-yellow"
                        />
                        <span>
                          Sabicrest in collaboration with <strong className="font-semibold">{profileBusinessName || '[Enter Business Name First]'}</strong>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1.5">Official Title / Capacity</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                        className="w-full text-left text-xs font-light bg-brand-light/50 border border-zinc-150 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow flex items-center justify-between select-none cursor-pointer"
                      >
                        <span>{trainerRole === 'Mentor' ? 'Authorized Mentor' : `CEO of ${profileBusinessName}`}</span>
                        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isRoleDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)} />
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setTrainerRole('Mentor');
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-light hover:bg-zinc-50 transition-colors select-none ${trainerRole === 'Mentor' ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                            >
                              Authorized Mentor
                            </button>
                            {profileBusinessName && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTrainerRole('CEO');
                                  setIsRoleDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-xs font-light hover:bg-zinc-50 transition-colors select-none ${trainerRole === 'CEO' ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                              >
                                CEO of {profileBusinessName}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-400 font-light mt-1 block">
                      Determines the subscript subscript text shown underneath your signature line on official PDF certificates.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1.5">Official Digital Signature</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center border border-dashed border-zinc-200 hover:border-brand-yellow bg-zinc-50 hover:bg-white rounded-xl p-3 cursor-pointer transition-all">
                          <Upload size={14} className="text-zinc-405 mb-1" />
                          <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Upload PNG/JPG</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      <div className="w-28 h-14 bg-white border border-zinc-100 rounded-xl flex flex-col items-center justify-center p-1 relative overflow-hidden select-none">
                        {profileSignature ? (
                          <>
                            <img
                              src={profileSignature}
                              alt="Signature Preview"
                              className="max-h-full max-w-full object-contain pointer-events-none"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setProfileSignature('')}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-650 transition-colors cursor-pointer"
                              title="Clear Signature"
                            >
                              <X size={8} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[7.5px] text-zinc-400 font-mono text-center">Unsigned Digital Key</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-50">
                <button
                  type="submit"
                  className="bg-brand-black hover:bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer font-light transition-colors"
                >
                  Save Profile Information
                </button>
              </div>

            </form>
          </div>

          {/* Preferences and settings indicators */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Verification Status Settings Card */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black border-b border-zinc-50 pb-2 flex items-center gap-1.5 font-light">
                <Shield size={13} className="text-brand-yellow" /> Trainer Verification Status
              </h4>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Current Status</span>
                  <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-md ${
                    currentUser.verified 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                  }`}>
                    {currentUser.verified ? '✓ Approved' : 'Action Required'}
                  </span>
                </div>

                <p className="text-xs font-light text-zinc-550 leading-relaxed">
                  {currentUser.verified 
                    ? 'Excellent! Your profile is fully verified. You can now build courses and assign work to students.'
                    : 'To verify your account, please complete the 3 steps to submit your social links, lesson examples, and teaching video.'
                  }
                </p>

                {!currentUser.verified && (
                  <button
                    type="button"
                    onClick={() => setShowVerificationPortal(true)}
                    className="w-full text-center bg-brand-black hover:bg-zinc-900 border border-brand-black text-white py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all font-medium cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <Sparkles size={11} className="text-brand-yellow" />
                    <span>Get Verified</span>
                  </button>
                )}
                
                {currentUser.verified && (
                  <button
                    type="button"
                    onClick={() => setShowVerificationPortal(true)}
                    className="w-full text-center bg-zinc-50 hover:bg-zinc-100 text-zinc-650 py-2.5 rounded-xl text-xs transition-all font-light cursor-pointer inline-flex items-center justify-center gap-2 border border-zinc-100"
                  >
                    <span>View Verification details</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black border-b border-zinc-50 pb-2 flex items-center gap-1.5 font-light">
                <Sliders size={13} className="text-brand-yellow" /> App Settings
              </h4>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-brand-black block leading-none">Work Alerts</span>
                    <span className="text-[9px] text-zinc-400 block">Email me as soon as a student submits homework</span>
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
                    <span className="text-[11px] font-medium text-brand-black block leading-none">Work Updates</span>
                    <span className="text-[9px] text-zinc-400 block">Share course reviews in team channels</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefSlackSync}
                    onChange={(e) => setPrefSlackSync(e.target.checked)}
                    className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                  />
                </div>

                 <div className="flex items-center justify-between border-b border-zinc-50 pb-3 mb-1">
                  <div>
                    <span className="text-[11px] font-medium text-brand-black block leading-none">Alert Sounds</span>
                    <span className="text-[9px] text-zinc-400 block">Play a sound when a certificate is given to a student</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefSoundEffects}
                    onChange={(e) => setPrefSoundEffects(e.target.checked)}
                    className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Chat Message Sound Cues */}
                <div className="pt-1 mt-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-brand-black block leading-none flex items-center gap-1.5">
                        {msgSoundEnabled ? <Volume2 size={12} className="text-brand-yellow animate-pulse" /> : <VolumeX size={12} className="text-zinc-400" />}
                        Message Audio Cues
                      </span>
                      <span className="text-[9px] text-zinc-400 block">Subtle acoustics when chat messages arrive</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={msgSoundEnabled}
                      onChange={(e) => {
                        setMsgSoundEnabled(e.target.checked);
                        localStorage.setItem('sabicrest_msg_sound_enabled', String(e.target.checked));
                        if (e.target.checked) {
                          audio.playSound(msgSoundId);
                        }
                      }}
                      className="accent-brand-yellow focus:outline-hidden w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {msgSoundEnabled && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-150">
                      <label className="block text-[9px] uppercase tracking-wider font-semibold text-zinc-400">Select Message Sound</label>
                      <div className="grid grid-cols-1 gap-1.5 bg-zinc-50/50 p-2 rounded-xl border border-zinc-100">
                        {[
                          { id: 'cosmic-chime', label: 'Cosmic Chime 🌌', desc: 'Harmonious sine waves' },
                          { id: 'digital-bubble', label: 'Digital Bubble 🫧', desc: 'High sweep blip' },
                          { id: 'gentle-woodblock', label: 'Gentle Woodblock 🪵', desc: 'Crisp organic knock' },
                          { id: 'retro-pip', label: 'Retro Pip 👾', desc: 'Nostalgic 8-bit pulse' },
                          { id: 'modern-synth', label: 'Modern Synth 🎹', desc: 'Warm dual chord filter' }
                        ].map((sound) => (
                          <div 
                            key={sound.id}
                            onClick={() => {
                              setMsgSoundId(sound.id);
                              localStorage.setItem('sabicrest_msg_sound_id', sound.id);
                              audio.playSound(sound.id);
                            }}
                            className={`flex items-center justify-between p-1.5 px-2 rounded-lg cursor-pointer transition-all border ${
                              msgSoundId === sound.id 
                                ? 'bg-white border-brand-yellow/50 shadow-2xs' 
                                : 'bg-transparent border-transparent hover:bg-white/40'
                            }`}
                          >
                            <div>
                              <span className="text-[10px] font-medium text-brand-black block leading-none">{sound.label}</span>
                              <span className="text-[8px] text-zinc-400 block font-light leading-none mt-1">{sound.desc}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                audio.playSound(sound.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-brand-black hover:bg-zinc-100 rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0 border border-zinc-100 bg-white"
                              title="Play Preview"
                            >
                              <Play size={10} className="fill-current" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notification logs */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black border-b border-zinc-50 pb-2 flex items-center justify-between font-light">
                <span className="flex items-center gap-1.5">
                  <Bell size={13} className="text-brand-yellow" /> Coach Security Logs
                </span>
                <span className="text-[9px] text-zinc-400 font-mono font-light">({trainerNotifs.length})</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {trainerNotifs.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-[10px] italic">
                    No active mentoring alerts.
                  </div>
                ) : (
                  trainerNotifs.map((n, idx) => (
                    <div key={n.id || idx} className="p-2 border border-zinc-100 bg-zinc-50/50 rounded-lg text-[10px] leading-relaxed">
                      <div className="flex justify-between items-center text-brand-black font-semibold mb-0.5">
                        <span className="truncate max-w-[130px]">{n.title}</span>
                        <span className="text-zinc-400 text-[8px] font-light">Just now</span>
                      </div>
                      <p className="text-zinc-500 font-light text-[9.5px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Assignment Evaluator prompt window */}
      {activeGradingAss && (
        <div id="grade-assignment-overlay" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase bg-zinc-50 px-2 py-0.5 rounded text-zinc-400">Assignment Review Form</span>
                <h3 className="text-base font-light tracking-tight text-brand-black">
                  Evaluate Project: <span className="font-semibold">{activeGradingAss.title}</span>
                </h3>
              </div>
              <button
                id="close-grading-modal-btn"
                onClick={() => setActiveGradingAss(null)}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl text-xs font-light text-zinc-500 mb-4 leading-normal">
              <strong>Student Submission Notes:</strong> "{activeGradingAss.submissionContent || 'No notes included.'}"
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Grade Mark</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
                      className="w-full text-left text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2.5 flex items-center justify-between select-none cursor-pointer"
                    >
                      <span>
                        {gradeInput === 'A+' && 'A+ (Outstanding Portfolio)'}
                        {gradeInput === 'A' && 'A (Design Grid Approved)'}
                        {gradeInput === 'B+' && 'B+ (Good spacing balance)'}
                        {gradeInput === 'B' && 'B (Adequate Layout)'}
                        {gradeInput === 'C' && 'C (Action Suggested)'}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isGradeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isGradeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsGradeDropdownOpen(false)} />
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          {[
                            { value: 'A+', label: 'A+ (Outstanding Portfolio)' },
                            { value: 'A', label: 'A (Design Grid Approved)' },
                            { value: 'B+', label: 'B+ (Good spacing balance)' },
                            { value: 'B', label: 'B (Adequate Layout)' },
                            { value: 'C', label: 'C (Action Suggested)' }
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setGradeInput(opt.value);
                                setIsGradeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-light hover:bg-zinc-50 transition-colors select-none ${gradeInput === opt.value ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Total Points (0-100)</label>
                  <input
                    id="grade-points-input"
                    type="number"
                    min={0}
                    max={100}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(Number(e.target.value))}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Tutor Feedback & Constructive reviews</label>
                <textarea
                  id="grade-feedback-textarea"
                  placeholder="Provide constructive reviews on layout, font choice, and margins to help the student refine their work..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full min-h-24 text-xs font-mono font-light text-zinc-700 bg-brand-light border border-zinc-100 rounded-xl p-3 resize-none focus:outline-hidden focus:border-brand-yellow"
                  required
                ></textarea>
              </div>

              <div className="bg-amber-50/25 border border-brand-yellow/20 p-3 rounded-lg text-[10px] text-zinc-500 leading-relaxed flex items-start gap-1.5">
                <AlertCircle size={14} className="text-brand-yellow shrink-0 mt-0.5" />
                <span>
                  Awarding 90 points or above automatically issues a Certificate of Achievement to the student's dashboard.
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  id="submit-points-grade-btn"
                  type="submit"
                  disabled={savingGrade}
                  className="bg-brand-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-light uppercase tracking-wide cursor-pointer flex-1"
                >
                  {savingGrade ? 'Saving Grade...' : 'Save Grade'}
                </button>
                <button
                  id="cancel-points-grade-btn"
                  type="button"
                  onClick={() => setActiveGradingAss(null)}
                  className="bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-light uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose Curriculum Modal Window */}
      {showCurriculumModal && (
        <div id="add-curriculum-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <h3 className="text-base font-light tracking-tight text-brand-black">
                {editingCurriculum ? 'Edit Course Proposal' : 'Propose New Course'} // <span className="font-semibold">{editingCurriculum ? 'Update details' : 'Course Proposal Wizard'}</span>
              </h3>
              <button
                id="close-curriculum-modal-btn"
                onClick={() => {
                  setShowCurriculumModal(false);
                  setEditingCurriculum(null);
                }}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCurriculum} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Course Project Name</label>
                <input
                  id="cur-input-title"
                  type="text"
                  placeholder="e.g. Advanced Fluid Typography Systems"
                  value={currTitle}
                  onChange={(e) => setCurrTitle(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Course Summary & Outcome (what the end goal will be for the student who takes the course)</label>
                <textarea
                  id="cur-input-desc"
                  placeholder="Draft a brief course summary & outcome, including what the end goal will be for the student who takes the course..."
                  value={currDesc}
                  onChange={(e) => setCurrDesc(e.target.value)}
                  className="w-full min-h-20 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1 relative z-30">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Category</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                        setIsLevelDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2.5 py-2 flex items-center justify-between select-none cursor-pointer"
                    >
                      <span className="truncate">{currCategory}</span>
                      <ChevronDown size={12} className={`text-zinc-500 shrink-0 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCategoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {[
                            "Business",
                            "Marketing",
                            "Design",
                            "Tech",
                            "Vocational (Hairmaking, Carpentry, etc.)",
                            "Visual Design",
                            "Cloud Architecture",
                            "Security Engineering",
                            "Other"
                          ].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCurrCategory(cat);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 text-[11px] font-light hover:bg-zinc-50 transition-colors select-none ${currCategory === cat ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="col-span-1 relative z-30">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Target Skill level</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLevelDropdownOpen(!isLevelDropdownOpen);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2.5 py-2 flex items-center justify-between select-none cursor-pointer"
                    >
                      <span className="truncate">{currLevel}</span>
                      <ChevronDown size={12} className={`text-zinc-500 shrink-0 transition-transform ${isLevelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLevelDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsLevelDropdownOpen(false)} />
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          {[
                            "Beginner",
                            "Intermediate",
                            "Advanced"
                          ].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => {
                                setCurrLevel(lvl as any);
                                setIsLevelDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 text-[11px] font-light hover:bg-zinc-50 transition-colors select-none ${currLevel === lvl ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Weeks count</label>
                  <input
                    id="cur-input-duration"
                    type="number"
                    min={1}
                    max={24}
                    value={currDuration}
                    onChange={(e) => setCurrDuration(Number(e.target.value))}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2.5 py-2 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Best Price (NGN)</label>
                  <input
                    id="cur-input-price"
                    type="number"
                    min={0}
                    value={currPrice}
                    onChange={(e) => setCurrPrice(Number(e.target.value))}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2.5 py-2 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {currCategory === 'Other' && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1.5 flex items-center gap-1.5">
                  <Camera size={12} className="text-brand-yellow" />
                  Course Cover Image
                </label>
                
                <div className="space-y-3">
                  {/* Visual Dropzone/File Selector */}
                  <div className="flex items-center gap-4">
                    {currImageUrl ? (
                      <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 shrink-0 shadow-2xs">
                        <img 
                          src={currImageUrl} 
                          alt="Cover preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          id="clear-cover-image-btn"
                          onClick={() => setCurrImageUrl('')}
                          className="absolute inset-0 bg-brand-black/40 hover:bg-brand-black/60 flex items-center justify-center text-white transition-colors cursor-pointer"
                          title="Remove cover image"
                        >
                          <X size={14} className="stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0 bg-zinc-100/50">
                        <Camera size={14} className="text-zinc-450" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center">
                        <label className="bg-brand-black hover:bg-zinc-900 text-brand-yellow text-[10px] font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                          <Upload size={11} />
                          Upload Image File
                          <input 
                            id="cur-input-file-image"
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                            className="hidden" 
                          />
                        </label>
                        {currImageUrl && (
                          <button
                            type="button"
                            id="remove-image-file-btn"
                            onClick={() => setCurrImageUrl('')}
                            className="ml-2 text-[10px] text-zinc-400 hover:text-red-500 font-medium cursor-pointer py-1 px-2 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-400 font-light leading-snug">
                        Recommended size: 800x450 (16:9). Select JPEG/PNG image. If left empty, an aesthetic category backdrop will be auto-assigned.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules list addition */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Weekly Modules Syllabus ({moduleList.length})</label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="module-type-input"
                    type="text"
                    placeholder="e.g. Constructing grid columns for margins"
                    value={newModuleText}
                    onChange={(e) => setNewModuleText(e.target.value)}
                    className="flex-1 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2.5 focus:outline-hidden"
                  />
                  <button
                    id="add-module-item-btn"
                    type="button"
                    onClick={handleAddModule}
                    className="bg-brand-black text-white rounded-xl px-3 text-xs font-light cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {moduleList.map((mod, index) => (
                    <div key={index} className="flex justify-between items-center bg-zinc-50 px-3 py-1.5 rounded-lg text-[11px] font-mono text-zinc-500">
                      <span className="truncate">Week {index + 1}: {mod}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(index)}
                        className="text-red-600 hover:text-red-800 font-bold px-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  id="final-propose-cur-btn"
                  type="submit"
                  className="bg-brand-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-light uppercase tracking-wide cursor-pointer flex-1"
                >
                  {editingCurriculum ? 'Save Changes' : 'Submit Proposal to Admin'}
                </button>
                <button
                  id="cancel-propose-cur-btn"
                  type="button"
                  onClick={() => {
                    setShowCurriculumModal(false);
                    setEditingCurriculum(null);
                    setCurrTitle('');
                    setCurrDesc('');
                    setCurrPrice(150000);
                    setCurrImageUrl('');
                    setModuleList([]);
                  }}
                  className="bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-light uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Assign Assignment Modal Window */}
      {showAssignModal && (
        <div id="assign-assignment-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <h3 className="text-base font-light tracking-tight text-brand-black">
                Assign New Assignment // <span className="font-semibold">Mentee Task Assignment</span>
              </h3>
              <button
                id="close-assign-modal-btn"
                onClick={() => setShowAssignModal(false)}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAssignAssignment} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Target Student</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                    className="w-full text-left text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 flex items-center justify-between select-none cursor-pointer"
                  >
                    <span>
                      {allStudents.find(s => s.id === assignStudentId)?.name || 'Select a student'} {allStudents.find(s => s.id === assignStudentId) ? `(${allStudents.find(s => s.id === assignStudentId)?.email})` : ''}
                    </span>
                    <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isStudentDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStudentDropdownOpen(false)} />
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                        {allStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setAssignStudentId(student.id);
                              setIsStudentDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs font-light hover:bg-zinc-50 transition-colors select-none ${assignStudentId === student.id ? 'bg-brand-light font-medium text-brand-black' : 'text-zinc-700'}`}
                          >
                            {student.name} ({student.email})
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Assignment Name</label>
                <input
                  id="assign-input-title"
                  type="text"
                  placeholder="e.g. Advanced Visual Balance Typography Challenge"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Assignment Description & Scope</label>
                <textarea
                  id="assign-input-desc"
                  placeholder="Summarize visual parameters, required layouts, reference Figma pages, and spacing standards..."
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  className="w-full min-h-24 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Due Date</label>
                  <input
                    id="assign-input-duedate"
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Max Points</label>
                  <input
                    id="assign-input-points"
                    type="number"
                    min={1}
                    max={100}
                    value={assignMaxPoints}
                    onChange={(e) => setAssignMaxPoints(Number(e.target.value))}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  id="final-assign-assignment-btn"
                  type="submit"
                  disabled={assigningInProgress}
                  className="bg-brand-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-light uppercase tracking-wide cursor-pointer flex-1 transition-colors"
                >
                  {assigningInProgress ? 'Generating Task...' : 'Confirm Assignment'}
                </button>
                <button
                  id="cancel-assign-assignment-btn"
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-light uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modern, Step-by-Step Trainer Verification Portal Modal */}
      {showVerificationPortal && (
        <div id="trainer-verification-portal" className="fixed inset-0 bg-zinc-950/65 backdrop-blur-md flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-150 rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left space-y-6 animate-in zoom-in-95 duration-200 divide-y divide-zinc-100 scrollbar-none">
            
            {/* Header Area */}
            <div className="flex justify-between items-start pb-4 border-b border-zinc-150/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-[9px] tracking-wider uppercase px-2.5 py-0.5 rounded-full font-mono font-bold">Trainer Hub</span>
                  <span className="text-zinc-300">//</span>
                  <span className="text-[10px] text-zinc-400 font-mono">ID: {currentUser.id.substring(0, 8)}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <Shield className="text-brand-yellow w-5 h-5 fill-amber-100" /> Trainer Verification Portal
                </h3>
                <p className="text-xs text-zinc-550 font-light max-w-2xl">
                  Complete the 3 quick steps below to verify your account so you can start creating classes, sharing lessons, and teaching students.
                </p>
              </div>

              <button 
                id="close-verification-portal-btn"
                onClick={() => {
                  setShowVerificationPortal(false);
                  setSimulatedMediaState('idle');
                  setMediaProgress(0);
                }}
                className="text-zinc-400 hover:text-black cursor-pointer bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* Portal Step Card Contents */}
            <div className="pt-4 space-y-6">
              
              {/* Conditional Success Overlay */}
              {verificationData.status === 'approved' && (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-white p-3 rounded-full shadow-md">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-950 font-sans tracking-tight">Your Account is Verified!</h4>
                      <p className="text-xs text-emerald-800 font-light mt-0.5 leading-relaxed">
                        Excellent work, Coach {currentUser.name}! You are now fully verified to teach at Sabicrest. You can now create your own classes, propose course layouts, assign tasks, and give marks to students.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-4 border border-emerald-100 text-xs font-light text-zinc-650 space-y-2">
                    <div className="font-semibold text-emerald-900 uppercase tracking-wider text-[9px] font-mono">Your Registered Profile Details</div>
                    <div>• <strong>Teaching Category:</strong> {verificationData.category ? verificationData.category.toUpperCase() : 'General design'}</div>
                    {verificationData.step2Data && <div className="italic text-zinc-600 bg-zinc-50 p-2 rounded border border-zinc-100 mt-1 mt-1 font-mono">"{verificationData.step2Data}"</div>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowVerificationPortal(false);
                        setShowCurriculumModal(true);
                      }}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Propose New Course Now
                    </button>
                    <button
                      onClick={() => {
                        // Reset for testing
                        if (confirm("Reset validation files for testing? (Developer mode)")) {
                          setVerificationData({
                            category: null,
                            step1Saved: false,
                            step1Data: { links: '', lookbookLink: '', instagramLink: '', metrics: '50', farmPhotoUrl: '' },
                            step2Saved: false,
                            step2Data: '',
                            step3Saved: false,
                            step3Data: { videoUrl: '', recorded: false, durationSeconds: 0 },
                            status: 'unstarted'
                          });
                          db.updateUser({ ...currentUser, verified: false });
                          showToast("✓ Accreditation credentials reset. You are now unverified.");
                        }
                      }}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-light text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
                    >
                      Reset Verification Form (For Testing)
                    </button>
                  </div>
                </div>
              )}

              {verificationData.status !== 'approved' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* STEP 1: CATEGORY SELECTION & PROOF */}
                  <div className={`p-5 rounded-2xl transition-all border ${
                    verificationData.step1Saved 
                      ? 'bg-zinc-50/50 border-emerald-150 hover:border-emerald-250 shadow-xs' 
                      : 'bg-white border-zinc-150 hover:border-zinc-300'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold uppercase">Step 1 // Information</span>
                      {verificationData.step1Saved ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                          <Check size={10} className="stroke-[3]" /> Saved
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold">Active</span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 tracking-tight mb-2.5 flex items-center gap-1.5 uppercase">
                      <Compass size={14} className="text-amber-500" /> 1. Choose Your Subject & Add Proof
                    </h4>
                    
                    <p className="text-[11px] text-zinc-550 font-light mb-4 leading-relaxed">
                      Tell us what topic you teach. Then, add a link or photo to show us some previous work you have done.
                    </p>

                    {/* Selector Buttons */}
                    {!verificationData.step1Saved ? (
                      <div className="space-y-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setVerificationData(prev => ({ ...prev, category: 'digital' }))}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-3 ${
                            verificationData.category === 'digital' 
                              ? 'bg-brand-light border-brand-yellow text-zinc-900 font-semibold' 
                              : 'bg-zinc-50/50 border-zinc-150 leading-relaxed text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <Laptop size={16} className="text-indigo-600 shrink-0" />
                          <div>
                            <div className="leading-tight text-[11px] font-bold">Computers, Coding, and Website Design</div>
                            <div className="text-[9px] text-zinc-400 font-light mt-0.5">Share your websites, web projects, designs, or online documents.</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setVerificationData(prev => ({ ...prev, category: 'creative' }))}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-3 ${
                            verificationData.category === 'creative' 
                              ? 'bg-brand-light border-brand-yellow text-zinc-900 font-semibold' 
                              : 'bg-zinc-50/50 border-zinc-150 leading-relaxed text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <Camera size={16} className="text-rose-600 shrink-0" />
                          <div>
                            <div className="leading-tight text-[11px] font-bold">Art, Fashion, Makeup, and Music</div>
                            <div className="text-[9px] text-zinc-400 font-light mt-0.5">Share your fashion portfolio, lookbooks, or social media pages (like Instagram or TikTok).</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setVerificationData(prev => ({ ...prev, category: 'agricultural' }))}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-3 ${
                            verificationData.category === 'agricultural' 
                              ? 'bg-brand-light border-brand-yellow text-zinc-900 font-semibold' 
                              : 'bg-zinc-50/50 border-zinc-150 leading-relaxed text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <Tractor size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <div className="leading-tight text-[11px] font-bold">Farming, Welding, and Practical Handwork</div>
                            <div className="text-[9px] text-zinc-400 font-light mt-0.5">Share details about your farm/workshop size, animal count, or physical work site.</div>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-zinc-100/50 border border-zinc-150 p-3 rounded-xl text-[11px] text-zinc-700 space-y-1.5 mb-4">
                        <div><strong>Your Topic:</strong> {verificationData.category === 'digital' ? '💻 Computers, Coding, and Website Design' : verificationData.category === 'creative' ? '🌸 Art, Fashion, Makeup, and Music' : '🚜 Farming, Welding, and Practical Handwork'}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationData(prev => ({
                              ...prev,
                              step1Saved: false,
                              status: 'unstarted'
                            }));
                          }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer block font-semibold text-left"
                        >
                          ✏️ Change choice or edit details
                        </button>
                      </div>
                    )}

                    {/* Specific Proof Fields based on selected category */}
                    {verificationData.category && !verificationData.step1Saved && (
                      <div className="mt-4 p-3.5 bg-zinc-50 border border-zinc-150 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                        {verificationData.category === 'digital' && (
                          <div className="space-y-2">
                            <label className="block text-[9px] uppercase font-bold text-zinc-500">Paste web links or online portfolios below:</label>
                            <textarea
                              placeholder="Type or paste links to your websites, Google Drive files, or project folders here..."
                              value={verificationData.step1Data.links}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVerificationData(prev => ({
                                  ...prev,
                                  step1Data: { ...prev.step1Data, links: val }
                                }));
                              }}
                              className="w-full text-[11px] bg-white border border-zinc-200 rounded-lg p-2 focus:outline-hidden focus:border-brand-yellow min-h-16"
                              required
                            />
                            <p className="text-[9px] text-zinc-400 font-light">Please share at least one correct link so we can see your work.</p>
                          </div>
                        )}

                        {verificationData.category === 'creative' && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase font-bold text-zinc-500">Your Instagram or TikTok address (optional):</label>
                              <input
                                type="text"
                                placeholder="e.g. instagram.com/creative_handle"
                                value={verificationData.step1Data.instagramLink}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVerificationData(prev => ({
                                    ...prev,
                                    step1Data: { ...prev.step1Data, instagramLink: val }
                                  }));
                                }}
                                className="w-full text-[11px] bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-brand-yellow"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase font-bold text-zinc-500">Your online lookbook or photo folder link:</label>
                              <input
                                type="text"
                                placeholder="e.g. pin.it/lookbook or drive.google.com/styling"
                                value={verificationData.step1Data.lookbookLink}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVerificationData(prev => ({
                                    ...prev,
                                    step1Data: { ...prev.step1Data, lookbookLink: val }
                                  }));
                                }}
                                className="w-full text-[11px] bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-brand-yellow"
                              />
                            </div>
                            <div className="border border-dashed border-zinc-200 rounded-xl p-3 text-center bg-white cursor-pointer hover:bg-zinc-50 transition-all">
                              <Upload size={14} className="text-zinc-450 mx-auto mb-1" />
                              <span className="text-[10px] text-zinc-500 block">Upload pictures of your work</span>
                              <span className="text-[8px] text-zinc-400 font-light block mt-0.5">Drag and drop your photos here (JPEG, JPG, PNG format)</span>
                            </div>
                          </div>
                        )}

                        {verificationData.category === 'agricultural' && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase font-bold text-zinc-500">What is your farm size, animal count, or workshop details?</label>
                              <input
                                type="text"
                                placeholder="e.g. 150 cattle managed, 450 sq.m engineering floor"
                                value={verificationData.step1Data.metrics}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVerificationData(prev => ({
                                    ...prev,
                                    step1Data: { ...prev.step1Data, metrics: val }
                                  }));
                                }}
                                className="w-full text-[11px] bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-brand-yellow"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase font-bold text-zinc-500">Link to photos of your farm or workshop (optional):</label>
                              <input
                                type="text"
                                placeholder="e.g. shared folder representing farm layouts, machinery boards"
                                value={verificationData.step1Data.farmPhotoUrl}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVerificationData(prev => ({
                                    ...prev,
                                    step1Data: { ...prev.step1Data, farmPhotoUrl: val }
                                  }));
                                }}
                                className="w-full text-[11px] bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-brand-yellow"
                              />
                            </div>
                            <div className="border border-dashed border-zinc-200 rounded-xl p-3 text-center bg-white cursor-pointer hover:bg-zinc-50 transition-all">
                              <Camera size={14} className="text-zinc-450 mx-auto mb-1" />
                              <span className="text-[10px] text-zinc-500 block">Upload photos of your workshop or farm</span>
                              <span className="text-[8px] text-zinc-400 font-light block mt-0.5">Drag and drop your farm or workshop photos here (JPEG, JPG, PNG format)</span>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setVerificationData(prev => ({
                              ...prev,
                              step1Saved: true,
                              status: 'step1_complete'
                            }));
                            showToast("✓ Step 1 saved! Now proceed to Step 2.");
                          }}
                          className="w-full bg-brand-black hover:bg-zinc-800 text-white py-2 rounded-xl text-[10px] uppercase tracking-wider font-semibold cursor-pointer transition-colors"
                        >
                          Save Step 1 & Proceed
                        </button>
                      </div>
                    )}
                  </div>


                  {/* STEP 2: SABICREST COMMUNICATION FILTER */}
                  <div className={`p-5 rounded-2xl transition-all border ${
                    !verificationData.step1Saved 
                      ? 'bg-zinc-50/20 border-zinc-100 opacity-55 pointer-events-none' 
                      : verificationData.step2Saved 
                        ? 'bg-zinc-50/50 border-emerald-150 hover:border-emerald-250 shadow-xs'
                        : 'bg-white border-zinc-155 hover:border-zinc-350'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold uppercase">Step 2 // Explanation</span>
                      {verificationData.step2Saved ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                          <Check size={10} className="stroke-[3]" /> Passed
                        </span>
                      ) : !verificationData.step1Saved ? (
                        <span className="bg-zinc-150 text-zinc-450 text-[9px] px-2 py-0.5 rounded-md font-mono">Locked</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold">Unlocked</span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 tracking-tight mb-2.5 flex items-center gap-1.5 uppercase">
                      <MessageSquare size={14} className="text-indigo-500" /> 2. Sabicrest Simple Explanation
                    </h4>
                    
                    <p className="text-[11px] text-zinc-550 font-light mb-4 leading-relaxed">
                      Sabicrest means explaining difficult things in a simple way so that anyone can learn. Please write down the very first lesson of your craft for a complete beginner in **exactly three sentences**.
                    </p>

                    {/* Sabicrest Concept Text Input */}
                    {!verificationData.step2Saved ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="e.g., Welcome to website building where we organize text and boxes on a screen. The very first step is learning how spacing keeps things looking neat and clean. Once you understand spacing, everything else will look perfectly balanced and beautiful to the user."
                          value={verificationData.step2Data}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVerificationData(prev => ({ ...prev, step2Data: val }));
                          }}
                          className="w-full text-[11px] font-mono bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:outline-hidden focus:border-brand-yellow min-h-32 text-zinc-850 leading-relaxed font-light"
                        />

                        {/* Interactive Real-Time Tone and Grammatical Analyser Output */}
                        {verificationData.step2Data.trim().length > 3 && (() => {
                          const sents = computeSentences(verificationData.step2Data);
                          const tone = checkWarmTone(verificationData.step2Data);
                          const count = sents.length;
                          const isExactlyThree = count === 3;
                          
                          return (
                            <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 space-y-1.5 text-[10px] animate-in slide-in-from-top-1">
                              <div className="font-semibold text-zinc-700 uppercase tracking-widest text-[8px] font-mono flex items-center justify-between border-b border-zinc-150 pb-1">
                                <span>Helpful Sentence Checker</span>
                                <span className={isExactlyThree ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
                                  {isExactlyThree ? "✓ Sentence Count Met" : "Checking your sentences..."}
                                </span>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-zinc-500">How many sentences we found:</span>
                                <strong className={isExactlyThree ? "text-emerald-700" : "text-amber-600"}>{count} of 3 sentences</strong>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-zinc-500 font-light">Friendly Tone Level:</span>
                                <strong className={tone.score === 'warm' ? "text-emerald-700" : tone.score === 'moderate' ? "text-blue-600" : "text-amber-600"}>
                                  {tone.score === 'warm' ? '✨ Warm & friendly' : tone.score === 'moderate' ? '👍 Good / Neutral' : '⚠️ Too complex / Formal'}
                                </strong>
                              </div>

                              {tone.matches.length > 0 && (
                                <div className="text-[9px] text-zinc-450 italic">
                                  Friendly words found: {tone.matches.join(", ")}
                                </div>
                              )}

                              {/* Interactive Coaching Alerts */}
                              <div className="pt-1.5 text-[9px] font-mono text-zinc-500 flex items-start gap-1">
                                <span className="text-amber-500">💡</span>
                                <span>
                                  {count < 3 
                                    ? `Please write exactly three simple sentences. You have written ${count} so far.` 
                                    : count > 3 
                                      ? `Explanation is too long. Please make it shorter. You have written ${count} sentences.` 
                                      : `Sentence count: Excellent! This text is very easy for a beginner to understand.`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => {
                            const sentencesNum = computeSentences(verificationData.step2Data).length;
                            if (sentencesNum !== 3) {
                              if (!confirm(`Your lesson currently has ${sentencesNum} sentences. We recommend exactly 3 sentences to fulfill the Sabicrest Beginner Lesson, but would you like to save it anyway?`)) {
                                    return;
                              }
                            }
                            setVerificationData(prev => ({
                              ...prev,
                              step2Saved: true,
                              status: 'step2_complete'
                            }));
                            showToast("✓ Sabicrest Communication style approved! Step 3 is now unlocked.");
                          }}
                          disabled={!verificationData.step2Data.trim()}
                          className={`w-full py-2 rounded-xl text-[10px] uppercase tracking-wider font-semibold cursor-pointer transition-colors ${
                            verificationData.step2Data.trim() 
                              ? 'bg-brand-black hover:bg-zinc-800 text-white' 
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          }`}
                        >
                          Save Step 2 & Proceed
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-zinc-100/50 rounded-xl text-[11px] font-mono border border-zinc-150 leading-relaxed italic text-zinc-650 font-light select-none">
                          "{verificationData.step2Data}"
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationData(prev => ({
                              ...prev,
                              step2Saved: false,
                              status: 'step1_complete'
                            }));
                          }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer block font-semibold text-left"
                        >
                          ✏️ Change explanation or edit text
                        </button>
                      </div>
                    )}
                  </div>


                  {/* STEP 3: LESSON VIDEO */}
                  <div className={`p-5 rounded-2xl transition-all border ${
                    !verificationData.step2Saved 
                      ? 'bg-zinc-50/20 border-zinc-100 opacity-55 pointer-events-none' 
                      : verificationData.step3Saved 
                        ? 'bg-zinc-50/50 border-emerald-150 hover:border-emerald-250 shadow-xs'
                        : 'bg-white border-zinc-155 hover:border-zinc-350'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold uppercase">Step 3 // Lesson Video</span>
                      {verificationData.step3Saved ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                          <Check size={10} className="stroke-[3]" /> Uploaded
                        </span>
                      ) : !verificationData.step2Saved ? (
                        <span className="bg-zinc-150 text-zinc-450 text-[9px] px-2 py-0.5 rounded-md font-mono">Locked</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded-md font-mono font-bold animate-pulse">Waiting for Video</span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 tracking-tight mb-2.5 flex items-center gap-1.5 uppercase">
                      <Play size={14} className="text-rose-500" /> 3. Short Lesson Video
                    </h4>
                    
                    <p className="text-[11px] text-zinc-550 font-light mb-4 leading-relaxed">
                      Record or send us a short 5-minute video of you teaching. Show us how you write code, style designs, or work on the farm.
                    </p>

                    {/* Step-specific directions */}
                    {verificationData.step2Saved && !verificationData.step3Saved && (
                      <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl mb-4 text-[10px] text-zinc-600 font-mono leading-relaxed">
                        <span className="font-bold text-rose-600 block uppercase tracking-wide text-[9px] mb-1">
                          {verificationData.category === 'digital' ? '💻 COMPUTER TEACHING VIDEO GOAL' : verificationData.category === 'creative' ? '🌸 HANDS-ON ART & STYLE VIDEO GOAL' : '🚜 FARM & WORKSHOP VIDEO GOAL'}
                        </span>
                        {verificationData.category === 'digital' ? 'Record your screen showing how you build web projects or configure code.' : verificationData.category === 'creative' ? 'Show a video of you drawing, makeup styling, doing hair, or matching colors.' : 'Record a video explaining how to use shop tools safely, or showing your animals and farm machines.'}
                      </div>
                    )}

                    {/* Media Uploader / Recording Simulator */}
                    {!verificationData.step3Saved ? (
                      <div className="space-y-3">
                        {simulatedMediaState === 'idle' ? (
                          <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-5 text-center space-y-3">
                            <VideoIcon className="w-8 h-8 text-zinc-400 mx-auto" />
                            <div>
                              <span className="text-[11px] font-bold text-zinc-800 block">Record Video or Choose File</span>
                              <span className="text-[9px] text-zinc-400 font-light block mt-0.5">We accept MP4, WEBM, and MOV video files</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  // Simulate recording live
                                  setSimulatedMediaState('recording');
                                  let currentSecs = 0;
                                  const recInt = setInterval(() => {
                                    currentSecs++;
                                    setMediaProgress(currentSecs);
                                    if (currentSecs >= 3) {
                                      clearInterval(recInt);
                                      setSimulatedMediaState('uploading');
                                      let uploadPercent = 0;
                                      const upInt = setInterval(() => {
                                        uploadPercent += 20;
                                        setMediaProgress(uploadPercent);
                                        if (uploadPercent >= 100) {
                                          clearInterval(upInt);
                                          setSimulatedMediaState('completed');
                                          setVerificationData(p => ({
                                            ...p,
                                            step3Saved: true,
                                            step3Data: {
                                              ...p.step3Data,
                                              videoUrl: `sabicrest_audition_video_${currentUser.id}_draft.mp4`,
                                              recorded: true,
                                              durationSeconds: 180
                                            },
                                            status: 'submitted'
                                          }));
                                          showToast("✓ Video lesson recorded and saved!");
                                        }
                                      }, 300);
                                    }
                                  }, 1000);
                                }}
                                className="flex-1 bg-brand-black hover:bg-zinc-800 text-white py-1.5 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-colors inline-flex justify-center items-center gap-1.5"
                              >
                                <Camera size={11} className="text-red-500 animate-pulse" /> Live Record Screen
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSimulatedMediaState('uploading');
                                  let percent = 0;
                                  const loader = setInterval(() => {
                                    percent += 10;
                                    setMediaProgress(percent);
                                    if (percent >= 100) {
                                      clearInterval(loader);
                                      setSimulatedMediaState('completed');
                                      setVerificationData(p => ({
                                        ...p,
                                        step3Saved: true,
                                        step3Data: {
                                          ...p.step3Data,
                                          videoUrl: `uploaded_video_${currentUser.name.replace(/\s+/g, '_').toLowerCase()}.mp4`,
                                          recorded: false,
                                          durationSeconds: 300
                                        },
                                        status: 'submitted'
                                      }));
                                      showToast("✓ Video lesson successfully uploaded!");
                                    }
                                  }, 150);
                                }}
                                className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 py-1.5 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-colors inline-flex justify-center items-center gap-1.5"
                              >
                                <Upload size={11} /> Upload Video File
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-zinc-150 bg-zinc-50 rounded-2xl p-5 text-center space-y-4 animate-in fade-in">
                            {simulatedMediaState === 'recording' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-600 font-mono animate-pulse">
                                  <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                                  <span>RECORDING YOUR SCREEN NOW (SIMULATED)</span>
                                </div>
                                <div className="text-3xl font-light font-mono text-zinc-800">
                                  00:0{mediaProgress}
                                </div>
                                <p className="text-[10px] text-zinc-400">Recording your voice and actions. Explain your topic simply and clearly...</p>
                              </div>
                            )}

                            {simulatedMediaState === 'uploading' && (
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-zinc-800 font-mono block">UPLOADING YOUR VIDEO FILE</span>
                                <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                                  <div className="bg-brand-yellow h-2 transition-all duration-150" style={{ width: `${mediaProgress}%` }}></div>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-450">
                                  Saving video chunks // {mediaProgress}% loaded
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Play className="text-emerald-500 w-4 h-4 fill-emerald-100" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Sabicrest Lesson Video Saved</span>
                              <span className="text-[9px] text-zinc-400 font-mono block leading-none">{verificationData.step3Data.videoUrl || 'sabicrest_upload.mp4'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded font-bold">Secure</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSimulatedMediaState('idle');
                            setMediaProgress(0);
                            setVerificationData(prev => ({
                              ...prev,
                              step3Saved: false,
                              status: 'step2_complete'
                            }));
                          }}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer block font-semibold text-left"
                        >
                          ✏️ Remove video & choose another
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ACTION PACKET & EVALUATION FOR CLOSED SUBMISSION */}
              {verificationData.status === 'submitted' && (
                <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-5 md:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200/50">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Your Application is Being Checked</h4>
                      <p className="text-xs text-zinc-550 font-light mt-0.5 leading-relaxed">
                        Great job! We have received your answers and our team is checking them now. Your status will update as soon as we review your details.
                      </p>
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] uppercase font-mono px-3 py-1 rounded-xl font-bold self-start sm:self-center flex items-center gap-1 animate-pulse">
                      <Hourglass size={11} /> Pending Review
                    </span>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-light">
                    <div className="bg-white p-3 rounded-xl border border-zinc-150">
                      <span className="text-[9px] uppercase font-bold text-zinc-450 block font-mono">1. Trainer Name</span>
                      <strong className="text-zinc-800 block text-[11px] mt-0.5 truncate">{currentUser.name}</strong>
                      <span className="text-[9px] text-zinc-400 block truncate">{currentUser.email}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-zinc-150">
                      <span className="text-[9px] uppercase font-bold text-zinc-450 block font-mono">2. Selected Topic</span>
                      <strong className="text-zinc-800 block text-[11px] mt-0.5 capitalize">{verificationData.category || 'Digital Tech'}</strong>
                      <span className="text-[9px] text-emerald-600 block flex items-center gap-0.5"><Check size={10} /> Saved successfully</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-zinc-150 font-mono">
                      <span className="text-[9px] uppercase font-bold text-zinc-450 block font-mono">3. Lesson explanation</span>
                      <strong className="text-emerald-700 block text-[10px] mt-0.5 leading-tight truncate">✓ Saved</strong>
                      <span className="text-[8px] text-zinc-400 block truncate">"{verificationData.step2Data.substring(0, 30)}..."</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-zinc-150">
                      <span className="text-[9px] uppercase font-bold text-zinc-450 block font-mono">4. Lesson Video</span>
                      <strong className="text-emerald-700 block text-[11px] mt-0.5">✓ Video Saved</strong>
                      <span className="text-[9px] text-zinc-400 block font-mono truncate">{verificationData.step3Data.videoUrl}</span>
                    </div>
                  </div>

                  {/* Edit submitted details or start again */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationData(prev => ({
                          ...prev,
                          status: 'step2_complete',
                          step3Saved: false
                        }));
                        showToast("Unlocked! You can now change or edit your answers.");
                      }}
                      className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-white border border-zinc-200 px-3.5 py-2.5 rounded-xl shadow-xs cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      ✏️ Edit My Answers / Start Over
                    </button>
                  </div>

                  {/* HIGH VALUE DEVELOPER SIMULATION BOX */}
                  <div className="bg-amber-50/50 border border-amber-250/50 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="text-amber-600 w-4 h-4 fill-amber-100" />
                      <h5 className="text-[11px] uppercase font-mono tracking-wider font-bold text-zinc-850">Trainer Verification Override Panel (For Testing)</h5>
                    </div>
                    <p className="text-[11px] text-zinc-650 font-light">
                      To help you quickly test this application from start to finish, you can click the button below to instantly approve this account as a verified trainer!
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1 font-mono">
                      <button
                        type="button"
                        onClick={async () => {
                          const updated: User = {
                            ...currentUser,
                            verified: true
                          };
                          // Save back to DB
                          await db.updateUser(updated);
                          
                          setVerificationData(p => ({
                            ...p,
                            status: 'approved'
                          }));

                          db.addNotification({
                            userId: currentUser.id,
                            title: '✨ Coach Accreditation Confirmed!',
                            message: 'Congratulations! Your trainer verification has been approved. You are now authorized to propose curricula, assign work, and build advanced courses.',
                            type: 'curriculum'
                          });

                          showToast("✓ Account approved! You can now create courses.");
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <Check size={11} className="stroke-[3]" /> Approve Trainer Instantly
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVerificationData({
                            category: null,
                            step1Saved: false,
                            step1Data: { links: '', lookbookLink: '', instagramLink: '', metrics: '50', farmPhotoUrl: '' },
                            step2Saved: false,
                            step2Data: '',
                            step3Saved: false,
                            step3Data: { videoUrl: '', recorded: false, durationSeconds: 0 },
                            status: 'unstarted'
                          });
                          showToast("✓ Form cleared! Status updated to 'Unstarted'.");
                        }}
                        className="bg-zinc-150 hover:bg-zinc-200 text-zinc-650 font-medium text-[10px] uppercase px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                      >
                        Clear Form & Start Over
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Bottom Controls */}
            <div className="pt-4 flex justify-between items-center bg-white">
              <span className="text-[10px] text-zinc-400 font-mono">
                {verificationData.status === 'approved' ? '✓ Registered Sabicrest Trainer' : 'Vetting state: ' + verificationData.status.toUpperCase()}
              </span>

              <button
                onClick={() => {
                  setShowVerificationPortal(false);
                  setSimulatedMediaState('idle');
                  setMediaProgress(0);
                }}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 relative z-10 font-light text-xs uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                Close Portal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

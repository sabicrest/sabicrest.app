/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Assignment, Curriculum } from '../types';
import { db } from '../db';
import { 
  BookOpen, FileText, CheckCircle2, Award, ClipboardCheck, Sparkles, Plus, AlertCircle, 
  FileCheck, HelpCircle, Settings, Sliders, Bell, User as UserIcon, Mail, Phone, MapPin, Activity, X, Search, ArrowUpRight
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

  // Custom Preferences
  const [prefEmailAlerts, setPrefEmailAlerts] = useState(true);
  const [prefSlackSync, setPrefSlackSync] = useState(true);
  const [prefSoundEffects, setPrefSoundEffects] = useState(true);

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
  const [currTitle, setCurrTitle] = useState('');
  const [currDesc, setCurrDesc] = useState('');
  const [currCategory, setCurrCategory] = useState('Visual Design');
  const [currLevel, setCurrLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [currDuration, setCurrDuration] = useState(6);
  const [currPrice, setCurrPrice] = useState<number>(150000);
  const [newModuleText, setNewModuleText] = useState('');
  const [moduleList, setModuleList] = useState<string[]>([]);

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
      bio: profileBio
    };

    try {
      await db.updateUser(updatedUser);

      db.addNotification({
        userId: currentUser.id,
        title: 'Mentor Credentials Synchronized',
        message: 'Your public mentoring specialty, slack hooks and visual bio data was replicated successfully.',
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

  const handleCreateCurriculum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currTitle || !currDesc || moduleList.length === 0) return;

    const newCurr: Omit<Curriculum, 'id' | 'status' | 'submittedAt'> = {
      trainerId: currentUser.id,
      trainerName: currentUser.name,
      title: currTitle,
      description: currDesc,
      category: currCategory,
      level: currLevel,
      durationWeeks: Number(currDuration),
      modules: moduleList,
      price: Number(currPrice) || 0
    };

    db.addCurriculum(newCurr);
    reloadTrainerData();

    // Notify admins
    db.addNotification({
      userId: 'u-admin-1', // admin user id directly
      title: 'Curriculum Proposed for Review',
      message: `${currentUser.name} has submitted a new curriculum proposal: "${currTitle}".`,
      type: 'curriculum'
    });

    // Reset values
    setCurrTitle('');
    setCurrDesc('');
    setCurrPrice(150000);
    setModuleList([]);
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
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Trainer dashboard // <span className="font-semibold text-brand-yellow">{currentUser.name}</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Propose core courses, review student submissions, and grade completed works.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
          {/* Dynamic header search box */}
          <div className="relative w-full sm:w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <Search size={12} />
            </span>
            <input
              type="text"
              placeholder="Search screen..."
              value={dashboardSearchQuery}
              onChange={(e) => setDashboardSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-zinc-550 focus:outline-hidden focus:border-brand-yellow font-light"
            />
            {dashboardSearchQuery && (
              <button 
                onClick={() => setDashboardSearchQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <button
            id="assign-assignment-trigger"
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl py-2.5 px-4 text-xs font-light tracking-wide uppercase transition-all cursor-pointer shadow-xs focus-ring"
          >
            <Plus size={14} className="text-zinc-400 font-normal" /> Assign Student Assignment
          </button>

          <button
            id="propose-curriculum-trigger"
            onClick={() => setShowCurriculumModal(true)}
            className="flex items-center gap-2 bg-brand-yellow hover:bg-amber-400 text-brand-black rounded-xl py-2.5 px-4 text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer shadow-xs focus-ring"
          >
            <Plus size={14} className="text-brand-black font-semibold" /> Propose Curriculum
          </button>
        </div>
      </div>

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
          <p className="text-[10px] font-light text-brand-gray mt-2">Connecting students and teachers together for learning and sharing work.</p>
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
                                <span className="text-[9px] font-mono text-indigo-650 bg-indigo-50 px-1.5 py-0.25 rounded-md mt-1 inline-block">{studentObj.slackHandle}</span>
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

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`py-3 px-4 text-xs uppercase tracking-wider font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'settings'
              ? 'border-brand-yellow text-brand-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <Settings size={13} className={activeSubTab === 'settings' ? 'text-brand-yellow font-bold' : 'text-zinc-400'} />
          Trainer Settings & Profile
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

              <div className="space-y-3.5">
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

                  return (
                    <div key={curr.id} className="border border-zinc-100 bg-zinc-50/20 rounded-xl p-3.5 hover:bg-white transition-all">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-semibold text-brand-black pr-2 leading-tight">{curr.title}</h4>
                        <span className={`text-[8px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                          isApproved ? 'bg-emerald-50 text-emerald-800' :
                          isRejected ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800 animate-pulse'
                        }`}>
                          {curr.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-brand-gray font-light mt-1.5 leading-relaxed">{curr.description}</p>
                      <div className="text-[9px] text-zinc-400 font-mono font-light mt-2 pt-2 border-t border-zinc-50 uppercase flex justify-between items-center">
                        <span>weeks: {curr.durationWeeks} // {curr.category}</span>
                        {curr.price !== undefined && (
                          <span className="text-brand-black font-semibold font-sans normal-case">₦{curr.price.toLocaleString()}</span>
                        )}
                      </div>

                      {isRejected && curr.rejectionReason && (
                        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-[10px] font-light mt-2.5 leading-normal">
                          <strong>Rejection Reason:</strong> "{curr.rejectionReason}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'settings' && (
        <div id="trainer-settings-workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          
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
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                    required
                  />
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
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-brand-gray mb-1">Slack ID URL</label>
                  <input
                    type="text"
                    placeholder="e.g. @sabicrest_coach"
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

                <div className="flex items-center justify-between">
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
                  <select
                    id="grade-mark-select"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2.5"
                  >
                    <option value="A+">A+ (Outstanding Portfolio)</option>
                    <option value="A">A (Design Grid Approved)</option>
                    <option value="B+">B+ (Good spacing balance)</option>
                    <option value="B">B (Adequate Layout)</option>
                    <option value="C">C (Action Suggested)</option>
                  </select>
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
                Propose New Course // <span className="font-semibold">Course Proposal Wizard</span>
              </h3>
              <button
                id="close-curriculum-modal-btn"
                onClick={() => setShowCurriculumModal(false)}
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
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Course Syllabus Scope</label>
                <textarea
                  id="cur-input-desc"
                  placeholder="Draft syllabus details, course objectives, and targets for students..."
                  value={currDesc}
                  onChange={(e) => setCurrDesc(e.target.value)}
                  className="w-full min-h-20 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Category</label>
                  <select
                    id="cur-select-category"
                    value={currCategory}
                    onChange={(e) => setCurrCategory(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2 py-2"
                  >
                    <option value="Visual Design">Visual Design</option>
                    <option value="Cloud Architecture">Cloud Architecture</option>
                    <option value="Privacy Engineering">Security Engineering</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Target Skill level</label>
                  <select
                    id="cur-select-level"
                    value={currLevel}
                    onChange={(e) => setCurrLevel(e.target.value as any)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-2 py-2"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
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
                  Submit Proposal to Admin
                </button>
                <button
                  id="cancel-propose-cur-btn"
                  type="button"
                  onClick={() => setShowCurriculumModal(false)}
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
                <select
                  id="assign-select-student"
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  required
                >
                  {allStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
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

    </div>
  );
}

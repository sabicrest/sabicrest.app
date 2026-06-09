/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Curriculum, CourseEnrollment } from '../types';
import { db } from '../db';
import { 
  BookOpen, Plus, Search, Sparkles, Filter, ChevronDown, CheckCircle2, AlertCircle, XCircle, Clock,
  DollarSign, Users, Award, BookOpenCheck, ChevronUp, FileText, Sliders, Camera, Upload, X, ArrowUpRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TrainerCoursesProps {
  currentUser: User;
}

export default function TrainerCourses({ currentUser }: TrainerCoursesProps) {
  // Primary list states
  const [courses, setCourses] = useState<Curriculum[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  // Interactive detail accordions
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);
  const [expandedStudentsId, setExpandedStudentsId] = useState<string | null>(null);

  // Proposal Form Modal States
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [proposalActiveSection, setProposalActiveSection] = useState<'info' | 'details' | 'image' | 'syllabus'>('info');

  // Form Fields State
  const [currTitle, setCurrTitle] = useState('');
  const [currDesc, setCurrDesc] = useState('');
  const [currCategory, setCurrCategory] = useState('Visual Design');
  const [customCategory, setCustomCategory] = useState('');
  const [currLevel, setCurrLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [currDuration, setCurrDuration] = useState(8);
  const [currPrice, setCurrPrice] = useState(150000);
  const [currImageUrl, setCurrImageUrl] = useState('');
  const [moduleList, setModuleList] = useState<string[]>([]);
  const [newModuleText, setNewModuleText] = useState('');

  // Dropdown UI triggers
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);

  // Load Trainer-specific information
  const loadData = () => {
    const allCourses = db.getCurricula().filter(c => c.trainerId === currentUser.id);
    const allEnrollments = db.getEnrollments().filter(e => 
      e.trainerId === currentUser.id || allCourses.some(c => c.id === e.courseId)
    );
    setCourses(allCourses);
    setEnrollments(allEnrollments);
  };

  useEffect(() => {
    loadData();
    // Refresh periodically
    const timer = setInterval(loadData, 4000);
    return () => clearInterval(timer);
  }, [currentUser.id]);

  // Handle student payment verification directly from this page!
  const handleVerifyStudentPayment = (enr: CourseEnrollment) => {
    const updated = { 
      ...enr, 
      paymentStatus: 'approved' as const, 
      verifiedAt: new Date().toISOString() 
    };
    db.updateEnrollment(updated);
    
    // Add real-time log notification to active student
    db.addNotification({
      userId: enr.studentId,
      title: 'Congratulations! Enrollment Verified',
      message: `Your payment was verified by ${currentUser.name}. You now have access to "${enr.courseTitle}"!`,
      type: 'system'
    });

    // Notify of success and refresh state
    loadData();
  };

  // Syllabus list helpers
  const handleAddModule = () => {
    if (!newModuleText.trim()) return;
    setModuleList([...moduleList, newModuleText.trim()]);
    setNewModuleText('');
  };

  const handleRemoveModule = (idx: number) => {
    setModuleList(moduleList.filter((_, i) => i !== idx));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Only images are accepted.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCurrImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit new proposal or edit changes
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currTitle.trim() || !currDesc.trim()) return;

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

      // Trigger admin alert log
      db.addNotification({
        userId: 'u-admin-1',
        title: 'New Course Proposed',
        message: `${currentUser.name} proposed a course: "${currTitle}".`,
        type: 'curriculum'
      });
    }

    // Reset Form Fields state
    setCurrTitle('');
    setCurrDesc('');
    setCustomCategory('');
    setCurrPrice(150000);
    setCurrImageUrl('');
    setModuleList([]);
    setEditingCurriculum(null);
    setShowProposalModal(false);
    
    // Refresh
    loadData();
  };

  // Form edit pre-loader
  const handleTriggerEdit = (c: Curriculum) => {
    setEditingCurriculum(c);
    setCurrTitle(c.title);
    setCurrDesc(c.description);
    setCurrCategory(c.category);
    setCurrLevel(c.level);
    setCurrDuration(c.durationWeeks);
    setCurrPrice(c.price || 0);
    setCurrImageUrl(c.imageUrl || '');
    setModuleList(c.modules || []);
    setProposalActiveSection('info');
    setShowProposalModal(true);
  };

  // Summary Metrics calculations
  const totalCourses = courses.length;
  const approvedCourses = courses.filter(c => c.status === 'approved').length;
  const totalStudentsEnrolled = enrollments.filter(e => e.paymentStatus === 'approved').length;
  const expectedEarnings = enrollments
    .filter(e => e.paymentStatus === 'approved')
    .reduce((sum, enr) => sum + (enr.amount || 0), 0);

  // Combined filters applied lists
  const filteredCourses = courses.filter(col => {
    const matchesSearch = col.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          col.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          col.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || col.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="trainer-courses-viewport" className="py-5 px-3 sm:px-6 max-w-5xl mx-auto space-y-6 select-none font-sans">
      
      {/* Upper Dashboard Banner - Mobile-First */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-neutral-900 dark:text-zinc-50 flex items-center gap-2">
              <BookOpen className="text-brand-yellow shrink-0" size={24} />
              My <span className="font-semibold">Courses Hub</span>
            </h1>
            <p className="text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
              Curriculum building & verification control workspace
            </p>
          </div>
          
          <button
            onClick={() => {
              setEditingCurriculum(null);
              setCurrTitle('');
              setCurrDesc('');
              setCurrPrice(150000);
              setCurrImageUrl('');
              setModuleList([]);
              setProposalActiveSection('info');
              setShowProposalModal(true);
            }}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 dark:bg-brand-yellow dark:text-neutral-950 text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Plus size={14} className="stroke-[2.5]" /> Propose
          </button>
        </div>
      </div>

      {/* Metrics Section: Elegant grid made fully mobile-first */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Courses Metric */}
        <div className="bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between">
          <BookOpenCheck size={16} className="text-zinc-400 dark:text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Courses Created</div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-zinc-50">{totalCourses}</div>
          </div>
        </div>

        {/* Live Courses Metric */}
        <div className="bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between">
          <Award size={16} className="text-emerald-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Approved / Live</div>
            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{approvedCourses}</div>
          </div>
        </div>

        {/* Students Enrolled Metric */}
        <div className="bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between">
          <Users size={16} className="text-indigo-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Students Active</div>
            <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{totalStudentsEnrolled}</div>
          </div>
        </div>

        {/* Projected Revenue Metric */}
        <div className="bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between">
          <DollarSign size={16} className="text-emerald-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Gross Earnings</div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-zinc-50">
              ₦{expectedEarnings.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Control filters panel - highly touch and mobile optimized */}
      <div className="space-y-3">
        {/* Search tool block */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-zinc-400" />
          </span>
          <input
            type="text"
            placeholder="Search matching course title, summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 outline-hidden focus:border-brand-yellow/80"
          />
        </div>

        {/* Filter Scrollable Hub Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
          {[
            { id: 'all', label: 'All Courses' },
            { id: 'approved', label: 'Active/Live' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'rejected', label: 'Review Alerts' }
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id as any)}
              className={`text-[11px] font-medium tracking-wide uppercase px-3.5 py-2 rounded-xl border shrink-0 transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-brand-yellow dark:text-neutral-950 dark:border-brand-yellow font-semibold'
                  : 'bg-white border-zinc-100 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main interactive Courses Feed stream */}
      <div className="space-y-4">
        {filteredCourses.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl px-6 py-12 text-center bg-zinc-50/25">
            <AlertCircle className="mx-auto text-zinc-300 dark:text-zinc-650" size={32} />
            <h3 className="text-xs font-semibold text-neutral-800 dark:text-zinc-300 mt-2">No matching curriculum elements found</h3>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
              Propose a new lesson path using the "Propose" action above.
            </p>
          </div>
        ) : (
          filteredCourses.map(col => {
            const courseEnrollments = enrollments.filter(e => e.courseId === col.id);
            const verifiedStudents = courseEnrollments.filter(e => e.paymentStatus === 'approved');
            const pendingVerifyStudents = courseEnrollments.filter(e => e.paymentStatus === 'pending_verification');

            return (
              <div 
                key={col.id}
                className="bg-white border border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-xs border-l-4 border-l-black dark:border-l-brand-yellow active:scale-[0.99] transition-transform"
              >
                {/* Course Header card info component */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                  
                  {/* Backdrop or Image */}
                  <div className="w-full md:w-36 h-28 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-150/40 dark:border-zinc-850 relative">
                    {col.imageUrl ? (
                      <img 
                        src={col.imageUrl} 
                        alt="Course cover" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-zinc-300 gap-1">
                        <BookOpen size={20} className="text-zinc-500" />
                        <span className="text-[9px] font-mono tracking-widest text-zinc-400">TEMPLATE</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 text-[9px] font-mono font-medium tracking-wide bg-neutral-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded">
                      ₦{col.price?.toLocaleString()}
                    </span>
                  </div>

                  {/* Text Description fields */}
                  <div className="flex-1 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-550 uppercase bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 rounded">
                          {col.category}
                        </span>
                        
                        {col.status === 'approved' && (
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1 font-semibold">
                            <span className="h-1 w-1 bg-emerald-500 rounded-full animate-ping"></span> Live/Approved
                          </span>
                        )}
                        {col.status === 'pending' && (
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold animate-pulse">
                            Pending Review
                          </span>
                        )}
                        {col.status === 'rejected' && (
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">
                            Needs Updates
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-zinc-50 tracking-tight mt-1">
                        {col.title}
                      </h3>
                      
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5 leading-snug line-clamp-2">
                        {col.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 dark:text-zinc-550 pt-1 font-mono">
                      <span>{col.durationWeeks} Weeks</span>
                      <span>•</span>
                      <span>{col.level}</span>
                      <span>•</span>
                      <span className="text-neutral-950 dark:text-zinc-550 font-semibold">{courseEnrollments.length} Registrations</span>
                    </div>
                  </div>

                  {/* Actions column panel */}
                  <div className="flex items-center gap-2 md:flex-col md:justify-center md:items-stretch md:min-w-28 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-50 dark:border-zinc-900 md:pl-4">
                    <button
                      onClick={() => handleTriggerEdit(col)}
                      className="flex-1 md:w-full bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 py-1.5 px-3 rounded-lg text-[10px] uppercase font-semibold text-neutral-800 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {col.status === 'rejected' && col.rejectionReason && (
                  <div className="bg-red-50/50 border-t border-red-50 p-3 flex items-start gap-2 text-xs text-red-700 font-light leading-relaxed">
                    <AlertCircle size={14} className="shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <span className="font-semibold font-mono text-[10px] uppercase">Rejection Reason:</span> "{col.rejectionReason}" - please refine elements and submit again.
                    </div>
                  </div>
                )}

                {/* Grid list of Collapsible Accordion drawers (folded sections) under each course */}
                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-zinc-55 dark:border-zinc-900/80 bg-zinc-50/30 dark:bg-zinc-950/20">
                  
                  {/* Section A: Syllabus Folding Drawer */}
                  <div className="border-b md:border-b-0 md:border-r border-zinc-55 dark:border-zinc-900/80">
                    <button
                      onClick={() => setExpandedSyllabusId(expandedSyllabusId === col.id ? null : col.id)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors select-none cursor-pointer"
                    >
                      <span className="text-[10px] uppercase tracking-wide font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                        <Sliders size={12} className="text-zinc-400" />
                        Syllabus modules ({col.modules?.length || 0})
                      </span>
                      <ChevronDown 
                        size={14} 
                        className={`text-zinc-400 transition-transform ${expandedSyllabusId === col.id ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {expandedSyllabusId === col.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-white border-t border-zinc-55 dark:bg-zinc-950/40 dark:border-zinc-900">
                            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                              {(col.modules || []).map((mod, mi) => (
                                <div key={mi} className="text-[11px] font-mono text-zinc-500 dark:text-zinc-450 bg-zinc-50/70 dark:bg-zinc-900/50 p-2 rounded-lg flex items-start gap-1.5 leading-snug">
                                  <span className="text-[10px] text-brand-yellow font-bold shrink-0">W{mi + 1}</span>
                                  <span>{mod}</span>
                                </div>
                              ))}
                              {(!col.modules || col.modules.length === 0) && (
                                <div className="text-[10px] text-zinc-400 font-mono text-center py-4">No syllabus modules compiled.</div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section B: Registered Students Folding Drawer */}
                  <div>
                    <button
                      onClick={() => setExpandedStudentsId(expandedStudentsId === col.id ? null : col.id)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors select-none cursor-pointer"
                    >
                      <span className="text-[10px] uppercase tracking-wide font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                        <Users size={12} className="text-indigo-500" />
                        Enrolled Cohort ({courseEnrollments.length})
                        {pendingVerifyStudents.length > 0 && (
                          <span className="text-[8px] bg-amber-500 text-white rounded-full h-4 min-w-4 flex items-center justify-center font-bold px-1 animate-pulse">
                            {pendingVerifyStudents.length} Needs Verification
                          </span>
                        )}
                      </span>
                      <ChevronDown 
                        size={14} 
                        className={`text-zinc-400 transition-transform ${expandedStudentsId === col.id ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {expandedStudentsId === col.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-white border-t border-zinc-55 dark:bg-zinc-950/40 dark:border-zinc-900">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                              {courseEnrollments.map((studentEnr) => (
                                <div 
                                  key={studentEnr.id}
                                  className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 p-2.5 rounded-xl flex items-center justify-between gap-3 flex-wrap"
                                >
                                  <div>
                                    <div className="text-[11px] font-semibold text-neutral-900 dark:text-zinc-50">{studentEnr.studentName}</div>
                                    <div className="text-[9px] text-zinc-400 font-mono">{studentEnr.studentEmail}</div>
                                    <div className="text-[9px] text-zinc-400 font-mono">Paid: ₦{studentEnr.amount?.toLocaleString()} ({studentEnr.paymentReference || 'Direct Transfer'})</div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {studentEnr.paymentStatus === 'approved' ? (
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full font-mono flex items-center gap-0.5 font-semibold">
                                        <Check size={10} className="stroke-[2.5]" /> Approved
                                      </span>
                                    ) : studentEnr.paymentStatus === 'pending_verification' ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full font-mono font-semibold animate-pulse">
                                          Transfer Review
                                        </span>
                                        <button
                                          onClick={() => handleVerifyStudentPayment(studentEnr)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-wide px-2 py-1 transition-colors cursor-pointer"
                                        >
                                          Approve
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full font-mono font-semibold">
                                        {studentEnr.paymentStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {courseEnrollments.length === 0 && (
                                <div className="text-[10px] text-zinc-450 font-mono text-center py-4 italic">No course enrollment history available yet.</div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Propose/Edit Course Modal Window - Implements Collapsible Form Fold Sections */}
      {showProposalModal && (
        <div id="add-curriculum-modal-v2" className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          {(() => {
            const isSection1Filled = currTitle.trim().length > 0 && currDesc.trim().length > 0;
            const isSection2Filled = currCategory.trim().length > 0 && currPrice >= 0 && currDuration > 0;
            const isSection3Filled = currImageUrl.trim().length > 0;
            const isSection4Filled = moduleList.length > 0;

            return (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                
                <div className="flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900 pb-4 mb-4 select-none">
                  <h3 className="text-base font-light tracking-tight text-neutral-900 dark:text-zinc-50">
                    {editingCurriculum ? 'Edit Curriculum' : 'Propose New Course'} // <span className="font-semibold">{editingCurriculum ? 'Update details' : 'Proposal Wizard'}</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowProposalModal(false);
                      setEditingCurriculum(null);
                      setProposalActiveSection('info');
                    }}
                    className="text-zinc-400 hover:text-neutral-950 dark:hover:text-zinc-50 font-semibold text-xl cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  
                  {/* Scrollable multi section container */}
                  <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                    
                    {/* Section 1: Course Basics */}
                    <div className="border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden bg-zinc-50/25 dark:bg-zinc-900/10">
                      <button
                        type="button"
                        onClick={() => setProposalActiveSection(proposalActiveSection === 'info' ? '' as any : 'info')}
                        className="w-full text-left px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} className={isSection1Filled ? "text-emerald-500" : "text-zinc-400"} />
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">1. Course Basics</h4>
                            <p className="text-[10px] text-zinc-400 font-light">Title & Description</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSection1Filled && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono font-medium">
                              <CheckCircle2 size={10} className="stroke-[2.5]" /> Done
                            </span>
                          )}
                          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${proposalActiveSection === 'info' ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {proposalActiveSection === 'info' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 space-y-3 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Course Project Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Advanced Fluid Typography Systems"
                                  value={currTitle}
                                  onChange={(e) => setCurrTitle(e.target.value)}
                                  className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Course Summary & Outcome</label>
                                <textarea
                                  placeholder="Briefly describe what students will build and absolute outcomes they achieve..."
                                  value={currDesc}
                                  onChange={(e) => setCurrDesc(e.target.value)}
                                  className="w-full min-h-20 text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                                  required
                                ></textarea>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Section 2: Details & Pricing */}
                    <div className="border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden bg-zinc-50/25 dark:bg-zinc-900/10">
                      <button
                        type="button"
                        onClick={() => setProposalActiveSection(proposalActiveSection === 'details' ? '' as any : 'details')}
                        className="w-full text-left px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders size={16} className={isSection2Filled ? "text-emerald-500" : "text-zinc-400"} />
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">2. Details & Pricing</h4>
                            <p className="text-[10px] text-zinc-400 font-light">Category, Price & Level</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSection2Filled && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono font-medium">
                              <CheckCircle2 size={10} className="stroke-[2.5]" /> Done
                            </span>
                          )}
                          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${proposalActiveSection === 'details' ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {proposalActiveSection === 'details' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 space-y-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1 relative">
                                  <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Category</label>
                                  <select
                                    value={currCategory}
                                    onChange={(e) => setCurrCategory(e.target.value)}
                                    className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-2.5 py-2.5 outline-hidden"
                                  >
                                    {[
                                      "Business", "Marketing", "Design", "Tech", "Visual Design",
                                      "Vocational (Hairmaking, Carpentry, etc.)", "Cloud Architecture", "Security Engineering", "Other"
                                    ].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                                </div>

                                <div className="col-span-1 relative">
                                  <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Target level</label>
                                  <select
                                    value={currLevel}
                                    onChange={(e) => setCurrLevel(e.target.value as any)}
                                    className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-2.5 py-2.5 outline-hidden"
                                  >
                                    {["Beginner", "Intermediate", "Advanced"].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                                  </select>
                                </div>

                                <div className="col-span-1">
                                  <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Weeks count</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={currDuration}
                                    onChange={(e) => setCurrDuration(Number(e.target.value))}
                                    className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-2.5 py-2 focus:outline-hidden"
                                    required
                                  />
                                </div>

                                <div className="col-span-1">
                                  <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Price (NGN)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={currPrice}
                                    onChange={(e) => setCurrPrice(Number(e.target.value))}
                                    className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-2.5 py-2 focus:outline-hidden"
                                    required
                                  />
                                </div>
                              </div>

                              {currCategory === 'Other' && (
                                <div className="space-y-1">
                                  <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Custom Category</label>
                                  <input
                                    type="text"
                                    placeholder="Enter custom category name..."
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    className="w-full text-xs font-light bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2 focus:outline-hidden"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Section 3: Cover Image */}
                    <div className="border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden bg-zinc-50/25 dark:bg-zinc-900/10">
                      <button
                        type="button"
                        onClick={() => setProposalActiveSection(proposalActiveSection === 'image' ? '' as any : 'image')}
                        className="w-full text-left px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Camera size={16} className={isSection3Filled ? "text-emerald-500" : "text-zinc-400"} />
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">3. Cover Illustration</h4>
                            <p className="text-[10px] text-zinc-400 font-light">Promotional Lesson Graphic</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSection3Filled && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono font-medium">
                              <CheckCircle2 size={10} className="stroke-[2.5]" /> Done
                            </span>
                          )}
                          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${proposalActiveSection === 'image' ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {proposalActiveSection === 'image' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                              <div className="flex items-center gap-4">
                                {currImageUrl ? (
                                  <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shrink-0 shadow-2xs">
                                    <img 
                                      src={currImageUrl} 
                                      alt="Cover preview" 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setCurrImageUrl('')}
                                      className="absolute inset-0 bg-neutral-950/40 hover:bg-neutral-950/60 flex items-center justify-center text-white transition-colors cursor-pointer"
                                    >
                                      <X size={14} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-zinc-150 flex items-center justify-center text-zinc-400 shrink-0 bg-zinc-50">
                                    <Camera size={14} className="text-zinc-400" />
                                  </div>
                                )}

                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center">
                                    <label className="bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 dark:bg-brand-yellow dark:text-neutral-950 dark:border-brand-yellow text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-2 rounded-xl cursor-pointer transition-colors flex items-center gap-1">
                                      <Upload size={11} />
                                      Select File
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload}
                                        className="hidden" 
                                      />
                                    </label>
                                  </div>
                                  <p className="text-[9px] text-zinc-400 font-light leading-snug">
                                    Select PEG/PNG course thumbnail graphics. Left empty: default backdrop auto-assigned.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Section 4: Syllabus & Modules */}
                    <div className="border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden bg-zinc-50/25 dark:bg-zinc-900/10">
                      <button
                        type="button"
                        onClick={() => setProposalActiveSection(proposalActiveSection === 'syllabus' ? '' as any : 'syllabus')}
                        className="w-full text-left px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className={isSection4Filled ? "text-emerald-500" : "text-zinc-400"} />
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">4. Syllabus Plan</h4>
                            <p className="text-[10px] text-zinc-400 font-light">Chapters & Modules ({moduleList.length})</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSection4Filled && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono font-medium">
                              <CheckCircle2 size={10} className="stroke-[2.5]" /> Done
                            </span>
                          )}
                          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${proposalActiveSection === 'syllabus' ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {proposalActiveSection === 'syllabus' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                              <label className="block text-[10px] uppercase tracking-wider font-light text-zinc-400 mb-1">Add Weekly Syllabus Modules ({moduleList.length})</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g. Introduction to grid metrics & structures"
                                  value={newModuleText}
                                  onChange={(e) => setNewModuleText(e.target.value)}
                                  className="flex-1 text-xs font-light bg-zinc-50 dark:bg-zinc-905 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddModule}
                                  className="bg-neutral-900 text-white dark:bg-brand-yellow dark:text-neutral-950 rounded-xl px-3 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  Add
                                </button>
                              </div>

                              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                                {moduleList.map((mod, index) => (
                                  <div key={index} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                    <span className="truncate">Week {index + 1}: {mod}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveModule(index)}
                                      className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                                {moduleList.length === 0 && (
                                  <p className="text-[10px] text-zinc-400 font-mono py-2 text-center select-none">Enter week chapters and register the modules index.</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex gap-2">
                    <button
                      type="submit"
                      disabled={moduleList.length === 0 || !currTitle.trim()}
                      className="bg-neutral-900 hover:bg-neutral-850 dark:bg-brand-yellow dark:text-neutral-950 text-white px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide cursor-pointer flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {editingCurriculum ? 'Save Changes' : 'Propose To Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProposalModal(false);
                        setEditingCurriculum(null);
                        setProposalActiveSection('info');
                      }}
                      className="bg-zinc-100 dark:bg-zinc-900 text-neutral-850 dark:text-zinc-400 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer py-2.5 hover:bg-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>

                </form>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}

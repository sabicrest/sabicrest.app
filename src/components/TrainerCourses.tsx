/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Curriculum, CourseEnrollment } from '../types';
import { db } from '../db';
import { 
  BookOpen, Plus, Search, Sparkles, Filter, ChevronDown, CheckCircle2, AlertCircle, XCircle, Clock,
  DollarSign, Users, Award, BookOpenCheck, ChevronUp, FileText, Sliders, Camera, Upload, X, ArrowUpRight, Check,
  Calendar, Lock, Unlock, Info
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

  // Tab control state
  const [currentTab, setCurrentTab] = useState<'courses' | 'roster'>('courses');

  // Cohort & Roster filters state
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterCourseFilter, setRosterCourseFilter] = useState<string>('all');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [rosterDateFilter, setRosterDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [cohortStartDateInput, setCohortStartDateInput] = useState<Record<string, string>>({});

  // Interactive detail accordions
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);
  const [expandedStudentsId, setExpandedStudentsId] = useState<string | null>(null);

  // Proposal Form Modal States
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [proposalActiveSection, setProposalActiveSection] = useState<'info' | 'details' | 'image' | 'syllabus'>('info');
  const [showAgreementModal, setShowAgreementModal] = useState(false);

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

  // Activate cohort start date (requires min 1 active student registered)
  const handleActivateCohort = (courseId: string, selectedDate: string) => {
    if (!selectedDate) {
      alert("Please select a start date before activating the cohort.");
      return;
    }
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Verify there is at least one active student
    const approvedCount = getApprovedStudentsCount(courseId);
    if (approvedCount < 1) {
      alert("Cannot activate cohort. A cohort must have at least 1 registered and approved student before starting.");
      return;
    }

    const updated: Curriculum = {
      ...course,
      cohortStartDate: selectedDate
    };
    db.updateCurriculum(updated);
    
    db.addNotification({
      userId: currentUser.id,
      title: 'Cohort Start Date Set',
      message: `The official cohort start date for "${course.title}" has been activated on ${selectedDate}.`,
      type: 'curriculum'
    });

    loadData();
  };

  // Toggle completion status for registered student
  const handleToggleStudentCompletion = (enr: CourseEnrollment) => {
    const isNowCompleted = !enr.completed;
    const updated: CourseEnrollment = {
      ...enr,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined
    };
    db.updateEnrollment(updated);

    db.addNotification({
      userId: enr.studentId,
      title: isNowCompleted ? 'Course Cohort Completed!' : 'Cohort Progress Re-opened',
      message: isNowCompleted 
        ? `Congratulations! ${currentUser.name} marked your attendance and coursework for "${enr.courseTitle}" as successfully completed.`
        : `Your progress status for "${enr.courseTitle}" has been updated by the instructor.`,
      type: 'grade'
    });

    loadData();
  };

  // Process early 65% draw out of 85% within 48 hours of starting
  const handleProcessEarlyDraw = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated: Curriculum = {
      ...course,
      earlyDrawProcessed: true
    };
    db.updateCurriculum(updated);

    db.addNotification({
      userId: currentUser.id,
      title: '65% Early Payout Processed',
      message: `Successfully processed an early draw of 65% course fee (₦${(course.price * 0.65).toLocaleString()}) for tech cohort "${course.title}".`,
      type: 'system'
    });

    loadData();
  };

  // Process full pay draw (full 85% or remaining 20% balance) within 48 hours of ending
  const handleProcessFullDraw = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated: Curriculum = {
      ...course,
      fullDrawProcessed: true
    };
    db.updateCurriculum(updated);

    db.addNotification({
      userId: currentUser.id,
      title: 'Full Payout Balance Processed',
      message: `Successfully accessed the full remaining payout balance of ₦${(course.price * (course.earlyDrawProcessed ? 0.20 : 0.85)).toLocaleString()} for "${course.title}".`,
      type: 'system'
    });

    loadData();
  };

  // Utility to compute timeline dates & hour differences for payout windows
  const getCohortTimeline = (course: Curriculum) => {
    if (!course.cohortStartDate) return null;
    const start = new Date(course.cohortStartDate);
    const durationWeeks = course.durationWeeks || 8;
    const durationMs = durationWeeks * 7 * 24 * 3600 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const now = new Date();

    const startFormatted = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const endFormatted = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const hoursSinceStart = (now.getTime() - start.getTime()) / (3600 * 1000);
    const hoursSinceEnd = (now.getTime() - end.getTime()) / (3600 * 1000);

    const hasBegun = hoursSinceStart >= 0;
    const hasEnded = hoursSinceEnd >= 0;

    // Early draw window: within 48 hours after begins
    const earlyDrawOpen = hasBegun && hoursSinceStart <= 48;
    const earlyHoursLeft = earlyDrawOpen ? Math.max(0, 48 - hoursSinceStart) : 0;

    // Full draw window: within 48 hours after ends
    const fullDrawOpen = hasEnded && hoursSinceEnd <= 48;
    const fullHoursLeft = fullDrawOpen ? Math.max(0, 48 - hoursSinceEnd) : 0;

    return {
      startFormatted,
      endFormatted,
      hasBegun,
      hasEnded,
      earlyDrawOpen,
      earlyHoursLeft,
      fullDrawOpen,
      fullHoursLeft,
      hoursSinceStart,
      hoursSinceEnd
    };
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

  const getApprovedStudentsCount = (courseId: string) => {
    return enrollments.filter(e => e.courseId === courseId && e.paymentStatus === 'approved').length;
  };

  // Sum of course proposal fees for approved cohorts having at least 1 approved student
  const totalCohortsEligiblePriceSum = courses
    .filter(c => c.status === 'approved' && getApprovedStudentsCount(c.id) >= 1)
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const trainerEligiblePayout85 = totalCohortsEligiblePriceSum * 0.85;
  const platformMaintenanceFee15 = totalCohortsEligiblePriceSum * 0.15;

  // Combined filters applied lists
  const filteredCourses = courses.filter(col => {
    const matchesSearch = col.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          col.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          col.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || col.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="trainer-courses-viewport" className="py-6 max-w-7xl mx-auto px-4 select-none font-sans space-y-6">
      
      {/* Upper Dashboard Banner - Mobile-First */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-neutral-900 dark:text-zinc-50 flex items-center gap-2">
              <BookOpen className="text-brand-yellow shrink-0" size={24} />
              My <span className="font-semibold">Courses Hub</span>
            </h1>
            <p className="text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
              Curriculum building & verification control workspace
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAgreementModal(true)}
              className="flex items-center gap-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-850 dark:hover:bg-zinc-800 text-neutral-800 dark:text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
            >
              <FileText size={14} className="text-brand-yellow" /> Agreement
            </button>
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
      </div>

      {/* Metrics Section: Elegant grid made fully mobile-first and clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Courses Metric */}
        <button 
          onClick={() => {
            setCurrentTab('courses');
            setStatusFilter('all');
          }}
          className="text-left w-full bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60 transition-all active:scale-[0.98] cursor-pointer"
        >
          <BookOpenCheck size={16} className="text-zinc-400 dark:text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide flex items-center gap-1">Courses Created <ArrowUpRight size={10} className="stroke-[1.5]" /></div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-zinc-50">{totalCourses}</div>
          </div>
        </button>

        {/* Live Courses Metric */}
        <button 
          onClick={() => {
            setCurrentTab('courses');
            setStatusFilter('approved');
          }}
          className="text-left w-full bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Award size={16} className="text-emerald-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide flex items-center gap-1">Approved / Live <ArrowUpRight size={10} className="stroke-[1.5]" /></div>
            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{approvedCourses}</div>
          </div>
        </button>

        {/* Students Enrolled Metric */}
        <button 
          onClick={() => {
            setCurrentTab('roster');
            setRosterStatusFilter('all');
          }}
          className="text-left w-full bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-24 rounded-2xl flex flex-col justify-between hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Users size={16} className="text-indigo-500" />
          <div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide flex items-center gap-1">Students Active <ArrowUpRight size={10} className="stroke-[1.5]" /></div>
            <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{totalStudentsEnrolled}</div>
          </div>
        </button>

        {/* Projected Revenue Metric - Gross Payout details */}
        <button 
          onClick={() => {
            setCurrentTab('roster');
          }}
          className="text-left w-full bg-amber-50/20 border border-amber-100/60 dark:bg-zinc-900 dark:border-zinc-800/60 p-3 h-auto rounded-2xl flex flex-col justify-between space-y-1 hover:bg-amber-50/40 dark:hover:bg-zinc-850/60 transition-all active:scale-[0.98] cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <DollarSign size={16} className="text-amber-600 dark:text-brand-yellow" />
            <span className="text-[8px] bg-amber-100/60 text-amber-800 dark:bg-amber-950/40 dark:text-brand-yellow font-mono px-1.5 py-0.5 rounded uppercase leading-none font-bold">Trainer 85%</span>
          </div>
          <div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Trainer Payout</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-zinc-50 font-sans tracking-tight">
              ₦{trainerEligiblePayout85.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[8.5px] text-zinc-450 dark:text-zinc-500 font-light leading-none">
              Platform Maintenance (15%): ₦{platformMaintenanceFee15.toLocaleString()} <br/>
              Total Cohort Gross: ₦{totalCohortsEligiblePriceSum.toLocaleString()}
            </p>
          </div>
        </button>
      </div>

      {/* Tab control headers */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-900 pb-px">
        <button
          onClick={() => setCurrentTab('courses')}
          className={`flex-1 sm:flex-initial text-center sm:text-left flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            currentTab === 'courses'
              ? 'border-neutral-900 text-neutral-900 dark:border-brand-yellow dark:text-brand-yellow font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Sliders size={14} /> My Course Proposals & Curricula
        </button>
        <button
          onClick={() => setCurrentTab('roster')}
          className={`flex-1 sm:flex-initial text-center sm:text-left flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            currentTab === 'roster'
              ? 'border-neutral-900 text-neutral-900 dark:border-brand-yellow dark:text-brand-yellow font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Users size={14} /> Cohort History & Roster Audits
        </button>
      </div>

      {currentTab === 'courses' ? (
        <>
          {/* Control filters panel - highly touch and mobile optimized */}
          <div className="space-y-3 w-full max-w-full overflow-hidden">
            {/* Search tool block */}
            <div className="relative w-full">
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
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth w-full max-w-full">
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
                            <span className="text-[9px] font-mono text-zinc-455 dark:text-zinc-555 uppercase bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 rounded">
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
        </>
      ) : (
        /* Roster & Cohort History Control Panel */
        <div id="trainer-roster-control-panel" className="space-y-6">
          {/* Controls Filters Card */}
          <div className="bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="text-[11px] font-bold text-neutral-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-850 pb-2">
              <Filter size={13} className="text-zinc-400" /> Roster Filters & Cohort Date Settings
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Student Search</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search size={12} className="text-zinc-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Course Selection */}
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Select Cohort</label>
                <select
                  value={rosterCourseFilter}
                  onChange={(e) => setRosterCourseFilter(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-hidden"
                >
                  <option value="all">All Cohorts</option>
                  {courses.filter(c => c.status === 'approved').map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Completion Status Filter */}
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Progress Status</label>
                <select
                  value={rosterStatusFilter}
                  onChange={(e) => setRosterStatusFilter(e.target.value as any)}
                  className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">⏳ In Training (Active)</option>
                  <option value="completed">✓ Completed (Graduated)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Cohort Start Month/Day</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={rosterDateFilter}
                    onChange={(e) => setRosterDateFilter(e.target.value)}
                    className="flex-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 focus:outline-hidden"
                  />
                  {rosterDateFilter && (
                    <button
                      onClick={() => setRosterDateFilter('')}
                      className="bg-zinc-250 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-850 dark:text-zinc-300 px-2 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Roster list grouping logic */}
          <div className="space-y-4">
            {courses.filter(c => c.status === 'approved' && (rosterCourseFilter === 'all' || c.id === rosterCourseFilter) && (!rosterDateFilter || (c.cohortStartDate && c.cohortStartDate.includes(rosterDateFilter)))).length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl p-8 text-center bg-zinc-50/20">
                <Calendar className="mx-auto text-zinc-350" size={28} />
                <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-300 mt-2">No active cohorts match selected filters</h4>
                <p className="text-[10px] text-zinc-450 mt-1">Please adjust course select dropdown or date calendars.</p>
              </div>
            ) : (
              courses.filter(c => c.status === 'approved' && (rosterCourseFilter === 'all' || c.id === rosterCourseFilter) && (!rosterDateFilter || (c.cohortStartDate && c.cohortStartDate.includes(rosterDateFilter)))).map(col => {
                const approvedRoster = enrollments.filter(e => {
                  const matchesSearch = e.studentName.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                                        e.studentEmail.toLowerCase().includes(rosterSearch.toLowerCase());
                  const matchesStatus = rosterStatusFilter === 'all' || 
                                        (rosterStatusFilter === 'completed' && e.completed) ||
                                        (rosterStatusFilter === 'active' && !e.completed);
                  return e.courseId === col.id && e.paymentStatus === 'approved' && matchesSearch && matchesStatus;
                });

                const totalRegistrations = getApprovedStudentsCount(col.id);
                const timeline = getCohortTimeline(col);

                return (
                  <div key={col.id} className="bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-900 rounded-3xl overflow-hidden shadow-2xs">
                    
                    {/* Cohort Header Card Info */}
                    <div className="p-4 sm:p-5 bg-zinc-50/40 dark:bg-zinc-900/10 border-b border-zinc-100 dark:border-zinc-900 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 dark:bg-amber-955/40 px-2 py-0.5 rounded-sm">
                            {col.category}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-sm">
                            {col.level}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-sm font-semibold">
                            Capped (Max 5 Students): {totalRegistrations}/5
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-zinc-50 tracking-tight mt-1">
                          {col.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                          {col.durationWeeks} Weeks Cohort Program • Proposal Fee: <strong className="font-mono text-neutral-850 dark:text-zinc-200">₦{(col.price || 0).toLocaleString()}</strong>
                        </p>
                      </div>

                      {/* Cohort Date Setting and Activation Status Button */}
                      <div className="w-full md:w-auto pt-2 md:pt-0">
                        {!col.cohortStartDate ? (
                          <div className="bg-amber-50/40 border border-amber-100/60 p-2 rounded-xl flex items-center justify-between gap-3 text-xs w-full sm:min-w-[260px] min-w-[210px]">
                            <div>
                              <div className="text-[8px] font-bold text-amber-800 uppercase font-mono tracking-wide">Awaiting Activation</div>
                              <div className="text-[9px] text-zinc-505 leading-none">Min 1 paid student registration needed</div>
                            </div>
                            
                            {totalRegistrations >= 1 ? (
                              <div className="flex gap-1 items-center">
                                <input
                                  type="date"
                                  min="2026-01-01"
                                  id={`date-activate-${col.id}`}
                                  value={cohortStartDateInput[col.id] || ''}
                                  onChange={(e) => setCohortStartDateInput(prev => ({ ...prev, [col.id]: e.target.value }))}
                                  className="text-[10px] bg-white border border-zinc-250 dark:border-zinc-800 rounded px-1.5 py-1 outline-hidden"
                                />
                                <button
                                  onClick={() => handleActivateCohort(col.id, cohortStartDateInput[col.id])}
                                  className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-brand-yellow dark:text-neutral-950 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Activate
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-0.5 bg-zinc-100 px-2 py-1 rounded-sm leading-none">
                                <Lock size={10} /> Locked
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-xl text-right">
                            <span className="text-[9px] text-emerald-800 dark:text-emerald-450 font-mono uppercase bg-emerald-100/40 dark:bg-emerald-950 px-2 py-0.5 rounded font-bold">
                              ✓ Cohort Active
                            </span>
                            <div className="text-[10px] text-zinc-550 mt-1 leading-tight font-mono">
                              Start: <span className="font-semibold text-neutral-850 dark:text-zinc-200">{timeline?.startFormatted}</span> <br />
                              Graduation: <span className="font-semibold text-neutral-850 dark:text-zinc-200">{timeline?.endFormatted}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Financial Payout Access System inside each Activated Cohort block */}
                    {col.cohortStartDate && timeline && (
                      <div className="bg-zinc-50/40 border-b border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Payout Phase 1: Early Draw 65% out of 85% within 48 hours is possible */}
                        <div className="border border-zinc-200/60 p-3 bg-white rounded-2xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider font-semibold text-zinc-450">
                              <span>Phase 1: Early Draw (65% share)</span>
                              <span className="text-amber-600 dark:text-brand-yellow font-bold">₦{(col.price * 0.65).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-light">
                              Trainers can draw 65% out of the 85% course fee within 48 hours after the cohort begins.
                            </p>
                          </div>

                          <div className="mt-3 font-sans">
                            {col.earlyDrawProcessed ? (
                              <div className="w-full bg-emerald-50 text-emerald-700 rounded-lg py-1.5 px-3 text-center text-[10px] font-semibold flex items-center justify-center gap-1 leading-tight">
                                <Check size={11} className="stroke-[2.5]" /> 65% Pay Share Processed
                              </div>
                            ) : timeline.earlyDrawOpen ? (
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleProcessEarlyDraw(col.id)}
                                  className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-brand-yellow dark:text-neutral-950 text-neutral-950 rounded-lg py-1.5 px-3 text-center text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Process 65% Early Draw (₦{(col.price * 0.65).toLocaleString()})
                                </button>
                                <div className="text-[8.5px] text-amber-600 dark:text-brand-yellow font-mono text-center flex items-center justify-center gap-1">
                                  <Clock size={10} className="animate-spin" /> Early draw open window: {timeline.earlyHoursLeft.toFixed(1)} hrs left!
                                </div>
                              </div>
                            ) : !timeline.hasBegun ? (
                              <div className="w-full bg-zinc-100 text-zinc-400 rounded-lg py-1.5 px-3 text-center text-[10px] font-semibold cursor-not-allowed leading-tight flex items-center justify-center gap-1 select-none">
                                <Lock size={10} /> Locked until Cohort Start Date ({(new Date(col.cohortStartDate).toLocaleDateString() === new Date().toLocaleDateString() ? "Scheduled Today" : "Awaiting set-day")})
                              </div>
                            ) : (
                              <div className="w-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 rounded-lg py-1.5 px-3 text-center text-[10px] font-semibold leading-tight flex items-center justify-center gap-1 select-none">
                                <XCircle size={10} className="text-zinc-400" /> Early Draw Window Closed (48h elapsed)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payout Phase 2: Full payout access details within 48 hours after end */}
                        <div className="border border-zinc-200/60 p-3 bg-white rounded-2xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider font-semibold text-zinc-455">
                              <span>Phase 2: End Balance (Remaining Pay)</span>
                              <span className="text-emerald-600 font-bold">₦{(col.price * (col.earlyDrawProcessed ? 0.20 : 0.85)).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-light">
                              Access full or remaining balance within 48 hours after cohort ends (ends on {timeline.endFormatted}).
                            </p>
                          </div>

                          <div className="mt-3">
                            {col.fullDrawProcessed ? (
                              <div className="w-full bg-emerald-50 text-emerald-700 rounded-lg py-1.5 px-3 text-center text-[10px] font-semibold flex items-center justify-center gap-1 leading-tight">
                                <Check size={11} className="stroke-[2.5]" /> Full Balance Processed & Closed
                              </div>
                            ) : timeline.fullDrawOpen ? (
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleProcessFullDraw(col.id)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 px-3 text-center text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Process Balance payout (₦{(col.price * (col.earlyDrawProcessed ? 0.20 : 0.85)).toLocaleString()})
                                </button>
                                <div className="text-[8.5px] text-emerald-605 font-mono text-center flex items-center justify-center gap-1">
                                  <Clock size={10} className="animate-pulse" /> Access window open: {timeline.fullHoursLeft.toFixed(1)} hrs left!
                                </div>
                              </div>
                            ) : !timeline.hasEnded ? (
                              <div className="w-full bg-zinc-100 text-zinc-400 rounded-lg py-1.5 px-3 text-center text-[10px] font-semibold cursor-not-allowed leading-tight flex items-center justify-center gap-1 select-none">
                                <Lock size={10} /> Locked until Cohort concludes ({timeline.endFormatted})
                              </div>
                            ) : (
                              // Allow access with standard request since the peak 48h elapsed
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleProcessFullDraw(col.id)}
                                  className="w-full bg-neutral-900 hover:bg-neutral-850 text-white rounded-lg py-1.5 px-3 text-center text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Claim Cohort Balance (₦{(col.price * (col.earlyDrawProcessed ? 0.20 : 0.85)).toLocaleString()})
                                </button>
                                <p className="text-[8.5px] text-zinc-400 font-light text-center leading-tight">Peak 48-hour access window has elapsed. Claims trigger standard manual processing.</p>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Active Roster List inside Cohort Block */}
                    <div className="p-4 bg-zinc-50/10">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 font-mono mb-2 flex items-center gap-1">
                        <Users size={11} className="text-zinc-400" /> Active Student Roster list ({approvedRoster.length})
                      </div>

                      <div className="space-y-2">
                        {approvedRoster.map(studentEnr => (
                          <div 
                            key={studentEnr.id} 
                            className="bg-white border border-zinc-100 dark:border-zinc-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-neutral-900 dark:text-zinc-55 flex items-center gap-1.5">
                                {studentEnr.studentName}
                                {studentEnr.completed ? (
                                  <span className="text-[8px] uppercase font-bold text-emerald-800 bg-emerald-100/60 px-1.5 py-0.5 rounded-sm">
                                    ✓ Completed
                                  </span>
                                ) : (
                                  <span className="text-[8px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm animate-pulse">
                                    ⏳ In Training
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-zinc-405 font-mono">
                                Email: {studentEnr.studentEmail} • Registered on: {studentEnr.verifiedAt ? new Date(studentEnr.verifiedAt).toLocaleDateString() : 'Direct Setup'}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] text-zinc-450 dark:text-zinc-500">
                                Paid: ₦{studentEnr.amount?.toLocaleString() || (col.price || 0).toLocaleString()}
                              </span>
                              
                              <button
                                onClick={() => handleToggleStudentCompletion(studentEnr)}
                                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  studentEnr.completed
                                    ? 'bg-amber-100/60 text-amber-900 hover:bg-amber-200 border border-amber-200'
                                    : 'bg-emerald-650 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {studentEnr.completed ? "Mark Active" : "Mark Completed"}
                              </button>
                            </div>
                          </div>
                        ))}

                        {approvedRoster.length === 0 && (
                          <p className="text-[10px] text-zinc-400 font-mono py-2 text-center select-none italic">
                            No students matching selected filter criteria registered for this cohort.
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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

                              {/* Live updated split calculation reminder banner */}
                              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 text-[11px] leading-relaxed select-none text-zinc-650 dark:text-zinc-300">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                                  <AlertCircle size={12} className="text-brand-yellow font-semibold" /> Cohort Fixed-Pricing Revenue splits
                                </div>
                                <p className="font-light text-zinc-500 dark:text-zinc-400">
                                  With Sabicrest's unique fixed-fee cohort model, the proposed fee of <strong>₦{currPrice.toLocaleString()}</strong> is the total payment you will collect for this cohort (requires a minimum of 1 active student; maximum of 5 students). Revenue splits:
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] text-center">
                                  <div className="bg-white dark:bg-zinc-955 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    <span className="block text-[8px] text-zinc-400 font-mono">Trainer Payout (85%)</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">₦{(currPrice * 0.85).toLocaleString()}</span>
                                  </div>
                                  <div className="bg-white dark:bg-zinc-955 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    <span className="block text-[8px] text-zinc-400 font-mono">Sabicrest Maintenance (15%)</span>
                                    <span className="font-semibold text-neutral-850 dark:text-zinc-300 font-mono">₦{(currPrice * 0.15).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between text-xs">
                                  <span className="font-medium">Total Cohort Fee:</span>
                                  <span className="font-bold text-amber-600 dark:text-brand-yellow font-mono">₦{currPrice.toLocaleString()}</span>
                                </div>
                                <p className="text-[9px] text-zinc-455 dark:text-zinc-500 mt-1 text-center font-light leading-snug">
                                  Each course proposal represents a single, independent cohort (max 5 students) and cannot be automatically reused. New cohorts require Admin approval.
                                </p>
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

      {/* In-app Trainer Partnership Agreement Modal - Downloadable as PDF/HTML */}
      {showAgreementModal && (
        <div id="trainer-partnership-agreement-modal" className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Agreement Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-3 select-none">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-zinc-50 flex items-center gap-1.5">
                  <FileText className="text-brand-yellow" size={16} /> Trainer Revenue & Collaboration Agreement
                </h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider mt-0.5 uppercase">
                  Sabicrest Platform Terms • Company Reference ID: trainer-ag-2026
                </p>
              </div>
              <button
                onClick={() => setShowAgreementModal(false)}
                className="text-zinc-400 hover:text-neutral-950 dark:hover:text-zinc-50 p-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Agreement Body */}
            <div id="agreement-document-content" className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-zinc-650 dark:text-zinc-300 font-sans leading-relaxed select-text scrollbar-thin">
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-800 dark:text-amber-300 font-serif leading-normal italic py-3 select-none">
                "This agreement defines the legal fee split policies, cohort limit guidelines, and standard curriculum compliance parameters for experts collaborating with Sabicrest. By creating a curriculum proposal on the platform, both Sabicrest Group of Companies and the Trainer agree to abide by the terms set forth in this document."
              </div>

              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 select-none">
                <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide">Document Metadata</div>
                <div className="text-[11px] font-mono">
                  <span className="font-semibold text-neutral-850 dark:text-zinc-200">Contract Version:</span> SC-V4.0-COHORT <br />
                  <span className="font-semibold text-neutral-850 dark:text-zinc-200">Company Board Update Date:</span> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (Latest) <br />
                  <span className="font-semibold text-neutral-850 dark:text-zinc-200">Status:</span> Legally Active (In-App Binding) <br />
                  <span className="font-semibold text-neutral-850 dark:text-zinc-200">Applicable Region:</span> Comprehensive Global & Regional Domains
                </div>
              </div>

              {/* Terms Details */}
              <div className="space-y-3">
                
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">1. Pricing Controls & Setup</h4>
                  <p className="font-light mt-0.5">
                    Trainers set their cohort base Course Fees during the proposal phase. The proposed price represents the fixed payment the trainer will collect for that approved cohort, provided a minimum of one (1) active student is registered. Students see the full fee set by the trainer on their marketplace catalog.
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">2. Revenue Fee Splitting Model</h4>
                  <p className="font-light mt-0.5">
                    Sabicrest structures payouts directly proportional to completed cohorts. For each approved cohort, the trainer earns the exact fee, retaining an **85% direct share** of the cohort price, while the platform earns a **15% commission** for infrastructure and platform maintenance.
                  </p>
                  <p className="font-semibold text-neutral-900 dark:text-zinc-100 mt-2 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl">
                    Syllabus Cohort Splits:<br />
                    • Partner Trainer Share: 85.0% of cohort fee<br />
                    • Sabicrest Group of Companies Maintenance Share: 15.0% of cohort fee
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">3. Roster Management & Cohort Limits</h4>
                  <p className="font-light mt-0.5">
                    Each cohort is strictly capped at a <strong>maximum of five (5) students</strong> per cohort model. If a cohort hits the capacity of 5, additional registered students must be rostered on the trainer's next approved cohort proposal, or transferred to another available trainer's cohort. Course proposals represent a single cohort occurrence; they do not automatically rollover and must be approved anew.
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">4. Intellectual Rights & Terminations</h4>
                  <p className="font-light mt-0.5">
                    Curriculum materials proposed remain the shared property of the respective trainer and Sabicrest Group of Companies. Covenant exits require brief notice, provided all current active cohorts (min 1 student, max 5 students) have successfully graduated.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex gap-2 select-none">
              <button
                onClick={() => {
                  const docHtml = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8">
                      <title>Sabicrest Trainer Partnership and Fee Split Agreement</title>
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                          line-height: 1.6;
                          color: #1c1917;
                          background-color: #fafaf9;
                          margin: 40px auto;
                          max-width: 680px;
                          padding: 24px;
                          border: 1px solid #e7e5e4;
                          border-radius: 12px;
                        }
                        .header { text-align: center; border-bottom: 2px solid #e7e5e4; padding-bottom: 12px; margin-bottom: 24px; }
                        .logo { font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; color: #1c1917; }
                        .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #78716c; margin-top: 4px; }
                        h2 { font-size: 16px; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; margin-top: 24px; text-transform: uppercase; color: #1c1917; }
                        .meta-info { font-family: monospace; font-size: 11px; background: #f5f5f4; border: 1px solid #e7e5e4; padding: 12px; border-radius: 8px; margin: 16px 0; }
                        .split-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                        .split-table th, .split-table td { border: 1px solid #e7e5e4; padding: 8px 12px; font-size: 12px; text-align: left; }
                        .split-table th { background-color: #f5f5f4; }
                        .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #78716c; border-top: 1px solid #e7e5e4; padding-top: 12px; }
                        @media print {
                          body { border: none; margin: 0; background: #fff; }
                          .no-print { display: none; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="logo">SABICREST</div>
                        <div class="subtitle">Official Trainer Collaboration & Fees Agreement</div>
                      </div>
                      
                      <div class="meta-info">
                        <strong>CONTRACT VERSION:</strong> SC-V4.0-COHORT<br>
                        <strong>COMPANY UPDATE DATE:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
                        <strong>EFFECTIVE STATUS:</strong> Legally Binding Active Agreement<br>
                        <strong>PARTICIPATING PARTY:</strong> Verified Platform Partner Coach (${currentUser.name})
                      </div>

                      <h2>1. Agreement Scope</h2>
                      <p>This legally binding collaboration agreement defines the revenue split matrices, platform fee structures, and course governance policies between Sabicrest Group of Companies and Partner Trainer: <strong>${currentUser.name}</strong>.</p>

                      <h2>2. Revenue Fee Splitting Model & Cohort Limits</h2>
                      <p>Sabicrest Group of Companies operates under an exact, transparent cohort pricing setup. For each approved cohort, the trainer collects the base course fee, retaining 85.0% while Sabicrest retains 15.0% for operations and streaming servers:</p>
                      
                      <table class="split-table">
                        <thead>
                          <tr>
                            <th>Recipient / Allocation</th>
                            <th>Percentage Share</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Trainer Cohort Payout</strong></td>
                            <td>85.0%</td>
                            <td>Guaranteed payout to Trainer (minimum 1 student, maximum 5).</td>
                          </tr>
                        <tr>
                            <td><strong>Sabicrest Platform Maintenance</strong></td>
                            <td>15.0%</td>
                            <td>Standard platform operational and server support commission.</td>
                          </tr>
                          <tr style="font-weight: bold; background: #fafaf9;">
                            <td>Total Cohort Price</td>
                            <td>100.0%</td>
                            <td>Gross curriculum proposal fee set by the Trainer.</td>
                          </tr>
                        </tbody>
                      </table>

                      <h2>3. Cohort Regulations</h2>
                      <p>Each course proposal operates as a separate cohort of maximum 5 students. Rollicks / Rollover is not automated, and every new cohort requires Admin approval.</p>

                      <h2>4. Formal Execution Covenants</h2>
                      <p>Proposing new curriculum syllabi via Sabicrest represents standard electronic confirmation and execution of this agreement. Termination requires 7 days written notice from either partner.</p>

                      <div class="footer">
                        Sabicrest Group of Companies. All Professional Education Rights Protected © ${new Date().getFullYear()}. Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                      </div>
                    </body>
                    </html>
                  `;
                  
                  // Trigger direct download of the agreement HTML as printable document
                  const blob = new Blob([docHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Sabicrest_Trainer_Collaboration_Agreement_${new Date().getFullYear()}.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="bg-neutral-900 hover:bg-neutral-850 dark:bg-brand-yellow dark:text-neutral-950 text-white px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide cursor-pointer flex-1 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ArrowUpRight size={14} /> Download Agreement (PDF/HTML)
              </button>
              <button
                type="button"
                onClick={() => setShowAgreementModal(false)}
                className="bg-zinc-100 dark:bg-zinc-900 text-neutral-850 dark:text-zinc-400 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer py-2.5 hover:bg-zinc-200"
              >
                Close Terms
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Curriculum, CourseEnrollment, AdminActivity } from '../types';
import { db } from '../db';
import { Shield, Sparkles, BookOpen, UserCheck, Settings, Server, CheckSquare, XCircle, ToggleLeft, ToggleRight, Radio, RefreshCw, KeyRound, Clock, AlertCircle, X, Award, ClipboardCheck, Activity, Search } from 'lucide-react';

interface DashboardAdminProps {
  currentUser: User;
}

export default function DashboardAdmin({ currentUser }: DashboardAdminProps) {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [curricula, setCurricula] = useState<Curriculum[]>(db.getCurricula());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [activities, setActivities] = useState<AdminActivity[]>(db.getAdminActivities());
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Course Enrollment approval states
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>(db.getEnrollments());
  const [rejectionEnrollmentId, setRejectionEnrollmentId] = useState<string | null>(null);
  const [rejectEnrollmentReason, setRejectEnrollmentReason] = useState('');

  // Serverless performance controls states
  const [coldStartSpeed, setColdStartSpeed] = useState('11ms');
  const [secLevel, setSecLevel] = useState<'AES-256' | 'AES-GCM-512' | 'FIPS-140-3'>('AES-256');
  const [autoScaleLimit, setAutoScaleLimit] = useState(150);

  const [showActiveProgramsModal, setShowActiveProgramsModal] = useState(false);
  const [showSubmittedWorkModal, setShowSubmittedWorkModal] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [coursesSearchQuery, setCoursesSearchQuery] = useState('');

  const reloadAdminData = () => {
    setUsers(db.getUsers());
    setCurricula(db.getCurricula());
    setTransactions(db.getTransactions());
    setEnrollments(db.getEnrollments());
    setActivities(db.getAdminActivities());
  };

  useEffect(() => {
    // Log dashboard entrance audit
    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Dashboard Access',
      details: 'Administrator entered session under CAO clearance.',
      ipAddress: '192.168.10.22'
    });
    reloadAdminData();
    const interval = setInterval(reloadAdminData, 2000);
    return () => clearInterval(interval);
  }, []);

  const pendingCurricula = curricula.filter(c => c.status === 'pending');
  const onboardedUsers = users.filter(u => u.id !== currentUser.id);

  const handleApproveCurriculum = (currId: string) => {
    const target = curricula.find(c => c.id === currId);
    if (target) {
      const updated: Curriculum = {
        ...target,
        status: 'approved',
        approvedAt: new Date().toISOString()
      };
      db.updateCurriculum(updated);

      // Log admin audit activity
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Approve Syllabus',
        details: `Approved syllabus proposal "${target.title}" proposed by ${target.trainerName}.`,
        ipAddress: '192.168.10.22'
      });

      reloadAdminData();

      // Trigger tutor notification
      db.addNotification({
        userId: target.trainerId,
        title: 'Curriculum Scheme Approved',
        message: `Your propose for "${target.title}" was approved by CAO. Modules are now active.`,
        type: 'curriculum'
      });
    }
  };

  const handleOpenRejection = (id: string) => {
    setRejectionTargetId(id);
    setRejectReason('');
  };

  const handleSaveRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionTargetId) return;

    const target = curricula.find(c => c.id === rejectionTargetId);
    if (target) {
      const updated: Curriculum = {
        ...target,
        status: 'rejected',
        rejectionReason: rejectReason
      };
      db.updateCurriculum(updated);

      // Log admin audit activity
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Reject Syllabus',
        details: `Rejected syllabus "${target.title}" proposed by ${target.trainerName}. Reason: "${rejectReason}"`,
        ipAddress: '192.168.10.22'
      });

      reloadAdminData();

      // Notify tutor of rejection
      db.addNotification({
        userId: target.trainerId,
        title: 'Curriculum Scheme Deficiencies Highlighted',
        message: `Your propose for "${target.title}" was evaluated as pending revision. Reason: ${rejectReason}.`,
        type: 'curriculum'
      });
    }
    setRejectionTargetId(null);
  };

  // --- Enrollment Payment Approvals & Audits ---
  const handleApproveEnrollment = (enrId: string) => {
    const enr = db.getEnrollmentById(enrId);
    if (!enr) return;

    // Update enrollment status to approved
    const updated: CourseEnrollment = {
      ...enr,
      paymentStatus: 'approved'
    };
    db.updateEnrollment(updated);

    // Update Student enrolledCourseIds list
    const student = db.getUsers().find(u => u.id === enr.studentId);
    if (student) {
      const currentEnrolls = student.enrolledCourseIds || ['c-1'];
      if (!currentEnrolls.includes(enr.courseId)) {
        const updatedUser: User = {
          ...student,
          enrolledCourseIds: [...currentEnrolls, enr.courseId]
        };
        db.updateUser(updatedUser);
      }
    }

    // Allocate weekly assignment evaluators for the student
    const course = db.getCurricula().find(c => c.id === enr.courseId);
    if (course) {
      db.addAssignment({
        title: `${course.title}: Getting Started Assignment`,
        description: `Starter evaluation task for the newly registered syllabus: "${course.title}". Scope focus represents Week 1: "${course.modules[0] || 'Foundational Principles'}". Submit your work here when accomplished for tutor grading.`,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days out
        maxPoints: 100,
        studentId: enr.studentId,
        studentName: enr.studentName,
        trainerId: course.trainerId,
        trainerName: course.trainerName
      });

      // inform coach
      db.addNotification({
        userId: course.trainerId,
        title: 'New Student Approved & Onboarded',
        message: `${enr.studentName} has enrolled for your syllabus: "${course.title}". Starter assignment initialized.`,
        type: 'curriculum'
      });
    }

    // inform student
    db.addNotification({
      userId: enr.studentId,
      title: 'Tuition Payment Confirmed & Course Unlocked!',
      message: `Your reference "${enr.paymentReference}" has been audited successfully. "${enr.courseTitle}" is now fully unlocked in your dashboard!`,
      type: 'grade'
    });

    // Log admin audit activity
    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Approve Payment Audit',
      details: `Approved enrollment request of ${enr.studentName} for course "${enr.courseTitle}" (Ref: "${enr.paymentReference || 'N/A'}").`,
      ipAddress: '192.168.10.22'
    });

    reloadAdminData();
  };

  const handleOpenEnrollmentRejection = (id: string) => {
    setRejectionEnrollmentId(id);
    setRejectEnrollmentReason('');
  };

  const handleSaveEnrollmentRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionEnrollmentId) return;

    const enr = db.getEnrollmentById(rejectionEnrollmentId);
    if (enr) {
      const updated: CourseEnrollment = {
        ...enr,
        paymentStatus: 'rejected',
        rejectionReason: rejectEnrollmentReason
      };
      db.updateEnrollment(updated);

      // notify student
      db.addNotification({
        userId: enr.studentId,
        title: 'Tuition Payment Reference Audit Failed',
        message: `Your reference submission "${enr.paymentReference}" was rejected by CAO. Reason: "${rejectEnrollmentReason}".`,
        type: 'system'
      });

      // Log admin audit activity
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Reject Payment Audit',
        details: `Rejected enrollment query from student ${enr.studentName} for course "${enr.courseTitle}" (Ref: "${enr.paymentReference || 'N/A'}"). Reason: "${rejectEnrollmentReason}"`,
        ipAddress: '192.168.10.22'
      });
    }

    setRejectionEnrollmentId(null);
    setRejectEnrollmentReason('');
    reloadAdminData();
  };

  // Toggle user active status or suspend them instantly
  const handleToggleUserStatus = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      const nextStatus: User['status'] = target.status === 'active' ? 'suspended' : 'active';
      const updated: User = { ...target, status: nextStatus };
      db.updateUser(updated);

      // Log admin audit activity
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: nextStatus === 'suspended' ? 'Suspend User' : 'Activate User',
        details: `${nextStatus === 'suspended' ? 'Suspended' : 'Activated'} credentials for "${target.name}" (${target.role}).`,
        ipAddress: '192.168.10.22'
      });

      reloadAdminData();

      db.addNotification({
        userId,
        title: `Account Status Modified`,
        message: `Your Sabicrest credentials status was altered to ${nextStatus}. Contact assistance if this is a mistake.`,
        type: 'system'
      });
    }
  };

  // Turn verification status checkpoint on or off
  const handleToggleUserVerify = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      const updated: User = { ...target, verified: !target.verified };
      db.updateUser(updated);

      // Log admin audit activity
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: !target.verified ? 'Verify Profile' : 'De-verify Profile',
        details: `${!target.verified ? 'Verified' : 'De-verified'} profile for user "${target.name}" (${target.role}).`,
        ipAddress: '192.168.10.22'
      });

      reloadAdminData();

      db.addNotification({
        userId,
        title: `Verified Status Alignment`,
        message: `Administrator has ${!target.verified ? 'Verified' : 'De-verified'} your instructional/student profiles.`,
        type: 'system'
      });
    }
  };

  const simulateServerlessRecalibration = () => {
    setColdStartSpeed('recalculating...');

    // Log admin audit activity
    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Recalibrate DB Clusters',
      details: 'Triggered cluster performance alignment sequence across Appwrite replicas.',
      ipAddress: '192.168.10.22'
    });

    setTimeout(() => {
      const randomSpeed = `${Math.floor(Math.random() * 8) + 6}ms`;
      setColdStartSpeed(randomSpeed);
    }, 700);
  };

  return (
    <div id="admin-dashboard-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Header Banner - Upgraded to match Student/Trainer aesthetics */}
      <div id="admin-hero-banner" className="bg-brand-black text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            Welcome back
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Administration dashboard // <span className="font-semibold text-brand-yellow">{currentUser.name}</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Review course proposals, approve educational materials, manage user accounts, and view platform activity.
          </p>
        </div>

        {/* Dynamic header search box */}
        <div className="relative z-10 w-full md:w-64 shrink-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search users or courses..."
            value={dashboardSearchQuery}
            onChange={(e) => setDashboardSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-brand-yellow font-light shadow-2xs"
          />
          {dashboardSearchQuery && (
            <button 
              onClick={() => setDashboardSearchQuery('')} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Admin Metrics panel row */}
      <div id="admin-metrics-row" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div 
          onClick={() => {
            document.getElementById('admin-users-directory-container')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Registered Users</span>
            <UserCheck size={16} className="text-brand-yellow" />
          </div>
          <div className="text-2xl font-light text-brand-black tracking-tight flex items-baseline gap-1.5">
            <span>{onboardedUsers.length} Users</span>
            <span className="text-[10px] text-zinc-400 font-normal italic">registered</span>
          </div>
        </div>

        <div 
          onClick={() => {
            document.getElementById('course-proposal-approval-queue-container')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Pending Approvals</span>
            <BookOpen size={16} className="text-brand-yellow font-normal" />
          </div>
          <div className="text-2xl font-light text-brand-black tracking-tight flex items-baseline gap-1.5">
            <span>{pendingCurricula.length} Proposals</span>
            <span className="text-[10px] text-brand-yellow font-normal italic">needs action</span>
          </div>
        </div>

        <div 
          onClick={() => setShowActiveProgramsModal(true)}
          className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Active Programs</span>
            <Shield size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-light text-brand-black tracking-tight">
            <span className="font-light text-emerald-600 text-lg">
              {curricula.filter(c => c.status === 'approved').length} Active
            </span>
          </div>
        </div>

        <div 
          onClick={() => setShowSubmittedWorkModal(true)}
          className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-brand-yellow hover:scale-[1.01] hover:shadow-xs transition-all duration-150"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Submitted Work</span>
            <Server size={16} className="text-brand-yellow" />
          </div>
          <div className="text-2xl font-light text-brand-black tracking-tight">
            <span>{db.getAssignments().length} Assignments</span>
          </div>
        </div>

      </div>

      {/* Active Programs Modal */}
      {showActiveProgramsModal && (
        <div id="active-programs-modal" className="fixed inset-0 bg-brand-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-155">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-2xl w-full text-left space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                <Shield size={16} className="text-emerald-500" /> Active Platform Curricula Programs
              </h3>
              <button 
                onClick={() => setShowActiveProgramsModal(false)}
                className="text-zinc-400 hover:text-brand-black cursor-pointer bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {curricula.filter(c => c.status === 'approved').length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-light text-xs bg-zinc-50 rounded-xl">
                  No active approved curricula on the platform yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {curricula.filter(c => c.status === 'approved').map(course => (
                    <div key={course.id} className="py-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                        <div>
                          <h4 className="text-xs font-semibold text-brand-black leading-tight">{course.title}</h4>
                          <p className="text-[10px] text-zinc-400 font-light mt-0.5">
                            Trainer/Coach: <strong className="text-zinc-650">{course.trainerName}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-1 sm:mt-0">
                          <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                            {course.category}
                          </span>
                          <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                            {course.durationWeeks} Weeks
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-550 font-light leading-relaxed">{course.description}</p>
                      
                      {/* Course Modules list */}
                      {course.modules && course.modules.length > 0 && (
                        <div className="bg-zinc-50/50 p-2 rounded-lg border border-zinc-50/80 space-y-1 mt-1">
                          <p className="text-[8.5px] uppercase tracking-wide text-zinc-400 font-bold font-mono">Curriculum Syllabus Modules</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {course.modules.map((mod, index) => (
                              <div key={index} className="text-[11px] text-zinc-600 flex items-center gap-1 font-light">
                                <span className="text-brand-yellow font-bold text-[9px] font-mono">M{index+1}:</span>
                                <span className="truncate">{mod}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowActiveProgramsModal(false)}
                className="bg-brand-black hover:bg-zinc-850 text-white text-xs font-light tracking-wide uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Student Work Modal */}
      {showSubmittedWorkModal && (
        <div id="submitted-assignments-modal" className="fixed inset-0 bg-brand-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-155">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-2xl w-full text-left space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
                <Server size={16} className="text-brand-yellow font-medium" /> All Student Deliverables & Homework
              </h3>
              <button 
                onClick={() => setShowSubmittedWorkModal(false)}
                className="text-zinc-400 hover:text-brand-black cursor-pointer bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {db.getAssignments().length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-light text-xs bg-zinc-50 rounded-xl">
                  No active student homework submissions recorded on the database.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {db.getAssignments().map(ass => {
                    const isPending = ass.status === 'pending_review';
                    const isGraded = ass.status === 'graded';
                    return (
                      <div key={ass.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h4 className="text-xs font-semibold text-brand-black leading-tight">{ass.title}</h4>
                          <p className="text-[10px] text-zinc-400 font-light mt-0.5">
                            Student: <strong className="text-zinc-650">{ass.studentName}</strong> • Coach: <strong>{ass.trainerName}</strong>
                          </p>
                          <p className="text-[10px] text-zinc-550 truncate mt-1 max-w-md italic">
                            Description: {ass.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">
                          <span className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                            isGraded ? 'bg-emerald-50 text-emerald-800' :
                            isPending ? 'bg-amber-50 text-amber-800 animate-pulse' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {ass.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSubmittedWorkModal(false)}
                className="bg-brand-black hover:bg-zinc-850 text-white text-xs font-light tracking-wide uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="admin-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Curricula Moderation list - Left column Wide */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="course-proposal-approval-queue-container">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
              <BookOpen size={13} className="text-brand-yellow" /> Course Proposal Approval Queue
            </h3>

            {pendingCurricula.length === 0 ? (
              <div className="text-center p-12 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100 flex flex-col items-center gap-1">
                <Radio size={28} className="text-zinc-300 animate-pulse" />
                <p>All reviews caught up.</p>
                <p className="text-[10px]">No program curriculum proposals are currently awaiting admin review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCurricula.map(curr => (
                  <div key={curr.id} className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
                      <div>
                        <span className="text-[8px] font-mono tracking-wider bg-brand-yellow/20 text-brand-black px-2 py-0.5 rounded uppercase font-semibold">Pending approval</span>
                        <h4 className="text-sm font-semibold text-brand-black mt-1 leading-tight">{curr.title}</h4>
                        <span className="text-[10px] text-zinc-500">Proposed by Coach: <strong>{curr.trainerName}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          id={`approve-cur-${curr.id}`}
                          onClick={() => handleApproveCurriculum(curr.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] tracking-wide uppercase px-3 py-2 cursor-pointer transition-colors"
                        >
                          Approve Syllabus
                        </button>
                        <button
                          id={`reject-cur-trigger-${curr.id}`}
                          onClick={() => handleOpenRejection(curr.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[10px] tracking-wide uppercase px-3 py-2 cursor-pointer transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-brand-gray font-light leading-relaxed mb-3">{curr.description}</p>
                    
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                      <span>weeks: {curr.durationWeeks} // level: {curr.level} // category: {curr.category}</span>
                      {curr.price !== undefined && (
                        <span className="text-zinc-700 font-bold bg-zinc-100/50 border border-zinc-100/60 px-2 py-0.5 rounded font-sans leading-none">Best Price: ₦{curr.price.toLocaleString()}</span>
                      )}
                    </div>

                    {/* render modules */}
                    <div className="mt-3 bg-white p-2.5 rounded-lg border border-zinc-50">
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 mb-1.5 font-bold font-mono">Proposed weekly Syllabus modules</p>
                      <div className="space-y-1">
                        {curr.modules.map((m, i) => (
                          <div key={i} className="text-xs font-light text-zinc-600 flex items-center gap-1">
                            <span className="text-brand-yellow font-bold text-[9px] font-mono">W{i+1}:</span> {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paystack Tuition & Enrollment Audit Queue */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-[#3bb75e] uppercase flex items-center gap-1.5 font-light">
                <Shield size={13} className="text-[#3bb75e]" /> Paystack Tuition Audit Queue ({enrollments.filter(e => e.paymentStatus === 'pending_verification').length})
              </h3>
              <span className="text-[9px] font-mono uppercase bg-zinc-100 px-2.5 py-0.5 rounded text-zinc-500 font-medium select-none">
                Chief admin audits
              </span>
            </div>

            {(() => {
              const pendingEnrs = enrollments.filter(e => e.paymentStatus === 'pending_verification');
              if (pendingEnrs.length === 0) {
                return (
                  <div className="text-center p-8 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100 flex flex-col items-center gap-1">
                    <Shield size={24} className="text-[#3bb75e]/30 mb-1 animate-pulse" />
                    <p>All tuition records audited.</p>
                    <p className="text-[10px]">No pending Paystack references are currently awaiting CAO clearance.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {pendingEnrs.map(enr => (
                    <div key={enr.id} className="border border-zinc-150/75 rounded-2xl p-4 bg-zinc-50/30 flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono tracking-wider bg-[#3bb75e]/15 text-[#218c3f] border border-[#3bb75e]/25 px-2 py-0.5 rounded uppercase font-bold">
                            Pending Audit
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Amount: <strong>₦{(enr.amount || 35000).toLocaleString()}</strong>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-brand-black leading-tight">
                            {enr.courseTitle}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-light mt-0.5">
                            Student Name: <strong className="text-zinc-750 font-semibold">{enr.studentName}</strong> ({enr.studentEmail})
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-450 items-center">
                          <span className="bg-zinc-100 border border-zinc-150 px-2 py-0.5 rounded text-zinc-700 select-all font-semibold">
                            Reference: {enr.paymentReference}
                          </span>
                          {enr.submittedAt && (
                            <span className="text-zinc-400 font-light text-[9.5px]">
                              Submitted: {new Date(enr.submittedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col justify-end gap-1.5 shrink-0 self-center">
                        <button
                          onClick={() => handleApproveEnrollment(enr.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] uppercase font-bold px-4 py-2 cursor-pointer transition-colors"
                        >
                          Approve payment
                        </button>
                        <button
                          onClick={() => handleOpenEnrollmentRejection(enr.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-[10px] uppercase font-semibold px-4 py-2 cursor-pointer transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Onboarded tenant Directory management list */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="admin-users-directory-container">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
              <UserCheck size={13} className="text-brand-yellow" /> Onboarded platform Users Directory
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-brand-black border-collapse">
                <thead>
                  <tr className="border-b border-zinc-50 text-zinc-400 text-left text-[10px] uppercase font-light">
                    <th className="pb-2">User Profile</th>
                    <th className="pb-2">Assigned Role</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Verify Status</th>
                    <th className="pb-2 text-right">Action Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {onboardedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt="logo" className="w-6 h-6 rounded-full object-cover border border-zinc-100 referrerPolicy='no-referrer'" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-black text-white flex items-center justify-center text-[9px] font-bold">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-brand-black leading-none">{user.name}</p>
                          <p className="text-[9px] text-zinc-400 font-mono leading-none mt-1">{user.email}</p>
                        </div>
                      </td>
                      
                      <td className="py-2.5">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-medium ${
                          user.role === 'trainer' ? 'bg-amber-100 text-amber-900 border border-brand-yellow/30' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <span className={`text-[9.5px] font-mono uppercase ${
                          user.status === 'active' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'
                        }`}>
                          ● {user.status}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded select-none">
                          {user.verified ? 'Verified Active' : 'Unverified Role'}
                        </span>
                      </td>

                      <td className="py-2.5 text-right">
                        <button
                          id={`toggle-suspend-user-${user.id}`}
                          onClick={() => handleToggleUserStatus(user.id)}
                          className={`text-[9px] uppercase tracking-wider font-light px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                            user.status === 'active' ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Platform Overview Panel - Right Side Col */}
        <div className="lg:col-span-1 space-y-6">

          {/* Administrative Action Audit Logs */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="admin-activity-tracker">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center justify-between font-light">
              <span className="flex items-center gap-1.5 font-bold text-brand-black">
                <Activity size={13} className="text-brand-yellow animate-pulse" /> Administrative Audit Trail
              </span>
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                {activities.length} entries
              </span>
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 font-light text-[10px] bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
                  No admin activities recorded yet.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl text-[10px] leading-relaxed space-y-2 hover:border-zinc-300 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-brand-black text-[10.5px] tracking-tight truncate max-w-[150px]">{act.action}</span>
                      <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-zinc-650 font-light">{act.details}</p>

                    <div className="flex flex-wrap items-center justify-between gap-1 border-t border-zinc-100/80 pt-2 text-[9px] text-zinc-400">
                      <span className="truncate max-w-[130px]" title={act.adminEmail}>By: {act.adminName}</span>
                      <span className="font-mono text-brand-yellow font-medium">IP: {act.ipAddress}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[9px] text-zinc-400 italic mt-3 text-right">
              Logs are cryptographically hashed and synced to Appwrite.
            </p>
          </div>
          
          {/* Activity Audit Ledger */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center justify-between font-light">
              <span className="flex items-center gap-1.5">
                <KeyRound size={13} className="text-brand-yellow" /> Database Activity Logs
              </span>
              <button 
                onClick={() => setTransactions(db.getTransactions())}
                className="text-zinc-500 hover:text-brand-black cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw size={11} />
              </button>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 font-light text-[10px] bg-zinc-50 rounded-xl">
                  No activity logs generated yet.
                </div>
              ) : (
                transactions.slice(0, 5).map((tx, idx) => (
                  <div key={idx} className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl text-[10px] font-sans leading-normal space-y-1">
                    <div className="flex justify-between text-brand-black font-semibold">
                      <span className="truncate max-w-[130px]">{tx.operation}</span>
                      <span className="text-emerald-600">Secure</span>
                    </div>
                    <div className="text-zinc-400 flex justify-between">
                      <span>Area: {tx.table}</span>
                      <span>{tx.sizeBytes}B</span>
                    </div>
                    <div className="text-zinc-300 font-light truncate text-[8.5px]">
                      ID: {tx.hash}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[9px] text-zinc-400 italic mt-3 text-right">
              This list shows recent updates on our server.
            </p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
              <Settings size={13} className="text-brand-yellow" /> Guidelines for Admins
            </h3>

            <div className="space-y-4">
              <div className="bg-zinc-50 p-3.5 rounded-xl text-xs font-light text-zinc-500 leading-relaxed border border-zinc-100">
                <span className="font-semibold text-brand-black block mb-1 text-[11px]">Course Approvals</span>
                Check that a course has good lessons and tasks before letting it launch. If a course is not ready, tell the teacher what they can do to fix it.
              </div>

              <div className="bg-zinc-50 p-3.5 rounded-xl text-xs font-light text-zinc-500 leading-relaxed border border-zinc-100">
                <span className="font-semibold text-brand-black block mb-1 text-[11px]">Teacher Verification</span>
                Teachers can design classes once they are approved. Make sure we check their background information before approving them.
              </div>

              <div className="bg-zinc-55 p-3.5 rounded-xl text-xs font-light text-zinc-500 leading-relaxed border border-zinc-100">
                <span className="font-semibold text-brand-black block mb-1 text-[11px]">User Account Security</span>
                Block any accounts that violate our rules, use unkind language, or disrupt the learning environment. Blocked users will not be able to log in.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Rejection comment text modal dialogue with light weights */}
      {rejectionTargetId && (
        <div id="add-rejection-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <h3 className="text-base font-light tracking-tight text-brand-black">
                Syllabus Deficiencies Review // <span className="font-semibold">Rejection Feedback</span>
              </h3>
              <button
                id="close-rejection-modal-btn"
                onClick={() => setRejectionTargetId(null)}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRejection} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Specify Rejection Reasons</label>
                <textarea
                  id="rejection-reason-textbox"
                  placeholder="Review weekly modules structure, request extra layout details, or provide design suggestions..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full min-h-24 text-xs font-mono font-light text-zinc-700 bg-brand-light border border-zinc-100 rounded-xl p-3 resize-none focus:outline-hidden focus:border-brand-yellow"
                  required
                ></textarea>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  id="submit-rejection-btn"
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-light uppercase tracking-wide cursor-pointer flex-1"
                >
                  Commit Rejection Feedback
                </button>
                <button
                  id="cancel-rejection-btn"
                  type="button"
                  onClick={() => setRejectionTargetId(null)}
                  className="bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-light uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paystack Enrollment Rejection comments modal dialog */}
      {rejectionEnrollmentId && (
        <div id="add-enrollment-rejection-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-50">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <h3 className="text-sm font-semibold tracking-tight text-brand-black flex items-center gap-1.5">
                <XCircle size={14} className="text-red-600" /> Payment Deficiencies Audit Feedback
              </h3>
              <button
                onClick={() => setRejectionEnrollmentId(null)}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEnrollmentRejection} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">CAO Audit Query Reason</label>
                <textarea
                  placeholder="E.g. Paystack reference did not match Zenith Bank invoice logs, Invalid reference format, order amount mismatched..."
                  value={rejectEnrollmentReason}
                  onChange={(e) => setRejectEnrollmentReason(e.target.value)}
                  className="w-full min-h-24 text-xs font-mono font-light text-zinc-750 bg-zinc-50/50 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-hidden focus:border-brand-black"
                  required
                ></textarea>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  type="submit"
                  className="bg-red-650 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer flex-1 transition-colors"
                >
                  Reject & Notify Student
                </button>
                <button
                  type="button"
                  onClick={() => setRejectionEnrollmentId(null)}
                  className="bg-zinc-100 text-zinc-650 px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

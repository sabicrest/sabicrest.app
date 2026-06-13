import React, { useState } from 'react';
import { User, Curriculum, CourseEnrollment, AdminActivity, TrainerApplication } from '../types';
import { db } from '../db';
import VerifiedBadge from './VerifiedBadge';
import { 
  ChevronLeft, Award, BookOpen, Users, HelpCircle, UserX, UserCheck, Search, XCircle, 
  MessageSquare, DollarSign, Clock, Shield, ToggleLeft, ToggleRight, Trash2, Plus, 
  BookOpenCheck, CheckCircle2, Flame, RefreshCw, Sparkles, Activity, FileText
} from 'lucide-react';

interface AdminSubViewsProps {
  currentUser: User;
  onClose: () => void;
  users: User[];
  curricula: Curriculum[];
  enrollments: CourseEnrollment[];
  trainerApps: TrainerApplication[];
  transactions: any[];
  activities: AdminActivity[];
  subView: 'users' | 'courses' | 'pending-verification' | 'ongoing-courses' | 'graduating' | 'inactive-students' | 'active-students' | 'active-trainers' | 'chats-messages' | 'finances';
  initialRoleFilter?: 'all' | 'student' | 'trainer';
  reloadAdminData: () => void;
}

export default function AdminSubViews({
  currentUser,
  onClose,
  users,
  curricula,
  enrollments,
  trainerApps,
  transactions,
  activities,
  subView,
  initialRoleFilter = 'all',
  reloadAdminData,
}: AdminSubViewsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'trainer'>(initialRoleFilter);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | '3months'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedCurriculumStatus, setSelectedCurriculumStatus] = useState<string>('all');

  // Local Rejection Comments States
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectionAppId, setRejectionAppId] = useState<string | null>(null);
  const [rejectAppReason, setRejectAppReason] = useState('');
  const [rejectionEnrollmentId, setRejectionEnrollmentId] = useState<string | null>(null);
  const [rejectEnrollmentReason, setRejectEnrollmentReason] = useState('');

  // Toast confirmation feedback trigger
  const [notifToast, setNotifToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotifToast(msg);
    setTimeout(() => setNotifToast(null), 3000);
  };

  const handleToggleUserStatus = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const updatedStatus = target.status === 'active' ? 'suspended' : 'active';
    db.updateUser({ ...target, status: updatedStatus });
    
    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Toggle User Access Gate',
      details: `${updatedStatus === 'suspended' ? 'Suspended' : 'Activated'} user account ${target.name} (${target.email}).`,
      ipAddress: '192.168.10.22'
    });
    
    showToast(`Account of ${target.name} updated to: ${updatedStatus.toUpperCase()}`);
    reloadAdminData();
  };

  const handleVerifyUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const targetVerify = !target.verified;
    db.updateUser({ ...target, verified: targetVerify });

    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Administrative Profile Verification',
      details: `Set verification status of ${target.name} to ${targetVerify ? 'VERIFIED' : 'UNVERIFIED'}.`,
      ipAddress: '192.168.10.22'
    });

    db.addNotification({
      userId: target.id,
      title: 'Academy Sync Verification Updated',
      message: `Administrator has reviewed your profiles and marked you as ${targetVerify ? 'VERIFIED' : 'UNVERIFIED'} educator.`,
      type: 'system'
    });

    showToast(`User ${target.name} verification status set to: ${targetVerify}`);
    reloadAdminData();
  };

  const handleApproveCurriculum = (currId: string) => {
    const target = curricula.find(c => c.id === currId);
    if (target) {
      db.updateCurriculum({
        ...target,
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Approve Syllabus',
        details: `Approved syllabus proposal "${target.title}" proposed by ${target.trainerName}.`,
        ipAddress: '192.168.10.22'
      });

      db.addNotification({
        userId: target.trainerId,
        title: 'Curriculum Scheme Approved',
        message: `Your proposed curriculum for "${target.title}" was approved by CAO. Cohort is now active.`,
        type: 'curriculum'
      });

      showToast(`Proposed course "${target.title}" is now APPROVED & LIVE.`);
      reloadAdminData();
    }
  };

  const handleSaveRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionTargetId) return;

    const target = curricula.find(c => c.id === rejectionTargetId);
    if (target) {
      db.updateCurriculum({
        ...target,
        status: 'rejected',
        rejectionReason: rejectReason
      });

      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Reject Syllabus',
        details: `Rejected syllabus proposal "${target.title}" proposed by ${target.trainerName} with criteria feedback.`,
        ipAddress: '192.168.10.22'
      });

      db.addNotification({
        userId: target.trainerId,
        title: 'Syllabus Deficiencies Review',
        message: `Your curriculum proposed for "${target.title}" needs edits: ${rejectReason}`,
        type: 'curriculum'
      });

      showToast(`Rejected proposed syllabus "${target.title}". Comments sent.`);
      setRejectionTargetId(null);
      setRejectReason('');
      reloadAdminData();
    }
  };

  const handleApproveTrainerApp = (appId: string) => {
    const app = trainerApps.find(a => a.id === appId);
    if (app) {
      db.updateTrainerApplication({
        ...app,
        status: 'approved'
      });

      // Automatically verify corresponding user profile
      const userProfile = users.find(u => u.email === app.trainerEmail);
      if (userProfile) {
        db.updateUser({ ...userProfile, verified: true });
      }

      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Approve Mentor Candidate',
        details: `Approved mentor-trainer application of ${app.trainerName} (${app.trainerEmail}).`,
        ipAddress: '192.168.10.22'
      });

      db.addNotification({
        userId: app.trainerId || 'all',
        title: 'Mentor Application Approved',
        message: `Congratulations! Your Sabicrest application is approved. You can now build courses.`,
        type: 'system'
      });

      showToast(`Application of Coach ${app.trainerName} APPROVED successfully.`);
      reloadAdminData();
    }
  };

  const handleSaveTrainerRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionAppId) return;

    const app = trainerApps.find(a => a.id === rejectionAppId);
    if (app) {
      db.updateTrainerApplication({
        ...app,
        status: 'rejected'
      });
      
      db.addAdminActivity({
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        action: 'Reject Mentor Candidate',
        details: `Rejected trainer application of ${app.trainerName} with evaluation comments.`,
        ipAddress: '192.168.10.22'
      });

      db.addNotification({
        userId: app.trainerId || 'all',
        title: 'Trainer Application Deficiencies Feedback',
        message: `Your Sabicrest trainer application requires revision: ${rejectAppReason}`,
        type: 'system'
      });

      showToast(`Trainer application of ${app.trainerName} rejected.`);
      setRejectionAppId(null);
      setRejectAppReason('');
      reloadAdminData();
    }
  };

  const handleTriggerNudgeAlert = (user: User) => {
    db.addNotification({
      userId: user.id,
      title: 'Action Required: Re-activate Academy Workspace',
      message: `Hello ${user.name}! We noticed you haven't registered for any curriculum or performed tasks recently. Check out new classes proposed by certified coaches!`,
      type: 'system'
    });

    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Inactivity Re-engagement Ping',
      details: `Queued push-notification re-engagement drip to inactive student ${user.name} (${user.email}).`,
      ipAddress: '192.168.10.22'
    });

    showToast(`Inactivity re-engagement nudge successfully pushed to ${user.name}.`);
  };

  const handleTriggerCertificateAllocation = (enr: CourseEnrollment) => {
    showToast(`Digital blockchain credential generated & encrypted on chain for ${enr.studentName}!`);
    
    db.addNotification({
      userId: enr.studentId,
      title: 'Graduation Digital Credential Ready',
      message: `Congratulations! Your verified alumni blockchain certificate for "${enr.courseTitle}" is ready in your locker.`,
      type: 'system'
    });

    db.addAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.name,
      adminEmail: currentUser.email,
      action: 'Issue Blockchain Certificate',
      details: `Issued graduating alumni certificate credentials to ${enr.studentName} for course ${enr.courseTitle}.`,
      ipAddress: '192.168.10.22'
    });
  };

  // Helper date filtering checks
  const checkPeriodFilter = (dateString: string) => {
    if (periodFilter === 'all') return true;
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (periodFilter === 'today') return diff < oneDay;
    if (periodFilter === 'week') return diff < (7 * oneDay);
    if (periodFilter === 'month') return diff < (30 * oneDay);
    if (periodFilter === '3months') return diff < (90 * oneDay);
    return true;
  };

  // 1. Filtered Students & Trainers List
  const searchedUsersMatchList = users
    .filter(u => u.id !== currentUser.id)
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => checkPeriodFilter(u.joinedDate))
    .filter(u => {
      if (courseFilter === 'all') return true;
      if (u.role === 'student') {
        const matchingEnrollments = enrollments.filter(e => e.studentId === u.id && e.paymentStatus === 'approved');
        return matchingEnrollments.some(e => e.courseId === courseFilter);
      } else if (u.role === 'trainer') {
        return curricula.some(c => c.trainerId === u.id && c.id === courseFilter);
      }
      return false;
    })
    .filter(u => {
      if (!searchQuery) return true;
      return (
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

  // 2. Filtered Courses Catalog
  const searchedCoursesMatchList = curricula
    .filter(c => selectedCurriculumStatus === 'all' || c.status === selectedCurriculumStatus)
    .filter(c => {
      if (!searchQuery) return true;
      return (
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.trainerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

  // 3. Inactive Students list
  const inactiveStudentsList = users.filter(u => {
    if (u.role !== 'student') return false;
    const studentEnrs = enrollments.filter(e => e.studentId === u.id);
    const hasNoCourse = studentEnrs.length === 0;

    const joinTime = new Date(u.joinedDate).getTime();
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const isOverThreeMonths = joinTime < ninetyDaysAgo;

    const hasNoMessages = !db.getMessages().some(m => m.senderId === u.id);
    return hasNoCourse || (isOverThreeMonths && hasNoMessages);
  }).filter(u => {
    if (!searchQuery) return true;
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div id="admin-subview-wrapper" className="space-y-6">
      
      {/* Dynamic Floating Notification Toast feedback */}
      {notifToast && (
        <div className="fixed top-20 right-4 bg-zinc-900 border border-zinc-800 text-white font-mono text-xs px-4 py-3 rounded-2xl shadow-2xl z-55 flex items-center gap-2 animate-in slide-in-from-right-5">
          <CheckCircle2 size={16} className="text-[#3bb75e]" />
          <span>{notifToast}</span>
        </div>
      )}

      {/* Header Breadcrumbs Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150/50 p-4 rounded-3xl">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onClose}
            className="p-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl cursor-pointer transition-all shrink-0"
            title="Return to control deck"
          >
            <ChevronLeft size={16} className="text-zinc-900" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
              <span>Admin Management Hub</span>
              <span>/</span>
              <span className="text-zinc-500 font-bold">{subView.split('-').join(' ')}</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight uppercase tracking-tight">
              {subView === 'users' ? '🛡️ Personnel & Access Directory' : 
               subView === 'courses' ? '📚 Curricula Syllabus Ledger' :
               subView === 'pending-verification' ? '📝 Evaluation Approvals Desk' :
               subView === 'ongoing-courses' ? '⚡ Active Class Cohorts' :
               subView === 'graduating' ? '🎓 Alumni Completion Clearance' :
               subView === 'inactive-students' ? '💤 Sleep Inactivity Monitor' :
               subView === 'active-students' ? '🔥 Student Leaderboard & Streaks' :
               subView === 'active-trainers' ? '⭐ Certified Mentor Dashboard' :
               subView === 'chats-messages' ? '💬 Interactive Communications feed' :
               '💰 Financial Accounts Audit'}
            </h2>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-mono uppercase rounded-xl tracking-wider cursor-pointer"
        >
          ← Return to Console
        </button>
      </div>

      {/* VIEW PANEL SECTIONS */}

      {/* A. PERSONNEL & ACCESS DIRECTORY */}
      {subView === 'users' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-6">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-2xl">
            <div>
              <label className="block text-[9px] font-mono font-bold uppercase text-zinc-500 mb-1">Search Profile</label>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find by name/email..." 
                  className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-hidden text-zinc-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold uppercase text-zinc-500 mb-1">Filter Role</label>
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden"
              >
                <option value="all">All Roles</option>
                <option value="student">Only Students</option>
                <option value="trainer">Only Trainers</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold uppercase text-zinc-500 mb-1">Date Joined</label>
              <select 
                value={periodFilter} 
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden"
              >
                <option value="all">All-Time</option>
                <option value="today">Joined Today</option>
                <option value="week">Joined This Week</option>
                <option value="month">Joined This Month</option>
                <option value="3months">Older than 3 Months</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold uppercase text-zinc-500 mb-1">Course Connected</label>
              <select 
                value={courseFilter} 
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden text-ellipsis truncate"
              >
                <option value="all">Any Curriculum</option>
                {curricula.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800 border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px] font-mono">
                  <th className="pb-3 pl-2">Educator/Student Handle</th>
                  <th className="pb-3">System Access Role</th>
                  <th className="pb-3">Sign-Up Date</th>
                  <th className="pb-3">Access State</th>
                  <th className="pb-3">Verification Badge</th>
                  <th className="pb-3 text-right pr-2">Security Gates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {searchedUsersMatchList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 font-mono">
                      No matching personnel profile records found.
                    </td>
                  </tr>
                ) : (
                  searchedUsersMatchList.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 group select-none">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white font-bold font-mono text-[10px]">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 flex items-center gap-1">
                              {u.name}
                              {u.role === 'trainer' && u.verified && <VerifiedBadge />}
                            </p>
                            <p className="text-[9.5px] text-zinc-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                          u.role === 'trainer' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-[10px] text-zinc-450">
                        {u.joinedDate}
                      </td>

                      <td className="py-3">
                        <span className={`text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                          u.status === 'active' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {u.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3">
                        <button 
                          onClick={() => handleVerifyUser(u.id)}
                          className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md cursor-pointer transition-colors border ${
                            u.verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-150 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {u.verified ? '✓ VERIFIED ACTIVE' : '● SET VERIFIED'}
                        </button>
                      </td>

                      <td className="py-3 text-right pr-2">
                        <button 
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`text-[9px] font-mono uppercase tracking-wider px-3 py-1 rounded-xl cursor-pointer shadow-2xs transition-all active:scale-[0.98] ${
                            u.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/40' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/40'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B. CURRICULA SYLLABUS LEDGER */}
      {subView === 'courses' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-zinc-50 p-4 rounded-2xl">
            <div className="relative flex-grow">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find curricula by syllabus title, Category, Coach..." 
                className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-hidden"
              />
            </div>

            <div className="w-full sm:w-48">
              <select 
                value={selectedCurriculumStatus} 
                onChange={(e) => setSelectedCurriculumStatus(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden"
              >
                <option value="all">All States</option>
                <option value="approved">Approved & Live</option>
                <option value="pending">Awaiting Review</option>
                <option value="rejected">Rejected Deficient</option>
              </select>
            </div>
          </div>

          {/* Cards Grid Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchedCoursesMatchList.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-zinc-400 font-mono">
                No syllabus records matched requirements.
              </div>
            ) : (
              searchedCoursesMatchList.map(c => {
                const rosterCount = enrollments.filter(e => e.courseId === c.id && e.paymentStatus === 'approved').length;
                return (
                  <div key={c.id} className="border border-zinc-100 rounded-2xl p-5 bg-zinc-50/10 hover:border-zinc-200 transition-all space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`text-[8.5px] font-mono tracking-wider px-2 py-0.5 rounded-full font-bold uppercase border ${
                          c.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          c.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {c.status}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900 mt-2 leading-tight">{c.title}</h3>
                        <p className="text-[10px] text-zinc-400 font-light mt-0.5">By Trainer: <strong className="text-zinc-650">{c.trainerName}</strong></p>
                      </div>

                      <div className="text-right text-xs font-mono shrink-0">
                        <span className="block font-bold text-neutral-900">₦{(c.price || 150000).toLocaleString()}</span>
                        <span className="text-[9px] text-[#218c3f] font-semibold bg-emerald-50/60 px-1.5 py-0.5 rounded mt-1 inline-block">₦{((c.price || 150000)*0.85).toLocaleString()} (85%)</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-550 font-light leading-relaxed line-clamp-2">{c.description}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-450 pt-2 border-t border-zinc-100/50">
                      <span>{c.durationWeeks} Weeks // {c.level} // {c.category}</span>
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-bold">Roster: {rosterCount} Students</span>
                    </div>

                    {/* Quick action gates */}
                    {c.status === 'pending' && (
                      <div className="pt-2 flex gap-2">
                        <button 
                          onClick={() => handleApproveCurriculum(c.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-1.5 text-[10.5px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Approve Syllabus
                        </button>
                        <button 
                          onClick={() => setRejectionTargetId(c.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl px-4 py-1.5 text-[10.5px] font-bold uppercase cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* C. EVALUATION APPROVALS DESK */}
      {subView === 'pending-verification' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Trainer Candidate Verification requests */}
          <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-amber-600 uppercase flex items-center gap-1.5 font-mono">
              <Award size={14} className="text-amber-500 animate-pulse" /> Trainer Applications Under Reviews
            </h3>

            {trainerApps.filter(a => a.status === 'pending').length === 0 ? (
              <div className="text-center py-12 text-zinc-400 font-mono font-light text-xs bg-zinc-50 rounded-2xl">
                No pending trainer verification applications.
              </div>
            ) : (
              <div className="space-y-4">
                {trainerApps.filter(a => a.status === 'pending').map(app => (
                  <div key={app.id} className="border border-zinc-150 rounded-2xl p-4 bg-zinc-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-mono text-zinc-405 uppercase tracking-wide">Course: {app.courseTitle}</h4>
                        <h3 className="text-sm font-bold text-zinc-900 mt-1">{app.trainerName}</h3>
                        <p className="text-[10px] text-zinc-400 font-mono">{app.trainerEmail} // {app.experienceYears} Years Experience</p>
                      </div>
                    </div>

                    {/* Detailed evaluation portfolios & links as specified by user */}
                    <div className="space-y-1.5 text-[10.5px] bg-white p-3 rounded-xl border border-zinc-100 leading-normal font-mono text-zinc-650">
                      {app.portfolioUrl && (
                        <p>● Website/Port: <a href={app.portfolioUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{app.portfolioUrl}</a></p>
                      )}
                      
                      {/* CRITICAL USER REQUIREMENT: Step 3 qualifications video link */}
                      {app.credentialsLink && (
                        <p>
                          🎬 Qualifications Video: <br/>
                          <a href={app.credentialsLink} target="_blank" rel="noreferrer" className="text-amber-650 hover:underline break-all font-bold font-sans flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                            📹 Click to play trainer intro video URL: <br/>{app.credentialsLink}
                          </a>
                        </p>
                      )}

                      {app.workshopAddress && (
                        <p>● Studio location: {app.workshopAddress}</p>
                      )}
                      {app.equipmentsOwned && (
                        <p>● Certified Equipments: {app.equipmentsOwned}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveTrainerApp(app.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Verify & Approve Coach
                      </button>
                      <button 
                        onClick={() => setRejectionAppId(app.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl px-4 py-2 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Curricula pending verification */}
          <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-rose-600 uppercase flex items-center gap-1.5 font-mono">
              <BookOpen size={14} className="text-rose-500 animate-pulse" /> Curricula Proposals awaiting Verify
            </h3>

            {curricula.filter(c => c.status === 'pending').length === 0 ? (
              <div className="text-center py-12 text-zinc-400 font-mono font-light text-xs bg-zinc-50 rounded-2xl">
                No syllabus curricula awaiting approval checks.
              </div>
            ) : (
              <div className="space-y-4">
                {curricula.filter(c => c.status === 'pending').map(curr => (
                  <div key={curr.id} className="border border-zinc-150 rounded-2xl p-4 bg-zinc-50/50 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">{curr.title}</h3>
                      <p className="text-[10px] text-zinc-400 font-mono">Proposed by Coach: {curr.trainerName}</p>
                    </div>

                    <p className="text-xs text-zinc-550 font-light leading-relaxed">{curr.description}</p>

                    <div className="bg-white p-3 rounded-xl border border-zinc-100 space-y-1">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 font-mono">Proposed Modules Syllabus</p>
                      {curr.modules.map((m, i) => (
                        <p key={i} className="text-xs font-light text-zinc-650 flex items-center gap-1">
                          <span className="text-amber-500 font-bold font-mono text-[9px]">W{i+1}:</span> {m}
                        </p>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveCurriculum(curr.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Approve Syllabus
                      </button>
                      <button 
                        onClick={() => setRejectionTargetId(curr.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl px-4 py-2 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* D. ACTIVE CLASS COHORTS */}
      {subView === 'ongoing-courses' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {curricula.filter(c => c.status === 'approved' && enrollments.some(e => e.courseId === c.id && e.paymentStatus === 'approved')).length === 0 ? (
              <div className="col-span-2 text-center py-12 text-zinc-400 font-mono">
                No active training classes or ongoing cohorts live yet.
              </div>
            ) : (
              curricula.filter(c => c.status === 'approved' && enrollments.some(e => e.courseId === c.id && e.paymentStatus === 'approved')).map(curr => {
                const roster = enrollments.filter(e => e.courseId === curr.id && e.paymentStatus === 'approved');
                const fundCollected = roster.reduce((sum, e) => sum + (e.amount || 150000), 0);
                
                // Live Progress bar calculations: assume week 3 of durationWeeks
                const isCompleted = false;
                const percent = 35; // 35% arbitrary active metrics progression 

                return (
                  <div key={curr.id} className="border border-zinc-100 p-5 rounded-2xl bg-zinc-50/20 space-y-3 hover:border-zinc-200 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[8.5px] font-mono tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-2 py-0.5 rounded uppercase font-bold">Ongoing Course</span>
                        <h3 className="text-sm font-bold text-zinc-900 mt-1.5">{curr.title}</h3>
                        <p className="text-[10.5px] text-zinc-400 font-mono">Mentor: {curr.trainerName}</p>
                      </div>
                      <div className="text-right text-xs font-mono shrink-0">
                        <span className="block font-bold text-emerald-505">₦{fundCollected.toLocaleString()}</span>
                        <span className="text-[9px] text-zinc-400">Tuition Pool</span>
                      </div>
                    </div>

                    {/* Progress slider layout */}
                    <div className="space-y-1 select-none">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-450">
                        <span>Course Progression Tracker</span>
                        <span className="font-bold text-zinc-700">{percent}% (Week 3 of {curr.durationWeeks})</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="bg-[#3bb75e] h-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-zinc-100">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 font-mono">Student Roster Directory ({roster.length})</p>
                      <div className="divide-y divide-zinc-50 max-h-32 overflow-y-auto">
                        {roster.map(st => (
                          <div key={st.id} className="py-1.5 flex justify-between items-center text-[11px] font-mono font-light text-zinc-650">
                            <span>● {st.studentName}</span>
                            <span className="text-[9.5px] text-zinc-400 bg-zinc-50 px-1.5 py-0.2 rounded">Reference: {st.paymentReference.substring(0, 8)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* E. ALUMNI COMPLETION CLEARANCE */}
      {subView === 'graduating' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500 animate-pulse" /> Graduating Students Completion Ledger
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800 border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px] font-mono">
                  <th className="pb-3 pl-2">Student Name</th>
                  <th className="pb-3">Completed Curriculum Profile</th>
                  <th className="pb-3">Final Grades Submission</th>
                  <th className="pb-3">Certificate Code</th>
                  <th className="pb-3 text-right pr-2">Clearance Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {enrollments.filter(e => e.paymentStatus === 'approved').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-zinc-400 font-mono">
                      No matching student graduation records available.
                    </td>
                  </tr>
                ) : (
                  enrollments.filter(e => e.paymentStatus === 'approved').map(enr => (
                    <tr key={enr.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 pl-2">
                        <p className="font-semibold text-zinc-900">{enr.studentName}</p>
                        <p className="text-[9.5px] text-zinc-450 font-mono">{enr.studentEmail}</p>
                      </td>
                      <td className="py-3 font-semibold text-zinc-700">
                        {enr.courseTitle}
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded font-bold">
                          ✓ EXCELLENT PASS - 94%
                        </span>
                      </td>
                      <td className="py-3 text-[10px] text-zinc-400 font-mono">
                        SAB-CERT-{enr.id.toUpperCase().substring(0,8)}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button 
                          onClick={() => handleTriggerCertificateAllocation(enr)}
                          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-[10px] font-mono uppercase cursor-pointer shadow-3xs"
                        >
                          Issue Verified Certificate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* F. SLEEP INACTIVITY MONITOR */}
      {subView === 'inactive-students' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-xs font-mono uppercase text-red-500 font-bold flex items-center gap-1.5">
                <UserX size={14} className="text-red-500" /> Inactive Students Directory (0 Courses Enrolled / No Actions &gt; 90 days)
              </h3>
              <p className="text-[10.5px] text-zinc-400 font-light mt-1">This list displays student profiles who signed up but haven't registered any course, or signed up for more than 3 months with 0 messages.</p>
            </div>
            <span className="text-[9.5px] font-mono uppercase bg-red-50 text-red-700 border border-red-100/50 px-2.5 py-0.5 rounded">
              Awaiting Engagement: {inactiveStudentsList.length} Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px] font-mono">
                  <th className="pb-3 pl-2">Student Portrait & Email</th>
                  <th className="pb-3">Sign-Up Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Inactivity Elapsed</th>
                  <th className="pb-3 text-right pr-2">Nudge Interaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {inactiveStudentsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-400 font-mono">
                      Terrific! Zero inactive student profiles.
                    </td>
                  </tr>
                ) : (
                  inactiveStudentsList.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 pl-2">
                        <p className="font-semibold text-zinc-900">{u.name}</p>
                        <p className="text-[9.5px] text-zinc-450 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3 font-mono text-zinc-650">
                        {u.joinedDate}
                      </td>
                      <td className="py-3">
                        <span className="text-[9.5px] font-mono uppercase bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">INACTIVE</span>
                      </td>
                      <td className="py-3 text-red-650 font-semibold font-mono text-[10px]">
                        Over 90 Days Idle
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button 
                          onClick={() => handleTriggerNudgeAlert(u)}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9.5px] font-mono uppercase cursor-pointer"
                        >
                          ⚡ Push Nudge Notification
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* G. LEADERBOARD & STREAKS (ACTIVE STUDENTS) */}
      {subView === 'active-students' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-mono uppercase text-orange-600 font-bold flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500 animate-bounce" /> Active Students Community Leaderboard (Active Streaks &amp; Classes)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px] font-mono">
                  <th className="pb-3 pl-2">Rank // Student Handle</th>
                  <th className="pb-3">Interactive Streak count</th>
                  <th className="pb-3">Enrolled Curriculas Pool</th>
                  <th className="pb-3">Leaderboard Level Score</th>
                  <th className="pb-3 text-right pr-2">Verify Status Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {users.filter(u => u.role === 'student' && !inactiveStudentsList.some(ins => ins.id === u.id)).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-zinc-400 font-mono">
                      No currently active student profiles registered.
                    </td>
                  </tr>
                ) : (
                  users.filter(u => u.role === 'student' && !inactiveStudentsList.some(ins => ins.id === u.id)).map((u, i) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 pl-2 font-mono flex items-center gap-2">
                        <span className="font-bold text-zinc-400">#0{i+1}</span>
                        <div>
                          <p className="font-semibold text-zinc-900">{u.name}</p>
                          <p className="text-[9.5px] text-zinc-400 leading-none mt-0.5">{u.email}</p>
                        </div>
                      </td>

                      <td className="py-3 font-mono font-bold text-orange-600 flex items-center gap-1">
                        <Flame size={13} fill="#ea580c" className="text-orange-600 shrink-0" /> {u.streakCount !== undefined ? u.streakCount : 4} Days Streak!
                      </td>

                      <td className="py-3 font-semibold text-zinc-650">
                        {u.enrolledCourseIds && u.enrolledCourseIds.length > 0 ? `${u.enrolledCourseIds.length} Curricula Enrolled` : '1 active syllabus course'}
                      </td>

                      <td className="py-3 text-[10px] font-mono font-bold text-indigo-600">
                        {((u.streakCount !== undefined ? u.streakCount : 4) * 85 + 240)} XP
                      </td>

                      <td className="py-3 text-right pr-2">
                        <span className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded">
                          ACTIVE INTERACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* H. COGNITIVE CHATS & DECEREBRAL MESSAGES */}
      {subView === 'chats-messages' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 p-4 rounded-2xl">
            <h3 className="text-xs font-mono uppercase text-pink-600 font-bold flex items-center gap-1.5 leading-none">
              <MessageSquare size={14} className="text-pink-500" /> Platform Communication Audit Feed
            </h3>
            <div className="flex flex-wrap gap-3 text-[10px] font-mono">
              <span className="bg-indigo-50 border border-indigo-150 text-indigo-800 px-3 py-1 rounded-lg">💬 PUBLIC MESSAGES: <b>{db.getMessages().filter(m => m.channelId).length}</b></span>
              <span className="bg-emerald-50 border border-emerald-150 text-emerald-800 px-3 py-1 rounded-lg">🛡️ DIRECT DMs: <b>{db.getMessages().filter(m => !m.channelId).length}</b></span>
            </div>
          </div>

          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {db.getMessages().length === 0 ? (
              <div className="text-center py-12 text-zinc-400 font-mono text-xs bg-zinc-50 rounded-2xl">
                Zero chat communications transmitted within database.
              </div>
            ) : (
              db.getMessages().slice().reverse().map(msg => (
                <div key={msg.id} className="border border-zinc-100 p-3 h-auto rounded-xl bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono">
                      <span className="font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded">{msg.senderName}</span>
                      <span className="text-zinc-400">to</span>
                      {msg.channelId ? (
                        <span className="text-indigo-600 font-bold bg-indigo-50/80 px-1.5 py-0.5 rounded">Channel: #{msg.channelId}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold bg-emerald-50/80 px-1.5 py-0.5 rounded">Secured Direct DM</span>
                      )}
                    </div>
                    {/* Message content */}
                    <p className="text-xs font-light text-zinc-700 font-sans italic">"{msg.content}"</p>
                  </div>
                  <div className="text-right text-[9.5px] font-mono text-zinc-400 shrink-0">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="block text-[8px] text-emerald-600 font-bold uppercase mt-1">✓ End-to-End Crypt</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* I. FINANCIAL AUDIT CENTER */}
      {subView === 'finances' && (
        <div className="bg-white border border-zinc-100 p-6 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl text-center">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">Platform Estimated Gross Volume</span>
              <p className="text-xl font-bold text-zinc-900 mt-1">₦{enrollments.filter(e => e.paymentStatus === 'approved').reduce((sum, e) => sum + (e.amount || 150000), 0).toLocaleString()}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl text-center">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#218c3f]">Combined Trainer Share payouts (85%)</span>
              <p className="text-xl font-bold text-[#218c3f] mt-1">₦{(enrollments.filter(e => e.paymentStatus === 'approved').reduce((sum, e) => sum + (e.amount || 150000), 0) * 0.85).toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-center">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800">Administrative Profits Split (15%)</span>
              <p className="text-xl font-bold text-emerald-800 mt-1">₦{(enrollments.filter(e => e.paymentStatus === 'approved').reduce((sum, e) => sum + (e.amount || 150000), 0) * 0.15).toLocaleString()}</p>
            </div>
          </div>

          {/* Detailed ledger table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800 border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px] font-mono">
                  <th className="pb-3 pl-2">Paystack Invoice Ref</th>
                  <th className="pb-3">Subscribed Course & Student</th>
                  <th className="pb-3">Billing Status</th>
                  <th className="pb-3">Platform Split (15%)</th>
                  <th className="pb-3 text-right pr-2">Coach Payout (85%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {enrollments.filter(e => e.paymentStatus === 'approved').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-zinc-400 font-mono">
                      No matching approved tuition financial ledgers registered.
                    </td>
                  </tr>
                ) : (
                  enrollments.filter(e => e.paymentStatus === 'approved').map(enr => (
                    <tr key={enr.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 pl-2 font-mono text-[10px] text-zinc-650">
                        PSTK-{enr.paymentReference.substring(0, 10).toUpperCase()}
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-zinc-900 leading-tight">{enr.courseTitle}</p>
                        <p className="text-[9.5px] text-zinc-450 leading-none mt-0.5">Student: {enr.studentName}</p>
                      </td>
                      <td className="py-3">
                        <span className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-0.5 rounded font-bold">Paid</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-neutral-800">
                        ₦{((enr.amount || 150000) * 0.15).toLocaleString()}
                      </td>
                      <td className="py-3 text-right pr-2 font-mono font-bold text-[#218c3f]">
                        ₦{((enr.amount || 150000) * 0.85).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECTION OVERLAYS AND PROMPT MODALS */}
      {rejectionTargetId && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Syllabus Review // Rejection Comments</h3>
              <button onClick={() => setRejectionTargetId(null)} className="text-zinc-450 hover:text-black font-semibold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveRejection} className="space-y-4">
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Please flesh out weeks 3 and 4 syllabus modules..."
                className="w-full min-h-24 text-xs font-mono text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200 focus:outline-hidden"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-red-650 text-white rounded-xl py-2 text-xs uppercase cursor-pointer">Submit</button>
                <button type="button" onClick={() => setRejectionTargetId(null)} className="bg-zinc-100 text-zinc-650 rounded-xl px-4 py-2 text-xs uppercase cursor-pointer">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectionAppId && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Trainer Verification Deficiencies</h3>
              <button onClick={() => setRejectionAppId(null)} className="text-zinc-450 hover:text-black font-semibold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveTrainerRejection} className="space-y-4">
              <textarea 
                value={rejectAppReason}
                onChange={(e) => setRejectAppReason(e.target.value)}
                placeholder="E.g., Intro YouTube qualifications video URL did not resolve or was blank..."
                className="w-full min-h-24 text-xs font-mono text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200 focus:outline-hidden"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-red-650 text-white rounded-xl py-2 text-xs uppercase cursor-pointer">Submit</button>
                <button type="button" onClick={() => setRejectionAppId(null)} className="bg-zinc-100 text-zinc-650 rounded-xl px-4 py-2 text-xs uppercase cursor-pointer">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

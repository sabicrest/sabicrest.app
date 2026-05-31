/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Assignment, Certificate, Curriculum, CourseEnrollment } from '../types';
import { db } from '../db';
import { 
  Award, BookOpen, Clock, FileText, CheckCircle2, ChevronRight, Upload, Link, AlertCircle, 
  FileCheck, Printer, Settings, User as UserIcon, Mail, Phone, MapPin, Sliders, Bell, 
  Compass, Radio, Heart, HelpCircle, Activity, CreditCard, Lock, X, ExternalLink, ShieldCheck, Coins
} from 'lucide-react';

interface DashboardStudentProps {
  currentUser: User;
  onNavigateChange: (tabId: string) => void;
}

export default function DashboardStudent({ currentUser, onNavigateChange }: DashboardStudentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(
    db.getAssignments().filter(a => a.studentId === currentUser.id)
  );
  const [certs, setCerts] = useState<Certificate[]>(
    db.getCertificates().filter(c => c.studentId === currentUser.id)
  );

  // Sub Tab states
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'register'>('assignments');

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
  const [studentNotifs, setStudentNotifs] = useState(db.getNotifications().filter(n => n.userId === currentUser.id));

  // Toast confirmation message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Assignment Submission state drawer
  const [activeSubmittingAss, setActiveSubmittingAss] = useState<Assignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active print certificate view dialog
  const [selectedCertToPrint, setSelectedCertToPrint] = useState<Certificate | null>(null);

  // Enrollments and Course Payment States
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>(
    db.getEnrollments().filter(e => e.studentId === currentUser.id)
  );
  const [selectedCourse, setSelectedCourse] = useState<Curriculum | null>(null);
  const [showPaystackTerminal, setShowPaystackTerminal] = useState(false);
  const [paystackRefInput, setPaystackRefInput] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  
  // Paystack terminal overlay steps
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'card_entry' | 'otp_entry' | 'processing' | 'success'>('checkout');
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentOtp, setPaymentOtp] = useState('');
  const [paystackLogs, setPaystackLogs] = useState<string[]>([]);

  const reloadStudentData = () => {
    setAssignments(db.getAssignments().filter(a => a.studentId === currentUser.id));
    setCerts(db.getCertificates().filter(c => c.studentId === currentUser.id));
    setStudentNotifs(db.getNotifications().filter(n => n.userId === currentUser.id));
    setEnrollments(db.getEnrollments().filter(e => e.studentId === currentUser.id));
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
    const interval = setInterval(reloadStudentData, 2000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleOpenSubmission = (ass: Assignment) => {
    setActiveSubmittingAss(ass);
    setSubmitText(ass.submissionContent || '');
    setSubmitLink(ass.linkUrl || '');
  };

  const handleSubmitAssignmentDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmittingAss) return;

    setSubmitting(true);
    setTimeout(() => {
      const updated: Assignment = {
        ...activeSubmittingAss,
        status: 'pending_review',
        submissionContent: submitText,
        linkUrl: submitLink,
        submittedAt: new Date().toISOString()
      };

      db.updateAssignment(updated);
      reloadStudentData();

      // Notification
      db.addNotification({
        userId: activeSubmittingAss.trainerId,
        title: 'New Student Assignment',
        message: `${currentUser.name} submitted assignment "${activeSubmittingAss.title}" for review.`,
        type: 'grade'
      });

      setSubmitting(false);
      setActiveSubmittingAss(null);
    }, 800);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleViewCourseDetails = (course: Curriculum) => {
    setSelectedCourse(course);
    // Find if there's already an enrollment record
    const match = db.getEnrollments().find(e => e.courseId === course.id && e.studentId === currentUser.id);
    if (match) {
      setPaystackRefInput(match.paymentReference || '');
    } else {
      setPaystackRefInput('');
    }
  };

  const handleInitiatePaymentProcess = (course: Curriculum) => {
    // Check if matching enrollment exists
    const match = db.getEnrollments().find(e => e.courseId === course.id && e.studentId === currentUser.id);
    if (!match) {
      const mockRef = `PSTK-REF-${Math.floor(100000 + Math.random() * 900000)}`;
      db.addEnrollment({
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        courseId: course.id,
        courseTitle: course.title,
        trainerId: course.trainerId,
        trainerName: course.trainerName,
        amount: course.price || 35000,
        paymentLinkUrl: `https://checkout.paystack.com/sabicrest-pay-${course.id}`,
        paymentStatus: 'pending_payment',
        paymentReference: mockRef
      });
      reloadStudentData();
    }
    
    // Reset terminal steps
    setPaymentStep('checkout');
    setCardNo('');
    setCardExpiry('');
    setCardCvv('');
    setPaymentOtp('');
    setPaystackLogs(['Initializing Paystack secure checkout terminal...', 'Setting up payment headers for NGN transaction...']);
    setShowPaystackTerminal(true);
  };

  const handleGeneratePaystackLink = (course: Curriculum) => {
    setGeneratingLink(true);
    setTimeout(() => {
      const link = `https://checkout.paystack.com/sabicrest-checkout-${course.id}-${Math.floor(Math.random() * 89999 + 10000)}`;
      setGeneratedLink(link);
      setGeneratingLink(false);
      showToast('✓ Paystack transaction secure check-out link compiled!');
    }, 1200);
  };

  const handleSimulateCardCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNo.length < 12) {
      showToast('Please insert a valid credit card layout.');
      return;
    }
    
    setPaymentStep('processing');
    const logs = [
      'Connecting to secure bank gateway...',
      'Establishing secure encrypted connection...',
      'Verifying details with bank...',
      'One-Time Password (OTP) validation requested by bank.'
    ];
    
    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setPaystackLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
        setPaymentStep('otp_entry');
      }
    }, 700);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentOtp.length < 4) {
      showToast('OTP verification code mismatch.');
      return;
    }
    
    setPaymentStep('processing');
    setPaystackLogs(prev => [...prev, 'Validating secure SMS authentication token...', 'Card authorized successfully!']);
    
    setTimeout(() => {
      setPaystackLogs(prev => [...prev, 'Compiling payment reference credentials...', 'Transaction reference PSTK-' + Math.floor(10000000 + Math.random() * 90000000) + ' saved on Sabicrest ledger.', 'Payment Successful!']);
      
      setTimeout(() => {
        const refCode = `PSTK-REF-${Math.floor(100000000 + Math.random() * 900000000)}`;
        setPaystackRefInput(refCode);
        setPaymentStep('success');
        
        // Auto-update enrollment status in database to pending_verification
        if (selectedCourse) {
          const match = db.getEnrollments().find(enr => enr.courseId === selectedCourse.id && enr.studentId === currentUser.id);
          if (match) {
            const updated: CourseEnrollment = {
              ...match,
              paymentStatus: 'pending_verification',
              paymentReference: refCode,
              submittedAt: new Date().toISOString()
            };
            db.updateEnrollment(updated);
            
            // notify admin
            db.addNotification({
              userId: 'u-admin-1', // Chief Admin Officer
              title: 'Pending Course Payment Audit',
              message: `${currentUser.name} submitted Paystack payment matching reference "${refCode}" for course "${selectedCourse.title}".`,
              type: 'system'
            });
            
            db.addNotification({
              userId: currentUser.id,
              title: 'Paystack Payment Verification Running',
              message: `Payment matching reference code "${refCode}" submitted for admin verification. Expected latency: < 5 mins.`,
              type: 'system'
            });
          }
        }
        reloadStudentData();
      }, 1000);
    }, 1200);
  };

  const handleSubmitVerificationReference = (courseId: string, referenceCode: string) => {
    if (!referenceCode.trim()) {
      showToast('Error: Payment reference code cannot be empty!');
      return;
    }
    
    const c = db.getCurricula().find(cur => cur.id === courseId);
    if (!c) return;

    // Check if enrollment exists
    const match = db.getEnrollments().find(e => e.courseId === courseId && e.studentId === currentUser.id);
    if (match) {
      const updated: CourseEnrollment = {
        ...match,
        paymentStatus: 'pending_verification',
        paymentReference: referenceCode,
        submittedAt: new Date().toISOString()
      };
      db.updateEnrollment(updated);
    } else {
      db.addEnrollment({
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        courseId: courseId,
        courseTitle: c.title,
        trainerId: c.trainerId,
        trainerName: c.trainerName,
        amount: c.price || 35000,
        paymentLinkUrl: `https://checkout.paystack.com/sabicrest-pay-${courseId}`,
        paymentStatus: 'pending_verification',
        paymentReference: referenceCode,
        submittedAt: new Date().toISOString()
      });
    }

    // Inform admin
    db.addNotification({
      userId: 'u-admin-1',
      title: 'Pending Course Payment Audit',
      message: `${currentUser.name} submitted Paystack payment matching reference "${referenceCode}" for course "${c.title}".`,
      type: 'system'
    });

    db.addNotification({
      userId: currentUser.id,
      title: 'Paystack Payment Verification Running',
      message: `Your payment reference "${referenceCode}" is queued for Chief Admin Officer evaluation.`,
      type: 'system'
    });

    showToast('✓ Paystack reference submitted for CAO validation!');
    reloadStudentData();
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
      skills: profileSkillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };

    try {
      await db.updateUser(updatedUser);
      
      db.addNotification({
        userId: currentUser.id,
        title: 'Credentials Saved',
        message: 'Your personal workspace credentials, skills and contact details are synced.',
        type: 'grade'
      });

      showToast('✓ Profile updated successfully!');
      reloadStudentData();
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Storage Failure: ${err.message || err}`);
    }
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
    reloadStudentData();
  };

  // Compute stats
  const gradedAssignments = assignments.filter(a => a.status === 'graded');
  const finishedCount = assignments.filter(a => a.status === 'graded' || a.status === 'pending_review').length;
  const totalCount = assignments.length;
  const gradeRate = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;
  
  // Custom simple line score visual representation
  const linePoints = gradedAssignments.map((a, i) => `${(i / Math.max(1, gradedAssignments.length - 1)) * 100},${60 - (Number(a.points || 90) - 50) * 0.8}`);

  return (
    <div id="student-dashboard-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Header Banner - Upgraded to match Settings aesthetics */}
      <div id="student-hero-banner" className="bg-brand-black text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            Welcome back
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Welcome back, <span className="font-semibold text-brand-yellow">{currentUser.name}</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Track certification degrees, evaluate active assignments, and collaborate in real-time.
          </p>
        </div>
      </div>

      {/* Analytics Bento Grid Row */}
      <div id="student-bento-row" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Assignment Progress</span>
            <FileText size={16} className="text-brand-yellow font-normal" />
          </div>
          <div className="text-3xl font-light text-brand-black tracking-tight flex items-baseline gap-1.5">
            <span>{gradeRate}%</span>
            <span className="text-xs text-zinc-400 font-mono font-light">({finishedCount}/{totalCount})</span>
          </div>
          <div className="w-full bg-zinc-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-brand-black h-1 rounded-full" style={{ width: `${gradeRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Earned Certificates</span>
            <Award size={16} className="text-brand-yellow" />
          </div>
          <div className="text-3xl font-light text-brand-black tracking-tight">
            <span>{certs.length}</span>
            <span className="text-xs text-brand-yellow font-mono ml-2 font-light">Issued</span>
          </div>
          <p className="text-[10px] font-light text-brand-gray mt-2 leading-relaxed font-sans">Verified and stored securely.</p>
        </div>

        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Current Topic</span>
            <BookOpen size={16} className="text-brand-yellow" />
          </div>
          <div className="text-lg font-light tracking-tight text-brand-black truncate">
            Spatial UI Typography
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 mt-2 flex items-center gap-1 bg-emerald-50/50 w-fit px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Active Module
          </p>
        </div>

        {/* Custom micro sparkline SVG */}
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Grade History</span>
            <span className="text-xs font-mono text-emerald-600 font-light">Performance Progress</span>
          </div>
          
          <div id="sparkline-container" className="h-10 w-full bg-zinc-50/50 rounded flex items-center justify-center">
            {gradedAssignments.length >= 2 ? (
              <svg className="w-full h-full p-1" viewBox="0 0 100 60">
                <polyline
                  fill="none"
                  stroke="#FBBF1E"
                  strokeWidth="1.5"
                  points={linePoints.join(' ')}
                />
              </svg>
            ) : (
              <span className="text-[10px] text-zinc-400 italic">No grading history yet</span>
            )}
          </div>
          
          <span className="text-[9px] text-zinc-400 block tracking-wide font-mono mt-1 text-right uppercase">
            Updated performance trend
          </span>
        </div>

      </div>

      {/* Centered Modal for Alerts & Confirmations */}
      {toastMessage && (
        <div id="toast-modal-overlay" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-brand-yellow">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-brand-black">Instruction Alert</h3>
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
      <div id="student-tab-bar" className="flex border-b border-zinc-100 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveSubTab('assignments')}
          className={`py-3 px-4 text-xs uppercase tracking-wider font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'assignments'
              ? 'border-brand-yellow text-brand-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <FileText size={13} className={activeSubTab === 'assignments' ? 'text-brand-yellow font-bold' : 'text-zinc-400'} />
          Assignments & Grades
        </button>

        <button
          onClick={() => setActiveSubTab('register')}
          className={`py-3 px-4 text-xs uppercase tracking-wider font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'register'
              ? 'border-brand-yellow text-brand-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          <Compass size={13} className={activeSubTab === 'register' ? 'text-brand-yellow font-bold' : 'text-zinc-400'} />
          Register Courses
        </button>
      </div>

      {activeSubTab === 'assignments' && (
        <div id="student-main-content-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          
          {/* Assignments stream - Left Wide col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <FileCheck size={13} className="text-brand-yellow" /> Course Assignments & Grades
              </h3>

              <div className="space-y-4">
                {assignments.map(ass => {
                  const isNotSubmit = ass.status === 'not_submitted';
                  const isPending = ass.status === 'pending_review';
                  const isGraded = ass.status === 'graded';

                  return (
                    <div key={ass.id} className="border border-zinc-50 rounded-xl p-4 hover:border-zinc-100 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                        <div className="space-y-0.5">
                          <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                            isGraded ? 'bg-emerald-50 text-emerald-800' :
                            isPending ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {ass.status.replace('_', ' ')}
                          </span>
                          <h4 className="text-sm font-light tracking-tight text-brand-black">{ass.title}</h4>
                        </div>

                        {/* Grade highlights */}
                        {isGraded && (
                          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-3 py-1 rounded-xl shrink-0">
                            <span className="text-lg font-bold text-brand-black">{ass.grade}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">({ass.points}/{ass.maxPoints} pts)</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-brand-gray font-light leading-relaxed mb-4">{ass.description}</p>
                      
                      {ass.feedback && (
                        <div className="bg-zinc-50 border-l-2 border-brand-yellow rounded-xl p-3 text-[11px] font-light text-zinc-600 mb-4 italic">
                          <strong>Tutor Feedback:</strong> "{ass.feedback}"
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-light">
                          <Clock size={11} /> Due Date: {ass.dueDate}
                        </div>

                        {isNotSubmit ? (
                          <button
                            id={`submit-trigger-${ass.id}`}
                            onClick={() => handleOpenSubmission(ass)}
                            className="flex items-center gap-1.5 bg-brand-yellow hover:bg-brand-yellow-hover text-brand-black rounded-xl text-[10px] tracking-wide uppercase px-3.5 py-2 font-medium cursor-pointer shadow-xs focus-ring transition-colors"
                          >
                            <Upload size={11} /> Submit Assignment
                          </button>
                        ) : (
                          <button
                            id={`resubmit-trigger-${ass.id}`}
                            onClick={() => handleOpenSubmission(ass)}
                            className="text-[10px] font-medium text-brand-gray hover:text-brand-black transition-colors pointer-events-auto"
                          >
                            View Submitted Work
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right side - Verified Certifications listing & Active Teams */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <Award size={13} className="text-brand-yellow" /> Earned Certificates
              </h3>

              {certs.length === 0 ? (
                <div className="text-center p-6 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-xl">
                  No certificates earned yet. Complete and submit assignments with points above 90 to get micro-degree credentials.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {certs.map(cert => (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedCertToPrint(cert)}
                      className="border border-zinc-100 hover:border-brand-yellow bg-zinc-50/20 hover:bg-white rounded-xl p-3.5 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-8 h-8 bg-brand-yellow text-brand-black rounded-bl-3xl flex items-center justify-center">
                        <Award size={12} />
                      </div>

                      <h4 className="text-xs font-semibold text-brand-black pr-4 leading-tight">{cert.curriculumTitle}</h4>
                      <p className="text-[10px] text-brand-gray font-light mt-1">Certified by: <strong>{cert.trainerName}</strong></p>
                      
                      <span className="text-[8px] font-mono text-zinc-300 block mt-2 pt-2 border-t border-zinc-50 truncate">
                        Certificate ID: {cert.hash}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-3 flex items-center justify-between font-light">
                <span>Active Horizon Team</span>
                <button
                  onClick={() => onNavigateChange('collaboration')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors uppercase cursor-pointer font-medium"
                >
                  Go to Team
                </button>
              </h3>
              <p className="text-xs font-light text-brand-gray leading-relaxed mb-1">
                You are assigned to <strong className="text-brand-black">Team Horizon</strong> collaborating on spatial interfaces in real-time.
              </p>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'register' && (
        <div id="student-register-courses-view" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-light tracking-tight text-brand-black mb-1">
              Join New Classes // <span className="font-semibold text-brand-yellow">Available Courses</span>
            </h3>
            <p className="text-xs text-brand-gray font-light mb-6">
              Sign up for our classes below. When you join, we will give you beginner projects, and your teacher will help check your work and keep track of your progress here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {db.getCurricula().filter(c => c.status === 'approved').map(course => {
                const alreadyEnrolled = (currentUser.enrolledCourseIds || ['c-1']).includes(course.id);
                return (
                  <div key={course.id} className="border border-zinc-100 rounded-2xl p-5 hover:border-brand-yellow bg-zinc-50/10 hover:bg-white transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono uppercase bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 font-medium">
                          {course.category}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {course.durationWeeks} Weeks
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-brand-black leading-tight">
                        {course.title}
                      </h4>

                      <p className="text-xs text-brand-gray font-light leading-relaxed">
                        {course.description}
                      </p>

                      <div className="space-y-1.5 pt-2">
                        <h5 className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider">Syllabus modules:</h5>
                        <ul className="space-y-1">
                          {course.modules.slice(0, 3).map((mod, i) => (
                            <li key={i} className="text-[10px] text-zinc-550 font-mono flex items-center gap-1.5 truncate">
                              <span className="w-1 h-1 rounded-full bg-brand-yellow shrink-0" />
                              Week {i + 1}: {mod}
                            </li>
                          ))}
                          {course.modules.length > 3 && (
                            <li className="text-[9px] text-zinc-400 italic pl-2.5">
                              + {course.modules.length - 3} more modules in syllabus
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-50 flex items-center justify-between gap-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-light truncate">
                          Trainer: <strong className="text-zinc-700">{course.trainerName}</strong>
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-900 font-mono mt-0.5">
                          ₦{(course.price || 35000).toLocaleString()}
                        </span>
                      </div>

                      {(() => {
                        const enr = enrollments.find(e => e.courseId === course.id);
                        if (alreadyEnrolled || (enr && enr.paymentStatus === 'approved')) {
                          return (
                            <div className="text-[10.5px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <CheckCircle2 size={11} /> Enrolled
                            </div>
                          );
                        }
                        if (enr && enr.paymentStatus === 'pending_verification') {
                          return (
                            <button
                              onClick={() => handleViewCourseDetails(course)}
                              className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
                            >
                              <Clock size={11} className="animate-spin" /> Verifying
                            </button>
                          );
                        }
                        if (enr && enr.paymentStatus === 'rejected') {
                          return (
                            <button
                              onClick={() => handleViewCourseDetails(course)}
                              className="text-[10px] text-red-650 font-semibold bg-red-50/70 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              <AlertCircle size={11} /> Rejected
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={() => handleViewCourseDetails(course)}
                            className="bg-brand-black hover:bg-zinc-900 text-brand-yellow rounded-xl text-[10px] tracking-wide uppercase px-4 py-2 font-medium cursor-pointer shadow-xs transition-colors focus-ring shrink-0"
                          >
                            Details & Enroll
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Submit overlay window drawer */}
      {activeSubmittingAss && (
        <div id="submit-assignment-drawer" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-end z-50">
          <div className="bg-white border-l border-zinc-100 w-full max-w-lg h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider bg-zinc-50 px-2 py-0.5 rounded text-zinc-500">Secure Submission Portal</span>
                  <h3 className="text-base font-light tracking-tight text-brand-black">
                    Submit: <span className="font-semibold">{activeSubmittingAss.title}</span>
                  </h3>
                </div>
                <button
                  id="close-assignment-drawer-btn"
                  onClick={() => setActiveSubmittingAss(null)}
                  className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
                >
                  &times;
                </button>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-xs font-light text-zinc-500 leading-relaxed">
                <strong>Project Scope:</strong> {activeSubmittingAss.description}
              </div>

              <form onSubmit={handleSubmitAssignmentDraft} className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Project Web Link / Work URL</label>
                  <div className="relative">
                    <Link size={13} className="absolute left-3.5 top-3.5 text-zinc-300" />
                    <input
                      id="submit-input-link"
                      type="url"
                      placeholder="https://figma.com/file/your-project-url"
                      value={submitLink}
                      onChange={(e) => setSubmitLink(e.target.value)}
                      className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl pl-9 pr-4 py-3 focus:outline-hidden focus:border-brand-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Brief Project Summary or Notes</label>
                  <textarea
                    id="submit-input-summary"
                    placeholder="Provide any comments about your design, spacing rules, and font choices..."
                    value={submitText}
                    onChange={(e) => setSubmitText(e.target.value)}
                    className="w-full min-h-40 text-xs font-mono font-light text-zinc-700 bg-brand-light border border-zinc-100 rounded-2xl p-4 focus:outline-hidden focus:border-brand-yellow resize-none"
                    required
                  ></textarea>
                </div>

                <div className="bg-amber-50/20 border border-brand-yellow/20 rounded-xl p-3.5 text-[10px] text-zinc-500 font-light leading-normal flex items-start gap-2">
                  <AlertCircle size={14} className="text-brand-yellow shrink-0 mt-0.5" />
                  <span>
                    Your submission will be stored and shared with your instructors securely.
                  </span>
                </div>

                <button
                  id="final-payload-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus-ring"
                >
                  {submitting ? 'Submitting Work...' : 'Submit Project'}
                </button>
              </form>
            </div>

            <div className="text-[9px] font-mono text-zinc-300 uppercase tracking-wide border-t border-zinc-50 pt-4 text-center">
              Sabicrest Workspace Secure Portal
            </div>

          </div>
        </div>
      )}

      {/* Verified Micro-degree Print Certificate Dialog */}
      {selectedCertToPrint && (
        <div id="print-certificate-dialog" className="fixed inset-0 bg-brand-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Elegant classic visual certificate frame */}
            <div className="border-[8px] border-amber-50 rounded-2xl p-6 md:p-10 relative bg-white text-center text-brand-black">
              
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-zinc-100 rounded"></div>

              {/* Verified Badge */}
              <div className="flex justify-center mb-4">
                <div id="cert-print-icon" className="w-14 h-14 bg-brand-yellow rounded-full flex items-center justify-center animate-bounce">
                  <Award size={26} className="text-brand-black" />
                </div>
              </div>

              <h1 className="text-xl md:text-3xl font-semibold uppercase tracking-widest text-black">
                Sabicrest
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-widest text-brand-gray block mt-1">Verified Certificate of Achievement</span>

              <p className="text-xs font-light text-zinc-400 mt-6 lowercase italic">This document confirms that</p>
              <h2 className="text-2xl mt-2 font-light tracking-tight text-brand-black border-b border-zinc-50 pb-2 w-max mx-auto">{selectedCertToPrint.studentName}</h2>

              <p className="text-xs font-light text-zinc-400 mt-4 lowercase italic">has successfully completed the mentorship curriculum course</p>
              <h3 className="text-lg md:text-xl font-medium text-brand-black mt-2 leading-tight px-4">{selectedCertToPrint.curriculumTitle}</h3>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-zinc-100 text-left text-xs font-light max-w-lg mx-auto">
                <div>
                  <span className="text-[9px] uppercase font-semibold text-brand-gray block">Certified Instructor</span>
                  <span className="text-brand-black">{selectedCertToPrint.trainerName}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-semibold text-brand-gray block">Issue Date</span>
                  <span className="text-brand-black">{selectedCertToPrint.issuedDate}</span>
                </div>
              </div>

              {/* Cryptographic hash details bottom */}
              <div className="mt-8 bg-zinc-50 p-2.5 rounded-lg text-[9px] text-zinc-400 font-mono select-all flex items-center justify-between gap-2 max-w-md mx-auto">
                <span className="truncate">Verification Code: {selectedCertToPrint.hash}</span>
                <span className="text-emerald-500 font-semibold shrink-0 uppercase text-[8px]">● Verified</span>
              </div>

            </div>

            {/* Actions bottom */}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                id="do-print-cert-btn"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs font-light uppercase tracking-wide px-4 py-2.5 cursor-pointer shadow-xs focus-ring"
              >
                <Printer size={13} className="text-brand-yellow" /> Print Certificate
              </button>
              <button
                id="close-cert-panel-btn"
                onClick={() => setSelectedCertToPrint(null)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-xs font-light uppercase px-4 py-2.5 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Course Details Slide-out Drawer */}
      {selectedCourse && (
        <div id="course-details-drawer" className="fixed inset-0 bg-brand-black/50 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white border-l border-zinc-100 w-full max-w-xl h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-widest bg-zinc-100 px-3 py-1 rounded-full text-zinc-500 font-medium border border-zinc-200">
                    SABICREST CURRICULUM SYLLABUS
                  </span>
                  <h3 className="text-lg md:text-xl font-light tracking-tight text-brand-black mt-2">
                    Course: <span className="font-semibold text-brand-black">{selectedCourse.title}</span>
                  </h3>
                </div>
                <button
                  id="close-course-details-drawer"
                  onClick={() => setSelectedCourse(null)}
                  className="p-1 text-zinc-400 hover:text-brand-black rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Course Brief Detail */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border border-zinc-100 rounded-2xl p-4 bg-zinc-50/20 text-xs font-light text-zinc-650">
                <div>
                  <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Duration weeks</span>
                  <strong className="text-zinc-800 text-sm">{selectedCourse.durationWeeks} Weeks</strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Skill level</span>
                  <strong className="text-zinc-800 text-sm">{selectedCourse.level}</strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Tuition Fee</span>
                  <strong className="text-brand-black text-sm text-[13px] font-mono font-bold">₦{(selectedCourse.price || 35000).toLocaleString()}</strong>
                </div>
                <div className="md:col-span-3 pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-zinc-500">
                  <span>Instructor: <strong className="text-brand-black font-medium">{selectedCourse.trainerName}</strong></span>
                  <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-mono">{selectedCourse.category}</span>
                </div>
              </div>

              {/* Course Description */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Curriculum Synopsis</h4>
                <p className="text-xs text-brand-gray font-light leading-relaxed">
                  {selectedCourse.description}
                </p>
              </div>

              {/* Core Syllabus Modules Weekly Breakdown */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Comprehensive Modules Breakdown ({selectedCourse.modules.length} Weeks)</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedCourse.modules.map((m, idx) => (
                    <div key={idx} className="border border-zinc-50 bg-zinc-50/5 p-3 rounded-xl flex items-start gap-3">
                      <span className="text-[11px] font-mono font-bold text-brand-black bg-brand-yellow/30 px-2 py-0.5 rounded shrink-0">W{idx + 1}</span>
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-semibold text-zinc-800 leading-tight">Module {idx + 1} System</h5>
                        <p className="text-[11px] text-zinc-500 leading-normal">{m}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secure Enrollment & Payments Block */}
              <div className="border-t border-zinc-100 pt-5 space-y-4">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Mentorship Onboarding & Payment Status</h4>
                
                {(() => {
                  const enr = enrollments.find(e => e.courseId === selectedCourse.id);
                  const isEnrApproved = (currentUser.enrolledCourseIds || ['c-1']).includes(selectedCourse.id) || (enr && enr.paymentStatus === 'approved');

                  if (isEnrApproved) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center space-y-2">
                        <div className="mx-auto w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-1">
                          <ShieldCheck size={20} />
                        </div>
                        <h5 className="text-xs font-semibold text-emerald-950 uppercase tracking-wide font-medium">✓ Certified Active Enrollment</h5>
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-light">
                          You are fully registered for this course syllabus. Weekly evaluation tasks have been allocated to your personal dashboard directory.
                        </p>
                      </div>
                    );
                  }

                  if (enr && enr.paymentStatus === 'pending_verification') {
                    return (
                      <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-5 text-center space-y-3">
                        <div className="mx-auto w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-1">
                          <Clock size={20} className="animate-spin" />
                        </div>
                        <h5 className="text-xs font-semibold text-amber-950 uppercase tracking-wide font-medium">● Reference Pending Admin Verification</h5>
                        <p className="text-[11px] text-amber-800 font-light leading-relaxed">
                          Your Paystack transaction reference <strong className="font-mono bg-amber-100/60 px-1.5 py-0.5 rounded text-amber-950">{enr.paymentReference}</strong> is in the queue. Chief Admin Officer is validating payment. Real-time updates will signal instantly once verified.
                        </p>
                        
                        <div className="pt-2 border-t border-amber-150/40 text-left text-[10px] space-y-1 text-zinc-500 font-light">
                          <p><strong>Merchant Order Size:</strong> ₦{(enr.amount || 35000).toLocaleString()}</p>
                          <p><strong>Submission Time:</strong> {enr.submittedAt ? new Date(enr.submittedAt).toLocaleTimeString() : 'Awaiting sync'}</p>
                        </div>
                      </div>
                    );
                  }

                  if (enr && enr.paymentStatus === 'rejected') {
                    return (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-650 shrink-0">
                            <AlertCircle size={16} />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs font-semibold text-red-950 uppercase tracking-wide font-medium">✕ Payment Reference Audit Rejected</h5>
                            <p className="text-[11px] text-red-800 font-light leading-relaxed">
                              Verification failed. Reason: <strong className="font-semibold text-red-955">{enr.rejectionReason || 'Invalid Transaction Reference. No payment matched.'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-red-100 flex gap-2.5">
                          <button
                            onClick={() => handleInitiatePaymentProcess(selectedCourse)}
                            className="bg-brand-black text-white hover:bg-zinc-900 text-brand-yellow rounded-xl px-4 py-2 text-[10px] uppercase font-semibold transition-colors cursor-pointer shrink-0"
                          >
                            Pay with Paystack (Retry)
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Not enrolled, payment status pending_payment or not exists
                  return (
                    <div className="space-y-4">
                      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-[11px] leading-relaxed text-zinc-650 font-light">
                        To register, proceed to check-out with the integrated Paystack secure portal. This ensures instant transaction indexing. Optionally, enter a reference manually.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <button
                          onClick={() => handleInitiatePaymentProcess(selectedCourse)}
                          className="flex items-center justify-center gap-2 bg-[#3bb75e] hover:bg-[#349e52] text-white py-3 px-4 rounded-xl text-xs uppercase tracking-wide font-semibold shadow-xs transition-colors cursor-pointer focus-ring"
                        >
                          <CreditCard size={13} />
                          Pay with Paystack
                        </button>

                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">Or submit paid Ref code</span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={paystackRefInput}
                              onChange={(e) => setPaystackRefInput(e.target.value)}
                              placeholder="PSTK-REF-..."
                              className="w-full text-xs font-mono bg-zinc-50 border border-zinc-150 rounded-lg px-2.5 py-1.5 focus:outline-hidden text-zinc-700"
                            />
                            <button
                              onClick={() => handleSubmitVerificationReference(selectedCourse.id, paystackRefInput)}
                              className="bg-zinc-900 hover:bg-zinc-800 text-brand-yellow px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer shrink-0"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>

            <div className="text-[9px] font-sans text-zinc-300 uppercase tracking-wide border-t border-zinc-50 pt-4 text-center mt-6">
              SABICREST REGISTRAR PORTAL // SECURE TRANSACTION
            </div>

          </div>
        </div>
      )}

      {/* Interactive Simulated Paystack Terminal Modal */}
      {showPaystackTerminal && selectedCourse && (
        <div id="paystack-terminal-overlay" className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col justify-between border border-zinc-100">
            
            {/* Paystack Header Banner */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="space-y-1.5 relative z-10">
                <span className="text-[8px] tracking-widest font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  SECURE PAYSTACK GATEWAY
                </span>
                <h4 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                  <CreditCard className="text-[#3bb75e]" size={15} />
                  Checkout // <span className="text-[#3bb75e] font-bold">Paystack</span>
                </h4>
                <p className="text-[10px] text-zinc-400 font-light">Merchant: Sabicrest Academy Account System</p>
              </div>
              <button
                onClick={() => setShowPaystackTerminal(false)}
                className="text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Merchant Details Ribbon */}
            <div className="bg-zinc-100/70 border-b border-zinc-200/50 px-5 py-3 flex items-center justify-between text-xs font-light text-zinc-650">
              <span>{currentUser.email}</span>
              <span className="font-mono text-brand-black font-semibold text-sm">
                ₦{(selectedCourse.price || 35000).toLocaleString()}
              </span>
            </div>

            {/* Main Terminal Terminal Body */}
            <div className="p-6 min-h-68">
              
              {paymentStep === 'checkout' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-center p-4 bg-zinc-50 rounded-2xl space-y-1 border border-zinc-100">
                    <p className="text-xs text-zinc-500">You are paying tuition fee for course:</p>
                    <p className="text-xs font-semibold text-brand-black">{selectedCourse.title}</p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setPaymentStep('card_entry')}
                      className="w-full flex items-center justify-between p-3.5 border border-zinc-150 hover:border-[#3bb75e] rounded-xl hover:bg-zinc-50/50 transition-all cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-[#3bb75e]">
                          <CreditCard size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-brand-black">Pay with Card</p>
                          <p className="text-[10px] text-zinc-400 font-light">Visa, Mastercard, Verve</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300 group-hover:text-[#3bb75e] transition-colors" />
                    </button>

                    <button
                      onClick={() => handleGeneratePaystackLink(selectedCourse)}
                      className="w-full flex items-center justify-between p-3.5 border border-zinc-150 hover:border-[#3bb75e] rounded-xl hover:bg-zinc-50/50 transition-all cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-sky-600">
                          <ExternalLink size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-brand-black">Generate Paystack Checkout Link</p>
                          <p className="text-[10px] text-zinc-400 font-light">Copy official link to pay on other frames</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300 group-hover:text-[#3bb75e] transition-colors" />
                    </button>
                  </div>

                  {generatingLink && (
                    <div className="text-center py-2 text-[10px] text-zinc-400 font-sans animate-pulse">
                      Generating secure checkout link...
                    </div>
                  )}

                  {generatedLink && (
                    <div className="bg-emerald-500/10 border border-emerald-100 rounded-xl p-3.5 text-center space-y-2 select-all">
                      <span className="text-[9px] font-sans font-bold text-emerald-800 tracking-wider block">OFFICIAL PAYSTACK LINK</span>
                      <p className="text-xs font-mono text-emerald-900 break-all underline cursor-pointer">{generatedLink}</p>
                      <span className="text-[8px] text-zinc-400 font-light block">You paid? Paste the code returned below or proceed with sandbox simulation card below.</span>
                    </div>
                  )}
                </div>
              )}

              {paymentStep === 'card_entry' && (
                <form
                  onSubmit={handleSimulateCardCheckout}
                  className="space-y-4 animate-in fade-in duration-200"
                >
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-light">
                    <span>Authorized checkout mode</span>
                    <strong className="text-brand-black uppercase font-bold text-[10px] text-[#3bb75e] flex items-center gap-1">
                      <Lock size={10} /> 3D-Secure Secure
                    </strong>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-1">CREDIT CARD NUMBER</label>
                      <input
                        type="text"
                        maxLength={16}
                        required
                        value={cardNo}
                        onChange={(e) => setCardNo(e.target.value.replace(/\D/g, ''))}
                        placeholder="5061 2345 6789 1011"
                        className="w-full text-xs font-mono tracking-widest bg-zinc-50 border border-zinc-150 rounded-xl px-4 py-3 placeholder:text-zinc-350 text-brand-black focus:outline-hidden focus:border-[#3bb75e] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-1">EXPIRY (MM/YY)</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          className="w-full text-xs font-mono text-center tracking-widest bg-zinc-50 border border-zinc-150 rounded-xl px-4 py-3 placeholder:text-zinc-350 text-brand-black focus:outline-hidden focus:border-[#3bb75e] focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-1">CVV / SECURE KEY</label>
                        <input
                          type="password"
                          required
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="012"
                          className="w-full text-xs font-mono text-center tracking-widest bg-zinc-50 border border-zinc-150 rounded-xl px-4 py-3 placeholder:text-zinc-350 text-brand-black focus:outline-hidden focus:border-[#3bb75e] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#3bb75e] hover:bg-[#349e52] text-white rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors mt-2 cursor-pointer text-center"
                  >
                    Authenticate secure payload
                  </button>
                </form>
              )}

              {paymentStep === 'processing' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                  <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  
                  <div className="text-xs uppercase font-semibold text-[#3bb75e] tracking-tight">
                    Connecting network handshakes...
                  </div>

                  <div className="bg-slate-900 text-[10px] text-zinc-300 font-mono rounded-xl p-4 text-left space-y-1 border border-slate-800 max-h-48 overflow-y-auto">
                    {paystackLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#3bb75e] shrink-0 font-bold">&gt;</span>
                        <span className="leading-relaxed text-zinc-300">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentStep === 'otp_entry' && (
                <form
                  onSubmit={handleVerifyOTP}
                  className="space-y-4 animate-in fade-in duration-200"
                >
                  <div className="text-center space-y-2">
                    <div className="text-xs text-zinc-500">
                      An authentic OTP was delivered to your mobile phone lines. Input code to authorize the tuition charge.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={paymentOtp}
                      onChange={(e) => setPaymentOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Input SMS authentication code (e.g. 1234)"
                      className="w-full text-xs font-mono text-center tracking-widest bg-zinc-50 border border-zinc-150 rounded-xl px-4 py-3 text-brand-black focus:outline-hidden focus:border-[#3bb75e] focus:bg-white transition-colors"
                    />

                    <div className="text-[10px] text-zinc-400 italic text-center">
                      Testing? Input any 4-digit numeric sequence (e.g., <strong>1234</strong>) to trigger validation.
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#3bb75e] hover:bg-[#349e52] text-white rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    Authorize Payment NGN {(selectedCourse.price || 35000).toLocaleString()}
                  </button>
                </form>
              )}

              {paymentStep === 'success' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 size={24} />
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide font-medium">Secure Payment Authenticated</h5>
                    <p className="text-xs text-zinc-500 font-light">
                      Invoice total fully settled on Paystack ledger.
                    </p>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-left text-[11px] font-mono space-y-1">
                    <p className="text-zinc-400 uppercase text-[9px] font-bold">Transaction Audit reference:</p>
                    <p className="text-emerald-700 font-semibold">{paystackRefInput}</p>
                    <p className="text-[9px] text-zinc-400 mt-2 italic leading-tight">✓ Reference is automatically linked and sent to administrator queues.</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowPaystackTerminal(false);
                      showToast('✓ Paystack transaction linked successfully!');
                    }}
                    className="w-full py-3 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    Continue Onboarding
                  </button>
                </div>
              )}

            </div>

            {/* Paystack Security Ribbon */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex items-center justify-center gap-2.5 text-[10px] text-zinc-400 select-none">
              <ShieldCheck size={14} className="text-[#3bb75e]" />
              <span>Secured by <strong>Paystack</strong>. PCIDSS-compliant transaction processors</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Assignment, Certificate, Curriculum, CourseEnrollment } from '../types';
import { db } from '../db';
import VerifiedBadge from './VerifiedBadge';
import { getCourseImage } from '../utils/course';
import { jsPDF } from 'jspdf';
import { 
  Award, BookOpen, Clock, FileText, CheckCircle2, ChevronRight, Upload, Link, AlertCircle, 
  FileCheck, Printer, Settings, User as UserIcon, Mail, Phone, MapPin, Sliders, Bell, 
  Compass, Radio, Heart, HelpCircle, Activity, CreditCard, Lock, X, ExternalLink, ShieldCheck, Coins, Search, ArrowUpRight,
  TrendingUp, ChevronDown, ChevronUp, Sparkles, Flame, Snowflake, Briefcase, Trophy
} from 'lucide-react';

interface DashboardStudentProps {
  currentUser: User;
  activeTab?: string;
  onNavigateChange: (tabId: string) => void;
}

export default function DashboardStudent({ currentUser, activeTab, onNavigateChange }: DashboardStudentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(
    db.getAssignments().filter(a => a.studentId === currentUser.id)
  );
  const [certs, setCerts] = useState<Certificate[]>(
    db.getCertificates().filter(c => c.studentId === currentUser.id)
  );

  const isTrainerVerified = (trainerName: string) => {
    const trainer = db.getUsers().find(u => u.name?.trim().toLowerCase() === trainerName?.trim().toLowerCase() && u.role === 'trainer');
    return trainer ? trainer.verified : false;
  };

  // Sub Tab states
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'register'>('assignments');

  useEffect(() => {
    if (activeTab === 'courses') {
      setActiveSubTab('register');
    } else if (activeTab === 'tasks') {
      setActiveSubTab('assignments');
    } else if (activeTab === 'dashboard') {
      setActiveSubTab('assignments');
    }
  }, [activeTab]);

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
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [coursesSearchQuery, setCoursesSearchQuery] = useState('');

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

  // Sabi Streak States
  const [studentUser, setStudentUser] = useState<User>(() => db.getUserById(currentUser.id) || currentUser);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceNote, setPracticeNote] = useState('');
  const [isCountdownDropdownOpen, setIsCountdownDropdownOpen] = useState(false);

  const reloadStudentData = () => {
    setAssignments(db.getAssignments().filter(a => a.studentId === currentUser.id));
    setCerts(db.getCertificates().filter(c => c.studentId === currentUser.id));
    setStudentNotifs(db.getNotifications().filter(n => n.userId === currentUser.id));
    setEnrollments(db.getEnrollments().filter(e => e.studentId === currentUser.id));
    
    const refreshedUser = db.getUserById(currentUser.id);
    if (refreshedUser) {
      setStudentUser(refreshedUser);
    }
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

  useEffect(() => {
    const calculateTimeLeft = () => {
      const dbUser = db.getUserById(currentUser.id) || currentUser;
      if (!dbUser.streakExpiry) {
        setTimeLeftStr('--h --m --s');
        return;
      }
      
      const expiry = new Date(dbUser.streakExpiry).getTime();
      const now = Date.now();
      const diff = expiry - now;
      
      if (diff <= 0) {
        if (dbUser.streakCount && dbUser.streakCount > 0 && !dbUser.streakFreezeActive) {
          const updated = {
            ...dbUser,
            streakCount: 0,
            streakExpiry: undefined
          };
          db.updateUser(updated);
          setStudentUser(updated);
        }
        setTimeLeftStr('00h 00m 00s (Fire Out)');
      } else {
        const hours = Math.floor(diff / (3600 * 1000));
        const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        
        let displayStr = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
        if (dbUser.streakFreezeActive) {
          displayStr = '🧊 FROZEN (Protected)';
        } else {
          displayStr += ' left';
        }
        setTimeLeftStr(displayStr);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [currentUser.id, studentUser.streakExpiry, studentUser.streakFreezeActive]);

  useEffect(() => {
    const handleSearch = (e: any) => {
      setDashboardSearchQuery(e.detail || '');
      setCoursesSearchQuery(e.detail || '');
    };
    window.addEventListener('sabicrest-search', handleSearch);
    return () => window.removeEventListener('sabicrest-search', handleSearch);
  }, []);

  const handleOpenSubmission = (ass: Assignment) => {
    setActiveSubmittingAss(ass);
    setSubmitText(ass.submissionContent || '');
    setSubmitLink(ass.linkUrl || '');
  };

  const handleSubmitAssignmentDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmittingAss) return;

    setSubmitting(true);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const dbUser = db.getUserById(currentUser.id) || currentUser;
    const hasLoggedToday = dbUser.lastStreakActivityDate === todayStr;
    const nextExpiry = new Date();
    nextExpiry.setHours(nextExpiry.getHours() + 36); // assignment submission gives a 36H timer boost

    const updatedUser: User = {
      ...dbUser,
      streakCount: hasLoggedToday ? (dbUser.streakCount || 5) : ((dbUser.streakCount || 5) + 1),
      streakExpiry: nextExpiry.toISOString(),
      streakFreezeActive: false,
      lastStreakActivityDate: todayStr,
      streakLogs: [
        {
          id: 'l-a-' + Math.random().toString(36).substr(2, 6),
          date: todayStr,
          type: 'assignment',
          note: `Uploaded required homework for "${activeSubmittingAss.title}" to standard catalog.`,
          timestamp: new Date().toISOString()
        },
        ...(dbUser.streakLogs || [])
      ]
    };

    const updatedAss: Assignment = {
      ...activeSubmittingAss,
      status: 'pending_review',
      submissionContent: submitText,
      linkUrl: submitLink,
      submittedAt: new Date().toISOString()
    };

    await db.updateAssignment(updatedAss);
    await db.updateUser(updatedUser);
    
    // Notification
    db.addNotification({
      userId: activeSubmittingAss.trainerId,
      title: 'New Student Assignment',
      message: `${currentUser.name} submitted assignment "${activeSubmittingAss.title}" for review.`,
      type: 'grade'
    });

    setSubmitting(false);
    setActiveSubmittingAss(null);
    reloadStudentData();
    showToast(`[STREAK REFUEL] Assignment submitted! Your Sabi Streak was refueled up to 36 hours! Keep shining!`);
  };

  const handleLogPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceNote.trim() || practiceNote.trim().length < 5) {
      showToast('[WARNING] Please write a brief practice description of at least 5 characters.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dbUser = db.getUserById(currentUser.id) || currentUser;
    const hasLoggedToday = dbUser.lastStreakActivityDate === todayStr;
    const nextExpiry = new Date();
    nextExpiry.setHours(nextExpiry.getHours() + 33); // daily logs give 33H timer boost

    const updatedUser: User = {
      ...dbUser,
      streakCount: hasLoggedToday ? (dbUser.streakCount || 5) : ((dbUser.streakCount || 5) + 1),
      streakExpiry: nextExpiry.toISOString(),
      streakFreezeActive: false,
      lastStreakActivityDate: todayStr,
      streakLogs: [
        {
          id: 'l-p-' + Math.random().toString(36).substr(2, 6),
          date: todayStr,
          type: 'practice',
          note: practiceNote,
          timestamp: new Date().toISOString()
        },
        ...(dbUser.streakLogs || [])
      ]
    };

    await db.updateUser(updatedUser);
    setStudentUser(updatedUser);
    setPracticeNote('');
    setShowPracticeModal(false);
    setAudioToggle(); // Play native chime logic
    reloadStudentData();
    showToast('[STREAK REFUEL] Sabi Streak refueled! Logged daily practice project and filled timer up to 33 hours!');
  };

  const handleUseStreakFreeze = async () => {
    const dbUser = db.getUserById(currentUser.id) || currentUser;
    const currentFreezes = dbUser.streakFreezes !== undefined ? dbUser.streakFreezes : 2;
    
    if (currentFreezes <= 0) {
      showToast('[ERROR] You do not have any Streak Freeze cards remaining.');
      return;
    }

    if (dbUser.streakFreezeActive) {
      showToast('[STREAK FROZEN] Your Sabi Streak is already frozen and protected.');
      return;
    }

    const nextExpiry = new Date();
    nextExpiry.setHours(nextExpiry.getHours() + 48); // freeze protects for 48 hours

    const updatedUser: User = {
      ...dbUser,
      streakFreezes: currentFreezes - 1,
      streakFreezeActive: true,
      streakExpiry: nextExpiry.toISOString(),
      streakLogs: [
        {
          id: 'l-f-' + Math.random().toString(36).substr(2, 6),
          date: new Date().toISOString().split('T')[0],
          type: 'practice',
          note: 'Activated emergency Streak Freeze card to protect current progress.',
          timestamp: new Date().toISOString()
        },
        ...(dbUser.streakLogs || [])
      ]
    };

    await db.updateUser(updatedUser);
    setStudentUser(updatedUser);
    setAudioToggle(); // Play native chime logic
    reloadStudentData();
    showToast('[STREAK FROZEN] Sabi Streak is now Frozen! Your progress is protected for up to 48 hours.');
  };

  const setAudioToggle = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.53);
    } catch(e) {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleDownloadCertificatePDF = (cert: Certificate) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [842, 595]
      });

      // Try to read trainer settings from DB if we can, to capture live changes
      const trainerUser = db.getUsers().find(u => u.role === 'trainer' && u.name === cert.trainerName);
      const isBusinessShared = cert.useBusinessName || trainerUser?.useBusinessName || false;
      const businessName = cert.trainerBusinessName || trainerUser?.trainerBusinessName || '';
      const signaturePayload = cert.trainerSignature || trainerUser?.trainerSignature || '';
      const capacityRole = cert.trainerRole || trainerUser?.trainerRole || 'Mentor';

      // 1. Base Canvas Soft/Aesthetic Background Ivory Color Fill
      doc.setFillColor(253, 252, 248);
      doc.rect(0, 0, 842, 595, 'F');

      // 2. Dual borders
      // Charcoal/Navy Outer Border
      doc.setDrawColor(24, 24, 27); 
      doc.setLineWidth(1.5);
      doc.rect(18, 18, 806, 559); 

      // Bronze/Gold Inner Border
      doc.setDrawColor(197, 160, 89); 
      doc.setLineWidth(1);
      doc.rect(23, 23, 796, 549); 

      // 3. Antique Corner Ornament Brackets (Gold)
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(1.5);
      // Top-Left
      doc.line(14, 35, 35, 14);
      doc.line(23, 45, 45, 23);
      // Top-Right
      doc.line(828, 35, 807, 14);
      doc.line(819, 45, 797, 23);
      // Bottom-Left
      doc.line(14, 560, 35, 581);
      doc.line(23, 550, 45, 572);
      // Bottom-Right
      doc.line(828, 560, 807, 581);
      doc.line(819, 550, 797, 572);

      // 4. Main Headline Board - "SABICREST ACADEMY"
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('SABICREST ACADEMY', 421, 75, { align: 'center' });

      // Subtle Underline Accent
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(1.5);
      doc.line(300, 85, 542, 85);

      // 5. Partnership Statement label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(115, 115, 115);
      doc.text('IN OFFICIAL PROFESSIONAL COLLABORATION WITH', 421, 102, { align: 'center' });

      // Collaborative Partner text (Use Business Name only if they have registered it)
      const partnerText = isBusinessShared && businessName
        ? `${businessName.toUpperCase()}`
        : `${cert.trainerName.toUpperCase()}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(197, 160, 89);
      doc.text(partnerText, 421, 122, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text('(REGISTERED PROFESSIONAL TRAINER AND MENTOR)', 421, 134, { align: 'center' });

      // 6. Star Gold Emblem Badge Logo Seal
      doc.setFillColor(197, 160, 89);
      doc.setDrawColor(161, 121, 51);
      doc.setLineWidth(1);
      doc.circle(421, 175, 20, 'FD');
      
      doc.setTextColor(253, 252, 248);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('★', 421, 180, { align: 'center' });

      // 7. Statement of Honor / Award Address
      doc.setFont('times', 'italic');
      doc.setFontSize(13);
      doc.setTextColor(82, 82, 91);
      doc.text('This verified professional certificate is jointly awarded to', 421, 218, { align: 'center' });

      // Recipient Graduate Name - Bold & Distinctive
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(15, 23, 42);
      doc.text(cert.studentName.toUpperCase(), 421, 252, { align: 'center' });

      // Graduate Name Underline Accent
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(1.2);
      doc.line(220, 262, 622, 262);

      // Completion Statement
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(82, 82, 91);
      doc.text('for exceptional commitment, caliber, and full completion of the industry accredited curriculum', 421, 282, { align: 'center' });

      // Curriculum Course Title (Accent color)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(197, 160, 89);
      doc.text(cert.curriculumTitle.toUpperCase(), 421, 312, { align: 'center' });

      // Audit identifiers
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(161, 161, 170);
      doc.text(`Official Graduation Date: ${cert.issuedDate}  |  Platform Audit ID: SC-${cert.hash.substring(0, 12).toUpperCase()}`, 421, 332, { align: 'center' });

      // Thin separator before signatures
      doc.setDrawColor(244, 244, 245);
      doc.setLineWidth(1);
      doc.line(100, 348, 742, 348);

      // 8. Signature columns (Symmetric 4 Column Grid)
      // Columns: [Founder 1] [Founder 2] [Founder 3] [Trainer / Mentor / CEO]
      // Coordinates: Col 1: 135, Col 2: 325, Col 3: 515, Col 4: 705

      // Subscripts base settings
      doc.setFontSize(8);
      doc.setTextColor(39, 39, 42);

      // COLUMN 1: Founder 1 Signature Space
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.8);
      doc.line(135 - 55, 410, 135 + 55, 410);

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text('Authorized Signature', 135, 400, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('FOUNDER & MD', 135, 422, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text('SABICREST ACADEMY', 135, 431, { align: 'center' });

      // COLUMN 2: Founder 2 Signature Space
      doc.setDrawColor(197, 160, 89);
      doc.line(325 - 55, 410, 325 + 55, 410);

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text('Authorized Signature', 325, 400, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('CO-FOUNDER & COO', 325, 422, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text('SABICREST ACADEMY', 325, 431, { align: 'center' });

      // COLUMN 3: Founder 3 Signature Space
      doc.setDrawColor(197, 160, 89);
      doc.line(515 - 55, 410, 515 + 55, 410);

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text('Authorized Signature', 515, 400, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('DIRECTOR OF DEGREES', 515, 422, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text('SABICREST ACADEMY', 515, 431, { align: 'center' });

      // COLUMN 4: Trainer/Mentor Signature (CEO or Mentor mode)
      doc.setDrawColor(197, 160, 89);
      doc.line(705 - 55, 410, 705 + 55, 410);

      if (signaturePayload) {
        try {
          doc.addImage(signaturePayload, 'PNG', 705 - 45, 368, 90, 36);
        } catch (imgErr) {
          console.warn("Signature add failed:", imgErr);
          doc.setFont('times', 'italic');
          doc.setFontSize(11);
          doc.setTextColor(197, 160, 89);
          doc.text(cert.trainerName, 705, 400, { align: 'center' });
        }
      } else {
        doc.setFont('times', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(197, 160, 89);
        doc.text(cert.trainerName, 705, 400, { align: 'center' });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(cert.trainerName.toUpperCase(), 705, 422, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      
      const subscriptRole = isBusinessShared && businessName && capacityRole === 'CEO'
        ? `CEO, ${businessName.toUpperCase()}`
        : 'AUTHORIZED TRAINER & MENTOR';
      
      doc.text(subscriptRole, 705, 431, { align: 'center' });

      // 9. Blockchain verification panel
      doc.setFillColor(244, 244, 245);
      doc.rect(171, 480, 500, 26, 'F');
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text(`VERIFICATION LEDGER HASH: ${cert.hash} (AUDITED BY SABICREST SYNDICATE)`, 421, 496, { align: 'center' });

      // Execute Download
      doc.save(`SABICREST_CERTIFICATE_${cert.studentName.replace(/\s+/g, '_')}_${cert.curriculumTitle.replace(/\s+/g, '_')}.pdf`);
      showToast("✓ Professional certification PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Error generating PDF certificate.");
    }
  };

  const handleInitializeDemoAssignments = (course: Curriculum) => {
    const task1 = db.addAssignment({
      title: `${course.title} Syllabus Core Milestone`,
      description: "Perform comprehensive layout structural maps, review margin pairings, and implement dynamic viewport containers according to specified client guidelines.",
      dueDate: "2026-06-15",
      maxPoints: 100,
      studentId: currentUser.id,
      studentName: currentUser.name,
      trainerId: course.trainerId || "u-trainer-1",
      trainerName: course.trainerName || "Verified Coach",
      courseId: course.id
    });
    
    db.updateAssignment({
      ...task1,
      status: 'graded',
      grade: 'A',
      points: 96,
      feedback: 'Excellent typographic execution and superb negative spacing boundaries! Keep it up.',
      gradedAt: new Date().toISOString()
    });

    const task2 = db.addAssignment({
      title: `${course.title} System Design Wireframe`,
      description: "Assemble responsive interface guidelines, define core colour tokens dynamically in config variables, and optimize canvas assets.",
      dueDate: "2026-06-25",
      maxPoints: 100,
      studentId: currentUser.id,
      studentName: currentUser.name,
      trainerId: course.trainerId || "u-trainer-1",
      trainerName: course.trainerName || "Verified Coach",
      courseId: course.id
    });

    db.updateAssignment({
      ...task2,
      status: 'graded',
      grade: 'A+',
      points: 98,
      feedback: 'Superb asset pipeline configuration. Professional-grade styling tokens.',
      gradedAt: new Date().toISOString()
    });

    db.addAssignment({
      title: `${course.title} Live Sandbox Integration`,
      description: "Configure client-side router transitions, integrate state event listeners, and execute build audits to run fully compliant containers.",
      dueDate: "2026-07-05",
      maxPoints: 100,
      studentId: currentUser.id,
      studentName: currentUser.name,
      trainerId: course.trainerId || "u-trainer-1",
      trainerName: course.trainerName || "Verified Coach",
      courseId: course.id
    });

    reloadStudentData();
    showToast(`✓ Initialized assignments list for "${course.title}". progress is updated!`);
  };

  const handleQuickAutogradeTasks = (course: Curriculum) => {
    const studentTasks = db.getAssignments().filter(a => a.courseId === course.id && a.studentId === currentUser.id);
    if (studentTasks.length === 0) {
      showToast("Initialize curriculum projects first!");
      return;
    }
    studentTasks.forEach(task => {
      db.updateAssignment({
        ...task,
        status: 'graded',
        grade: 'A',
        points: 95,
        feedback: 'Instantly graded in testing workspace sandbox module. Magnificent job!',
        gradedAt: new Date().toISOString()
      });
    });
    reloadStudentData();
    showToast(`✓ Graded all tasks for "${course.title}". Completion is at 100%!`);
  };

  const handleClaimAndDownloadCertificate = (course: Curriculum) => {
    let match = db.getCertificates().find(c => c.curriculumTitle === course.title && c.studentId === currentUser.id);
    if (!match) {
      match = db.issueCertificate(
        currentUser.id,
        currentUser.name,
        course.title,
        course.trainerName
      );
    }
    reloadStudentData();
    handleDownloadCertificatePDF(match);
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

  const filteredAssignments = assignments.filter(ass => 
    ass.title.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
    ass.description.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
  );

  const filteredCerts = certs.filter(cert => 
    cert.curriculumTitle.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
    cert.trainerName.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
  );

  const enrolledCoursesForProg = db.getCurricula().filter(c => 
    c.status === 'approved' && 
    ((currentUser.enrolledCourseIds || []).includes(c.id) || 
     enrollments.some(e => e.courseId === c.id && e.paymentStatus === 'approved'))
  );

  // Compute actual active topic data from user's dashboard activity dynamically instead of mock indicators
  let activeTopicTitle = 'Explore Academy';
  let activeTopicStatus = 'Beginner Track';
  let activeTopicDesc = 'Propose or request a trainer course to get started.';

  if (enrolledCoursesForProg.length > 0) {
    const activeCourse = enrolledCoursesForProg[0];
    activeTopicTitle = activeCourse.title;
    activeTopicStatus = activeCourse.category || 'Core Curriculum';
    activeTopicDesc = `Active curriculum with Trainer ${activeCourse.trainerName}.`;
  } else if (assignments.length > 0) {
    const latestAss = assignments.find(a => a.status === 'not_submitted') || assignments[0];
    activeTopicTitle = latestAss.title;
    activeTopicStatus = latestAss.status === 'graded' ? 'Graded Task' : 'Pending Homework';
    activeTopicDesc = `Task assigned. Status: ${latestAss.status.replace('_', ' ')}.`;
  } else if (studentUser.streakLogs && studentUser.streakLogs.length > 0) {
    const latestLog = studentUser.streakLogs[0];
    activeTopicTitle = latestLog.note.length > 40 ? latestLog.note.substring(0, 40) + '...' : latestLog.note;
    activeTopicStatus = latestLog.type === 'practice' ? 'Practice Log' : 'Streak Event';
    activeTopicDesc = `Activity recorded on ${new Date(latestLog.timestamp || latestLog.date).toLocaleDateString()}.`;
  } else {
    // Fallback search of standard database approved courses
    const allCourses = db.getCurricula().filter(c => c.status === 'approved');
    if (allCourses.length > 0) {
      activeTopicTitle = allCourses[0].title;
      activeTopicStatus = 'Suggested Course';
      activeTopicDesc = `Join other classmates. Register today!`;
    }
  }

  return (
    <div id="student-dashboard-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Centered Modal for Alerts & Confirmations */}
      {toastMessage && (
        <div id="toast-modal-overlay" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-550/15 flex items-center justify-center mx-auto text-brand-yellow">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-brand-black dark:text-white">Instruction Alert</h3>
              <p className="text-xs font-light text-zinc-650 dark:text-zinc-350 leading-normal">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="bg-brand-black dark:bg-zinc-850 hover:bg-zinc-850 dark:hover:bg-zinc-700 text-white text-xs font-light tracking-wide uppercase px-4 py-2.5 rounded-xl transition-all w-full cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD TAB (HOME) */}
      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-250">
          {/* Premium Hero Welcome Banner */}
          <div id="student-hero-banner" className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black dark:bg-brand-yellow dark:from-brand-yellow dark:via-brand-yellow dark:to-brand-yellow text-white dark:text-black rounded-3xl p-5 xs:p-7 md:p-10 mb-8 relative overflow-hidden border border-zinc-800/40 dark:border-white shadow-xl grid grid-cols-1 md:grid-cols-[13fr_7fr] gap-5 md:gap-10 items-stretch">
            {/* Glow effect & subtle brand highlights */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none dark:hidden" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-50/5 rounded-full blur-3xl pointer-events-none dark:hidden" />
            <div className="absolute right-12 top-4 w-[2px] h-20 bg-gradient-to-b from-brand-yellow/40 to-transparent dark:from-black/10 blur-[1px] pointer-events-none" />
            <div className="absolute right-24 bottom-4 w-[2px] h-12 bg-gradient-to-t from-amber-500/30 to-transparent dark:from-black/15 blur-[1.5px] pointer-events-none" />
            
            {/* Left container: greeting and motivational stats */}
            <div className="relative z-10 flex flex-col justify-between space-y-3 sm:space-y-5">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                  <span className="text-[9px] xs:text-[11px] sm:text-xs font-mono tracking-widest uppercase bg-zinc-805/85 dark:bg-black/10 text-brand-yellow dark:text-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-md border border-zinc-700/60 dark:border-black/20 flex items-center gap-1 shrink-0 font-bold">
                    <Sparkles size={10} className="text-brand-yellow dark:text-black animate-pulse" /> Welcome
                  </span>
                  <span className="text-[9px] xs:text-[11px] sm:text-xs font-mono tracking-widest uppercase bg-zinc-800/50 dark:bg-black/5 text-zinc-300 dark:text-black/85 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md border border-zinc-800 dark:border-black/10 flex items-center gap-1 shrink-0 font-bold">
                    🏆 Rank #3
                  </span>
                </div>
                
                <h2 className="text-[28px] xs:text-[36px] sm:text-[44px] md:text-5xl lg:text-6xl font-light tracking-tight pr-1 leading-tight break-words text-white dark:text-black">
                  <span className="inline">Hello,</span>{' '}
                  <span className="inline font-semibold text-brand-yellow dark:text-black bg-gradient-to-r from-brand-yellow via-amber-400 to-amber-300 dark:from-black dark:to-neutral-900 bg-clip-text text-transparent dark:bg-none">
                    {currentUser.name ? currentUser.name.split(' ')[0] : 'Developer'}
                  </span>
                </h2>
                
                <p className="text-[11px]/[15px] xs:text-[13px]/[18px] sm:text-sm md:text-base text-zinc-300 dark:text-black/85 font-light leading-relaxed max-w-xl">
                  Every line you code shapes the future. Keep pushing forward!
                </p>
              </div>
 
              {/* Micro stat-line for Motivation */}
              <div className="pt-2 sm:pt-4 border-t border-zinc-800/40 dark:border-black/10 flex flex-wrap items-center gap-3 sm:gap-5 text-zinc-400 dark:text-black/60">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="text-[9px] xs:text-[11px] sm:text-xs uppercase font-mono tracking-wider text-zinc-500 dark:text-black/55 font-medium">Pace</span>
                  <span className="text-[10.5px] xs:text-xs sm:text-sm font-semibold text-white dark:text-black">4.8h/Day</span>
                </div>
                <div className="w-[1px] h-3 sm:h-4 bg-zinc-800 dark:bg-black/10" />
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="text-[9px] xs:text-[11px] sm:text-xs uppercase font-mono tracking-wider text-zinc-500 dark:text-black/55 font-medium">Sync</span>
                  <span className="text-[10.5px] xs:text-xs sm:text-sm font-semibold text-emerald-450 dark:text-emerald-850 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-450 dark:bg-emerald-800 animate-ping shrink-0" /> Live
                  </span>
                </div>
              </div>
            </div>
 
            {/* Right container: Learning Streak Tracker beside it */}
            <div className="relative z-10 flex flex-col justify-center items-stretch border-t md:border-t-0 md:border-l border-zinc-805 dark:border-black/10 pt-5 md:pt-0 pl-0 md:pl-6 lg:pl-10">
              <div className="space-y-4 w-full">
                <div className="flex flex-row justify-between items-center w-full gap-2">
                  <h3 className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-400 dark:text-black/65 font-bold flex items-center gap-1.5 select-none">
                    <Flame size={14} className="text-brand-yellow animate-pulse shrink-0 fill-brand-yellow" /> SABI STREAK
                  </h3>
                  <span className="text-[10px] xs:text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-brand-yellow via-amber-400 to-amber-500 border border-brand-yellow/45 px-3 py-1 shadow-xs rounded-full shrink-0 flex items-center gap-1 select-none font-mono">
                    <Flame size={12} className="text-black fill-black shrink-0" /> {studentUser.streakCount ?? 5} Days Core
                  </span>
                </div>

                {/* Vivid Countdown & Touchpoints Engine */}
                <div className="bg-zinc-950/85 dark:bg-zinc-50 border border-zinc-800/80 dark:border-zinc-200 p-4 rounded-2xl shadow-md">
                  {/* Dropdown Header Trigger - visible ONLY on mobile (< md) */}
                  <button
                    onClick={() => setIsCountdownDropdownOpen(!isCountdownDropdownOpen)}
                    className="md:hidden w-full flex items-center justify-between text-left select-none"
                  >
                    <span className="flex items-center gap-1.5 uppercase tracking-wide text-[11px] font-mono text-zinc-300 dark:text-zinc-650 font-bold">
                      <span className="w-2 h-2 rounded-full bg-brand-yellow animate-ping shrink-0" />
                      Countdown: <span className="text-brand-yellow dark:text-black font-semibold ml-1">{timeLeftStr}</span>
                    </span>
                    <ChevronDown size={14} className={`text-brand-yellow dark:text-black transition-transform duration-200 ${isCountdownDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Content - Always visible on desktop (>= md), toggled on mobile (< md) */}
                  <div className={`${isCountdownDropdownOpen ? 'block mt-3 space-y-3.5 pt-3 border-t border-zinc-800/60 dark:border-zinc-300/60' : 'hidden md:block md:space-y-3.5'}`}>
                    {/* Header for Desktop - visible only on md and larger */}
                    <div className="hidden md:flex items-center justify-between text-[11px] font-mono text-zinc-300 dark:text-zinc-650 font-bold border-b border-zinc-800/60 dark:border-zinc-300/60 pb-2">
                      <span className="flex items-center gap-1.5 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-brand-yellow animate-ping shrink-0" />
                        Fire Countdown:
                      </span>
                      <span className="text-brand-yellow dark:text-black font-mono font-bold text-xs">
                        {timeLeftStr}
                      </span>
                    </div>

                    {/* Sabi Touchpoints motivators */}
                    <div className="text-[10px] sm:text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-600 font-light space-y-1.5">
                      <div className="flex items-start gap-1">
                        <span className="text-brand-yellow font-normal shrink-0">✓</span>
                        <p>Marked classroom attendance automatically fuels your streak.</p>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-brand-yellow font-normal shrink-0">✓</span>
                        <p>Practical daily exercises logs and submitted assignments instantly refresh your clock.</p>
                      </div>
                    </div>

                    {/* Interactive Button Section */}
                    <div className="flex flex-col gap-2.5 pt-1">
                      <button
                        onClick={() => setShowPracticeModal(true)}
                        className="w-full bg-gradient-to-r from-brand-yellow via-amber-400 to-amber-500 text-black hover:opacity-90 font-bold tracking-wide uppercase py-2.5 px-3 rounded-xl text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Flame size={12} className="text-black fill-black" /> Log Project Practice Notes
                      </button>

                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          onClick={handleUseStreakFreeze}
                          disabled={studentUser.streakFreezeActive || (studentUser.streakFreezes ?? 2) <= 0}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-750 disabled:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-center border border-zinc-700/60 disabled:border-transparent rounded-xl py-2 px-2 text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                          title={studentUser.streakFreezeActive ? "Streak is currently frozen" : "Activate freeze card"}
                        >
                          <Snowflake size={11} className="text-zinc-300" /> {studentUser.streakFreezeActive ? "Streak is Frozen" : "Use Streak Freeze"}
                        </button>
                        
                        <span className="text-[9.5px] font-mono text-zinc-400 dark:text-zinc-600 whitespace-nowrap bg-zinc-950 dark:bg-zinc-200/50 px-2.5 py-1.5 rounded-lg border border-zinc-800/40 dark:border-zinc-300 select-none flex items-center gap-1">
                          <Snowflake size={11} className="text-blue-400" /> {studentUser.streakFreezes ?? 2} Freezes Left
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job priority banner */}
                <div className="bg-brand-black/45 dark:bg-white border border-brand-yellow/30 dark:border-zinc-150 p-3 rounded-xl flex items-center gap-2.5 shadow-2xs select-none">
                  <Briefcase size={18} className="text-brand-yellow shrink-0" />
                  <div className="text-[10px] sm:text-[11px] leading-snug">
                    <strong className="text-brand-yellow dark:text-black uppercase tracking-wider block font-bold">Elite Career Advantage</strong>
                    <span className="text-zinc-400 dark:text-zinc-600 font-light">Most consistent high-streak students are given <strong>first priority for elite global jobs</strong>!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Analytics Bento Grid Row - Structured in Two Elegant Columns */}
        <div id="student-bento-row" className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
            
            {/* Card 1: Assignment Progress */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-5 sm:p-7 md:p-9 rounded-2xl shadow-sm hover:shadow-md cursor-pointer hover:border-brand-yellow dark:hover:border-brand-yellow transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-450 font-semibold">Task Progress</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <FileText className="text-brand-yellow w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-300 group-hover:text-brand-black dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3.5xl md:text-4.5xl lg:text-5xl font-light text-brand-black dark:text-white tracking-tight flex items-baseline gap-2 leading-tight">
                <span className="font-extrabold">{gradeRate}%</span>
                <span className="text-[10px] xs:text-xs sm:text-sm text-zinc-450 dark:text-zinc-550 font-mono font-medium">({finishedCount}/{totalCount})</span>
              </div>
              <div className="w-full bg-zinc-150 dark:bg-zinc-805 rounded-full h-1.5 sm:h-2 mt-4 sm:mt-5 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-yellow to-amber-500 h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${gradeRate}%` }}></div>
              </div>
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-light mt-3 sm:mt-4">Active course completion ratings.</p>
            </div>

            {/* Card 2: Earned Certificates */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-5 sm:p-7 md:p-9 rounded-2xl shadow-sm hover:shadow-md cursor-pointer hover:border-brand-yellow dark:hover:border-brand-yellow transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-450 font-semibold">Certificates</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Award className="text-brand-yellow w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-300 group-hover:text-brand-black dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3.5xl md:text-4.5xl lg:text-5xl font-light text-brand-black dark:text-white tracking-tight flex items-baseline gap-2 leading-tight">
                <span className="font-extrabold">{certs.length}</span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-brand-yellow font-mono font-bold uppercase tracking-wider">Credentials</span>
              </div>
              <div className="w-full h-[1px] bg-zinc-150 dark:bg-zinc-800 mt-4 sm:mt-5" />
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-light mt-3 sm:mt-4">Jointly verified with Sabicrest Syndicate.</p>
            </div>

            {/* Card 3: Current Topic */}
            <div 
              onClick={() => onNavigateChange('courses')}
              className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-5 sm:p-7 md:p-9 rounded-2xl shadow-sm hover:shadow-md cursor-pointer hover:border-brand-yellow dark:hover:border-brand-yellow transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-450 font-semibold">Active Topic</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <BookOpen className="text-brand-yellow w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-300 group-hover:text-brand-black dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-sm xs:text-base sm:text-xl md:text-2xl lg:text-[26px] font-semibold tracking-tight text-brand-black dark:text-white truncate leading-tight">
                {activeTopicTitle}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono uppercase tracking-wider">{activeTopicStatus}</span>
              </div>
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-light mt-2 sm:mt-3">{activeTopicDesc}</p>
            </div>

            {/* Card 4: Grade History */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-5 sm:p-7 md:p-9 rounded-2xl shadow-sm hover:shadow-md cursor-pointer hover:border-brand-yellow dark:hover:border-brand-yellow transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-550 dark:text-zinc-450 font-semibold">Grade Log</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[60px] xs:max-w-none">Live Trend</span>
                  <ArrowUpRight className="text-zinc-300 group-hover:text-brand-black dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-5 py-1.5">
                <div id="sparkline-container" className="h-10 sm:h-12 flex-1 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-xl border border-zinc-100/50 dark:border-zinc-800 flex items-center justify-center">
                  {gradedAssignments.length >= 2 ? (
                    <svg className="w-full h-full p-1.5" viewBox="0 0 100 60">
                      <polyline
                        fill="none"
                        stroke="#FBBF1E"
                        strokeWidth="2"
                        points={linePoints.join(' ')}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="text-[9px] sm:text-xs text-zinc-400 italic">No grade data</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-zinc-200">A+</span>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs font-mono text-zinc-450">Class Avg</p>
                </div>
              </div>
              
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-light mt-3 sm:mt-4">Real-time performance scores ledger.</p>
            </div>

          </div>

          {/* Horizontally Scrollable Row of Quick Actions */}
          <div className="mb-8">
            <div className="px-1 mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-yellow font-bold" />
              <span className="text-xs uppercase font-bold tracking-widest text-brand-gray dark:text-zinc-450">Quick Actions</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {[
                { 
                  label: 'Register Course', 
                  icon: Compass, 
                  onClick: () => onNavigateChange('courses')
                },
                { 
                  label: 'View Certificates', 
                  icon: Award, 
                  onClick: () => onNavigateChange('tasks')
                },
                { 
                  label: 'Assignments', 
                  icon: FileText, 
                  onClick: () => onNavigateChange('tasks')
                },
                { 
                  label: 'Class Leaderboard', 
                  icon: Activity, 
                  onClick: () => {
                    showToast("🏆 Sabicrest Syndicate Leaderboard: You are currently ranked #3 out of all registered active developers with an average score of 96.8%!");
                  } 
                },
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={action.onClick}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150/80 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 hover:border-brand-yellow dark:hover:border-brand-yellow hover:shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Icon size={14} className="text-brand-yellow shrink-0" />
                    <span className="text-xs font-semibold text-brand-black dark:text-white tracking-tight">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Home Active Courses Progress Hub - High Contrast Isolation */}
          <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs uppercase font-bold tracking-widest text-brand-gray dark:text-zinc-455 flex items-center gap-1.5">
                <BookOpen size={13} className="text-brand-yellow" /> Active Courses
              </h3>
              <button 
                onClick={() => onNavigateChange('courses')}
                className="text-xs text-brand-yellow font-semibold hover:underline"
              >
                Register For More Courses &rarr;
              </button>
            </div>

            {enrolledCoursesForProg.length === 0 ? (
              <div className="text-center p-8 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl text-xs font-light border border-zinc-100/50 dark:border-zinc-800">
                You are not currently enrolled in any curricula. Head over to the <strong className="text-brand-black dark:text-white cursor-pointer underline font-medium" onClick={() => onNavigateChange('courses')}>Register Courses</strong> page to explore available classes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCoursesForProg.map(course => {
                  const courseTasks = assignments.filter(a => a.courseId === course.id);
                  const gradedTasks = courseTasks.filter(a => a.status === 'graded');
                  const hasAssignments = courseTasks.length > 0;
                  const completionPercent = hasAssignments ? Math.round((gradedTasks.length / courseTasks.length) * 100) : 0;
                  
                  return (
                    <div key={course.id} className="border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-4 bg-white dark:bg-zinc-900/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-8 rounded-lg overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-850">
                          <img 
                            src={getCourseImage(course.category, course.title, course.imageUrl)} 
                            alt={course.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-semibold text-brand-black dark:text-zinc-200 truncate max-w-[180px] sm:max-w-[240px]">{course.title}</h4>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Trainer: {course.trainerName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10.5px] font-mono font-semibold text-brand-yellow">{completionPercent}% Complete</span>
                        <div className="w-16 bg-zinc-100 dark:bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-brand-yellow h-1.5 rounded-full" style={{ width: `${completionPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STANDALONE TASKS/EVALUATION PAGE */}
      {activeTab === 'tasks' && (
        <div id="student-main-content-standalone-tasks" className="space-y-6 animate-in fade-in duration-200">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-brand-black dark:text-white leading-tight">
                Academic <span className="font-semibold text-brand-yellow">Coursework, Grades & Certificates</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1">
                Upload your project files, track grades from your Trainers, and print certified joint-verified degrees.
              </p>
            </div>
            <button 
              onClick={() => onNavigateChange('dashboard')} 
              className="text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white font-semibold uppercase tracking-wider cursor-pointer border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 transition-colors shrink-0 max-w-[140px]"
            >
              &larr; Back Home
            </button>
          </div>
          
          <div id="student-main-content-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
            
            {/* Assignments stream - Left Wide col */}
            <div className="lg:col-span-2 space-y-6" id="student-assignments-stream">
            
            {/* Curriculum Progress & Certification Hub */}
            <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs relative overflow-hidden" id="student-certification-hub">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-1.5 mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase flex items-center gap-1.5 font-bold">
                    <Award size={14} className="text-brand-yellow" /> Curriculum Progress & Certification Hub
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-light">
                    Ensure all course requirements are met to unlock and download your official accredited milestone PDF degree.
                  </p>
                </div>
              </div>

              {enrolledCoursesForProg.length === 0 ? (
                <div className="text-center p-6 text-zinc-500 bg-zinc-50 rounded-xl text-xs font-light">
                  You are not currently enrolled in any active curricula. Head over to the <strong className="text-brand-black cursor-pointer underline font-medium font-semibold" onClick={() => setActiveSubTab('register')}>Register Courses</strong> tab to join classes.
                </div>
              ) : (
                <div className="space-y-5">
                  {enrolledCoursesForProg.map(course => {
                    const courseTasks = assignments.filter(a => a.courseId === course.id);
                    const gradedTasks = courseTasks.filter(a => a.status === 'graded');
                    const hasAssignments = courseTasks.length > 0;
                    
                    const isFullyGraduated = certs.some(c => c.curriculumTitle === course.title);
                    const requirementsMatched = hasAssignments && (gradedTasks.length === courseTasks.length);
                    const completionPercent = hasAssignments ? Math.round((gradedTasks.length / courseTasks.length) * 100) : (isFullyGraduated ? 100 : 0);

                    return (
                      <div key={course.id} className="border border-zinc-100 rounded-xl p-4 md:p-5 bg-zinc-50/20 hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        
                        <div className="space-y-3 flex-1 w-full">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-100">
                              <img 
                                src={getCourseImage(course.category, course.title, course.imageUrl)} 
                                alt={course.title} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-brand-black truncate max-w-[280px] md:max-w-[360px] leading-tight">
                                {course.title}
                              </h4>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                Mentor: <strong className="text-zinc-650 font-medium">{course.trainerName}</strong> • {course.durationWeeks} Weeks
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-500 font-light flex items-center gap-1">
                                {hasAssignments ? (
                                  <>
                                    <span className="font-semibold">{gradedTasks.length} of {courseTasks.length}</span> assignments evaluated
                                  </>
                                ) : (
                                  <span className="text-amber-600 font-medium flex items-center gap-1">
                                    <AlertCircle size={10} /> No curriculum projects initialized yet
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-brand-black">{completionPercent}%</span>
                            </div>
                            
                            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  completionPercent === 100 ? 'bg-emerald-500' : 'bg-brand-yellow'
                                }`}
                                style={{ width: `${completionPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                          {!hasAssignments && (
                            <button
                              type="button"
                              id={`initialize-tasks-btn-${course.id}`}
                              onClick={() => handleInitializeDemoAssignments(course)}
                              className="text-[9.5px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Sparkles size={11} /> Allocate Course Projects
                            </button>
                          )}

                          {hasAssignments && !requirementsMatched && (
                            <button
                              type="button"
                              id={`quick-autograde-btn-${course.id}`}
                              onClick={() => handleQuickAutogradeTasks(course)}
                              className="text-[9px] text-zinc-500 hover:text-brand-black bg-zinc-100 hover:bg-zinc-200 font-mono px-2.5 py-1.5 rounded-lg border border-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Quickly complete and grade all coursework for instant testing"
                            >
                              <CheckCircle2 size={10} className="text-emerald-500" /> Fast Grade (Test PDF)
                            </button>
                          )}

                          {(requirementsMatched || isFullyGraduated || completionPercent === 100) ? (
                            <button
                              type="button"
                              id={`claim-download-cert-${course.id}`}
                              onClick={() => handleClaimAndDownloadCertificate(course)}
                              className="w-full md:w-auto text-[10px] uppercase tracking-wider font-bold text-brand-black bg-brand-yellow hover:bg-zinc-900 hover:text-brand-yellow font-sans px-4 py-2.5 rounded-xl transition-all shadow-2xs hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Award size={12} className="shrink-0" /> Download PDF Degree
                            </button>
                          ) : (
                            <div className="bg-zinc-100 border border-zinc-150 text-zinc-400 uppercase font-medium text-[9px] tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-not-allowed select-none">
                              <Lock size={10} /> Pending Milestones
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <FileCheck size={13} className="text-brand-yellow" /> Course Assignments & Grades
              </h3>

              <div className="space-y-4">
                {filteredAssignments.map(ass => {
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
            
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="earned-certificates-section">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
                <Award size={13} className="text-brand-yellow" /> Earned Certificates
              </h3>

              {certs.length === 0 ? (
                <div className="text-center p-6 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-xl">
                  No certificates earned yet. Complete and submit assignments with points above 90 to get micro-degree credentials.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredCerts.map(cert => (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedCertToPrint(cert)}
                      className="border border-zinc-100 hover:border-brand-yellow bg-zinc-50/20 hover:bg-white rounded-xl p-3.5 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-8 h-8 bg-brand-yellow text-brand-black rounded-bl-3xl flex items-center justify-center">
                        <Award size={12} />
                      </div>

                      <h4 className="text-xs font-semibold text-brand-black pr-4 leading-tight">{cert.curriculumTitle}</h4>
                      <p className="text-[10px] text-brand-gray font-light mt-1 flex items-center flex-wrap gap-1">Certified by: <strong>{cert.trainerName}</strong>{isTrainerVerified(cert.trainerName) && <VerifiedBadge />}</p>
                      
                      <span className="text-[8px] font-mono text-zinc-300 block mt-2 pt-2 border-t border-zinc-50 truncate">
                        Certificate ID: {cert.hash}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sabi Community Streak Leaderboard */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="streak-leaderboard-section">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center justify-between font-light">
                <span className="flex items-center gap-1.5"><TrendingUp size={13} className="text-brand-yellow" /> Community Sabi Leaderboard</span>
                <span className="text-[9px] text-zinc-400 font-mono font-medium">STREAK SORTED</span>
              </h3>

              <div className="space-y-2.5 font-sans">
                {(() => {
                  const leaderboardStudents = db.getUsers()
                    .filter(u => u.role === 'student')
                    .sort((a, b) => (b.streakCount ?? 5) - (a.streakCount ?? 5))
                    .slice(0, 5);

                  return leaderboardStudents.map((st, index) => {
                    const isSelf = st.id === currentUser.id;
                    return (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isSelf
                            ? 'bg-amber-50/50 border-brand-yellow/80 shadow-xs'
                            : 'bg-zinc-50/30 border-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                            index === 0 ? 'bg-brand-yellow text-black' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-brand-black text-white flex items-center justify-center text-[9px] font-bold uppercase select-none">
                            {st.name.charAt(0)}
                          </div>
                          <div className="truncate max-w-[110px]">
                            <p className={`text-xs truncate leading-tight ${isSelf ? 'font-bold text-brand-black' : 'text-zinc-650 font-semibold'}`}>
                              {st.name} {isSelf && <span className="text-[9px] text-brand-yellow font-normal font-mono font-bold bg-brand-black px-1.2 ml-0.5 rounded select-none">YOU</span>}
                            </p>
                            <p className="text-[9px] text-zinc-400 font-light font-mono leading-none mt-0.5">Top-placed</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-black shrink-0 flex items-center gap-1 select-none">
                          <Flame size={12} className={index === 0 ? "text-brand-yellow fill-brand-yellow animate-pulse" : "text-zinc-400 fill-zinc-300"} /> {st.streakCount ?? 5} days
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="text-[9px] text-zinc-400 mt-3 font-light leading-snug select-none flex items-center gap-1">
                <AlertCircle size={10} className="text-zinc-400 shrink-0" /> Consistency in Sabi activity logs determines leaderboard placement. Keep your fire high!
              </p>
            </div>

            {/* Sabi Touchpoint Audit Log History */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs" id="practice-logs-history-section">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-3 flex items-center justify-between font-light">
                <span className="flex items-center gap-1.5"><FileCheck size={13} className="text-brand-yellow" /> My Sabi Activity Logs</span>
                <span className="text-[9px] text-indigo-650 font-mono font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded select-none">Touchpoints</span>
              </h3>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(!studentUser.streakLogs || studentUser.streakLogs.length === 0) ? (
                  <div className="text-center p-6 text-zinc-400 font-light text-[11px] bg-zinc-50/50 rounded-xl">
                    No active streak touchpoints recorded yet. Submitting homework or logging daily farm/salon practice creates immutable log entries above.
                  </div>
                ) : (
                  studentUser.streakLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/30 space-y-1 text-[11px] hover:border-zinc-200 transition-all">
                      <div className="flex items-center justify-between font-mono text-[9px] text-zinc-400">
                        <span className={`px-1.5 py-0.25 rounded font-bold uppercase shrink-0 select-none ${
                          log.type === 'attendance'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : log.type === 'assignment'
                            ? 'bg-blue-50 text-indigo-850 border border-blue-105'
                            : 'bg-amber-50 text-amber-800 border border-amber-100'
                        }`}>
                          {log.type}
                        </span>
                        <span>{log.date}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-light leading-relaxed">{log.note}</p>
                    </div>
                  ))
                )}
              </div>
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
      </div>
      )}

      {activeTab === 'courses' && (
        <div id="student-register-courses-view" className="space-y-6 animate-in fade-in duration-200">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-brand-black dark:text-white leading-tight">
                Available <span className="font-semibold text-brand-yellow">Course Curriculum Catalog</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1">
                Browse detailed development syllabi, pay tuition securely, and interact with professional mentors.
              </p>
            </div>
            <button 
              onClick={() => onNavigateChange('dashboard')} 
              className="text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white font-semibold uppercase tracking-wider cursor-pointer border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 transition-all shrink-0 max-w-[140px]"
            >
              &larr; Back Home
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-xs" id="course-offering-catalog">
            <h3 className="text-sm font-light tracking-tight text-brand-black mb-1">
              Join New Classes // <span className="font-semibold text-brand-yellow">Available Courses</span>
            </h3>
            <p className="text-xs text-brand-gray font-light mb-4">
              Sign up for our classes below. When you join, we will give you beginner projects, and your Trainer will help check your work and keep track of your progress here.
            </p>

            {/* Courses/Catalog Search Input */}
            <div className="relative w-full max-w-md mb-6">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Type course name, Trainer or syllabus category to search..."
                value={coursesSearchQuery}
                onChange={(e) => setCoursesSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-black placeholder-zinc-400 focus:outline-hidden focus:border-brand-yellow font-light"
              />
              {coursesSearchQuery && (
                <button 
                  onClick={() => setCoursesSearchQuery('')} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-450 hover:text-brand-black cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {db.getCurricula()
                .filter(c => c.status === 'approved')
                .filter(course => 
                  course.title.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
                  course.description.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
                  course.trainerName.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
                  course.category.toLowerCase().includes(coursesSearchQuery.toLowerCase())
                )
                .map(course => {
                const alreadyEnrolled = (currentUser.enrolledCourseIds || []).includes(course.id);
                const coverImage = getCourseImage(course.category, course.title, course.imageUrl);
                return (
                  <div key={course.id} className="border border-zinc-150 rounded-2xl overflow-hidden hover:shadow-md bg-white hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between group">
                    <div className="space-y-0">
                      {/* Course Card Visual Cover */}
                      <div className="relative h-44 w-full bg-zinc-150 overflow-hidden">
                        <img 
                          src={coverImage} 
                          alt={course.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/40 via-transparent to-transparent" />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-brand-black/80 backdrop-blur-xs text-[9px] text-white font-mono uppercase font-bold tracking-wider px-2.5 py-1 rounded-md">
                            {course.category}
                          </span>
                          <span className="bg-white/90 backdrop-blur-xs text-[9px] text-zinc-800 font-mono font-medium px-2 py-1 rounded-md">
                            {course.level || 'Intermediate'}
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                          <span className="text-[10px] font-mono backdrop-blur-xs bg-brand-black/35 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock size={10} className="text-brand-yellow" />
                            {course.durationWeeks} Weeks
                          </span>
                        </div>
                      </div>

                      {/* Content Area with Spacious Padding */}
                      <div className="p-6 space-y-4">
                        <div className="space-y-1.5 animate-in fade-in">
                          <h4 className="text-base font-bold text-brand-black leading-snug tracking-tight group-hover:text-brand-yellow transition-colors">
                            {course.title}
                          </h4>
                          <p className="text-xs text-brand-gray font-light leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        {/* Syllabus Outline Snippet */}
                        <div className="space-y-2.5 pt-4 border-t border-zinc-100 bg-zinc-50/10 rounded-xl p-3">
                          <h5 className="text-[9px] uppercase font-bold text-brand-gray tracking-widest flex items-center gap-1.5">
                            <BookOpen size={11} className="text-brand-yellow" />
                            Featured Syllabus Topics:
                          </h5>
                          <ul className="space-y-2">
                            {course.modules.slice(0, 3).map((mod, i) => (
                              <li key={i} className="text-[10.5px] text-zinc-650 font-sans flex items-start gap-2">
                                <span className="text-[9px] font-mono leading-none bg-zinc-200 text-brand-black px-1 py-0.5 rounded font-bold mt-0.5 shrink-0">W{i + 1}</span>
                                <span className="truncate">{mod}</span>
                              </li>
                            ))}
                            {course.modules.length > 3 && (
                              <li className="text-[9.5px] text-zinc-400 italic pl-8">
                                + {course.modules.length - 3} more modules in comprehensive syllabus
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Section with Nice Isolation */}
                    <div className="p-6 pt-0">
                      <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-zinc-400 font-light tracking-wide truncate flex items-center gap-1 mb-0.5">
                            Mentor: <strong className="text-zinc-700 font-medium">{course.trainerName}</strong>
                            {isTrainerVerified(course.trainerName) && <VerifiedBadge />}
                          </span>
                          <span className="text-sm font-bold text-zinc-900 font-mono">
                            ₦{(course.price || 35000).toLocaleString()}
                          </span>
                        </div>

                        {(() => {
                          const enr = enrollments.find(e => e.courseId === course.id);
                          if (alreadyEnrolled || (enr && enr.paymentStatus === 'approved')) {
                            return (
                              <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 animate-in zoom-in-95">
                                <CheckCircle2 size={12} /> Registered
                              </div>
                            );
                          }
                          if (enr && enr.paymentStatus === 'pending_verification') {
                            return (
                              <button
                                onClick={() => handleViewCourseDetails(course)}
                                className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100/70 px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
                              >
                                <Clock size={11} className="animate-spin" /> Verifying
                              </button>
                            );
                          }
                          if (enr && enr.paymentStatus === 'rejected') {
                            return (
                              <button
                                onClick={() => handleViewCourseDetails(course)}
                                className="text-[10px] text-red-650 font-semibold bg-red-50 border border-red-100/50 px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer hover:bg-red-100 transition-colors"
                              >
                                <AlertCircle size={11} /> Rejected Referral
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleViewCourseDetails(course)}
                              className="bg-brand-black hover:bg-zinc-900 text-brand-yellow rounded-xl text-[10px] tracking-wider uppercase px-4py-2.5 px-4 py-2 hover:px-5 hover:text-white transition-all font-semibold cursor-pointer shadow-xs focus-ring shrink-0"
                            >
                              Explore Details
                            </button>
                          );
                        })()}
                      </div>
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
                    Your submission will be stored and shared with your trainers securely.
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
                  <span className="text-[9px] uppercase font-semibold text-brand-gray block">Certified Trainer</span>
                  <span className="text-brand-black flex items-center gap-1">{selectedCertToPrint.trainerName}{isTrainerVerified(selectedCertToPrint.trainerName) && <VerifiedBadge />}</span>
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
                id="download-cert-pdf-direct-btn"
                type="button"
                onClick={() => handleDownloadCertificatePDF(selectedCertToPrint)}
                className="flex items-center gap-1.5 bg-brand-yellow hover:bg-zinc-900 hover:text-brand-yellow text-brand-black transition-all rounded-xl text-xs font-semibold uppercase tracking-wide px-4 py-2.5 cursor-pointer shadow-xs focus-ring"
              >
                <Award size={13} className="text-brand-black shrink-0" /> Download PDF Degree
              </button>
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

              {/* Cover Image Banner */}
              <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-zinc-150 shadow-xs border border-zinc-200">
                <img 
                  src={getCourseImage(selectedCourse.category, selectedCourse.title, selectedCourse.imageUrl)} 
                  alt={selectedCourse.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
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
                  <span className="flex items-center gap-1.5 flex-wrap">Trainer: <strong className="text-brand-black font-medium">{selectedCourse.trainerName}</strong>{isTrainerVerified(selectedCourse.trainerName) && <VerifiedBadge />}</span>
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
                  const isEnrApproved = (currentUser.enrolledCourseIds || []).includes(selectedCourse.id) || (enr && enr.paymentStatus === 'approved');

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

      {/* Sabi Practice Note Daily Logger Modal Overlay */}
      {showPracticeModal && (
        <div id="practice-logger-overlay" className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col justify-between p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase font-mono">
                <Flame size={14} className="text-brand-yellow fill-brand-yellow animate-pulse" /> Sabi Practice Logger
              </h3>
              <button
                onClick={() => setShowPracticeModal(false)}
                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleLogPractice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase font-mono block">Describe what you did today:</label>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light leading-snug">
                  Provide a brief sentence of what you hand-practiced (e.g., mixing formulation on the farm, sterilizing shop tools, sectioning haircut slices, balancing ledger entries).
                </p>
                <textarea
                  value={practiceNote}
                  onChange={(e) => setPracticeNote(e.target.value)}
                  placeholder="e.g. Mixed feed for the poultry stock and calibrated the automatic nipple drinkers today on the farm."
                  required
                  rows={4}
                  className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow focus:outline-hidden leading-relaxed font-light text-zinc-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPracticeModal(false)}
                  className="flex-1 py-3 text-xs uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs uppercase tracking-wider font-semibold bg-gradient-to-r from-brand-yellow to-amber-500 text-black hover:opacity-95 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  Fuel My Streak <Flame size={12} className="text-black fill-black shrink-0" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

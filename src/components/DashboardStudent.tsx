/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, Assignment, Certificate, Curriculum, CourseEnrollment } from '../types';
import { db } from '../db';
import VerifiedBadge from './VerifiedBadge';
import { getCourseImage } from '../utils/course';
import { getQuoteOfTheDay } from '../utils/quotes';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, BookOpen, Clock, FileText, CheckCircle2, ChevronRight, Upload, Link, AlertCircle, 
  FileCheck, Printer, Settings, User as UserIcon, Mail, Phone, MapPin, Sliders, Bell, 
  Compass, Radio, Heart, HelpCircle, Activity, CreditCard, Lock, X, ExternalLink, ShieldCheck, Coins, Search, ArrowUpRight,
  TrendingUp, ChevronDown, ChevronUp, Sparkles, Flame, Snowflake, Briefcase, Trophy, Filter, List, Users
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [coursesLimit, setCoursesLimit] = useState(10);

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
  const [confirmingCourseId, setConfirmingCourseId] = useState<string | null>(null);
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

  // Live Updates Feed States
  const [studentUser, setStudentUser] = useState<User>(() => db.getUserById(currentUser.id) || currentUser);
  const [activeUpdateIdx, setActiveUpdateIdx] = useState(0);

  // Standalone Tasks page states
  const [tasksFilterOpen, setTasksFilterOpen] = useState(false);
  const [tasksSearchQuery, setTasksSearchQuery] = useState('');
  const [tasksTrainerFilter, setTasksTrainerFilter] = useState('All');
  const [tasksStatusFilter, setTasksStatusFilter] = useState('ongoing'); // 'all', 'ongoing', 'graded'
  const [tasksDateFilter, setTasksDateFilter] = useState('all'); // 'all', 'upcoming', 'overdue'
  const [tasksLimit, setTasksLimit] = useState(5); // For vertical list view more limit
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Assignment | null>(null);

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

  // Generate live updates using users' first names where appropriate along with Google News updates
  const liveUpdates = useMemo(() => {
    const students = db.getUsers().filter(u => u.role === 'student');
    const getFirst = (name: string) => name.split(' ')[0] || 'A student';
    
    // Fallback names if database has few students
    const defaultNames = ['Tobi', 'Amara', 'Musa', 'Ngozi', 'Sani', 'Yinka', 'Chioma', 'Kelechi', 'Femi', 'Aisha'];
    
    const studentUpdates: { type: 'join' | 'online' | 'submit'; text: string; category: string }[] = [];
    
    students.forEach((st, i) => {
      const name = getFirst(st.name);
      if (i % 3 === 0) {
        studentUpdates.push({
          type: 'join',
          text: `${name} just registered for the curriculum cohort.`,
          category: 'NEW MEMBER'
        });
      } else if (i % 3 === 1) {
        studentUpdates.push({
          type: 'online',
          text: `${name} is active and designing spatial layouts in the workspace.`,
          category: 'ACTIVE NOW'
        });
      } else {
        studentUpdates.push({
          type: 'submit',
          text: `${name} successfully uploaded a practice assignment.`,
          category: 'SUBMISSION'
        });
      }
    });
    
    // Populate with fallback names if needed
    if (studentUpdates.length < 6) {
      defaultNames.forEach((name, i) => {
        if (i % 3 === 0) {
          studentUpdates.push({
            type: 'join',
            text: `${name} just registered for the curriculum cohort.`,
            category: 'NEW MEMBER'
          });
        } else if (i % 3 === 1) {
          studentUpdates.push({
            type: 'online',
            text: `${name} is active and designing spatial layouts in the workspace.`,
            category: 'ACTIVE NOW'
          });
        } else {
          studentUpdates.push({
            type: 'submit',
            text: `${name} successfully uploaded a practice assignment.`,
            category: 'SUBMISSION'
          });
        }
      });
    }

    // Google News Updates
    const newsUpdates = [
      {
        type: 'news' as const,
        text: 'Google Maps and Location technology see massive adoption across new West African delivery startups.',
        category: 'GOOGLE NEWS // TRENDS'
      },
      {
        type: 'news' as const,
        text: 'Specialized enterprise micro-certificates outperform traditional degrees in global tech hires for 2026.',
        category: 'GOOGLE NEWS // CAREERS'
      },
      {
        type: 'news' as const,
        text: 'Vocational business programs in design, bookkeeping, and solar alignment report record-high enrollment.',
        category: 'GOOGLE NEWS // BUSINESS'
      },
      {
        type: 'news' as const,
        text: 'Ais-dev environment and full-stack proxies securely isolate critical third-party API keys on the server.',
        category: 'GOOGLE NEWS // SECURITIES'
      },
      {
        type: 'news' as const,
        text: 'Agribusiness entrepreneurs transition to soil-to-market direct automation to maximize client margins.',
        category: 'GOOGLE NEWS // AGRI-TECH'
      },
      {
        type: 'news' as const,
        text: 'New vocational regulations prioritize portfolio proofs over standard resumes in construction hiring.',
        category: 'GOOGLE NEWS // INDUSTRY'
      },
      {
        type: 'news' as const,
        text: 'Professional beauty operations report a 40% growth in high-value online customer bookings.',
        category: 'GOOGLE NEWS // COMMERCE'
      }
    ];

    // Interleave the news items to ensure they make up the majority/mostly news items
    const combined: { type: 'join' | 'online' | 'submit' | 'news'; text: string; category: string }[] = [];
    let newsIdx = 0;
    let userIdx = 0;
    
    while (newsIdx < newsUpdates.length || userIdx < studentUpdates.length) {
      if (newsIdx < newsUpdates.length) combined.push(newsUpdates[newsIdx++]);
      if (newsIdx < newsUpdates.length) combined.push(newsUpdates[newsIdx++]);
      if (userIdx < studentUpdates.length) combined.push(studentUpdates[userIdx++]);
    }
    
    return combined;
  }, []);

  // Automatic Cycler for live updates feed (10 seconds)
  useEffect(() => {
    if (liveUpdates.length === 0) return;
    const timer = setInterval(() => {
      setActiveUpdateIdx((prev) => (prev + 1) % liveUpdates.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [liveUpdates.length]);

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
    // Check if max 5 students limit reached
    const approvedCount = db.getEnrollments().filter(e => e.courseId === course.id && e.paymentStatus === 'approved').length;
    if (approvedCount >= 5) {
      showToast('Error: This cohort is full (maximum 5 students).');
      return;
    }

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

    // Check if max 5 students limit reached
    const approvedCount = db.getEnrollments().filter(e => e.courseId === courseId && e.paymentStatus === 'approved').length;
    if (approvedCount >= 5) {
      showToast('Error: This cohort is full (maximum 5 students). Cannot verify payment.');
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

  const enrolledTrainers = useMemo(() => {
    const trainers = enrolledCoursesForProg.map(c => c.trainerName);
    return Array.from(new Set(trainers.filter(Boolean)));
  }, [enrolledCoursesForProg]);

  const sortedEnrolledCourses = useMemo(() => {
    return [...enrolledCoursesForProg]
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 10);
  }, [enrolledCoursesForProg]);

  const tasksPageAssignments = useMemo(() => {
    let result = [...assignments];

    // Filter by Trainer from past & present (using trainerName)
    if (tasksTrainerFilter !== 'All') {
      result = result.filter(ass => {
        const course = db.getCurricula().find(c => c.id === ass.courseId);
        return course?.trainerName === tasksTrainerFilter;
      });
    }

    // Filter by Status / Phase
    if (tasksStatusFilter === 'ongoing') {
      result = result.filter(ass => ass.status === 'not_submitted' || ass.status === 'pending_review');
    } else if (tasksStatusFilter === 'graded') {
      result = result.filter(ass => ass.status === 'graded');
    }

    // Filter by Deadline Date Range
    if (tasksDateFilter === 'upcoming') {
      const nowStr = new Date().toISOString().split('T')[0];
      result = result.filter(ass => ass.dueDate >= nowStr);
    } else if (tasksDateFilter === 'overdue') {
      const nowStr = new Date().toISOString().split('T')[0];
      result = result.filter(ass => ass.dueDate < nowStr && ass.status === 'not_submitted');
    }

    // Filter by course search bar / query
    if (tasksSearchQuery.trim()) {
      const q = tasksSearchQuery.toLowerCase();
      result = result.filter(ass => {
        const course = db.getCurricula().find(c => c.id === ass.courseId);
        return ass.title.toLowerCase().includes(q) || 
               ass.description.toLowerCase().includes(q) ||
               (course?.title || '').toLowerCase().includes(q);
      });
    }

    // Sort: "keep the latest or ongoing/new tasks on default load every time they load the page"
    result.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

    return result;
  }, [assignments, tasksTrainerFilter, tasksStatusFilter, tasksDateFilter, tasksSearchQuery]);

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
          <div id="student-hero-banner" className="bg-white text-zinc-950 rounded-[28px] p-6 xs:p-8 md:p-10 mb-8 relative overflow-hidden border border-zinc-200/50 shadow-[0_15px_45px_rgba(0,0,0,0.015)] flex flex-col gap-6">
            {/* Soft, low-opacity gradient glows for subtle accenting */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#FFCC00]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-50/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* greeting and motivational stats */}
            <div className="relative z-10 flex flex-col space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                <span className="text-[9px] xs:text-[11px] sm:text-xs font-mono tracking-widest uppercase bg-[#FFCC00]/10 text-[#FFCC00] px-3 py-1 rounded-full border border-[#FFCC00]/25 flex items-center gap-1 shrink-0 font-extrabold shadow-2xs">
                  <Sparkles size={10} className="text-[#FFCC00] animate-pulse" /> WELCOME BACK
                </span>
                <span className="text-[9px] xs:text-[11px] sm:text-xs font-mono tracking-widest uppercase bg-zinc-100/80 text-zinc-700 px-3 py-1 rounded-full border border-zinc-200/40 flex items-center gap-1 shrink-0 font-bold select-none">
                  🏆 Rank #3
                </span>
              </div>
              
              <h2 className="text-[28px] xs:text-[36px] sm:text-[44px] md:text-5xl font-extrabold tracking-tight pr-1 leading-tight break-words text-zinc-950">
                <span className="inline">Hello,</span>{' '}
                <span className="inline font-extrabold text-[#FFCC00]">
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Developer'}
                </span>
              </h2>
              
              <p className="text-[11px]/[15px] xs:text-[13px]/[18px] sm:text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-3xl">
                {getQuoteOfTheDay()}
              </p>
            </div>
          </div>

        {/* Analytics Bento Grid Row - Structured in Two Elegant Columns */}
        <div id="student-bento-row" className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
            
            {/* Card 1: Assignment Progress */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group premium-card p-5 sm:p-7 md:p-9 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-400 font-bold">Task Progress</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <FileText className="text-[#FFCC00] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-450 group-hover:text-zinc-950 dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl xs:text-2xl sm:text-3.5xl md:text-4.5xl lg:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-baseline gap-2 leading-tight">
                  <span>{gradeRate}%</span>
                  <span className="text-[10px] xs:text-xs sm:text-sm text-zinc-450 dark:text-zinc-550 font-mono font-bold">({finishedCount}/{totalCount})</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 sm:h-2 mt-4 sm:mt-5 overflow-hidden">
                  <div className="bg-[#FFCC00] h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${gradeRate}%` }}></div>
                </div>
              </div>
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-400 dark:text-zinc-400 font-medium mt-3 sm:mt-4">Active course completion ratings.</p>
            </div>
 
            {/* Card 2: Earned Certificates */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group premium-card p-5 sm:p-7 md:p-9 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-400 font-bold">Certificates</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Award className="text-[#FFCC00] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-450 group-hover:text-zinc-950 dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl xs:text-2xl sm:text-3.5xl md:text-4.5xl lg:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-baseline gap-2 leading-tight">
                <span>{certs.length}</span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-[#FFCC00] font-mono font-bold uppercase tracking-wider">Credentials</span>
              </div>
              <div className="w-full h-[1px] bg-zinc-100 dark:bg-zinc-800 mt-4 sm:mt-5" />
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-400 dark:text-zinc-400 font-medium mt-3 sm:mt-4">Jointly verified with Sabicrest Syndicate.</p>
            </div>
 
            {/* Card 3: Current Topic */}
            <div 
              onClick={() => onNavigateChange('courses')}
              className="group premium-card p-5 sm:p-7 md:p-9 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3 sm:mb-4">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-400 font-bold">Active Topic</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <BookOpen className="text-[#FFCC00] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                  <ArrowUpRight className="text-zinc-450 group-hover:text-zinc-950 dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-sm xs:text-base sm:text-xl md:text-2xl lg:text-[26px] font-extrabold tracking-tight text-zinc-950 dark:text-white truncate leading-tight">
                {activeTopicTitle}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                <div className="w-2 h-2 rounded-full bg-[#FFCC00] animate-pulse" />
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-zinc-800 dark:text-[#FFCC00] font-extrabold font-mono uppercase tracking-wider">{activeTopicStatus}</span>
              </div>
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-400 dark:text-zinc-400 font-medium mt-2 sm:mt-3">{activeTopicDesc}</p>
            </div>
 
            {/* Card 4: Grade History */}
            <div 
              onClick={() => onNavigateChange('tasks')}
              className="group premium-card p-5 sm:p-7 md:p-9 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm uppercase font-mono tracking-widest text-zinc-400 font-bold">Grade Log</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono text-[#FFCC00] font-bold truncate max-w-[60px] xs:max-w-none">Live Trend</span>
                  <ArrowUpRight className="text-zinc-455 group-hover:text-zinc-950 dark:group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-150 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-5 py-1.5">
                <div id="sparkline-container" className="h-10 sm:h-12 flex-1 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-xl border border-zinc-100/50 dark:border-zinc-800 flex items-center justify-center">
                  {gradedAssignments.length >= 2 ? (
                    <svg className="w-full h-full p-1.5" viewBox="0 0 100 60">
                      <polyline
                        fill="none"
                        stroke="#FFCC00"
                        strokeWidth="2"
                        points={linePoints.join(' ')}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="text-[9px] sm:text-xs text-zinc-405 italic">No grade data</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-zinc-200">A+</span>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs font-mono text-zinc-450 font-bold">Class Avg</p>
                </div>
              </div>
              
              <p className="text-[9.5px]/[14px] xs:text-[11px]/[16px] sm:text-xs md:text-sm text-zinc-405 dark:text-zinc-400 font-medium mt-3 sm:mt-4">Real-time performance scores ledger.</p>
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
                    <div key={course.id} className="premium-card p-4 flex items-center justify-between gap-4">
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
          <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-brand-black dark:text-white leading-tight">
                Tasks & <span className="font-semibold text-brand-yellow">Assignments</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1">
                See and follow up on tasks and assignments given to you by your past and current trainers.
              </p>
            </div>
            
            <div className="relative shrink-0 w-full md:w-auto flex flex-col md:items-end gap-2">
              <button 
                onClick={() => setTasksFilterOpen(!tasksFilterOpen)} 
                className="text-xs text-zinc-650 hover:text-black dark:text-zinc-300 dark:hover:text-white font-medium uppercase tracking-wider cursor-pointer border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 transition-all flex items-center justify-center gap-2 shadow-2xs hover:border-brand-yellow active:scale-95"
              >
                <Filter size={14} className="text-brand-yellow" />
                <span>Filter Tasks & Search</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${tasksFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* FILTER PANEL - Dropdown (Closed by default) */}
              <AnimatePresence>
                {tasksFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-12 z-40 w-full md:w-80 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-4 rounded-2xl shadow-xl space-y-4 text-left"
                  >
                    {/* Course Search Bar */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 block">Search Courses / Tasks</label>
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
                        <input 
                          type="text" 
                          placeholder="Search title, descriptors, mentors..." 
                          value={tasksSearchQuery}
                          onChange={(e) => setTasksSearchQuery(e.target.value)}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl py-2 pl-8 pr-3 focus:outline-hidden focus:border-brand-yellow text-brand-black dark:text-white font-light"
                        />
                      </div>
                    </div>

                    {/* Past & Present Trainer Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 block">Trainer (Past & Present)</label>
                      <select 
                        value={tasksTrainerFilter}
                        onChange={(e) => setTasksTrainerFilter(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-yellow text-brand-black dark:text-white font-light cursor-pointer"
                      >
                        <option value="All">All Mentors</option>
                        {enrolledTrainers.map(tr => (
                          <option key={tr} value={tr}>{tr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Deadline date filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 block">Deadline Date Range</label>
                      <select 
                        value={tasksDateFilter}
                        onChange={(e) => setTasksDateFilter(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-yellow text-brand-black dark:text-white font-light cursor-pointer"
                      >
                        <option value="all">All Dates / Deadlines</option>
                        <option value="upcoming">Upcoming Deadlines</option>
                        <option value="overdue">Overdue Tasks</option>
                      </select>
                    </div>

                    {/* Task Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 block">Task Status / Phase</label>
                      <select 
                        value={tasksStatusFilter}
                        onChange={(e) => setTasksStatusFilter(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-yellow text-brand-black dark:text-white font-light cursor-pointer"
                      >
                        <option value="ongoing">Ongoing & New Tasks (Default)</option>
                        <option value="graded">Graded / Evaluated</option>
                        <option value="all">All Task Records</option>
                      </select>
                    </div>

                    {/* Micro Reset info */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[9px] text-zinc-450 font-mono">
                      <span>Filters active</span>
                      <button 
                        onClick={() => {
                          setTasksSearchQuery('');
                          setTasksTrainerFilter('All');
                          setTasksDateFilter('all');
                          setTasksStatusFilter('ongoing');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 font-bold uppercase hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

              {sortedEnrolledCourses.length === 0 ? (
                <div className="text-center p-6 text-zinc-500 bg-zinc-50 rounded-xl text-xs font-light">
                  You are not currently enrolled in any active curricula. Head over to the <strong className="text-brand-black cursor-pointer underline font-medium font-semibold" onClick={() => setActiveSubTab('register')}>Register Courses</strong> tab to join classes.
                </div>
              ) : (
                <div className="space-y-5">
                  {sortedEnrolledCourses.map(course => {
                    const courseTasks = assignments.filter(a => a.courseId === course.id);
                    const gradedTasks = courseTasks.filter(a => a.status === 'graded');
                    const hasAssignments = courseTasks.length > 0;
                    
                    const isFullyGraduated = certs.some(c => c.curriculumTitle === course.title);
                    const requirementsMatched = hasAssignments && (gradedTasks.length === courseTasks.length);
                    const completionPercent = hasAssignments ? Math.round((gradedTasks.length / courseTasks.length) * 100) : (isFullyGraduated ? 100 : 0);

                    return (
                      <div key={course.id} className="border border-zinc-105 rounded-xl p-4 md:p-5 bg-zinc-50/20 hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        
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
                              <h4 className="text-xs font-bold text-brand-black truncate max-w-[280px] md:max-w-[360px] leading-tight font-semibold">
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
                                    <span className="font-semibold text-brand-black">{gradedTasks.length} of {courseTasks.length}</span> assignments evaluated
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

            {/* Vertical Tasks Lists Format */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between gap-1.5 mb-4 border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase flex items-center gap-1.5 font-bold">
                  <List size={13} className="text-brand-yellow" /> Tasks & Assignments Ledger
                </h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded">
                  Showing {Math.min(tasksPageAssignments.length, tasksLimit)} of {tasksPageAssignments.length}
                </span>
              </div>

              <div className="space-y-4">
                {tasksPageAssignments.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 font-light text-xs bg-zinc-50/50 rounded-xl leading-relaxed">
                    No active tasks match your filters. Click filter settings to view graded or overdue assignments.
                  </div>
                ) : (
                  tasksPageAssignments.slice(0, tasksLimit).map(ass => {
                    const isNotSubmit = ass.status === 'not_submitted';
                    const isPending = ass.status === 'pending_review';
                    const isGraded = ass.status === 'graded';
                    const hasDraft = ass.submissionContent || ass.linkUrl;

                    const isDueSoon = (() => {
                      if (ass.status !== 'not_submitted') return false;
                      const dueTime = new Date(`${ass.dueDate}T23:59:59`).getTime();
                      const nowTime = new Date().getTime();
                      const diffHours = (dueTime - nowTime) / (1000 * 60 * 60);
                      return diffHours > 0 && diffHours <= 24;
                    })();

                    return (
                      <div 
                        key={ass.id} 
                        onClick={() => setSelectedTaskDetail(ass)}
                        className={`group border rounded-xl p-4 transition-all cursor-pointer bg-zinc-50/10 hover:bg-zinc-50/30 shadow-2xs hover:shadow-xs ${
                          isDueSoon ? 'border-rose-300 hover:border-rose-500' : 'border-zinc-50 hover:border-brand-yellow'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-brand inline-block ${
                                isGraded ? 'bg-emerald-50 text-emerald-800' :
                                isPending ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-650'
                              }`}>
                                {ass.status.replace('_', ' ')}
                              </span>
                              {isDueSoon && (
                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-extrabold tracking-wide inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                                  ⚠️ Due in &lt;24 hrs
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold tracking-tight text-brand-black group-hover:text-brand-yellow transition-colors mt-1">
                              {ass.title}
                            </h4>
                          </div>

                          {/* Grade highlight status */}
                          {isGraded && (
                            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-3 py-1 rounded-xl shrink-0">
                              <span className="text-lg font-extrabold text-brand-black">{ass.grade}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">({ass.points}/{ass.maxPoints} pts)</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-brand-gray font-light leading-relaxed mb-4 line-clamp-2">
                          {ass.description}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-50/80">
                          <div className="flex items-center gap-1 text-[10px] font-light">
                            <Clock size={11} className={isDueSoon ? "text-rose-500 animate-pulse" : "text-brand-yellow"} />
                            <span className={isDueSoon ? "text-rose-600 font-semibold animate-pulse" : "text-zinc-400"}>
                              Due Date: {ass.dueDate} {isDueSoon && "(Urgent)"}
                            </span>
                          </div>

                          <span className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-0.5 ${
                            isDueSoon ? 'text-rose-600 group-hover:text-rose-700 font-bold' : 'text-brand-black group-hover:text-amber-600'
                          } transition-colors`}>
                            {isGraded ? 'Review Feedback' : hasDraft ? 'Click to Continue' : 'Click to Start'} &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Vertical tasks stream View More text link */}
                {tasksPageAssignments.length > tasksLimit && (
                  <div className="text-center pt-3 border-t border-zinc-100">
                    <button 
                      onClick={() => setTasksLimit(prev => prev + 10)}
                      className="text-xs font-semibold uppercase tracking-wider text-zinc-650 hover:text-brand-yellow font-sans hover:underline cursor-pointer"
                    >
                      View More
                    </button>
                  </div>
                )}
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

      {activeTab === 'courses' && (() => {
        const filteredAndSortedCourses = db.getCurricula()
          .filter(c => c.status === 'approved')
          .filter(c => selectedCategoryFilter === 'All' || c.category === selectedCategoryFilter)
          .filter(course => 
            course.title.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
            course.description.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
            course.trainerName.toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
            course.category.toLowerCase().includes(coursesSearchQuery.toLowerCase())
          )
          .sort((a, b) => a.title.localeCompare(b.title));

        return (
          <div id="student-register-courses-view" className="space-y-6 animate-in fade-in duration-200">
            
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-brand-black dark:text-white leading-tight font-sans">
                  Courses
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
                  Pick a course, register, track your progress alongside your Trainer/Mentor, do assignments, get graded, and get certified.
                </p>
              </div>

              {/* Course filter and search elements side by side */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 relative z-30">
                {/* Search Bar */}
                <div id="courses-custom-search-container" className="relative flex-1 sm:w-64">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={coursesSearchQuery}
                    onChange={(e) => setCoursesSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-brand-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 focus:outline-hidden focus:border-brand-yellow font-light shadow-2xs"
                  />
                  {coursesSearchQuery && (
                    <button 
                      onClick={() => setCoursesSearchQuery('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-brand-black dark:hover:text-white cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Filter Icon and Dropdown */}
                <div className="relative" id="categories-filter-dropdown-trigger">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer border border-zinc-250 dark:border-zinc-800 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-950 text-zinc-650 dark:text-brand-yellow hover:text-brand-black dark:hover:text-white hover:border-zinc-350 dark:hover:border-zinc-700 transition-all shadow-2xs"
                  >
                    <Sliders size={13} className="text-zinc-500 dark:text-brand-yellow shrink-0" />
                    <span>Category: <strong className="text-brand-black dark:text-white font-bold">{selectedCategoryFilter === 'All' ? 'All' : selectedCategoryFilter.replace(' Course', '')}</strong></span>
                    <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isFilterDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsFilterDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => {
                            setSelectedCategoryFilter('All');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${selectedCategoryFilter === 'All' ? 'bg-amber-50/50 dark:bg-amber-500/10 text-brand-yellow font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                        >
                          All Categories
                          {selectedCategoryFilter === 'All' && <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategoryFilter('Digital Course');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${selectedCategoryFilter === 'Digital Course' ? 'bg-amber-50/50 dark:bg-amber-500/10 text-brand-yellow font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                        >
                          Digital Courses
                          {selectedCategoryFilter === 'Digital Course' && <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategoryFilter('Physical Course');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${selectedCategoryFilter === 'Physical Course' ? 'bg-amber-50/50 dark:bg-amber-500/10 text-brand-yellow font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                        >
                          Physical Courses
                          {selectedCategoryFilter === 'Physical Course' && <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl p-4 sm:p-6 shadow-xs" id="course-offering-catalog">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-550 font-bold flex items-center gap-1.5 select-none">
                  <BookOpen size={13} className="text-brand-yellow" /> Catalogue Directory ({filteredAndSortedCourses.length} Approved Courses)
                </h3>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono capitalize">Sorted alphabetically A-Z</span>
              </div>

              {filteredAndSortedCourses.length === 0 ? (
                <div className="text-center py-12 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <BookOpen size={24} className="text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">No courses matched your active filters or search criteria.</p>
                  <button
                    onClick={() => {
                      setCoursesSearchQuery('');
                      setSelectedCategoryFilter('All');
                    }}
                    className="text-[10px] text-brand-yellow hover:underline cursor-pointer font-bold font-mono uppercase"
                  >
                    Reset all query filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedCourses.slice(0, coursesLimit).map(course => {
                    const alreadyEnrolled = (currentUser.enrolledCourseIds || []).includes(course.id);
                    const coverImage = getCourseImage(course.category, course.title, course.imageUrl);

                    return (
                      <div 
                        key={course.id} 
                        onClick={() => handleViewCourseDetails(course)}
                        id={`course-row-${course.id}`}
                        className="group border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      >
                        {/* Left: cover visual + title & description details */}
                        <div className="flex items-start sm:items-center gap-4 flex-1">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-zinc-150 dark:border-zinc-800 bg-zinc-100">
                            <img 
                              src={coverImage} 
                              alt={course.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 font-bold">
                                {course.category}
                              </span>
                              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-50/30 dark:bg-amber-500/10 text-brand-yellow font-bold">
                                {course.level || 'Intermediate'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                <Clock size={9} />
                                {course.durationWeeks} Weeks
                              </span>
                            </div>

                            <h4 className="text-[13px] sm:text-sm font-semibold text-brand-black dark:text-white leading-tight group-hover:text-brand-yellow transition-colors font-sans">
                              {course.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light leading-relaxed line-clamp-2 max-w-3xl">
                              {course.description}
                            </p>

                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-550">
                              <span>Mentor: <strong className="text-zinc-750 dark:text-zinc-300">{course.trainerName}</strong></span>
                              {isTrainerVerified(course.trainerName) && <VerifiedBadge />}
                            </div>
                          </div>
                        </div>

                        {/* Right: pricing & action handles */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800/60 shrink-0 min-w-[140px]">
                          <span className="text-sm font-bold text-brand-black dark:text-white font-mono">
                            ₦{(course.price || 35000).toLocaleString()}
                          </span>

                          {(() => {
                            const enr = enrollments.find(e => e.courseId === course.id);
                            if (alreadyEnrolled || (enr && enr.paymentStatus === 'approved')) {
                              return (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <CheckCircle2 size={11} /> Registered
                                </div>
                              );
                            }
                            if (enr && enr.paymentStatus === 'pending_verification') {
                              return (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 border border-amber-100/70 dark:border-amber-900/40 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <Clock size={11} className="animate-spin" /> Verifying
                                </div>
                              );
                            }
                            if (enr && enr.paymentStatus === 'rejected') {
                              return (
                                <div className="text-[10px] text-red-650 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/40 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <AlertCircle size={11} /> Rejected
                                </div>
                              );
                            }
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewCourseDetails(course);
                                }}
                                className="bg-brand-black dark:bg-brand-yellow text-brand-yellow dark:text-black hover:bg-zinc-900 dark:hover:bg-amber-400 rounded-lg text-[9.5px] tracking-wider uppercase px-3 py-1.5 font-bold cursor-pointer transition-all shrink-0 font-mono shadow-2xs"
                              >
                                Explore details
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}

                  {/* View More Link */}
                  {filteredAndSortedCourses.length > coursesLimit && (
                    <div className="pt-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoursesLimit(prev => prev + 10);
                        }}
                        id="view-more-courses-btn"
                        className="text-xs text-brand-yellow hover:text-amber-500 font-bold uppercase tracking-wider font-mono cursor-pointer bg-zinc-100 dark:bg-zinc-900 px-6 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all inline-block"
                      >
                        View More Courses &darr;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* Selected Task Details Modal Popup */}
      {selectedTaskDetail && (
        <div id="task-detail-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 w-full max-w-xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-150 flex flex-col justify-between overflow-y-auto max-h-[90vh]">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-brand-yellow font-bold">
                    Assignment Brief
                  </span>
                  <h3 className="text-lg font-bold text-brand-black dark:text-white leading-snug">
                    {selectedTaskDetail.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTaskDetail(null)}
                  className="text-zinc-400 hover:text-brand-black dark:hover:text-white font-semibold text-2xl cursor-pointer p-1"
                >
                  &times;
                </button>
              </div>

              {/* Course Meta */}
              {(() => {
                const course = db.getCurricula().find(c => c.id === selectedTaskDetail.courseId);
                const isDueSoon = (() => {
                  if (selectedTaskDetail.status !== 'not_submitted') return false;
                  const dueTime = new Date(`${selectedTaskDetail.dueDate}T23:59:59`).getTime();
                  const nowTime = new Date().getTime();
                  const diffHours = (dueTime - nowTime) / (1000 * 60 * 60);
                  return diffHours > 0 && diffHours <= 24;
                })();

                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs bg-zinc-50 dark:bg-zinc-955 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                      <BookOpen size={14} className="text-brand-yellow shrink-0" />
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-semibold text-brand-black dark:text-zinc-200 leading-tight">
                          {course?.title || 'Standalone Curricula'}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Mentor: {course?.trainerName || selectedTaskDetail.trainerId} • Due: {selectedTaskDetail.dueDate}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        selectedTaskDetail.status === 'graded' ? 'bg-emerald-50 text-emerald-805 dark:bg-emerald-950/50 dark:text-emerald-400' :
                        selectedTaskDetail.status === 'pending_review' ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-400' :
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {selectedTaskDetail.status.replace('_', ' ')}
                      </span>
                    </div>

                    {isDueSoon && (
                      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-905 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 animate-pulse">
                        <Clock size={15} className="shrink-0" />
                        <span className="font-medium">
                          <strong>Urgent:</strong> This task is due within the next 24 hours. Start or continue your submission to meet the deadline!
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Project Details & Objectives</h4>
                <div className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-light whitespace-pre-line bg-zinc-50/45 dark:bg-zinc-950/10 p-4 rounded-xl border border-zinc-100/50 dark:border-zinc-800">
                  {selectedTaskDetail.description}
                </div>
              </div>

              {/* Feedback Section (if evaluated) */}
              {selectedTaskDetail.feedback && (
                <div className="bg-amber-50/10 border-l-2 border-brand-yellow p-4 rounded-xl space-y-1">
                  <h5 className="text-[10px] uppercase font-mono tracking-widest text-brand-yellow font-bold">Tutor Review & Comments</h5>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-light italic leading-relaxed">
                    "{selectedTaskDetail.feedback}"
                  </p>
                </div>
              )}

              {/* Submission Information if submitted */}
              {(selectedTaskDetail.submissionContent || selectedTaskDetail.linkUrl) && (
                <div className="bg-zinc-50/60 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 text-xs space-y-1.5">
                  <h5 className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">Your Saved Content</h5>
                  {selectedTaskDetail.linkUrl && (
                    <p className="truncate text-indigo-650 dark:text-indigo-450">
                      <strong>Link URL:</strong> <a href={selectedTaskDetail.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{selectedTaskDetail.linkUrl}</a>
                    </p>
                  )}
                  {selectedTaskDetail.submissionContent && (
                    <p className="text-zinc-650 dark:text-zinc-400 line-clamp-3 italic">
                      "{(selectedTaskDetail.submissionContent || '').substring(0, 150)}..."
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-4 border-t border-zinc-105 dark:border-zinc-800/80 flex flex-wrap items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer tracking-wide"
              >
                Close
              </button>

              {selectedTaskDetail.status !== 'graded' && (
                <button
                  type="button"
                  id="modal-continue-submission-btn"
                  onClick={() => {
                    handleOpenSubmission(selectedTaskDetail);
                    setSelectedTaskDetail(null);
                  }}
                  className="px-5 py-2 bg-brand-yellow hover:bg-[#E5A910] text-brand-black font-semibold rounded-xl text-xs uppercase tracking-wider transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {(selectedTaskDetail.submissionContent || selectedTaskDetail.linkUrl) ? 'Continue Task' : 'Start Task'}
                  <ChevronRight size={13} />
                </button>
              )}
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
              {(() => {
                const startD = new Date('2026-06-15');
                const endD = new Date(startD);
                endD.setDate(startD.getDate() + (selectedCourse.durationWeeks * 7));
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-zinc-150 rounded-2xl p-4 bg-zinc-50/20 text-xs font-light text-zinc-650">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Duration weeks</span>
                      <strong className="text-zinc-800 text-sm">{selectedCourse.durationWeeks} Weeks</strong>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Skill level</span>
                      <strong className="text-zinc-800 text-sm">{selectedCourse.level}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">Start Date</span>
                      <strong className="text-zinc-800 text-sm">{startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">End Date</span>
                      <strong className="text-zinc-800 text-sm">{endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </div>
                    <div className="col-span-2 md:col-span-4 border-t border-zinc-100 pt-2 flex flex-col md:flex-row md:items-center justify-between text-zinc-550 gap-2">
                      <span className="flex items-center gap-1.5 flex-wrap">Trainer taking-it: <strong className="text-brand-black font-semibold font-sans">{selectedCourse.trainerName}</strong>{isTrainerVerified(selectedCourse.trainerName) && <VerifiedBadge />}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-mono">{selectedCourse.category}</span>
                        <strong className="text-brand-black text-[13px] font-mono font-bold">₦{(selectedCourse.price || 35000).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Course Description */}
              <div className="space-y-1.5 animate-in fade-in">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Curriculum Synopsis</h4>
                <p className="text-xs text-zinc-650 dark:text-zinc-450 font-light leading-relaxed">
                  {selectedCourse.description}
                </p>
              </div>

              {/* Targeted Learning Outcomes */}
              {(() => {
                const getCourseOutcomes = (title: string) => {
                  if (title.toLowerCase().includes('figma')) {
                    return [
                      "Architect dynamic auto-layouts, spatial components, and centralized token variables",
                      "Draft high-fidelity interactive UI screens and responsive layouts to guide frontend devs",
                      "Ship scalable spatial grids and reusable component libraries ready for production handoff"
                    ];
                  } else if (title.toLowerCase().includes('product')) {
                    return [
                      "Master PRD (Product Requirement Document) drafting, metric measurement, and roadmap mapping",
                      "Design responsive user journey flows and validate converted wireframe funnels",
                      "Harness conversion metrics audits, Agile sprint controls, and team collaboration cycles"
                    ];
                  } else if (title.toLowerCase().includes('full-stack') || title.toLowerCase().includes('web') || title.toLowerCase().includes('development')) {
                    return [
                      "Ship self-contained Express REST & WebSocket backend services with native TypeScript safety",
                      "Harmonize fluid frontend web portals using React, custom hooks, and utility Tailwind classes",
                      "Package server containers using Docker and deploy instantly to Google Cloud Run clusters"
                    ];
                  } else if (title.toLowerCase().includes('iot') || title.toLowerCase().includes('hardware') || title.toLowerCase().includes('computing')) {
                    return [
                      "Assemble electrical circuit board designs coordinating Wi-Fi, sensors, and microcontrollers",
                      "Program embedded logic processors using low-resource optimized C++ compilers",
                      "Route telemetry data streams safely to database arrays with encrypted OTA integrations"
                    ];
                  } else {
                    return [
                      "Model structural and physical designs in Fusion 360 aligning ergonomic factors",
                      "Format machine parameters or plastic composites for SLA and FDM 3D printers",
                      "Evaluate prototype durability, assemble hardware cases, and polish surface tolerances"
                    ];
                  }
                };

                return (
                  <div className="space-y-2 border border-zinc-150 rounded-2xl p-4 bg-amber-50/5">
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-brand-yellow font-bold">Targeted Learning Outcomes (Certified)</h4>
                    <ul className="space-y-1.5">
                      {getCourseOutcomes(selectedCourse.title).map((outcome, oIdx) => (
                        <li key={oIdx} className="text-[11px] text-zinc-650 dark:text-zinc-350 font-light flex items-start gap-2">
                          <span className="text-[#3bb75e] text-xs font-bold leading-none mt-0.5">✓</span>
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

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
                  const approvedCount = db.getEnrollments().filter(e => e.courseId === selectedCourse.id && e.paymentStatus === 'approved').length;
                  const isCohortFull = approvedCount >= 5;

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

                  if (isCohortFull) {
                    return (
                      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 text-center space-y-3">
                        <div className="mx-auto w-10 h-10 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-1">
                          <Users size={18} />
                        </div>
                        <h5 className="text-xs font-bold text-rose-950 dark:text-rose-200 uppercase tracking-wide">Cohort Capacity Full (5/5 Students)</h5>
                        <p className="text-[11px] text-rose-900 dark:text-rose-300 font-light leading-relaxed">
                          Sabicrest limits each cohort to a maximum of 5 students to preserve hyper-personalized expert instruction. Additional registrations are locked for this cohort.
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                          This cohort is now closed. Please request to join this trainer's next cohort proposal or explore other active expert cohorts.
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
                  if (confirmingCourseId === selectedCourse.id) {
                    return (
                      <div className="bg-amber-50 dark:bg-zinc-900 border border-brand-yellow/30 rounded-2xl p-4 sm:p-5 text-center space-y-3.5 animate-in zoom-in-95">
                        <div className="mx-auto w-10 h-10 bg-brand-yellow/30 text-brand-black dark:text-brand-yellow rounded-full flex items-center justify-center font-bold text-sm">
                          ?
                        </div>
                        <h5 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Confirm Course Enrollment</h5>
                        <p className="text-[11px] text-zinc-650 dark:text-zinc-400 font-light leading-relaxed">
                          Are you sure you want to register for <strong className="font-semibold text-brand-black dark:text-white">{selectedCourse.title}</strong>? Continuing will securely initialize your student roster and direct you to Paystack payment for <strong className="font-mono text-brand-black dark:text-brand-yellow font-bold">₦{(selectedCourse.price || 35000).toLocaleString()}</strong>.
                        </p>
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => {
                              setConfirmingCourseId(null);
                              handleInitiatePaymentProcess(selectedCourse);
                            }}
                            className="flex-1 bg-[#3bb75e] hover:bg-[#349e52] text-white py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            Proceed to payment
                          </button>
                          <button
                            onClick={() => setConfirmingCourseId(null)}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                          >
                            Go Back
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-4 text-[11px] leading-relaxed text-zinc-650 dark:text-zinc-450 font-light">
                        To register, proceed to check-out with the integrated Paystack secure portal. This ensures instant transaction indexing. Optionally, enter a reference manually.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <button
                          onClick={() => setConfirmingCourseId(selectedCourse.id)}
                          className="flex items-center justify-center gap-2 bg-[#3bb75e] hover:bg-[#349e52] text-white py-3 px-4 rounded-xl text-xs uppercase tracking-wide font-semibold shadow-xs transition-colors cursor-pointer focus-ring"
                        >
                          <CreditCard size={13} />
                          Register Course
                        </button>

                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-bold text-zinc-450 block">Or submit paid Ref code</span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={paystackRefInput}
                              onChange={(e) => setPaystackRefInput(e.target.value)}
                              placeholder="PSTK-REF-..."
                              className="w-full text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-hidden text-zinc-700 dark:text-zinc-300"
                            />
                            <button
                              onClick={() => handleSubmitVerificationReference(selectedCourse.id, paystackRefInput)}
                              className="bg-zinc-950 dark:bg-brand-yellow hover:bg-zinc-800 text-brand-yellow dark:text-brand-black px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer shrink-0"
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

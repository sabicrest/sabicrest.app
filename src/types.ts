/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

// User roles in the Sabicrest platform
export type UserRole = 'student' | 'trainer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  verified: boolean;
  joinedDate: string;
  status: 'active' | 'pending' | 'suspended';
  bio?: string;
  skills?: string[];
  teamId?: string; // Optional reference to collaboration team
  phone?: string;       // Student dashboard profile update contact
  slackHandle?: string; // Student dashboard profile update contact
  location?: string;    // Student dashboard profile update location
  enrolledCourseIds?: string[]; // Track registered course IDs
  trainerBusinessName?: string; // Registered business name in same line as skills
  useBusinessName?: boolean; // Choose between full name or business name on certs
  trainerSignature?: string; // base64 signature image as CEO/Mentor
  trainerRole?: 'CEO' | 'Mentor'; // Signing role title preference
  
  // Custom Sabi Streak Engine metadata for Student roles
  streakCount?: number;          // Sabi Streak count (days)
  streakExpiry?: string;         // ISO date when streak expires or drops to 0
  streakFreezes?: number;        // Count of emergency Streak Freeze cards details (standard = 2)
  streakFreezeActive?: boolean;  // Is freeze currently active?
  lastStreakActivityDate?: string; // YYYY-MM-DD
  streakLogs?: StreakLog[];       // Array of logged practice notes
}

export interface StreakLog {
  id: string;
  date: string;
  type: 'attendance' | 'practice' | 'assignment';
  note: string;
  timestamp: string;
}

// Secure Message structure with real-time payload encryption flags
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string; // Standard DM
  channelId?: string;  // Channel/Team channel ID
  content: string;     // Decrypted content shown in UI
  encryptedContent: string; // Base64 encrypted / hashed representation stored in Database
  timestamp: string;
  isEncrypted: boolean;
  algorithm: string; // e.g. "AES-256-GCM / Supabase Database Crypt"
  replyToId?: string; // Quote reply support
  replyToSender?: string;
  replyToText?: string;
  reactions?: { [emoji: string]: string[] }; // map of emoji to list of userIds who voted
  attachmentUrl?: string; // base64 payload URL
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
  delivered?: boolean;
  read?: boolean;
}

// Interactive Sabicrest General Community Hub message matching WhatsApp capabilities
export interface HubMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  tag: 'general' | 'question' | 'collab' | 'idea';
  isSolved?: boolean; // For question category
  replyToId?: string; // WhatsApp-style reply quote target
  replyToSender?: string;
  replyToText?: string;
  reactions?: { [emoji: string]: string[] }; // map of emoji to list of userIds who voted
  attachmentUrl?: string; // base64 payload URL
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
}

// Scheduling system events
export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  hostId: string;
  hostName: string;
  attendeeId: string; // student or group
  status: 'confirmed' | 'pending' | 'cancelled';
  meetLink?: string;
  roleType: '1-on-1' | 'office-hours' | 'team-review';
}

// Curriculum details proposed by Trainers/Mentors
export interface Curriculum {
  id: string;
  trainerId: string;
  trainerName: string;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  durationWeeks: number;
  modules: string[]; // List of modules
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  price?: number; // Price of the course in NGN (Nigerian Naira)
  imageUrl?: string; // Opt course cover image URL
  cohortStartDate?: string; // YYYY-MM-DD cohort start date
  earlyDrawProcessed?: boolean; // 65% early draw
  fullDrawProcessed?: boolean; // full share draw
}

// Assignment state
export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  submittedAt?: string;
  submissionContent?: string;
  linkUrl?: string;
  status: 'not_submitted' | 'pending_review' | 'graded';
  grade?: string; // E.g. "A", "95", "100"
  points?: number;
  feedback?: string;
  gradedAt?: string;
  courseId?: string; // Track original curriculum course template
}

// Multi-user Student Team collaboration module
export interface Team {
  id: string;
  name: string;
  projectTitle: string;
  description: string;
  members: string[]; // user IDs
  tasks: TeamTask[];
  sharedNotes: string;
}

export interface TeamTask {
  id: string;
  title: string;
  assignedTo: string; // user name
  status: 'todo' | 'in_progress' | 'done';
}

// Verified Certifications issued to Students upon successful completion
export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  curriculumTitle: string;
  trainerName: string;
  issuedDate: string;
  hash: string; // secure non-fungible ledger identification
  status: 'verified' | 'revoked';
  trainerBusinessName?: string;
  useBusinessName?: boolean;
  trainerSignature?: string; 
  trainerRole?: 'CEO' | 'Mentor';
}

// Real-time Platform Notifications
export interface NotificationAlert {
  id: string;
  userId: string; // To user
  title: string;
  message: string;
  type: 'message' | 'schedule' | 'grade' | 'curriculum' | 'system';
  read: boolean;
  createdAt: string;
}

// Supabase Simulated Serverless DB Transaction audit line
export interface DbTransactionLog {
  timestamp: string;
  operation: string;
  table: string;
  encryptionKey: string;
  hash: string;
  sizeBytes: number;
}

// Student Course Enrollments & Paystack payment confirmations
export interface CourseEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  trainerId: string;
  trainerName: string;
  amount: number;
  paymentLinkUrl: string; // Dynamic simulated Paystack checkout link
  paymentStatus: 'pending_payment' | 'pending_verification' | 'approved' | 'rejected';
  paymentReference?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  completed?: boolean; // Student has completed the cohort/course
  completedAt?: string; // ISO date of completion
}

// Administrative Audit logs for actions in the admin dashboard
export interface AdminActivity {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  details: string;
  ipAddress: string;
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Message,
  HubMessage,
  ScheduleEvent,
  Curriculum,
  Assignment,
  Team,
  Certificate,
  NotificationAlert,
  DbTransactionLog,
  CourseEnrollment
} from './types';

// Simple simulated encryption tools for Appwrite database privacy compliance.
export const encryptPayload = (text: string, fakeKey: string = 'SABICREST_APPWRITE_AES_256_GCM'): string => {
  if (!text) return '';
  // Convert to Base64 and rot13 equivalent to mock raw encrypted block
  const b64 = btoa(unescape(encodeURIComponent(text)));
  let cipher = '';
  for (let i = 0; i < b64.length; i++) {
    const charCode = b64.charCodeAt(i);
    cipher += String.fromCharCode(charCode ^ ((fakeKey.charCodeAt(i % fakeKey.length) + i) % 256));
  }
  return btoa(cipher);
};

export const decryptPayload = (cipherText: string, fakeKey: string = 'SABICREST_APPWRITE_AES_256_GCM'): string => {
  if (!cipherText) return '';
  try {
    const decryptedB64 = atob(cipherText);
    let rawStr = '';
    for (let i = 0; i < decryptedB64.length; i++) {
      const charCode = decryptedB64.charCodeAt(i);
      rawStr += String.fromCharCode(charCode ^ ((fakeKey.charCodeAt(i % fakeKey.length) + i) % 256));
    }
    return decodeURIComponent(escape(atob(rawStr)));
  } catch (e) {
    return '[Encrypted Security Payload - Restrictive Decryption Key]';
  }
};

// Generate a mock secure transaction hash (e.g. SHA-256 likeness)
const generateTxHash = (): string => {
  const chars = 'abcdef0123456789';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

// Initial state mock definitions
const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@edu.sabicrest.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    verified: true,
    joinedDate: '2026-01-10',
    status: 'active',
    bio: 'Product Design Enthusiast interested in UI/UX architectures, spatial alignments, and minimal typography patterns.',
    skills: ['UI Design', 'Figma', 'Typography', 'Sass'],
    teamId: 't-1',
    phone: '+1 (555) 234-5678',
    slackHandle: '@alex_design',
    location: 'San Francisco, CA',
    enrolledCourseIds: ['c-1']
  },
  {
    id: 'u-2',
    name: 'Jordan Lee',
    email: 'jordan.lee@edu.sabicrest.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    verified: true,
    joinedDate: '2026-02-15',
    status: 'active',
    bio: 'Interface specialist focusing on digital security, system layout mapping, and secure user dashboards.',
    skills: ['Interface Security', 'Data Systems', 'Information Architecture', 'Tailwind'],
    teamId: 't-1',
    phone: '+1 (555) 876-5432',
    slackHandle: '@jordan_gate',
    location: 'Austin, TX',
    enrolledCourseIds: ['c-1']
  },
  {
    id: 'u-trainer-1',
    name: 'Dr. Sarah Sterling',
    email: 'sarah.sterling@sabicrest.com',
    role: 'trainer',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    verified: true,
    joinedDate: '2025-05-12',
    status: 'active',
    bio: 'Certified Senior Design Coach, previous Principal Architect. Teaching Typography Systems, Layout Design, and Advanced Spatial Rhythms.',
    skills: ['System Design', 'Visual Communication', 'Creative Direction']
  },
  {
    id: 'u-trainer-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@sabicrest.com',
    role: 'trainer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    verified: true,
    joinedDate: '2025-08-20',
    status: 'active',
    bio: 'Appwrite Enterprise Platform Architect. Specializes in cost-optimized serverless layouts, secure database indexation models, and user privacy pipelines.',
    skills: ['Serverless Design', 'Appwrite platform', 'Data Privacy', 'Workflow Audits']
  },
  {
    id: 'u-admin-1',
    name: 'Chief Admin Officer',
    email: 'officialsabicrest@gmail.com', // Prefilled with user email for realism
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    verified: true,
    joinedDate: '2025-01-01',
    status: 'active',
    bio: 'Core Platform Overseer at Sabicrest. Approving curriculum projects, onboarding trainers, and governing secure database protocols.'
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm-1',
    senderId: 'u-trainer-1',
    senderName: 'Dr. Sarah Sterling',
    senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    channelId: 'team-general',
    content: 'Welcome students to Sabicrest! We are hosting our kick-off UI/UX spatial typography lecture tomorrow at 10:00 AM. Please make sure to check the scheduling tool and mark your calendar details.',
    encryptedContent: '', // dynamically processed
    timestamp: '2026-05-28T09:12:00Z',
    isEncrypted: true,
    algorithm: 'AES-256-GCM / Appwrite Database Crypt'
  },
  {
    id: 'm-2',
    senderId: 'u-1',
    senderName: 'Alex Rivera',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    channelId: 'team-general',
    content: 'Thank you Dr. Sterling! Confirmed. Extremely excited to review the typography module curricula. Jordan, are you ready to collaborate on the system assignment tomorrow?',
    encryptedContent: '',
    timestamp: '2026-05-28T10:05:00Z',
    isEncrypted: true,
    algorithm: 'AES-256-GCM / Appwrite Database Crypt'
  },
  {
    id: 'm-3',
    senderId: 'u-2',
    senderName: 'Jordan Lee',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    channelId: 'team-general',
    content: 'Absolutely Alex, I created our collaboration workspace file and added research notes. Looking forward to our 1-on-1 team review scheduled with Marcus.',
    encryptedContent: '',
    timestamp: '2026-05-28T10:15:00Z',
    isEncrypted: true,
    algorithm: 'AES-256-GCM / Appwrite Database Crypt'
  }
];

// Pre-fill encryptedContent for initial messages
INITIAL_MESSAGES.forEach(m => {
  m.encryptedContent = encryptPayload(m.content);
});

const INITIAL_EVENTS: ScheduleEvent[] = [
  {
    id: 'e-1',
    title: 'UI/UX Spatial Typography & Visual Rhythm Lecture',
    description: 'Core lecture reviewing minimalist spacing rules, thin font alignment, and visual-first design principles with Dr. Sarah Sterling.',
    date: '2026-05-30',
    time: '10:00',
    durationMinutes: 60,
    hostId: 'u-trainer-1',
    hostName: 'Dr. Sarah Sterling',
    attendeeId: 'team-general',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/sc-uux-type',
    roleType: 'office-hours'
  },
  {
    id: 'e-2',
    title: 'Individual Design Review Slot: Alex Rivera',
    description: 'Reviewing the submitted typography wireframes and grading feedback guidelines.',
    date: '2026-05-31',
    time: '14:30',
    durationMinutes: 30,
    hostId: 'u-trainer-1',
    hostName: 'Dr. Sarah Sterling',
    attendeeId: 'u-1',
    status: 'pending',
    meetLink: 'https://meet.google.com/sc-uux-alex',
    roleType: '1-on-1'
  },
  {
    id: 'e-3',
    title: 'Serverless Storage Optimization Consultation',
    description: 'Active discussion on configuring serverless clusters with minimal cold starts and encrypted fields.',
    date: '2026-06-02',
    time: '11:00',
    durationMinutes: 45,
    hostId: 'u-trainer-2',
    hostName: 'Marcus Vance',
    attendeeId: 'u-2',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/sc-cloud-marcus',
    roleType: '1-on-1'
  }
];

const INITIAL_CURRICULA: Curriculum[] = [
  {
    id: 'c-1',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    title: 'Minimalist Spatial Typography Schemes',
    description: 'A comprehensive system exploring font hierarchy using thin and ultra-light weights, fluid margins, high color contrasts, and intentional white-space density.',
    category: 'Visual Design',
    level: 'Intermediate',
    durationWeeks: 6,
    modules: [
      'Anatomy of Light Weights (100-300)',
      'Constructing Consistent Spatial Grids',
      'High-Contrast Color Harmonies without Noise',
      'The Art of Negative Space in Modern Dashboards',
      'Testing Micro-Transitions with Motion React'
    ],
    status: 'approved',
    submittedAt: '2026-05-20T10:00:00Z',
    approvedAt: '2026-05-22T14:30:00Z',
    price: 35000
  },
  {
    id: 'c-2',
    trainerId: 'u-trainer-2',
    trainerName: 'Marcus Vance',
    title: 'Serverless Layout Systems: Enterprise Performance & Privacy',
    description: 'Advanced workspace organization. Structure secure layout configurations, leverage data decryption at rest, and optimize delivery latencies.',
    category: 'Cloud Architecture',
    level: 'Advanced',
    durationWeeks: 8,
    modules: [
      'Simulating Enterprise Workspace Configurations',
      'Database Security Frameworks (AES / Advanced Hash)',
      'Optimizing Node Response Standards & Delivery',
      'Securing User Spaces with Custom Authentication Headers',
      'Designing Scalable Content Pipelines'
    ],
    status: 'pending',
    submittedAt: '2026-05-28T16:00:00Z',
    price: 45000
  },
  {
    id: 'c-3',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    title: 'Advanced React Layout Systems & Micro-Interactions',
    description: 'Master the creation of seamless workspace transitions and motion layouts. Explore container grids, robust multi-device fluidity, and responsive density structures.',
    category: 'Visual Design',
    level: 'Advanced',
    durationWeeks: 10,
    modules: [
      'Tailwind Container Fluidity & Margins',
      'Staggered Orchestrated Entrances',
      'Orchestrating Sidebar Transitions with CSS variables',
      'Performance and Layout Optimization on Device Viewports'
    ],
    status: 'approved',
    submittedAt: '2026-05-22T10:00:00Z',
    approvedAt: '2026-05-24T12:00:00Z',
    price: 55000
  },
  {
    id: 'c-4',
    trainerId: 'u-trainer-2',
    trainerName: 'Marcus Vance',
    title: 'Enterprise Server Security & Best Practices',
    description: 'Learn secure application governance, data safety rules, secure database setups, user permissions, and compliance log generation.',
    category: 'Cloud Architecture',
    level: 'Advanced',
    durationWeeks: 12,
    modules: [
      'Secure User Log-In & Authentication Flows',
      'Developing Secure Application Routing',
      'Securing Client & Server Data Storage',
      'Creating Real-time Activity Logs & Indicators'
    ],
    status: 'approved',
    submittedAt: '2026-05-24T12:00:00Z',
    approvedAt: '2026-05-25T15:30:00Z',
    price: 65000
  }
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a-1',
    title: 'Spatial Grid Layout Design Project',
    description: 'Design a web frame mockup that relies exclusively on font-weight differences (thin, light, normal) with white backgrounds and precise micro-margins. Provide links and design details below.',
    dueDate: '2026-05-29',
    maxPoints: 100,
    studentId: 'u-1',
    studentName: 'Alex Rivera',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    status: 'pending_review',
    submittedAt: '2026-05-28T22:30:00Z',
    submissionContent: 'Here is my typography dashboard mockup. I utilized the 100-300 Outfit weights and structured the padding around a 24px grid system to deliver maximum clarity.',
    linkUrl: 'https://figma.com/file/sabicrest-spatial-mockup'
  },
  {
    id: 'a-2',
    title: 'Encrypted Appwrite Workspace Configuration Strategy',
    description: 'Formulate an end-to-end user data strategy that secures layout configurations within Appwrite serverless storage.',
    dueDate: '2026-06-03',
    maxPoints: 100,
    studentId: 'u-2',
    studentName: 'Jordan Lee',
    trainerId: 'u-trainer-2',
    trainerName: 'Marcus Vance',
    status: 'not_submitted'
  },
  {
    id: 'a-3',
    title: 'Visual Hierarchy Portfolio Submission',
    description: 'Demonstrate balance in dark vs light accent placements, using black and yellow branding highlights on a pure light canvas.',
    dueDate: '2026-05-22',
    maxPoints: 100,
    studentId: 'u-1',
    studentName: 'Alex Rivera',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    status: 'graded',
    submittedAt: '2026-05-21T11:20:00Z',
    submissionContent: 'Integrated the Sabicrest golden tone in headers with extremely light font weights for clean, minimalist navigation accents.',
    linkUrl: 'https://figma.com/file/portfolio-sabicrest',
    grade: 'A',
    points: 98,
    feedback: 'Excellent typography pairing. The choice of thin weights beautifully highlights key elements. Background contrast is outstanding.',
    gradedAt: '2026-05-22T09:00:00Z'
  }
];

const INITIAL_TEAMS: Team[] = [
  {
    id: 't-1',
    name: 'Team Horizon',
    projectTitle: 'Sabicrest Strategic Layout Ecosystem',
    description: 'Structuring a collaborative user workspace leveraging light design parameters and Appwrite layout privacy protections.',
    members: ['u-1', 'u-2'],
    tasks: [
      { id: 'task-1', title: 'Design typographic canvas margins', assignedTo: 'Alex Rivera', status: 'done' },
      { id: 'task-2', title: 'Configure encrypted layout parameters', assignedTo: 'Jordan Lee', status: 'in_progress' },
      { id: 'task-3', title: 'Formulate workspace notification models', assignedTo: 'Alex Rivera', status: 'todo' },
      { id: 'task-4', title: 'Optimize core layout response speed', assignedTo: 'Jordan Lee', status: 'todo' }
    ],
    sharedNotes: 'Welcome to Horizon! Our team focus is minimalism and lightweight design. Let us use dark text offsets, 100-300-400 font weights, and avoid visual clutter.'
  }
];

const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-1',
    studentId: 'u-1',
    studentName: 'Alex Rivera',
    curriculumTitle: 'Advanced Spatial Grid Alignment & Micro-Margins',
    trainerName: 'Dr. Sarah Sterling',
    issuedDate: '2026-04-15',
    hash: '0x3f5c9e2a1b4d8c6e7f0980aa829bf42901ce104d',
    status: 'verified'
  }
];

const INITIAL_NOTIFICATIONS: NotificationAlert[] = [
  {
    id: 'n-1',
    userId: 'u-1',
    title: 'Assignment Submitted Successfully',
    message: 'Your submittal for "Spatial Grid Layout Design Project" is now pending tutor evaluation.',
    type: 'grade',
    read: false,
    createdAt: '2026-05-28T22:30:00Z'
  },
  {
    id: 'n-2',
    userId: 'u-trainer-1',
    title: 'New Student Submission',
    message: 'Alex Rivera submitted work for "Spatial Grid Layout Design Project". Action suggested.',
    type: 'curriculum',
    read: false,
    createdAt: '2026-05-28T22:30:10Z'
  },
  {
    id: 'n-3',
    userId: 'u-admin-1',
    title: 'New Curriculum Proposed',
    message: 'Marcus Vance proposed a new curriculum: "Serverless Functions: Enterprise Performance & Privacy". Review required.',
    type: 'curriculum',
    read: false,
    createdAt: '2026-05-28T16:00:15Z'
  }
];

const INITIAL_TRANSACTIONS: DbTransactionLog[] = [
  {
    timestamp: '2026-05-29T16:00:12Z',
    operation: 'READ_USERS_QUERY',
    table: 'Users',
    encryptionKey: 'AES-256-UNIFIED',
    hash: '0x992cf...3a1',
    sizeBytes: 1240
  },
  {
    timestamp: '2026-05-29T16:01:05Z',
    operation: 'REPLICATION_SYNC',
    table: 'Appwrite_Replica_01',
    encryptionKey: 'RSA-4096-REPL',
    hash: '0xdfe21...28b',
    sizeBytes: 8940
  }
];

const INITIAL_HUB_MESSAGES: HubMessage[] = [
  {
    id: 'hm-1',
    senderId: 'u-1',
    senderName: 'Alex Rivera',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    content: 'Hey everyone! Has anyone started preparing for the typography layout challenge yet? Looking to team up with someone or share notes!',
    timestamp: '2026-05-29T10:15:00Z',
    tag: 'collab',
    reactions: { '👍': ['u-2', 'u-trainer-1'], '❤️': ['u-2'] }
  },
  {
    id: 'hm-2',
    senderId: 'u-2',
    senderName: 'Jordan Lee',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    content: "Absolutely Alex, count me in! I've been researching layout spacing standards. Let's start a call.",
    timestamp: '2026-05-29T10:20:00Z',
    tag: 'collab',
    replyToId: 'hm-1',
    replyToSender: 'Alex Rivera',
    replyToText: 'Hey everyone! Has anyone started preparing for the typography layout challenge yet? Looking to team up with someone or share notes!',
    reactions: { '👍': ['u-1'] }
  },
  {
    id: 'hm-3',
    senderId: 'u-1',
    senderName: 'Alex Rivera',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    content: 'Which Google Font should we prefer if we want a classic mid-century Swiss modernist design system? Space Grotesk, Inter, or something like Helvetica?',
    timestamp: '2026-05-29T11:00:00Z',
    tag: 'question',
    isSolved: true,
    reactions: { '🤔': ['u-2'] }
  },
  {
    id: 'hm-4',
    senderId: 'u-trainer-1',
    senderName: 'Dr. Sarah Sterling',
    senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    content: 'For mid-century Swiss design, Inter is an excellent neo-grotesque candidate. If you use Google Fonts, try "Arimo" or "DM Sans" as highly neutral structures! It gives spectacular visual balance.',
    timestamp: '2026-05-29T11:30:00Z',
    tag: 'question',
    replyToId: 'hm-3',
    replyToSender: 'Alex Rivera',
    replyToText: 'Which Google Font should we prefer if we want a classic mid-century Swiss modernist design system?',
    reactions: { '❤️': ['u-1', 'u-2'], '🙏': ['u-1'] }
  }
];

// Student Course Enrollments initial list pre-filled
const INITIAL_ENROLLMENTS: CourseEnrollment[] = [
  {
    id: 'enr-1',
    studentId: 'u-1',
    studentName: 'Alex Rivera',
    studentEmail: 'alex.rivera@edu.sabicrest.com',
    courseId: 'c-1',
    courseTitle: 'Minimalist Spatial Typography Schemes',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    amount: 35000,
    paymentLinkUrl: 'https://checkout.paystack.com/sabicrest-c1-mock',
    paymentStatus: 'approved',
    paymentReference: 'PSTK-918230982-ALX',
    submittedAt: '2026-05-10T11:00:00Z',
    verifiedAt: '2026-05-11T09:00:00Z'
  },
  {
    id: 'enr-2',
    studentId: 'u-2',
    studentName: 'Jordan Lee',
    studentEmail: 'jordan.lee@edu.sabicrest.com',
    courseId: 'c-1',
    courseTitle: 'Minimalist Spatial Typography Schemes',
    trainerId: 'u-trainer-1',
    trainerName: 'Dr. Sarah Sterling',
    amount: 35000,
    paymentLinkUrl: 'https://checkout.paystack.com/sabicrest-c1-mock',
    paymentStatus: 'approved',
    paymentReference: 'PSTK-918230983-JDN',
    submittedAt: '2026-05-15T15:00:00Z',
    verifiedAt: '2026-05-16T10:00:00Z'
  }
];

// Database Engine Provider Class
export class AppwriteDatabase {
  private users: User[];
  private messages: Message[];
  private hubMessages: HubMessage[];
  private events: ScheduleEvent[];
  private curricula: Curriculum[];
  private assignments: Assignment[];
  private teams: Team[];
  private certificates: Certificate[];
  private notifications: NotificationAlert[];
  private transactions: DbTransactionLog[];
  private enrollments: CourseEnrollment[];

  constructor() {
    this.users = JSON.parse(localStorage.getItem('sc_users') || JSON.stringify(INITIAL_USERS));
    this.messages = JSON.parse(localStorage.getItem('sc_messages') || JSON.stringify(INITIAL_MESSAGES));
    this.hubMessages = JSON.parse(localStorage.getItem('sc_hub_messages') || JSON.stringify(INITIAL_HUB_MESSAGES));
    this.events = JSON.parse(localStorage.getItem('sc_events') || JSON.stringify(INITIAL_EVENTS));
    this.curricula = JSON.parse(localStorage.getItem('sc_curricula') || JSON.stringify(INITIAL_CURRICULA));
    this.assignments = JSON.parse(localStorage.getItem('sc_assignments') || JSON.stringify(INITIAL_ASSIGNMENTS));
    this.teams = JSON.parse(localStorage.getItem('sc_teams') || JSON.stringify(INITIAL_TEAMS));
    this.certificates = JSON.parse(localStorage.getItem('sc_certificates') || JSON.stringify(INITIAL_CERTIFICATES));
    this.notifications = JSON.parse(localStorage.getItem('sc_notifications') || JSON.stringify(INITIAL_NOTIFICATIONS));
    this.transactions = JSON.parse(localStorage.getItem('sc_transactions') || JSON.stringify(INITIAL_TRANSACTIONS));
    this.enrollments = JSON.parse(localStorage.getItem('sc_enrollments') || JSON.stringify(INITIAL_ENROLLMENTS));

    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('sc_users', JSON.stringify(this.users));
    localStorage.setItem('sc_messages', JSON.stringify(this.messages));
    localStorage.setItem('sc_hub_messages', JSON.stringify(this.hubMessages));
    localStorage.setItem('sc_events', JSON.stringify(this.events));
    localStorage.setItem('sc_curricula', JSON.stringify(this.curricula));
    localStorage.setItem('sc_assignments', JSON.stringify(this.assignments));
    localStorage.setItem('sc_teams', JSON.stringify(this.teams));
    localStorage.setItem('sc_certificates', JSON.stringify(this.certificates));
    localStorage.setItem('sc_notifications', JSON.stringify(this.notifications));
    localStorage.setItem('sc_transactions', JSON.stringify(this.transactions));
    localStorage.setItem('sc_enrollments', JSON.stringify(this.enrollments));
  }

  private logTransaction(operation: string, table: string, dataStr: string) {
    const freshLog: DbTransactionLog = {
      timestamp: new Date().toISOString(),
      operation,
      table,
      encryptionKey: 'AES-256-GCM / Appwrite Database Crypt',
      hash: generateTxHash(),
      sizeBytes: dataStr.length
    };
    this.transactions = [freshLog, ...this.transactions.slice(0, 49)]; // keep 50 logs max
    this.saveToStorage();
  }

  // --- Users CRUD ---
  getUsers(): User[] {
    return this.users;
  }
  
  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  updateUser(user: User) {
    this.users = this.users.map(u => u.id === user.id ? user : u);
    this.saveToStorage();
    this.logTransaction('UPDATE_USER_RECORD', 'Users', JSON.stringify(user));
  }

  addUser(user: User) {
    this.users.push(user);
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(user));
  }

  // --- Messages CRUD ---
  getMessages(): Message[] {
    return this.messages;
  }

  addMessage(msg: Omit<Message, 'id' | 'encryptedContent' | 'isEncrypted' | 'algorithm'>): Message {
    const encrypted = encryptPayload(msg.content);
    const newMsg: Message = {
      ...msg,
      id: `m-${Date.now()}`,
      encryptedContent: encrypted,
      isEncrypted: true,
      algorithm: 'AES-256-GCM / Appwrite Database Crypt'
    };
    this.messages.push(newMsg);
    this.saveToStorage();
    this.logTransaction('INSERT_SECURE_MESSAGE', 'Messages', JSON.stringify(newMsg));
    return newMsg;
  }

  // --- Sabicrest Community Hub CRUD ---
  getHubMessages(): HubMessage[] {
    return this.hubMessages;
  }

  addHubMessage(msg: Omit<HubMessage, 'id' | 'timestamp' | 'reactions'>): HubMessage {
    const newMsg: HubMessage = {
      ...msg,
      id: `hm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reactions: {}
    };
    this.hubMessages.push(newMsg);
    this.saveToStorage();
    this.logTransaction('INSERT_HUB_MESSAGE', 'HubMessages', JSON.stringify(newMsg));
    return newMsg;
  }

  addHubReaction(msgId: string, emoji: string, userId: string): void {
    this.hubMessages = this.hubMessages.map(m => {
      if (m.id === msgId) {
        const reactions = m.reactions ? { ...m.reactions } : {};
        const voters = reactions[emoji] ? [...reactions[emoji]] : [];
        if (voters.includes(userId)) {
          reactions[emoji] = voters.filter(id => id !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...voters, userId];
        }
        return { ...m, reactions };
      }
      return m;
    });
    this.saveToStorage();
    this.logTransaction('TOGGLE_HUB_REACTION', 'HubMessages', `msgId: ${msgId}, emoji: ${emoji}`);
  }

  toggleHubSolved(msgId: string): void {
    this.hubMessages = this.hubMessages.map(m => {
      if (m.id === msgId) {
        return { ...m, isSolved: !m.isSolved };
      }
      return m;
    });
    this.saveToStorage();
    this.logTransaction('TOGGLE_HUB_SOLVED', 'HubMessages', `msgId: ${msgId}`);
  }

  // --- Events CRUD ---
  getEvents(): ScheduleEvent[] {
    return this.events;
  }

  addEvent(event: Omit<ScheduleEvent, 'id'>): ScheduleEvent {
    const newEvent: ScheduleEvent = {
      ...event,
      id: `e-${Date.now()}`
    };
    this.events.push(newEvent);
    this.saveToStorage();
    this.logTransaction('INSERT_EVENT_RECORD', 'ScheduleEvents', JSON.stringify(newEvent));
    return newEvent;
  }

  updateEvent(event: ScheduleEvent) {
    this.events = this.events.map(e => e.id === event.id ? event : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_EVENT_RECORD', 'ScheduleEvents', JSON.stringify(event));
  }

  // --- Curricula CRUD ---
  getCurricula(): Curriculum[] {
    return this.curricula;
  }

  addCurriculum(curriculum: Omit<Curriculum, 'id' | 'status' | 'submittedAt'>): Curriculum {
    const newCurriculum: Curriculum = {
      ...curriculum,
      id: `c-${Date.now()}`,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    this.curricula.push(newCurriculum);
    this.saveToStorage();
    this.logTransaction('PROPOSE_CURRICULUM_RECORD', 'Curricula', JSON.stringify(newCurriculum));
    return newCurriculum;
  }

  updateCurriculum(curriculum: Curriculum) {
    this.curricula = this.curricula.map(c => c.id === curriculum.id ? curriculum : c);
    this.saveToStorage();
    this.logTransaction('UPDATE_CURRICULUM_RECORD', 'Curricula', JSON.stringify(curriculum));
  }

  // --- Assignments CRUD ---
  getAssignments(): Assignment[] {
    return this.assignments;
  }

  addAssignment(assignment: Omit<Assignment, 'id' | 'status'>): Assignment {
    const newAssignment: Assignment = {
      ...assignment,
      id: `a-${Date.now()}`,
      status: 'not_submitted'
    };
    this.assignments.push(newAssignment);
    this.saveToStorage();
    this.logTransaction('CREATE_ASSIGNMENT_RECORD', 'Assignments', JSON.stringify(newAssignment));
    return newAssignment;
  }

  updateAssignment(assignment: Assignment) {
    this.assignments = this.assignments.map(a => a.id === assignment.id ? assignment : a);
    this.saveToStorage();
    this.logTransaction('UPDATE_ASSIGNMENT_RECORD', 'Assignments', JSON.stringify(assignment));
  }

  // --- Teams CRUD ---
  getTeams(): Team[] {
    return this.teams;
  }

  updateTeam(team: Team) {
    this.teams = this.teams.map(t => t.id === team.id ? team : t);
    this.saveToStorage();
    this.logTransaction('UPDATE_TEAM_RECORD', 'Teams', JSON.stringify(team));
  }

  // --- Certificates CRUD ---
  getCertificates(): Certificate[] {
    return this.certificates;
  }

  issueCertificate(studentId: string, studentName: string, curriculumTitle: string, trainerName: string): Certificate {
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      studentId,
      studentName,
      curriculumTitle,
      trainerName,
      issuedDate: new Date().toISOString().split('T')[0],
      hash: generateTxHash(),
      status: 'verified'
    };
    this.certificates.push(newCert);
    this.saveToStorage();
    this.logTransaction('ISSUE_VERIFIED_CERTIFICATE', 'Certificates', JSON.stringify(newCert));
    return newCert;
  }

  // --- Notifications CRUD ---
  getNotifications(): NotificationAlert[] {
    return this.notifications;
  }

  addNotification(notification: Omit<NotificationAlert, 'id' | 'read' | 'createdAt'>): NotificationAlert {
    const newNotif: NotificationAlert = {
      ...notification,
      id: `n-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.push(newNotif);
    this.saveToStorage();
    return newNotif;
  }

  markAllNotificationsRead(userId: string) {
    this.notifications = this.notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    this.saveToStorage();
  }

  clearNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
  }

  // --- Transaction Logs CR ---
  getTransactions(): DbTransactionLog[] {
    return this.transactions;
  }

  clearLogs() {
    this.transactions = [];
    this.saveToStorage();
  }

  // --- Enrollments CRUD ---
  getEnrollments(): CourseEnrollment[] {
    return this.enrollments;
  }

  getEnrollmentById(id: string): CourseEnrollment | undefined {
    return this.enrollments.find(e => e.id === id);
  }

  addEnrollment(enr: Omit<CourseEnrollment, 'id'>): CourseEnrollment {
    const newEnr: CourseEnrollment = {
      ...enr,
      id: `enr-${Date.now()}`
    };
    this.enrollments.push(newEnr);
    this.saveToStorage();
    this.logTransaction('INITIATE_COURSE_PAYMENT', 'CourseEnrollments', JSON.stringify(newEnr));
    return newEnr;
  }

  updateEnrollment(enr: CourseEnrollment) {
    this.enrollments = this.enrollments.map(e => e.id === enr.id ? enr : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_COURSE_ENROLLMENT', 'CourseEnrollments', JSON.stringify(enr));
  }
}

export const db = new AppwriteDatabase();

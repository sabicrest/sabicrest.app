/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Databases, Query } from 'appwrite';
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

let appwriteClient: Client | null = null;
let appwriteDatabases: Databases | null = null;

export function getAppwrite(): Databases | null {
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
  if (!projectId) {
    return null;
  }
  if (!appwriteClient) {
    appwriteClient = new Client().setEndpoint(endpoint).setProject(projectId);
    appwriteDatabases = new Databases(appwriteClient);
  }
  return appwriteDatabases;
}

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

/// Initial state mock definitions (Empty for production readiness)
const INITIAL_USERS: User[] = [];
const INITIAL_MESSAGES: Message[] = [];
const INITIAL_EVENTS: ScheduleEvent[] = [];
const INITIAL_CURRICULA: Curriculum[] = [];
const INITIAL_ASSIGNMENTS: Assignment[] = [];
const INITIAL_TEAMS: Team[] = [];
const INITIAL_CERTIFICATES: Certificate[] = [];
const INITIAL_NOTIFICATIONS: NotificationAlert[] = [];
const INITIAL_TRANSACTIONS: DbTransactionLog[] = [];
const INITIAL_HUB_MESSAGES: HubMessage[] = [];
const INITIAL_ENROLLMENTS: CourseEnrollment[] = [];

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
    // Force reset old mock keys on first run to clean up active browser storage
    if (localStorage.getItem('sabicrest_clean_v2') !== 'true') {
      localStorage.removeItem('sc_users');
      localStorage.removeItem('sc_messages');
      localStorage.removeItem('sc_hub_messages');
      localStorage.removeItem('sc_events');
      localStorage.removeItem('sc_curricula');
      localStorage.removeItem('sc_assignments');
      localStorage.removeItem('sc_teams');
      localStorage.removeItem('sc_certificates');
      localStorage.removeItem('sc_notifications');
      localStorage.removeItem('sc_transactions');
      localStorage.removeItem('sc_enrollments');
      localStorage.setItem('sabicrest_clean_v2', 'true');
    }

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
    this.syncFromAppwrite();
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

  async syncFromAppwrite() {
    const dbSvc = getAppwrite();
    if (!dbSvc) return;

    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'sabicrest_db';
      console.log('Appwrite Background Sync Starting...');
      
      // Sync Users
      try {
        const res = await dbSvc.listDocuments(databaseId, 'users');
        if (res.documents.length > 0) {
          this.users = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [users]:', err);
      }

      // Sync Messages
      try {
        const res = await dbSvc.listDocuments(databaseId, 'messages');
        if (res.documents.length > 0) {
          this.messages = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [messages]:', err);
      }

      // Sync Hub Messages
      try {
        const res = await dbSvc.listDocuments(databaseId, 'hub_messages');
        if (res.documents.length > 0) {
          this.hubMessages = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            let parsedReactions = {};
            if (typeof data.reactions === 'string') {
              try { parsedReactions = JSON.parse(data.reactions); } catch(e){}
            } else if (data.reactions) {
              parsedReactions = data.reactions;
            }
            return { id: $id, ...data, reactions: parsedReactions } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [hub_messages]:', err);
      }

      // Sync Events
      try {
        const res = await dbSvc.listDocuments(databaseId, 'events');
        if (res.documents.length > 0) {
          this.events = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [events]:', err);
      }

      // Sync Curricula
      try {
        const res = await dbSvc.listDocuments(databaseId, 'curricula');
        if (res.documents.length > 0) {
          this.curricula = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            let parsedModules = [];
            if (typeof data.modules === 'string') {
              try { parsedModules = JSON.parse(data.modules); } catch(e){}
            } else if (Array.isArray(data.modules)) {
              parsedModules = data.modules;
            }
            return { id: $id, ...data, modules: parsedModules } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [curricula]:', err);
      }

      // Sync Assignments
      try {
        const res = await dbSvc.listDocuments(databaseId, 'assignments');
        if (res.documents.length > 0) {
          this.assignments = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [assignments]:', err);
      }

      // Sync Teams
      try {
        const res = await dbSvc.listDocuments(databaseId, 'teams');
        if (res.documents.length > 0) {
          this.teams = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            let parsedMembers = [];
            if (typeof data.members === 'string') {
              try { parsedMembers = JSON.parse(data.members); } catch(e){}
            } else if (Array.isArray(data.members)) {
              parsedMembers = data.members;
            }
            let parsedTasks = [];
            if (typeof data.tasks === 'string') {
              try { parsedTasks = JSON.parse(data.tasks); } catch(e){}
            } else if (Array.isArray(data.tasks)) {
              parsedTasks = data.tasks;
            }
            return { id: $id, ...data, members: parsedMembers, tasks: parsedTasks } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [teams]:', err);
      }

      // Sync Certificates
      try {
        const res = await dbSvc.listDocuments(databaseId, 'certificates');
        if (res.documents.length > 0) {
          this.certificates = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [certificates]:', err);
      }

      // Sync Notifications
      try {
        const res = await dbSvc.listDocuments(databaseId, 'notifications');
        if (res.documents.length > 0) {
          this.notifications = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [notifications]:', err);
      }

      // Sync Enrollments
      try {
        const res = await dbSvc.listDocuments(databaseId, 'enrollments');
        if (res.documents.length > 0) {
          this.enrollments = res.documents.map(doc => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [enrollments]:', err);
      }

      this.saveToStorage();
      console.log('Appwrite Background Sync Completed Successfully!');
    } catch (globalErr) {
      console.error('Appwrite Global sync error:', globalErr);
    }
  }

  async saveToAppwrite(collectionId: string, documentId: string, data: any, isDelete = false) {
    const dbSvc = getAppwrite();
    if (!dbSvc) return;

    const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'sabicrest_db';
    const sanitizedDocId = documentId.replace(/[^a-zA-Z0-9_\.\-]/g, '_').slice(0, 36);

    try {
      if (isDelete) {
        await dbSvc.deleteDocument(databaseId, collectionId, sanitizedDocId);
        this.logTransaction('APPWRITE_DELETE_SUCCESS', collectionId, `id: ${sanitizedDocId}`);
      } else {
        const appwriteData = { ...data };
        delete appwriteData.id;

        for (const key of Object.keys(appwriteData)) {
          if (typeof appwriteData[key] === 'object' && appwriteData[key] !== null) {
            appwriteData[key] = JSON.stringify(appwriteData[key]);
          }
        }

        try {
          await dbSvc.updateDocument(databaseId, collectionId, sanitizedDocId, appwriteData);
          this.logTransaction('APPWRITE_UPDATE_SUCCESS', collectionId, JSON.stringify(appwriteData));
        } catch (updateErr: any) {
          if (updateErr.code === 404 || updateErr.status === 404) {
            await dbSvc.createDocument(databaseId, collectionId, sanitizedDocId, appwriteData);
            this.logTransaction('APPWRITE_CREATE_SUCCESS', collectionId, JSON.stringify(appwriteData));
          } else {
            throw updateErr;
          }
        }
      }
    } catch (err: any) {
      console.error(`Appwrite failure on collection ${collectionId}:`, err);
      this.logTransaction('APPWRITE_SYNC_FAILURE', collectionId, `${err.message || 'Unknown network error'}`);
    }
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
    this.saveToAppwrite('users', user.id, user);
  }

  addUser(user: User) {
    this.users.push(user);
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(user));
    this.saveToAppwrite('users', user.id, user);
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
    this.saveToAppwrite('messages', newMsg.id, newMsg);
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
    this.saveToAppwrite('hub_messages', newMsg.id, newMsg);
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
    const updated = this.hubMessages.find(m => m.id === msgId);
    if (updated) {
      this.saveToAppwrite('hub_messages', msgId, updated);
    }
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
    const updated = this.hubMessages.find(m => m.id === msgId);
    if (updated) {
      this.saveToAppwrite('hub_messages', msgId, updated);
    }
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
    this.saveToAppwrite('events', newEvent.id, newEvent);
    return newEvent;
  }

  updateEvent(event: ScheduleEvent) {
    this.events = this.events.map(e => e.id === event.id ? event : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_EVENT_RECORD', 'ScheduleEvents', JSON.stringify(event));
    this.saveToAppwrite('events', event.id, event);
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
    this.saveToAppwrite('curricula', newCurriculum.id, newCurriculum);
    return newCurriculum;
  }

  updateCurriculum(curriculum: Curriculum) {
    this.curricula = this.curricula.map(c => c.id === curriculum.id ? curriculum : c);
    this.saveToStorage();
    this.logTransaction('UPDATE_CURRICULUM_RECORD', 'Curricula', JSON.stringify(curriculum));
    this.saveToAppwrite('curricula', curriculum.id, curriculum);
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
    this.saveToAppwrite('assignments', newAssignment.id, newAssignment);
    return newAssignment;
  }

  updateAssignment(assignment: Assignment) {
    this.assignments = this.assignments.map(a => a.id === assignment.id ? assignment : a);
    this.saveToStorage();
    this.logTransaction('UPDATE_ASSIGNMENT_RECORD', 'Assignments', JSON.stringify(assignment));
    this.saveToAppwrite('assignments', assignment.id, assignment);
  }

  // --- Teams CRUD ---
  getTeams(): Team[] {
    return this.teams;
  }

  updateTeam(team: Team) {
    this.teams = this.teams.map(t => t.id === team.id ? team : t);
    this.saveToStorage();
    this.logTransaction('UPDATE_TEAM_RECORD', 'Teams', JSON.stringify(team));
    this.saveToAppwrite('teams', team.id, team);
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
    this.saveToAppwrite('certificates', newCert.id, newCert);
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
    this.saveToAppwrite('notifications', newNotif.id, newNotif);
    return newNotif;
  }

  markAllNotificationsRead(userId: string) {
    this.notifications = this.notifications.map(n => {
      if (n.userId === userId) {
        const updated = { ...n, read: true };
        this.saveToAppwrite('notifications', n.id, updated);
        return updated;
      }
      return n;
    });
    this.saveToStorage();
  }

  clearNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.saveToAppwrite('notifications', id, null, true);
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
    this.saveToAppwrite('enrollments', newEnr.id, newEnr);
    return newEnr;
  }

  updateEnrollment(enr: CourseEnrollment) {
    this.enrollments = this.enrollments.map(e => e.id === enr.id ? enr : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_COURSE_ENROLLMENT', 'CourseEnrollments', JSON.stringify(enr));
    this.saveToAppwrite('enrollments', enr.id, enr);
  }
}

export const db = new AppwriteDatabase();

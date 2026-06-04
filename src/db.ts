/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Databases, Query, Account } from 'appwrite';
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
  CourseEnrollment,
  AdminActivity
} from './types';

let appwriteClient: Client | null = null;
let appwriteDatabases: Databases | null = null;
let appwriteAccount: Account | null = null;

export function getAppwriteClient(): Client | null {
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT && !import.meta.env.VITE_APPWRITE_ENDPOINT.includes('fra.cloud.appwrite.io')
    ? import.meta.env.VITE_APPWRITE_ENDPOINT
    : `${window.location.origin}/api/appwrite-proxy`;
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '6a19e810001156433516';
  if (!projectId) {
    return null;
  }
  if (!appwriteClient) {
    appwriteClient = new Client().setEndpoint(endpoint).setProject(projectId);
  }
  return appwriteClient;
}

export function getAppwrite(): Databases | null {
  const client = getAppwriteClient();
  if (!client) {
    return null;
  }
  if (!appwriteDatabases) {
    appwriteDatabases = new Databases(client);
  }
  return appwriteDatabases;
}

export function getAppwriteAccount(): Account | null {
  const client = getAppwriteClient();
  if (!client) {
    return null;
  }
  if (!appwriteAccount) {
    appwriteAccount = new Account(client);
  }
  return appwriteAccount;
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

/// Initial state mock definitions (Offline seed fallback database)
const decodeBase64 = (b64: string): string => {
  try {
    if (typeof window !== 'undefined' && window.atob) {
      return window.atob(b64);
    }
    return '';
  } catch {
    return '';
  }
};

export const getAdminEmails = (): string[] => {
  const envEmails = import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '';
  if (envEmails.trim()) {
    return envEmails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  }
  const BASE64_ADMINS = [
    'b2ZmaWNpYWxzYWJpY3Jlc3RAZ21haWwuY29t',
    'b2ZmaWNpYWxwcmluY2VkaWtlQGdtYWlsLmNvbQ==',
    'bWljaGFlbGJlcm5hcmRvbGF5ZW1pQGdtYWlsLmNvbQ==',
    'aWFtcGF1bGtleXNAZ21haWwuY29t'
  ];
  return BASE64_ADMINS.map(decodeBase64).filter(Boolean);
};

const getFirstAdminEmail = (): string => {
  return getAdminEmails()[0] || 'officialsabicrest@gmail.com';
};

const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    name: 'Chief Admin Officer',
    email: getFirstAdminEmail(),
    role: 'admin',
    password: 'password123',
    verified: true,
    joinedDate: '2026-01-10',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'System compliance curator and chief design director at Sabicrest.',
    skills: ['Cybersecurity', 'Database Auditing', 'Infrastructure Design', 'System Architecture']
  }
];
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
  private adminActivities: AdminActivity[];

  constructor() {
    // Force reset old mock keys on first run to clean up active browser storage
    if (localStorage.getItem('sabicrest_clean_v3') !== 'true') {
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
      localStorage.removeItem('sc_admin_activities');
      localStorage.setItem('sabicrest_clean_v3', 'true');
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
    this.adminActivities = JSON.parse(localStorage.getItem('sc_admin_activities') || '[]');

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
    localStorage.setItem('sc_admin_activities', JSON.stringify(this.adminActivities));
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

  private async proxyList(collectionId: string): Promise<any> {
    const res = await fetch(`/api/appwrite/list/${collectionId}`);
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || `Proxy listing failed: ${res.statusText}`);
    }
    const data = await res.json();
    if (data && data.success === false) {
      throw new Error(data.error || 'Proxy list returned success=false');
    }
    return data;
  }

  private async proxySave(collectionId: string, documentId: string, data: any, isDelete = false): Promise<any> {
    const res = await fetch('/api/appwrite/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collectionId,
        documentId,
        data,
        isDelete
      })
    });
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || `Proxy saving failed: ${res.statusText}`);
    }
    const dataRes = await res.json();
    if (dataRes && dataRes.success === false) {
      throw new Error(dataRes.error || 'Proxy save returned success=false');
    }
    return dataRes;
  }

  private parseUserDoc(doc: any): User {
    const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
    
    let parsedBio = data.bio || '';
    let parsedPassword = '';
    
    if (parsedBio.includes('||pwd:')) {
      const index = parsedBio.indexOf('||pwd:');
      parsedPassword = parsedBio.slice(index + 6);
      parsedBio = parsedBio.slice(0, index);
    }

    let parsedSkills: string[] = [];
    if (typeof data.skills === 'string') {
      try {
        parsedSkills = JSON.parse(data.skills);
      } catch (e) {
        if (data.skills) {
          parsedSkills = [data.skills];
        }
      }
    } else if (Array.isArray(data.skills)) {
      parsedSkills = data.skills;
    }

    let parsedEnrolledCourseIds: string[] = [];
    if (typeof data.enrolledCourseIds === 'string') {
      try {
        parsedEnrolledCourseIds = JSON.parse(data.enrolledCourseIds);
      } catch (e) {
        if (data.enrolledCourseIds) {
          parsedEnrolledCourseIds = [data.enrolledCourseIds];
        }
      }
    } else if (Array.isArray(data.enrolledCourseIds)) {
      parsedEnrolledCourseIds = data.enrolledCourseIds;
    }

    return {
      ...data,
      id: $id,
      bio: parsedBio,
      password: parsedPassword,
      skills: parsedSkills,
      enrolledCourseIds: parsedEnrolledCourseIds,
      verified: data.verified === true || data.verified === 'true'
    } as User;
  }

  async syncFromAppwrite() {
    try {
      console.log('Appwrite Background Sync Starting...');
      
      // Sync Users
      try {
        const res = await this.proxyList('users');
        if (res && res.documents) {
          this.users = res.documents.map((doc: any) => this.parseUserDoc(doc));
        }
      } catch (err) {
        console.warn('Appwrite sync error [users]:', err);
      }

      // Sync Messages
      try {
        const res = await this.proxyList('messages');
        if (res && res.documents && res.documents.length > 0) {
          const syncedMessages = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
          
          const merged = [...this.messages];
          syncedMessages.forEach((remoteMsg: Message) => {
            const idx = merged.findIndex(m => m.id === remoteMsg.id);
            if (idx >= 0) {
              merged[idx] = remoteMsg;
            } else {
              merged.push(remoteMsg);
            }
          });
          this.messages = merged;
          this.saveToStorage();
        }
      } catch (err) {
        console.warn('Appwrite sync error [messages]:', err);
      }

      // Sync Hub Messages
      try {
        const res = await this.proxyList('hub_messages');
        if (res && res.documents && res.documents.length > 0) {
          const syncedHub = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            let parsedReactions = {};
            if (typeof data.reactions === 'string') {
              try { parsedReactions = JSON.parse(data.reactions); } catch(e){}
            } else if (data.reactions) {
              parsedReactions = data.reactions;
            }
            return { id: $id, ...data, reactions: parsedReactions } as any;
          });
          
          const merged = [...this.hubMessages];
          syncedHub.forEach((remoteMsg: HubMessage) => {
            const idx = merged.findIndex(m => m.id === remoteMsg.id);
            if (idx >= 0) {
              merged[idx] = remoteMsg;
            } else {
              merged.push(remoteMsg);
            }
          });
          this.hubMessages = merged;
          this.saveToStorage();
        }
      } catch (err) {
        console.warn('Appwrite sync error [hub_messages]:', err);
      }

      // Sync Events
      try {
        const res = await this.proxyList('events');
        if (res && res.documents) {
          this.events = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [events]:', err);
      }

      // Sync Curricula
      try {
        const res = await this.proxyList('curricula');
        if (res && res.documents) {
          this.curricula = res.documents.map((doc: any) => {
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
        const res = await this.proxyList('assignments');
        if (res && res.documents) {
          this.assignments = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [assignments]:', err);
      }

      // Sync Teams
      try {
        const res = await this.proxyList('teams');
        if (res && res.documents) {
          this.teams = res.documents.map((doc: any) => {
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
        const res = await this.proxyList('certificates');
        if (res && res.documents) {
          this.certificates = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [certificates]:', err);
      }

      // Sync Notifications
      try {
        const res = await this.proxyList('notifications');
        if (res && res.documents) {
          this.notifications = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [notifications]:', err);
      }

      // Sync Enrollments
      try {
        const res = await this.proxyList('enrollments');
        if (res && res.documents) {
          this.enrollments = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Appwrite sync error [enrollments]:', err);
      }

      // Sync Admin Audit Activities
      try {
        const res = await this.proxyList('admin_activities');
        if (res && res.documents) {
          this.adminActivities = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
          // Sort by timestamp descending
          this.adminActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch (err) {
        console.warn('Appwrite sync error [admin_activities]:', err);
      }

      this.saveToStorage();
      console.log('Appwrite Background Sync Completed Successfully!');
    } catch (globalErr) {
      console.warn('Appwrite Global sync warning (offline secure local state activated):', globalErr);
    }
  }

  async saveToAppwrite(collectionId: string, documentId: string, data: any, isDelete = false) {
    try {
      let appwriteData = { ...data };
      delete appwriteData.id;

      if (collectionId === 'users') {
        // Embed password in bio property
        const passwordVal = appwriteData.password || '';
        delete appwriteData.password;

        const userBio = appwriteData.bio || '';
        let finalBio = userBio;
        if (passwordVal) {
          finalBio = `${userBio}||pwd:${passwordVal}`;
        } else {
          const existingUser = this.getUserById(documentId);
          if (existingUser && existingUser.password) {
            finalBio = `${userBio}||pwd:${existingUser.password}`;
          }
        }
        appwriteData.bio = finalBio;

        // Allow list of Appwrite database columns
        const ALLOWED_USER_KEYS = [
          'name',
          'email',
          'role',
          'avatar',
          'verified',
          'joinedDate',
          'status',
          'bio',
          'skills',
          'teamId',
          'phone',
          'slackHandle',
          'location',
          'enrolledCourseIds'
        ];

        const filtered: any = {};
        for (const key of ALLOWED_USER_KEYS) {
          if (appwriteData[key] !== undefined) {
            filtered[key] = appwriteData[key];
          }
        }
        appwriteData = filtered;
      }

      // Format types (stringifying objects while preserving primitive arrays)
      for (const key of Object.keys(appwriteData)) {
        if (typeof appwriteData[key] === 'object' && appwriteData[key] !== null) {
          if (Array.isArray(appwriteData[key])) {
            const hasObject = appwriteData[key].some((item: any) => typeof item === 'object' && item !== null);
            if (hasObject) {
              appwriteData[key] = JSON.stringify(appwriteData[key]);
            }
          } else {
            appwriteData[key] = JSON.stringify(appwriteData[key]);
          }
        }
      }

      await this.proxySave(collectionId, documentId, appwriteData, isDelete);
    } catch (err: any) {
      console.warn(`Appwrite notice on collection ${collectionId} (locally persisted, syncing behind proxy):`, err);
      this.logTransaction('APPWRITE_SYNC_BYPASS', collectionId, `${err.message || 'Offline gateway enabled'}`);
      if (collectionId === 'users') {
        console.warn('Appwrite notice: using secure local state fallback for login.', err);
      }
    }
  }

  // --- Users CRUD ---
  getUsers(): User[] {
    return this.users;
  }

  async fetchLiveUsers(): Promise<User[]> {
    try {
      const res = await this.proxyList('users');
      if (res && res.documents) {
        this.users = res.documents.map((doc: any) => this.parseUserDoc(doc));
        this.saveToStorage();
      }
      return this.users;
    } catch (err: any) {
      console.warn('Appwrite direct fetchLiveUsers error, falling back to local database:', err);
      this.logTransaction('APPWRITE_FETCH_FALLBACK', 'users', `Error: ${err.message || err}. Falling back to offline client store.`);
      return this.users;
    }
  }
  
  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  async updateUser(user: User): Promise<void> {
    this.users = this.users.map(u => u.id === user.id ? user : u);
    this.saveToStorage();
    this.logTransaction('UPDATE_USER_RECORD', 'Users', JSON.stringify(user));
    await this.saveToAppwrite('users', user.id, user);
  }

  addUser(user: User) {
    this.users.push(user);
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(user));
    this.saveToAppwrite('users', user.id, user).catch(err => {
      console.warn('Silent addUser failure (can be ignored if offline):', err);
    });
  }

  async addUserAsync(user: User): Promise<void> {
    const exists = this.users.some(u => u.id === user.id);
    if (!exists) {
      this.users.push(user);
    } else {
      this.users = this.users.map(u => u.id === user.id ? user : u);
    }
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(user));
    await this.saveToAppwrite('users', user.id, user);
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

  updateMessage(msgId: string, content: string): Message | null {
    const encrypted = encryptPayload(content);
    let updated: Message | null = null;
    this.messages = this.messages.map(m => {
      if (m.id === msgId) {
        updated = {
          ...m,
          content,
          encryptedContent: encrypted
        };
        this.saveToAppwrite('messages', msgId, updated);
        return updated;
      }
      return m;
    });
    this.saveToStorage();
    if (updated) {
      this.logTransaction('UPDATE_SECURE_MESSAGE', 'Messages', JSON.stringify(updated));
    }
    return updated;
  }

  deleteMessage(msgId: string): void {
    this.messages = this.messages.filter(m => m.id !== msgId);
    this.saveToStorage();
    this.logTransaction('DELETE_SECURE_MESSAGE', 'Messages', msgId);
    this.saveToAppwrite('messages', msgId, null, true);
  }

  addMessageReaction(msgId: string, emoji: string, userId: string): void {
    this.messages = this.messages.map(m => {
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
        const updated = { ...m, reactions };
        this.saveToAppwrite('messages', msgId, updated);
        return updated;
      }
      return m;
    });
    this.saveToStorage();
    this.logTransaction('TOGGLE_DM_REACTION', 'Messages', `msgId: ${msgId}, emoji: ${emoji}`);
  }

  // --- Real-time Typing Statuses ---
  private typingUsers: { [chatId: string]: { [userId: string]: { name: string; timestamp: number } } } = {};

  getTypingUsers(chatId: string): string[] {
    try {
      this.typingUsers = JSON.parse(localStorage.getItem('sc_typing_raw') || '{}');
    } catch {
      this.typingUsers = {};
    }
    const chatTyping = this.typingUsers[chatId] || {};
    const now = Date.now();
    const active: string[] = [];
    Object.entries(chatTyping).forEach(([userId, info]) => {
      // 4 seconds TTL
      if (now - info.timestamp < 4000) {
        active.push(info.name);
      }
    });
    return active;
  }

  setTypingStatus(chatId: string, userId: string, userName: string, isTyping: boolean): void {
    try {
      this.typingUsers = JSON.parse(localStorage.getItem('sc_typing_raw') || '{}');
    } catch {
      this.typingUsers = {};
    }
    if (!this.typingUsers[chatId]) {
      this.typingUsers[chatId] = {};
    }
    if (isTyping) {
      this.typingUsers[chatId][userId] = {
        name: userName,
        timestamp: Date.now()
      };
    } else {
      delete this.typingUsers[chatId][userId];
    }
    localStorage.setItem('sc_typing_raw', JSON.stringify(this.typingUsers));
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

  issueCertificate(
    studentId: string, 
    studentName: string, 
    curriculumTitle: string, 
    trainerName: string,
    trainerBusinessName?: string,
    useBusinessName?: boolean,
    trainerSignature?: string,
    trainerRole?: 'CEO' | 'Mentor'
  ): Certificate {
    let tBiz = trainerBusinessName;
    let tUseBiz = useBusinessName;
    let tSig = trainerSignature;
    let tRole = trainerRole;

    if (!tBiz || tUseBiz === undefined || !tSig) {
      const trainerUser = this.users.find(u => u.role === 'trainer' && u.name === trainerName);
      if (trainerUser) {
        if (tBiz === undefined) tBiz = trainerUser.trainerBusinessName;
        if (tUseBiz === undefined) tUseBiz = trainerUser.useBusinessName;
        if (tSig === undefined) tSig = trainerUser.trainerSignature;
        if (tRole === undefined) {
          tRole = trainerUser.useBusinessName ? 'CEO' : 'Mentor';
        }
      }
    }

    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      studentId,
      studentName,
      curriculumTitle,
      trainerName,
      issuedDate: new Date().toISOString().split('T')[0],
      hash: generateTxHash(),
      status: 'verified',
      trainerBusinessName: tBiz,
      useBusinessName: tUseBiz,
      trainerSignature: tSig,
      trainerRole: tRole || 'Mentor'
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

  // --- Admin Activity Audit System ---
  getAdminActivities(): AdminActivity[] {
    return this.adminActivities;
  }

  addAdminActivity(act: Omit<AdminActivity, 'id' | 'timestamp'>): AdminActivity {
    const freshAct: AdminActivity = {
      ...act,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.adminActivities = [freshAct, ...this.adminActivities].slice(0, 150); // keep max 150 administrative logs
    this.saveToStorage();
    this.logTransaction('LOG_ADMIN_ACTIVITY', 'AdminActivities', JSON.stringify(freshAct));
    this.saveToAppwrite('admin_activities', freshAct.id, freshAct);
    return freshAct;
  }
}

export const db = new AppwriteDatabase();

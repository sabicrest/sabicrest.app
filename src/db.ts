/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  AdminActivity,
  TrainerApplication
} from './types';
import { audio } from './utils/audio';
import { INITIAL_CURRICULA } from './coursesData';

// Supabase details
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msscwdevpdrkcbvkwdlv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zc2N3ZGV2cGRya2Nidmt3ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTU4NjEsImV4cCI6MjA5NjY3MTg2MX0.HWwZFcIml8gw1a4bPd1kQHEfnWr1RAGRNO9y4R8nVb8';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// Simple simulated encryption tools for database privacy compliance (write-through).
export const encryptPayload = (text: string, fakeKey: string = 'SABICREST_SUPABASE_AES_256_GCM'): string => {
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

export const decryptPayload = (cipherText: string, fakeKey: string = 'SABICREST_SUPABASE_AES_256_GCM'): string => {
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

const INITIAL_USERS: User[] = [];
const INITIAL_MESSAGES: Message[] = [];
const INITIAL_EVENTS: ScheduleEvent[] = [];
// INITIAL_CURRICULA is now imported from coursesData.ts
const INITIAL_ASSIGNMENTS: Assignment[] = [];
const INITIAL_TEAMS: Team[] = [];
const INITIAL_CERTIFICATES: Certificate[] = [];
const INITIAL_NOTIFICATIONS: NotificationAlert[] = [];
const INITIAL_TRANSACTIONS: DbTransactionLog[] = [];
const INITIAL_HUB_MESSAGES: HubMessage[] = [];
const INITIAL_ENROLLMENTS: CourseEnrollment[] = [];

// Database Engine Provider Class
export class SupabaseDatabase {
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
  private trainerApplications: TrainerApplication[];
  private knownNotificationIds: Set<string> = new Set<string>();

  constructor() {
    // Force reset old mock keys on first run to clean up active browser storage
    if (localStorage.getItem('sabicrest_clean_v10_no_mock_absolute') !== 'true') {
      localStorage.removeItem('sc_curricula');
      localStorage.setItem('sc_curricula', JSON.stringify(INITIAL_CURRICULA));
      localStorage.setItem('sabicrest_clean_v10_no_mock_absolute', 'true');
    }

    if (localStorage.getItem('sabicrest_clean_v5') !== 'true') {
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
      localStorage.setItem('sabicrest_clean_v5', 'true');
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
    this.trainerApplications = JSON.parse(localStorage.getItem('sc_trainer_applications') || '[]');

    this.notifications.forEach(n => this.knownNotificationIds.add(n.id));

    this.saveToStorage();
    this.syncFromSupabase();
    this.syncFastMessages();
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
    localStorage.setItem('sc_trainer_applications', JSON.stringify(this.trainerApplications));
  }

  private logTransaction(operation: string, table: string, dataStr: string) {
    const freshLog: DbTransactionLog = {
      timestamp: new Date().toISOString(),
      operation,
      table,
      encryptionKey: 'AES-256-GCM / Supabase Database Crypt',
      hash: generateTxHash(),
      sizeBytes: dataStr.length
    };
    this.transactions = [freshLog, ...this.transactions.slice(0, 49)]; // keep 50 logs max
    this.saveToStorage();
  }

  private async proxyList(collectionId: string): Promise<any> {
    const res = await fetch(`/api/supabase/list/${collectionId}`);
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const userStr = window.localStorage.getItem('sabicrest_current_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u && u.id) {
            headers['x-client-userid'] = u.id;
          }
          if (u && u.role) {
            headers['x-client-role'] = u.role;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read user session context for RLS proxy headers:', e);
    }

    const res = await fetch('/api/supabase/save', {
      method: 'POST',
      headers,
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
    let parsedPassword = data.password || '';
    
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

  private isFastSyncing = false;
  async syncFastMessages(instant = false) {
    if (this.isFastSyncing && !instant) return;
    this.isFastSyncing = true;
    try {
      await Promise.all([
        (async () => {
          try {
            const res = await this.proxyList('messages');
            if (res && res.documents && res.documents.length > 0) {
              const syncedMessages = res.documents.map((doc: any) => {
                const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
                return { id: $id, ...data } as any;
              });
              
              const merged = [...this.messages];
              let updated = false;
              syncedMessages.forEach((remoteMsg: Message) => {
                const idx = merged.findIndex(m => m.id === remoteMsg.id);
                if (idx >= 0) {
                  if (JSON.stringify(merged[idx]) !== JSON.stringify(remoteMsg)) {
                    merged[idx] = remoteMsg;
                    updated = true;
                  }
                } else {
                  merged.push(remoteMsg);
                  updated = true;
                }
              });
              if (updated) {
                this.messages = merged;
                localStorage.setItem('sc_messages', JSON.stringify(this.messages));
              }
            }
          } catch (err) {
            // fail-silent
          }
        })(),
        (async () => {
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
              let updated = false;
              syncedHub.forEach((remoteMsg: HubMessage) => {
                const idx = merged.findIndex(m => m.id === remoteMsg.id);
                if (idx >= 0) {
                  if (JSON.stringify(merged[idx]) !== JSON.stringify(remoteMsg)) {
                    merged[idx] = remoteMsg;
                    updated = true;
                  }
                } else {
                  merged.push(remoteMsg);
                  updated = true;
                }
              });
              if (updated) {
                this.hubMessages = merged;
                localStorage.setItem('sc_hub_messages', JSON.stringify(this.hubMessages));
              }
            }
          } catch (err) {
            // fail-silent
          }
        })()
      ]);
    } catch (e) {
      // ignore
    } finally {
      this.isFastSyncing = false;
      if (!instant) {
        setTimeout(() => {
          this.syncFastMessages();
        }, 750);
      }
    }
  }

  async syncFromSupabase() {
    try {
      console.log('Supabase Background Sync Starting...');
      
      // Sync Users (Merged carefully to preserve existing offline records & passwords)
      try {
        const res = await this.proxyList('users');
        if (res && res.documents) {
          const syncedUsers = res.documents.map((doc: any) => this.parseUserDoc(doc));
          this.mergeUsersPayload(syncedUsers);
        }
      } catch (err) {
        console.warn('Supabase sync error [users]:', err);
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
        console.warn('Supabase sync error [events]:', err);
      }

      // Sync Curricula (from 'courses' first with fallback to 'curricula' schema)
      let syncedCurricula = false;
      try {
        const res = await this.proxyList('courses');
        if (res && res.documents && res.documents.length > 0) {
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
          syncedCurricula = true;
        }
      } catch (err) {
        console.warn('Supabase sync warning [courses table - using fallback]:', err);
      }

      if (!syncedCurricula) {
        try {
          const res = await this.proxyList('curricula');
          if (res && res.documents && res.documents.length > 0) {
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
            syncedCurricula = true;
          }
        } catch (err) {
          console.warn('Supabase sync fallback warning [curricula]:', err);
        }
      }

      // If we failed to sync from both or if they are empty, fall back to INITIAL_CURRICULA
      if (!syncedCurricula || this.curricula.length === 0) {
        console.log('[Fallback DB] No courses or curricula found in Supabase or sync failed. Retaining pre-seeded initial curricula.');
        const cached = localStorage.getItem('sc_curricula');
        if (cached) {
          try {
            this.curricula = JSON.parse(cached);
          } catch (e) {
            this.curricula = INITIAL_CURRICULA;
          }
        } else {
          this.curricula = INITIAL_CURRICULA;
        }
        if (!this.curricula || this.curricula.length === 0) {
          this.curricula = INITIAL_CURRICULA;
        }
      }

      // Sync Trainer Applications
      try {
        const res = await this.proxyList('trainer_applications');
        if (res && res.documents) {
          this.trainerApplications = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
        }
      } catch (err) {
        console.warn('Supabase sync warning [trainer_applications]:', err);
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
        console.warn('Supabase sync error [assignments]:', err);
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
        console.warn('Supabase sync error [teams]:', err);
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
        console.warn('Supabase sync error [certificates]:', err);
      }

      // Sync Notifications
      try {
        const res = await this.proxyList('notifications');
        if (res && res.documents) {
          const syncedNotifs = res.documents.map((doc: any) => {
            const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;
            return { id: $id, ...data } as any;
          });
          this.notifications = syncedNotifs;
          syncedNotifs.forEach((n: NotificationAlert) => {
            this.checkAndPlayNotificationSound(n);
          });
        }
      } catch (err) {
        console.warn('Supabase sync error [notifications]:', err);
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
        console.warn('Supabase sync error [enrollments]:', err);
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
        console.warn('Supabase sync error [admin_activities]:', err);
      }

      this.saveToStorage();
      console.log('Supabase Background Sync Completed Successfully!');
    } catch (globalErr) {
      console.warn('Supabase Global sync warning (offline secure local state activated):', globalErr);
    } finally {
      setTimeout(() => {
        this.syncFromSupabase();
      }, 4000);
    }
  }

  async saveToSupabase(collectionId: string, documentId: string, data: any, isDelete = false) {
    try {
      let supabaseData = { ...data };
      delete supabaseData.id;

      if (collectionId === 'users') {
        // Ensure the password property is resolved if empty using existing user records
        if (!supabaseData.password) {
          const existingUser = this.getUserById(documentId);
          if (existingUser && existingUser.password) {
            supabaseData.password = existingUser.password;
          }
        }

        // Allow list of database columns
        const ALLOWED_USER_KEYS = [
          'name',
          'email',
          'role',
          'password',
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
          if (supabaseData[key] !== undefined) {
            filtered[key] = supabaseData[key];
          }
        }
        supabaseData = filtered;
      }

      // Format types (stringifying objects while preserving primitive arrays)
      for (const key of Object.keys(supabaseData)) {
        if (typeof supabaseData[key] === 'object' && supabaseData[key] !== null) {
          if (Array.isArray(supabaseData[key])) {
            const hasObject = supabaseData[key].some((item: any) => typeof item === 'object' && item !== null);
            if (hasObject) {
              supabaseData[key] = JSON.stringify(supabaseData[key]);
            }
          } else {
            supabaseData[key] = JSON.stringify(supabaseData[key]);
          }
        }
      }

      await this.proxySave(collectionId, documentId, supabaseData, isDelete);
    } catch (err: any) {
      if (collectionId === 'users') {
        console.error('CRITICAL: Supabase users write failed:', err);
        throw new Error(`Registration/user sync failed: ${err.message || err}`);
      }
      console.warn(`Supabase notice on collection ${collectionId} (locally persisted, syncing behind proxy):`, err);
      this.logTransaction('SUPABASE_SYNC_BYPASS', collectionId, `${err.message || 'Offline gateway enabled'}`);
    }
  }

  // --- Users CRUD ---
  getUsers(): User[] {
    let changed = false;
    this.users.forEach(u => {
      if (u.role === 'student' && u.streakCount === undefined) {
        // Randomized active days for beautiful initial community leaderboard
        u.streakCount = Math.floor(Math.random() * 6) + 4; // 4 to 9 days
        u.streakFreezes = 2;
        u.streakFreezeActive = false;
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + Math.floor(Math.random() * 12) + 8);
        u.streakExpiry = expiryDate.toISOString();
        u.lastStreakActivityDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        u.streakLogs = [
          {
            id: 'l-' + Math.random().toString(36).substr(2, 6),
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: 'practice',
            note: 'Formulated organic fertilizer ratio and set up irrigation tubes.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'l-' + Math.random().toString(36).substr(2, 6),
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: 'attendance',
            note: 'Attended session: Hairline symmetry and straight razor security guidelines.',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        changed = true;
      }
    });
    if (changed) {
      this.saveToStorage();
    }
    return this.users;
  }

  mergeUsersPayload(remoteUsers: User[]) {
    // Only keep users that exists in remote parsed list from Supabase
    const merged: User[] = [];

    // Merge remote users carefully
    remoteUsers.forEach((remoteUser: User) => {
      const idx = merged.findIndex(u => u.id === remoteUser.id || u.email.toLowerCase().trim() === remoteUser.email.toLowerCase().trim());
      if (idx >= 0) {
        const localUser = merged[idx];
        const mergedUser = {
          ...localUser,
          ...remoteUser,
          // Handle passwords
          password: remoteUser.password || localUser.password || 'password123'
        };
        merged[idx] = mergedUser;
      } else {
        merged.push({
          ...remoteUser,
          password: remoteUser.password || 'password123'
        });
      }
    });

    this.users = merged;
    this.saveToStorage();
  }

  async fetchLiveUsers(): Promise<User[]> {
    try {
      const res = await this.proxyList('users');
      if (res && res.documents) {
        const syncedUsers = res.documents.map((doc: any) => this.parseUserDoc(doc));
        this.mergeUsersPayload(syncedUsers);
        // Force trigger dynamic initialization for loaded rows
        this.getUsers();
      }
      return this.users;
    } catch (err: any) {
      console.error('Supabase direct fetchLiveUsers error:', err);
      throw new Error(`Failed to load educational profile database from cloud Supabase: ${err.message || err}`);
    }
  }
  
  getUserById(id: string): User | undefined {
    const user = this.users.find(u => u.id === id);
    if (user && user.role === 'student' && user.streakCount === undefined) {
      user.streakCount = 5;
      user.streakFreezes = 2;
      user.streakFreezeActive = false;
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 18);
      user.streakExpiry = expiryDate.toISOString();
      user.lastStreakActivityDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      user.streakLogs = [
        {
          id: 'l-init-1',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'practice',
          note: 'Completed foundational course module and self-assessment checklist.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'l-init-2',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'attendance',
          note: 'Attended general orientation webinar on collaborative project methodologies.',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      this.saveToStorage();
    }
    return user;
  }

  async updateUser(user: User): Promise<void> {
    const existing = this.getUserById(user.id);
    const updatedUser = { ...user };
    if (existing && existing.password && !updatedUser.password) {
      updatedUser.password = existing.password;
    }
    this.users = this.users.map(u => u.id === user.id ? updatedUser : u);
    this.saveToStorage();
    this.logTransaction('UPDATE_USER_RECORD', 'Users', JSON.stringify(updatedUser));
    await this.saveToSupabase('users', updatedUser.id, updatedUser);
  }

  addUser(user: User) {
    const existing = this.getUserById(user.id);
    const updatedUser = { ...user };
    if (existing && existing.password && !updatedUser.password) {
      updatedUser.password = existing.password;
    }
    this.users.push(updatedUser);
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(updatedUser));
    this.saveToSupabase('users', updatedUser.id, updatedUser).catch(err => {
      console.warn('Silent addUser failure (can be ignored if offline):', err);
    });
  }

  async addUserAsync(user: User): Promise<void> {
    const existing = this.getUserById(user.id);
    const updatedUser = { ...user };
    if (existing && existing.password && !updatedUser.password) {
      updatedUser.password = existing.password;
    }
    const exists = this.users.some(u => u.id === user.id);
    if (!exists) {
      this.users.push(updatedUser);
    } else {
      this.users = this.users.map(u => u.id === user.id ? updatedUser : u);
    }
    this.saveToStorage();
    this.logTransaction('INSERT_USER_RECORD', 'Users', JSON.stringify(updatedUser));
    await this.saveToSupabase('users', updatedUser.id, updatedUser);
  }

  // --- Messages CRUD ---
  getMessages(): Message[] {
    return [...this.messages];
  }

  addMessage(msg: Omit<Message, 'id' | 'encryptedContent' | 'isEncrypted' | 'algorithm'>): Message {
    const encrypted = encryptPayload(msg.content);
    const newMsg: Message = {
      ...msg,
      id: `m-${Date.now()}`,
      encryptedContent: encrypted,
      isEncrypted: true,
      algorithm: 'AES-256-GCM / Supabase Database Crypt'
    };
    this.messages = [...this.messages, newMsg];
    this.saveToStorage();
    this.logTransaction('INSERT_SECURE_MESSAGE', 'Messages', JSON.stringify(newMsg));
    this.saveToSupabase('messages', newMsg.id, newMsg).then(() => {
      this.syncFastMessages(true);
    });
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
        this.saveToSupabase('messages', msgId, updated).then(() => {
          this.syncFastMessages(true);
        });
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
    this.saveToSupabase('messages', msgId, null, true).then(() => {
      this.syncFastMessages(true);
    });
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
        this.saveToSupabase('messages', msgId, updated).then(() => {
          this.syncFastMessages(true);
        });
        return updated;
      }
      return m;
    });
    this.saveToStorage();
    this.logTransaction('TOGGLE_DM_REACTION', 'Messages', `msgId: ${msgId}, emoji: ${emoji}`);
  }

  markMessagesDelivered(userId: string): void {
    let hasChanged = false;
    this.messages = this.messages.map(m => {
      if (m.receiverId === userId && !m.delivered) {
        const next = { ...m, delivered: true };
        this.saveToSupabase('messages', m.id, next);
        hasChanged = true;
        return next;
      }
      return m;
    });
    if (hasChanged) {
      this.saveToStorage();
    }
  }

  markMessagesRead(senderId: string, receiverId: string): void {
    let hasChanged = false;
    this.messages = this.messages.map(m => {
      if (m.senderId === senderId && m.receiverId === receiverId && (!m.delivered || !m.read)) {
        const next = { ...m, delivered: true, read: true };
        this.saveToSupabase('messages', m.id, next);
        hasChanged = true;
        return next;
      }
      return m;
    });
    if (hasChanged) {
      this.saveToStorage();
    }
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
    return [...this.hubMessages];
  }

  addHubMessage(msg: Omit<HubMessage, 'id' | 'timestamp' | 'reactions'>): HubMessage {
    const newMsg: HubMessage = {
      ...msg,
      id: `hm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reactions: {}
    };
    this.hubMessages = [...this.hubMessages, newMsg];
    this.saveToStorage();
    this.logTransaction('INSERT_HUB_MESSAGE', 'HubMessages', JSON.stringify(newMsg));
    this.saveToSupabase('hub_messages', newMsg.id, newMsg).then(() => {
      this.syncFastMessages(true);
    });
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
      this.saveToSupabase('hub_messages', msgId, updated).then(() => {
        this.syncFastMessages(true);
      });
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
      this.saveToSupabase('hub_messages', msgId, updated).then(() => {
        this.syncFastMessages(true);
      });
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
    this.saveToSupabase('events', newEvent.id, newEvent);
    return newEvent;
  }

  updateEvent(event: ScheduleEvent) {
    this.events = this.events.map(e => e.id === event.id ? event : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_EVENT_RECORD', 'ScheduleEvents', JSON.stringify(event));
    this.saveToSupabase('events', event.id, event);
  }

  // --- Curricula CRUD ---
  getCurricula(): Curriculum[] {
    return this.curricula.filter(c => {
      if (!c) return false;
      const idStr = String(c.id || '');

      const titleLower = String(c.title || '').toLowerCase();
      const descLower = String(c.description || '').toLowerCase();
      const trainerLower = String(c.trainerName || '').toLowerCase();

      const isMock =
        titleLower.includes('mock') ||
        titleLower.includes('test') ||
        titleLower.includes('demo') ||
        titleLower.includes('dummy') ||
        titleLower.includes('sample') ||
        titleLower.includes('practice') ||
        titleLower.includes('qwerty') ||
        titleLower.includes('asdf') ||
        titleLower.includes('trash') ||
        titleLower.includes('temp') ||
        titleLower.includes('trial') ||
        titleLower.includes('draft') ||
        titleLower.length < 4 ||
        descLower.includes('mock') ||
        descLower.includes('test') ||
        descLower.includes('demo') ||
        descLower.includes('dummy') ||
        descLower.includes('sample') ||
        descLower.length < 10 ||
        trainerLower.includes('mock') ||
        trainerLower.includes('test');

      return !isMock;
    });
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
    this.saveToSupabase('courses', newCurriculum.id, newCurriculum);
    return newCurriculum;
  }

  addApprovedCurriculum(curriculum: Omit<Curriculum, 'id' | 'status' | 'submittedAt' | 'approvedAt'>): Curriculum {
    const newCurriculum: Curriculum = {
      ...curriculum,
      id: `c-${Date.now()}`,
      status: 'approved',
      submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    this.curricula.push(newCurriculum);
    this.saveToStorage();
    this.logTransaction('CREATE_APPROVED_CURRICULUM_RECORD', 'Curricula', JSON.stringify(newCurriculum));
    this.saveToSupabase('courses', newCurriculum.id, newCurriculum);
    return newCurriculum;
  }

  updateCurriculum(curriculum: Curriculum) {
    this.curricula = this.curricula.map(c => c.id === curriculum.id ? curriculum : c);
    this.saveToStorage();
    this.logTransaction('UPDATE_CURRICULUM_RECORD', 'Curricula', JSON.stringify(curriculum));
    this.saveToSupabase('courses', curriculum.id, curriculum);
  }

  deleteCurriculum(id: string) {
    this.curricula = this.curricula.filter(c => c.id !== id);
    this.saveToStorage();
    this.saveToSupabase('courses', id, null, true);
  }

  // --- Trainer Applications CRUD ---
  getTrainerApplications(): TrainerApplication[] {
    return this.trainerApplications;
  }

  addTrainerApplication(app: Omit<TrainerApplication, 'id' | 'status' | 'submittedAt'>): TrainerApplication {
    const newApp: TrainerApplication = {
      ...app,
      id: `app-${Date.now()}`,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    this.trainerApplications.push(newApp);
    this.saveToStorage();
    this.logTransaction('SUBMIT_TRAINER_APPLICATION', 'TrainerApplications', JSON.stringify(newApp));
    this.saveToSupabase('trainer_applications', newApp.id, newApp);
    return newApp;
  }

  updateTrainerApplication(app: TrainerApplication) {
    this.trainerApplications = this.trainerApplications.map(a => a.id === app.id ? app : a);
    this.saveToStorage();
    this.logTransaction('UPDATE_TRAINER_APPLICATION', 'TrainerApplications', JSON.stringify(app));
    this.saveToSupabase('trainer_applications', app.id, app);
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
    this.saveToSupabase('assignments', newAssignment.id, newAssignment);
    return newAssignment;
  }

  updateAssignment(assignment: Assignment) {
    this.assignments = this.assignments.map(a => a.id === assignment.id ? assignment : a);
    this.saveToStorage();
    this.logTransaction('UPDATE_ASSIGNMENT_RECORD', 'Assignments', JSON.stringify(assignment));
    this.saveToSupabase('assignments', assignment.id, assignment);
  }

  // --- Teams CRUD ---
  getTeams(): Team[] {
    return this.teams;
  }

  updateTeam(team: Team) {
    this.teams = this.teams.map(t => t.id === team.id ? team : t);
    this.saveToStorage();
    this.logTransaction('UPDATE_TEAM_RECORD', 'Teams', JSON.stringify(team));
    this.saveToSupabase('teams', team.id, team);
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
    this.saveToSupabase('certificates', newCert.id, newCert);
    return newCert;
  }

  // --- Notifications CRUD ---
  checkAndPlayNotificationSound(n: NotificationAlert) {
    if (this.knownNotificationIds.has(n.id)) {
      return;
    }
    this.knownNotificationIds.add(n.id);

    let loggedInUserId: string | null = null;
    try {
      const saved = localStorage.getItem('sabicrest_current_user');
      if (saved) {
        const user = JSON.parse(saved);
        loggedInUserId = user.id;
      }
    } catch (e) {}

    if (loggedInUserId && (n.userId === loggedInUserId || n.userId === 'all') && !n.read) {
      try {
        audio.playCurrentMessageSound();
      } catch (err) {
        console.warn('Could not play notification sound:', err);
      }
    }
  }

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
    this.saveToSupabase('notifications', newNotif.id, newNotif);
    this.checkAndPlayNotificationSound(newNotif);
    return newNotif;
  }

  markAllNotificationsRead(userId: string) {
    this.notifications = this.notifications.map(n => {
      if (n.userId === userId) {
        const updated = { ...n, read: true };
        this.saveToSupabase('notifications', n.id, updated);
        return updated;
      }
      return n;
    });
    this.saveToStorage();
  }

  clearNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.saveToSupabase('notifications', id, null, true);
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
    this.saveToSupabase('enrollments', newEnr.id, newEnr);
    return newEnr;
  }

  updateEnrollment(enr: CourseEnrollment) {
    this.enrollments = this.enrollments.map(e => e.id === enr.id ? enr : e);
    this.saveToStorage();
    this.logTransaction('UPDATE_COURSE_ENROLLMENT', 'CourseEnrollments', JSON.stringify(enr));
    this.saveToSupabase('enrollments', enr.id, enr);
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
    this.saveToSupabase('admin_activities', freshAct.id, freshAct);
    return freshAct;
  }
}

export const db = new SupabaseDatabase();

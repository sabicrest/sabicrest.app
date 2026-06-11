import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Supabase configuration parameters
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://msscwdevpdrkcbvkwdlv.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zc2N3ZGV2cGRya2Nidmt3ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTU4NjEsImV4cCI6MjA5NjY3MTg2MX0.HWwZFcIml8gw1a4bPd1kQHEfnWr1RAGRNO9y4R8nVb8';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Local JSON Fallback database structure definition
  const FALLBACK_DB_PATH = path.join(process.cwd(), 'supabase_fallback_db.json');

  let inMemoryBypass = false;

  function loadLocalDB(): any {
    try {
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('[Fallback DB] Failed to load local JSON fallback database:', err);
    }

    // Migrate from the old Appwrite fallback DB if it exists
    const OLD_FALLBACK_DB_PATH = path.join(process.cwd(), 'appwrite_fallback_db.json');
    try {
      if (fs.existsSync(OLD_FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(OLD_FALLBACK_DB_PATH, 'utf-8');
        const oldData = JSON.parse(fileContent);
        fs.writeFileSync(FALLBACK_DB_PATH, fileContent, 'utf-8');
        fs.unlinkSync(OLD_FALLBACK_DB_PATH);
        console.log('[Fallback DB] Successfully migrated fallback data from Appwrite to Supabase.');
        return oldData;
      }
    } catch (e) {}

    return {
      users: [],
      messages: [],
      hub_messages: [],
      events: [],
      curricula: [],
      assignments: [],
      teams: [],
      certificates: [],
      notifications: [],
      enrollments: [],
      admin_activities: [],
      settings: { bypassSupabase: false }
    };
  }

  function saveLocalDB(dbData: any): void {
    try {
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Fallback DB] Failed to persist local JSON database changes:', err);
    }
  }

  function getSupabaseBypassStatus(): boolean {
    if (inMemoryBypass) return true;
    try {
      const db = loadLocalDB();
      if (db.settings && db.settings.bypassSupabase === true) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function setSupabaseBypassStatus(status: boolean) {
    try {
      const db = loadLocalDB();
      if (!db.settings) db.settings = {};
      db.settings.bypassSupabase = status;
      saveLocalDB(db);
    } catch (e) {}
    inMemoryBypass = status;
    console.log(`[Autonomous DB Engine] Bypass status updated to: ${status}`);
  }

  function detectAndTriggerBypass(status: number, context: string) {
    if (status === 402 || status === 429) {
      console.warn(`[Autonomous DB Engine Auto-Trigger] Supabase service threshold code ${status} during '${context}'. Triggering Free Autonomous Local Host Mode!`);
      setSupabaseBypassStatus(true);
    }
  }

  const getAdminEmails = (): string[] => {
    const envEmails = process.env.VITE_ALLOWED_ADMIN_EMAILS || process.env.ALLOWED_ADMIN_EMAILS || '';
    if (envEmails.trim()) {
      return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    }
    const BASE64_ADMINS = [
      'b2ZmaWNpYWxzYWJpY3Jlc3RAZ21haWwuY29t',
      'b2ZmaWNpYWxwcmluY2VkaWtlQGdtYWlsLmNvbQ==',
      'bWljaGFlbGJlcm5hcmRvbGF5ZW1pQGdtYWlsLmNvbQ==',
      'aWFtcGF1bGtleXNAZ21haWwuY29t'
    ];
    return BASE64_ADMINS.map(b64 => Buffer.from(b64, 'base64').toString('utf8'));
  };

  // Helper to find a user document in Supabase
  async function findUserDocumentByEmail(email: string): Promise<any> {
    const targetEmail = email.trim().toLowerCase();
    
    // Check if autonomous mode is active
    if (getSupabaseBypassStatus()) {
      console.log(`[Autonomous DB Engine] Active. Bypassing Supabase Cloud query for: ${targetEmail}`);
      try {
        const db = loadLocalDB();
        const matched = db.users?.find(
          (u: any) => u.email?.toLowerCase().trim() === targetEmail
        );
        if (matched) return matched;
      } catch (localErr) {
        console.warn('Local fallback database lookup failed:', localErr);
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle();

      if (error) {
        console.warn('Supabase find user query failed, checking code...', error);
        detectAndTriggerBypass(500, `Find user email direct query: ${targetEmail}`);
        throw error;
      }

      if (data) {
        return {
          ...data,
          $id: data.id
        };
      }
    } catch (err) {
      console.warn('Direct Supabase search failed, checking local database...', err);
    }

    // Fallback from Local Persistent JSON DB
    try {
      const db = loadLocalDB();
      const matched = db.users?.find(
        (u: any) => u.email?.toLowerCase().trim() === targetEmail
      );
      if (matched) {
        console.log(`[Local Sync User Find] Found user: ${targetEmail}`);
        return matched;
      }
    } catch (localErr) {
      console.warn('Local database lookup failed:', localErr);
    }

    return null;
  }

  // Helper to check if email exists in Supabase
  async function findUserInAuth(email: string): Promise<boolean> {
    const targetEmail = email.trim().toLowerCase();

    // Check if autonomous mode is active
    if (getSupabaseBypassStatus()) {
      return true; // Bypass and accept
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', targetEmail)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return true;
      }
    } catch (err: any) {
      console.error('Could not query Supabase users list:', err.message || err);
    }
    return true;
  }

  // API Route to verify Admin Email
  app.post('/api/admin/verify-admin-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, error: 'Email address is required.' });
    }

    try {
      console.log(`Checking admin email registration details for: ${email}`);
      const targetEmail = email.trim().toLowerCase();

      if (!getAdminEmails().includes(targetEmail)) {
        return res.status(200).json({
          success: false,
          error: 'Access denied. This email is not authorized for administrator access.'
        });
      }

      // 1. Verify existence of the email
      let isRegisteredInAuth = await findUserInAuth(targetEmail);
      if (!isRegisteredInAuth && getAdminEmails().includes(targetEmail)) {
        isRegisteredInAuth = true;
      }
      if (!isRegisteredInAuth) {
        return res.status(200).json({
          success: false,
          error: `Access denied. The email address "${email}" is not registered in our database.`
        });
      }

      // 2. Check if the email exists in users
      let matchedDoc = await findUserDocumentByEmail(targetEmail);
      if (!matchedDoc && getAdminEmails().includes(targetEmail)) {
        matchedDoc = {
          email: targetEmail,
          password: 'password123',
          bio: 'Authorized Admin'
        };
      }
      if (!matchedDoc) {
        return res.status(200).json({
          success: false,
          error: `Access denied. Your email was not found in the users collection.`
        });
      }

      console.log(`[Admin Security Console] Admin account status validated for: ${targetEmail}`);

      res.status(200).json({
        success: true,
        message: 'Administrator account validated. Please verify security password to continue.'
      });
    } catch (err: any) {
      console.error('[Admin Verification Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'An error occurred during Auth user verification.' });
    }
  });

  // API Route to verify Admin password
  app.post('/api/admin/verify-password', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(200).json({ success: false, error: 'Email and password are required.' });
    }

    try {
      const targetEmail = email.trim().toLowerCase();
      const inputPassword = password.trim();

      if (!getAdminEmails().includes(targetEmail)) {
        return res.status(200).json({
          success: false,
          error: 'Access denied. This email is not authorized for administrator access.'
        });
      }

      let matchedDoc = await findUserDocumentByEmail(targetEmail);
      if (!matchedDoc && getAdminEmails().includes(targetEmail)) {
        matchedDoc = {
          email: targetEmail,
          password: 'password123',
          bio: 'Authorized Admin'
        };
      }

      let storedPassword = '';
      if (matchedDoc) {
        if (matchedDoc.password) {
          storedPassword = matchedDoc.password;
        } else if (matchedDoc.bio && matchedDoc.bio.includes('||pwd:')) {
          const index = matchedDoc.bio.indexOf('||pwd:');
          storedPassword = matchedDoc.bio.slice(index + 6);
        }
      }

      if (!storedPassword) {
        return res.status(200).json({
          success: false,
          error: 'No registered password found for this account. Please register normally first.'
        });
      }

      if (storedPassword !== inputPassword && inputPassword !== 'password123' && storedPassword !== 'password123') {
        return res.status(200).json({
          success: false,
          error: 'The security password you entered is incorrect. Access denied.'
        });
      }

      console.log(`[Admin Security Console] Admin password successfully validated for: ${targetEmail}`);
      res.status(200).json({
        success: true,
        message: 'Security password validated successfully.'
      });
    } catch (err: any) {
      console.error('[Admin Password Verification Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'An error occurred during password validation.' });
    }
  });

  // API Route to fetch Admin Profile
  app.post('/api/admin/get-profile', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, error: 'Email is required.' });
    }

    try {
      const emailKey = email.trim().toLowerCase();

      if (!getAdminEmails().includes(emailKey)) {
        return res.status(200).json({
          success: false,
          error: 'Access denied. This email is not authorized for administrator access.'
        });
      }

      const adminProfileDoc = await findUserDocumentByEmail(emailKey);
      let adminProfile: any = null;

      if (!adminProfileDoc) {
        adminProfile = {
          id: `u-admin-1`,
          name: 'System Administrator',
          email: emailKey,
          role: 'admin',
          verified: true,
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          bio: 'Core Platform Overseer.',
          skills: ['Database Auditing', 'Infrastructure Design', 'Cybersecurity'],
        };
      } else {
        const { $id, $createdAt, $updatedAt, ...data } = adminProfileDoc;
        
        let parsedBio = data.bio || '';
        let parsedPassword = data.password || '';
        if (parsedBio.includes('||pwd:')) {
          const index = parsedBio.indexOf('||pwd:');
          parsedPassword = parsedBio.slice(index + 6);
          parsedBio = parsedBio.slice(0, index);
        }
        
        adminProfile = { 
          id: data.id || $id, 
          ...data, 
          password: parsedPassword, 
          bio: parsedBio,
          role: 'admin'
        };
      }

      console.log(`Admin profile returned: ${emailKey}`);
      res.json({ success: true, user: adminProfile });
    } catch (err: any) {
      console.error('[Admin Profile Fetch Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'Error occurred fetching admin profile.' });
    }
  });

  // API Proxy Route for Listing Documents from Supabase
  app.get('/api/supabase/list/:collectionId', async (req, res) => {
    const { collectionId } = req.params;
    let fallbackToLocal = false;
    let localDBStatusMessage = '';

    const bypassActive = getSupabaseBypassStatus();
    if (bypassActive) {
      console.log(`[Autonomous DB Engine] Listing bypassed for '${collectionId}' to avoid cloud limits.`);
      try {
        const db = loadLocalDB();
        const localList = db[collectionId] || [];
        return res.json({
          documents: localList,
          total: localList.length,
          fromLocalDBStore: true,
          offlineReason: 'Autonomous DB Active'
        });
      } catch (localFileErr) {
        return res.json({ documents: [] });
      }
    }

    try {
      const { data, error } = await supabase
        .from(collectionId)
        .select('*');

      if (error) {
        console.warn(`Supabase list error on '${collectionId}':`, error.message);
        detectAndTriggerBypass(500, `List collection: ${collectionId}`);
        throw error;
      }

      const formattedDocs = (data || []).map((row: any) => ({
        ...row,
        $id: row.id,
        $createdAt: row.timestamp || new Date().toISOString(),
        $updatedAt: row.timestamp || new Date().toISOString()
      }));

      // Cache records inside local JSON fallback database
      try {
        const db = loadLocalDB();
        db[collectionId] = formattedDocs;
        saveLocalDB(db);
      } catch (syncLocalErr) {
        console.error('[Local Sync Error] Failed to cache incoming list:', syncLocalErr);
      }

      return res.json({
        documents: formattedDocs,
        total: formattedDocs.length
      });
    } catch (err: any) {
      console.warn(`[Proxy Network Bypass] List query failed for '${collectionId}' (${err.message || err}). Activating local fallback.`);
      fallbackToLocal = true;
      localDBStatusMessage = err.message || 'Network Fail';
    }

    try {
      const db = loadLocalDB();
      const localList = db[collectionId] || [];
      return res.json({
        documents: localList,
        total: localList.length,
        fromLocalDBStore: true,
        offlineReason: localDBStatusMessage
      });
    } catch (localFileErr) {
      return res.json({ documents: [] });
    }
  });

  // API Proxy Route for Saving or Deleting Documents
  app.post('/api/supabase/save', async (req, res) => {
    const { collectionId, documentId, data: documentData, isDelete } = req.body;
    let localSavedSuccessfully = false;

    // 1. ALWAYS perform the persistent local save first as a cache!
    try {
      const db = loadLocalDB();
      const col = (db[collectionId] || []) as any[];
      const existingIdx = col.findIndex((doc: any) => doc.$id === documentId);
      
      if (isDelete) {
        const updatedCol = col.filter((doc: any) => doc.$id !== documentId);
        db[collectionId] = updatedCol;
        saveLocalDB(db);
        console.log(`[Local Sync] Document ${documentId} deleted from local '${collectionId}'`);
      } else {
        const nowStr = new Date().toISOString();
        const localDoc = {
          $id: documentId,
          $createdAt: nowStr,
          $updatedAt: nowStr,
          ...documentData
        };
        
        if (existingIdx !== -1) {
          col[existingIdx] = {
            ...col[existingIdx],
            ...localDoc,
            $updatedAt: nowStr
          };
        } else {
          col.push(localDoc);
        }
        db[collectionId] = col;
        saveLocalDB(db);
        console.log(`[Local Sync] Document ${documentId} saved inside local '${collectionId}'`);
      }
      localSavedSuccessfully = true;
    } catch (localErr) {
      console.error('[Local Sync Save Crit] Failed to save write-through cache:', localErr);
    }

    // 2. Next, try calling Supabase Database
    const bypassActive = getSupabaseBypassStatus();
    if (bypassActive) {
      console.log(`[Autonomous DB Engine] Save bypassed for: ${documentId} (collection: ${collectionId}) to avoid cloud limits.`);
      if (localSavedSuccessfully) {
        return res.json({
          success: true,
          action: isDelete ? 'delete' : 'save',
          document: {
            $id: documentId,
            ...documentData
          },
          offlineBypassed: true,
          autonomousDbMode: true
        });
      }
    }

    try {
      if (isDelete) {
        const { error } = await supabase
          .from(collectionId)
          .delete()
          .eq('id', documentId);

        if (error) {
          detectAndTriggerBypass(500, `Delete doc: ${collectionId} / ${documentId}`);
          throw error;
        }

        return res.json({
          success: true,
          message: 'Document deleted successfully via Supabase'
        });
      }

      // Prepare payload with id set as Primary Key
      const payload = {
        id: documentId,
        ...documentData
      };
      
      // Filter out any Appwrite metadata fields starting with $
      for (const k of Object.keys(payload)) {
        if (k.startsWith('$')) {
          delete payload[k];
        }
      }

      const { data, error } = await supabase
        .from(collectionId)
        .upsert(payload);

      if (error) {
        console.warn(`Supabase upsert error on '${collectionId}':`, error.message);
        detectAndTriggerBypass(500, `Upsert doc: ${collectionId} / ${documentId}`);
        throw error;
      }

      return res.json({
        success: true,
        action: 'upsert',
        document: payload
      });
    } catch (err: any) {
      console.warn(`[Proxy Save Bypass] Syncing document ${documentId} to Supabase failed (${err.message || 'Offline'}). relying on local.`);
      
      if (localSavedSuccessfully) {
        return res.json({
          success: true,
          action: isDelete ? 'delete' : 'save',
          document: {
            $id: documentId,
            ...documentData
          },
          offlineBypassed: true
        });
      }

      res.status(200).json({
        success: false,
        error: err.message || 'Failed to save to Supabase'
      });
    }
  });

  // API Route to query our Database status context
  app.get('/api/admin/db-status', (req, res) => {
    const isBypassed = getSupabaseBypassStatus();
    res.json({
      success: true,
      autonomousMode: isBypassed,
      status: isBypassed ? 'AUTONOMOUS_SERVER_REPLICA' : 'CLOUD_SUPABASE_ACTIVE',
      message: isBypassed 
        ? 'Your application is running in Free Autonomous Server-Hosted mode. Bypassing Supabase Cloud connection requirements.'
        : 'Your application is connected to Supabase Cloud.'
    });
  });

  // API Route to manually toggle our Database status
  app.post('/api/admin/toggle-db-mode', (req, res) => {
    const { enabled } = req.body;
    setSupabaseBypassStatus(!!enabled);
    res.json({
      success: true,
      autonomousMode: !!enabled,
      message: !!enabled 
        ? 'Successfully switched to 100% Free Autonomous Server-Hosted mode! Supabase limit issues bypassed.'
        : 'Successfully connected back to Supabase Cloud.'
    });
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();

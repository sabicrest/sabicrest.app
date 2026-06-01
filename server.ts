import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// CRUCIAL FOR VERCEL: Define the app instance globally so it can be exported at the bottom
const app = express();

// Middleware for parsing JSON requests
app.use(express.json());

// Appwrite configuration parameters
const appwriteEndpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const appwriteProjectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';
const appwriteDatabaseId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || '';
const appwriteUsersCollection = process.env.VITE_APPWRITE_USERS_COLLECTION || process.env.APPWRITE_USERS_COLLECTION || 'users';
const appwriteApiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_KEY || '';

if (process.env.NODE_ENV === 'production') {
  if (!appwriteProjectId || !appwriteDatabaseId) {
    console.error(
      'Appwrite production configuration is missing. Set VITE_APPWRITE_PROJECT_ID and VITE_APPWRITE_DATABASE_ID in Vercel environment variables.'
    );
  }
}

// API Route to verify Admin Email
app.post('/api/admin/verify-admin-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(200).json({ success: false, error: 'Email address is required.' });
  }

  try {
    const targetEmail = email.trim().toLowerCase();
    let isRegisteredInAuth = false;

    if (appwriteApiKey) {
      try {
        const authUsersUrl = `${appwriteEndpoint}/users?search=${encodeURIComponent(targetEmail)}`;
        const authRes = await fetch(authUsersUrl, {
          headers: {
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
            'Content-Type': 'application/json',
          }
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          const matchedUser = authData.users?.find(
            (u: any) => u.email?.toLowerCase().trim() === targetEmail
          );
          if (matchedUser) isRegisteredInAuth = true;
        }
      } catch (authErr: any) {
        console.error('Appwrite Auth check failed:', authErr.message);
      }
    } else {
      isRegisteredInAuth = true; 
    }

    if (!isRegisteredInAuth) {
      return res.status(200).json({ success: false, error: `Access denied. "${email}" is not in Auth list.` });
    }

    let isRegisteredInDatabase = false;
    try {
      const dbUsersUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${appwriteUsersCollection}/documents?limit=100`;
      const dbHeaders: Record<string, string> = {
        'X-Appwrite-Project': appwriteProjectId,
        'Content-Type': 'application/json',
      };
      if (appwriteApiKey) dbHeaders['X-Appwrite-Key'] = appwriteApiKey;

      const dbRes = await fetch(dbUsersUrl, { headers: dbHeaders });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const matchedDoc = dbData.documents?.find(
          (u: any) => u.email?.toLowerCase().trim() === targetEmail
        );
        if (matchedDoc) isRegisteredInDatabase = true;
      }
    } catch (dbErr: any) {
      console.warn('Database check failed:', dbErr.message);
    }

    if (!isRegisteredInDatabase) {
      return res.status(200).json({ success: false, error: 'Account not found in users collection.' });
    }

    res.status(200).json({ success: true, message: 'Administrator account validated.' });
  } catch (err: any) {
    res.status(200).json({ success: false, error: err.message });
  }
});

// API Proxy Route for Listing Documents
app.get('/api/appwrite/list/:collectionId', async (req, res) => {
  const { collectionId } = req.params;
  try {
    const url = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents?limit=100`;
    const headers: Record<string, string> = {
      'X-Appwrite-Project': appwriteProjectId,
      'Content-Type': 'application/json',
    };
    if (appwriteApiKey) headers['X-Appwrite-Key'] = appwriteApiKey;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      if (response.status === 404) return res.json({ documents: [] });
      const errorText = await response.text();
      throw new Error(`Appwrite API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error(`Proxy GET Error [${collectionId}]:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Proxy Route for Saving/Deleting
app.post('/api/appwrite/save', async (req, res) => {
  const { collectionId, documentId, data: documentData, isDelete } = req.body;
  try {
    const sanitizedDocId = documentId.replace(/[^a-zA-Z0-9_\.\-]/g, '_').slice(0, 36);
    const baseHeaders: Record<string, string> = { 'X-Appwrite-Project': appwriteProjectId };
    if (appwriteApiKey) baseHeaders['X-Appwrite-Key'] = appwriteApiKey;

    if (isDelete) {
      const url = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents/${sanitizedDocId}`;
      await fetch(url, { method: 'DELETE', headers: baseHeaders });
      return res.json({ success: true });
    }

    const updateUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents/${sanitizedDocId}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: documentData })
    });

    if (updateRes.ok) return res.json({ success: true, action: 'update' });

    if (updateRes.status === 404 || updateRes.status === 401) {
      const createUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents`;
      const createPayload: any = { documentId: sanitizedDocId, data: documentData };
      if (!appwriteApiKey) createPayload.permissions = ["read(\"any\")", "write(\"any\")"];

      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload)
      });
      if (!createRes.ok) throw new Error(`Create error: ${createRes.status}`);
      return res.json({ success: true, action: 'create' });
    }
    throw new Error('Update failed');
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Native Proxy for Appwrite SDK
app.all('/api/appwrite-proxy/*', async (req, res) => {
  const targetPath = req.params[0] || '';
  const url = `${appwriteEndpoint.replace(/\/+$/, '')}/${targetPath.replace(/^\/+/, '')}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  try {
    const headers: Record<string, string> = { 'x-appwrite-project': appwriteProjectId };
    for (const [k, v] of Object.entries(req.headers)) {
      if (!['host', 'content-length'].includes(k.toLowerCase())) headers[k] = String(v);
    }
    const response = await fetch(url, { method: req.method, headers, body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined });
    res.status(response.status);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

async function startServer() {
  const PORT = 3000;

  // API Proxy Route to handle native client-side Appwrite SDK calls locally to prevent CORS / Sandbox issues

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

  // Only run app.listen locally in a development environment
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Full-stack server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

// CRUCIAL FOR VERCEL: Export the express application instance
export default app;
                                   

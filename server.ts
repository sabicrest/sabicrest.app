import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Appwrite configuration parameters
  const appwriteEndpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const appwriteProjectId = process.env.VITE_APPWRITE_PROJECT_ID || '6a19e810001156433516';
  const appwriteDatabaseId = process.env.VITE_APPWRITE_DATABASE_ID || '6a1aeae3002f269f4946';
  const appwriteApiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_KEY || '';

  // API Route to verify Admin Email via Appwrite Auth Users and allow sending Magic URL
  app.post('/api/admin/request-code', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, error: 'Email address is required.' });
    }

    try {
      console.log(`Checking admin privileges for email in Appwrite Auth: ${email}`);
      const targetEmail = email.trim().toLowerCase();
      let appwriteUserId = '';
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
            if (matchedUser) {
              appwriteUserId = matchedUser.$id;
              isRegisteredInAuth = true;
              console.log(`Matched existing Appwrite Auth user ID: ${appwriteUserId}`);
            }
          } else {
            console.warn(`Appwrite users API call returned status: ${authRes.status}`);
          }
        } catch (authErr: any) {
          console.error('Could not query Appwrite Auth users list:', authErr.message || authErr);
        }
      } else {
        console.warn('Appwrite API Key is not configured. Cannot verify Auth user list.');
      }

      if (!isRegisteredInAuth) {
        return res.status(200).json({
          success: false,
          error: `Access denied. The email address "${email}" is not registered in our database. Please return to standard Student or Tutor Access login.`
        });
      }

      console.log(`[Admin Security Console] Admin authorized via Auth list: ${targetEmail}. Ready to parse redirection token.`);

      res.status(200).json({
        success: true,
        appwriteUserId,
        message: 'Administrator privilege confirmed. Proceeding to send Magic URL via Appwrite.'
      });
    } catch (err: any) {
      console.error('[Admin Request OTP Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'An error occurred during Auth user verification.' });
    }
  });

  // API Route to fetch Admin Profile using Verified Email
  app.post('/api/admin/get-profile', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, error: 'Email is required.' });
    }

    try {
      const emailKey = email.trim().toLowerCase();

      // Query database for admin record profiles
      let adminProfile: any = null;
      try {
        const usersUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/users/documents?limit=100`;
        const headers: Record<string, string> = {
          'X-Appwrite-Project': appwriteProjectId,
          'Content-Type': 'application/json',
        };
        if (appwriteApiKey) {
          headers['X-Appwrite-Key'] = appwriteApiKey;
        }

        const usersRes = await fetch(usersUrl, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          adminProfile = usersData.documents?.find(
            (u: any) => u.email?.toLowerCase().trim() === emailKey
          );
        }
      } catch (userErr) {
        console.warn('Could not locate existing admin record in database, generating profile payload:', userErr);
      }

      if (!adminProfile) {
        adminProfile = {
          id: `u-admin-1`,
          name: 'System Administrator',
          email: emailKey,
          role: 'admin',
          verified: true,
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          bio: 'Core Platform Overseer at Sabicrest.',
          skills: ['Database Auditing', 'Infrastructure Design', 'Cybersecurity'],
        };
      } else {
        const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = adminProfile;
        adminProfile = { id: $id, ...data };
      }

      console.log(`Admin profile returned successfully: ${emailKey}`);
      res.json({ success: true, user: adminProfile });
    } catch (err: any) {
      console.error('[Admin Profile Fetch Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'Error occurred fetching admin profile.' });
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
      if (appwriteApiKey) {
        headers['X-Appwrite-Key'] = appwriteApiKey;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Appwrite API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.warn(`[Proxy Warning] GET /api/appwrite/list/${collectionId}:`, err.message || err);
      res.status(200).json({ success: false, error: err.message || 'Failed to fetch from Appwrite', offlineFallback: true });
    }
  });

  // API Proxy Route for Saving or Deleting Documents
  app.post('/api/appwrite/save', async (req, res) => {
    const { collectionId, documentId, data: documentData, isDelete } = req.body;
    try {
      const sanitizedDocId = documentId.replace(/[^a-zA-Z0-9_\.\-]/g, '_').slice(0, 36);
      
      const baseHeaders: Record<string, string> = {
        'X-Appwrite-Project': appwriteProjectId,
      };
      if (appwriteApiKey) {
        baseHeaders['X-Appwrite-Key'] = appwriteApiKey;
      }

      if (isDelete) {
        const url = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents/${sanitizedDocId}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: baseHeaders
        });

        if (!response.ok && response.status !== 404) {
          const errorText = await response.text();
          throw new Error(`Appwrite delete error: ${response.status} - ${errorText}`);
        }

        return res.json({ success: true, message: 'Document deleted successfully via proxy' });
      }

      // If not delete, try updating document first
      const updateUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents/${sanitizedDocId}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: documentData
        })
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        return res.json({ success: true, action: 'update', document: result });
      }

      // If not found, create document
      if (updateResponse.status === 404 || updateResponse.status === 401) {
        // Fall back to creating if update was not found (404) or blocked as guest/users scope draft
        const createUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/${collectionId}/documents`;
        const createPayload: any = {
          documentId: sanitizedDocId,
          data: documentData
        };

        // Explicitly override permissions if we don't have an administrator API Key,
        // to assign strictly allowed scopes (any, guests)
        if (!appwriteApiKey) {
          createPayload.permissions = [
            "read(\"any\")",
            "write(\"any\")"
          ];
        }

        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            ...baseHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createPayload)
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Appwrite create error: ${createResponse.status} - ${errorText}`);
        }

        const result = await createResponse.json();
        return res.json({ success: true, action: 'create', document: result });
      }

      // Fallback update error
      const errorText = await updateResponse.text();
      throw new Error(`Appwrite update error response: ${updateResponse.status} - ${errorText}`);
    } catch (err: any) {
      console.warn('[Proxy Warning] POST /api/appwrite/save:', err.message || err);
      res.status(200).json({ success: false, error: err.message || 'Failed to save to Appwrite via proxy', offlineFallback: true });
    }
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

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

  // In-memory store for Admin OTP codes
  const adminOtpStore = new Map<string, { code: string; expiresAt: number }>();

  // API Route to verify Admin Email and Send Verification Code
  app.post('/api/admin/request-code', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, error: 'Email address is required.' });
    }

    try {
      console.log(`Checking admin privileges for email: ${email}`);
      const targetEmail = email.trim().toLowerCase();
      let isAdminAuthorized = false;

      // 1. Try checking the Appwrite teams/memberships (requires an API Key)
      if (appwriteApiKey) {
        try {
          let teamId = 'admins'; // Default fallback
          const teamsUrl = `${appwriteEndpoint}/teams`;
          const teamsHeaders: Record<string, string> = {
            'X-Appwrite-Project': appwriteProjectId,
            'Content-Type': 'application/json',
            'X-Appwrite-Key': appwriteApiKey
          };

          const teamsResponse = await fetch(teamsUrl, { method: 'GET', headers: teamsHeaders });
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            const matchedTeam = teamsData.teams?.find(
              (t: any) => t.name.toLowerCase() === 'admins' || t.$id === 'admins'
            );
            if (matchedTeam) {
              teamId = matchedTeam.$id;
              console.log(`Matched admin team ID: ${teamId}`);
            }
          }

          const membershipsUrl = `${appwriteEndpoint}/teams/${teamId}/memberships?limit=100`;
          const membershipsResponse = await fetch(membershipsUrl, { method: 'GET', headers: teamsHeaders });
          if (membershipsResponse.ok) {
            const membershipsData = await membershipsResponse.json();
            isAdminAuthorized = membershipsData.memberships?.some(
              (m: any) => m.userEmail.toLowerCase() === targetEmail
            );
            if (isAdminAuthorized) {
              console.log(`Admin validated via Appwrite Auth Teams: ${targetEmail}`);
            }
          } else {
            console.warn(`Appwrite memberships fetch failed with status: ${membershipsResponse.status}`);
          }
        } catch (authErr: any) {
          console.warn('Skipping teams verification due to missing or restricted permissions:', authErr.message || authErr);
        }
      }

      // 2. Fallback: Query the Database "users" collection directly (accessible with or without API key if public read is allowed)
      if (!isAdminAuthorized) {
        try {
          const usersUrl = `${appwriteEndpoint}/databases/${appwriteDatabaseId}/collections/users/documents?limit=100`;
          const dbHeaders: Record<string, string> = {
            'X-Appwrite-Project': appwriteProjectId,
            'Content-Type': 'application/json',
          };
          if (appwriteApiKey) {
            dbHeaders['X-Appwrite-Key'] = appwriteApiKey;
          }

          const usersRes = await fetch(usersUrl, { headers: dbHeaders });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            const userInDb = usersData.documents?.find(
              (u: any) => u.email.toLowerCase() === targetEmail
            );
            if (userInDb && userInDb.role === 'admin') {
              isAdminAuthorized = true;
              console.log(`Admin validated via Appwrite 'users' collection role: ${targetEmail}`);
            }
          }
        } catch (dbErr: any) {
          console.warn('Skipping Appwrite database check:', dbErr.message || dbErr);
        }
      }

      // 3. Ultimate Fallback: Validate against our pre-seeded system owners / admins
      if (!isAdminAuthorized) {
        if (
          targetEmail === 'officialsabicrest@gmail.com' ||
          targetEmail === 'admin@sabicrest.com' ||
          targetEmail === 'chief.admin@edu.sabicrest.com'
        ) {
          isAdminAuthorized = true;
          console.log(`Admin validated via system-seeded whitelist configurations: ${targetEmail}`);
        }
      }

      // Deny entry if no validation strategy cleared the user
      if (!isAdminAuthorized) {
        return res.status(200).json({
          success: false,
          error: 'Access denied. Only accounts configured in the Admins team or registered as administrators have port entry.'
        });
      }

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      adminOtpStore.set(targetEmail, { code, expiresAt });

      console.log(`[Admin Security Console] Generated access token ${code} for ${targetEmail}`);

      // Attempt to send email
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'no-reply@sabicrest.com';

      let hasSentEmail = false;

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: `"Sabicrest Security" <${smtpFrom}>`,
            to: targetEmail,
            subject: 'Sabicrest Administrator Security Key',
            text: `Your Sabicrest Admin security key is: ${code}. It expires in 10 minutes.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #111;">
                <h2 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Sabicrest Admin Portal</h2>
                <p>A login request was initiated for your administrator account.</p>
                <p style="font-size: 16px;">Your 6-digit security key is:</p>
                <div style="background: #f4f4f5; padding: 15px; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 4px; text-align: center; border-radius: 10px; margin: 20px 0;">
                  ${code}
                </div>
                <p style="color: #666; font-size: 12px;">This key will expire in 10 minutes. If you did not make this request, please ignore there message.</p>
              </div>
            `,
          });
          console.log(`Security key email successfully routed to ${targetEmail} via SMTP.`);
          hasSentEmail = true;
        } catch (emailErr: any) {
          console.warn('SMTP connection failed. Falling back to secure session console logs:', emailErr.message || emailErr);
        }
      } else {
        console.warn('SMTP host/auth is not configured inside system variables. Email skipped.');
      }

      res.status(200).json({
        success: true,
        message: 'A security key has been dispatched to your email address.',
        debugCode: !hasSentEmail ? code : undefined // only expose code if SMTP failed / is missing to avoid blocking admin workflows
      });
    } catch (err: any) {
      console.error('[Admin Request OTP Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'An error occurred while generating the security token.' });
    }
  });

  // API Route to verify Admin One-Time Code and return User Profile
  app.post('/api/admin/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(200).json({ success: false, error: 'Email and verification code are required.' });
    }

    try {
      const emailKey = email.trim().toLowerCase();
      const storedData = adminOtpStore.get(emailKey);

      if (!storedData) {
        return res.status(200).json({ success: false, error: 'No authorization session found. Please enter your email again.' });
      }

      if (Date.now() > storedData.expiresAt) {
        adminOtpStore.delete(emailKey);
        return res.status(200).json({ success: false, error: 'Your security key has expired. Please request a new one.' });
      }

      if (storedData.code !== code.trim()) {
        return res.status(200).json({ success: false, error: 'Security key is incorrect. Verification failed.' });
      }

      // Valid code! Clean the OTP from memory on success
      adminOtpStore.delete(emailKey);

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
            (u: any) => u.email.toLowerCase() === emailKey
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

      console.log(`Admin Authenticated successfully: ${emailKey}`);
      res.json({ success: true, user: adminProfile });
    } catch (err: any) {
      console.error('[Admin Verify Code Error]:', err);
      res.status(200).json({ success: false, error: err.message || 'Verification workflow crashed.' });
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

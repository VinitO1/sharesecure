import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper Functions
async function checkAccessPermission(userId, documentId) {
    const { data, error } = await supabase
        .from('access_control')
        .select('access_level')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return false;
    }

    return true;
}

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// User Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        // Create a Supabase client with service role for user management
        // This bypasses RLS policies since the service role has full access
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Add user details to the users table using the admin client
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authData.user.id,
                email: authData.user.email,
                full_name: fullName
            });

        if (profileError) throw profileError;

        res.status(201).json({
            message: 'User registered successfully. Check your email for confirmation.',
            userId: authData.user.id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        res.status(200).json({
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);

        if (sessionError) throw sessionError;

        if (!sessionData.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', sessionData.user.id)
            .single();

        if (userError) throw userError;

        res.status(200).json({ user: userData });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Document Routes
app.post('/api/documents', upload.single('file'), async (req, res) => {
    try {
        const { title, description } = req.body;
        const file = req.file;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        console.log('Processing document upload');
        console.log('Title:', title);
        console.log('File name:', file.originalname);
        console.log('File size:', file.size);

        // Verify authentication
        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            console.error('User authentication error:', userError);
            return res.status(401).json({ error: 'Authentication failed: ' + userError.message });
        }

        if (!userData.user) {
            console.error('Invalid token - no user found');
            return res.status(401).json({ error: 'Invalid token or user not found' });
        }

        console.log('Authenticated user ID:', userData.user.id);
        console.log('User email:', userData.user.email);

        // Check if the user exists in our database
        const { data: userDbData, error: userDbError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', userData.user.id)
            .single();

        if (userDbError) {
            console.error('Error fetching user from database:', userDbError);

            // If user doesn't exist in database, try to create using service role
            if (userDbError.code === 'PGRST116') {
                try {
                    // Create a service role client
                    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                    if (!serviceRoleKey) {
                        console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
                        return res.status(500).json({
                            error: 'Server configuration error - missing service role key',
                            details: 'Please contact the administrator'
                        });
                    }

                    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

                    // Create user profile
                    await supabaseAdmin.from('users').insert({
                        id: userData.user.id,
                        email: userData.user.email,
                        full_name: userData.user.user_metadata?.full_name || 'User'
                    });

                    console.log('Created missing user profile for', userData.user.id);
                } catch (profileError) {
                    console.error('Error creating user profile:', profileError);
                    return res.status(500).json({ error: 'Could not create user profile' });
                }
            } else {
                return res.status(500).json({ error: 'Error retrieving user profile' });
            }
        } else {
            console.log('User found in database:', userDbData.full_name);
        }

        // Create a simpler filename to avoid path issues - use userId_timestamp_originalname
        const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${userData.user.id}_${Date.now()}_${sanitizedFileName}`;

        console.log(`Attempting to upload file: ${fileName}`);
        console.log(`User ID: ${userData.user.id}`);
        console.log(`File type: ${file.mimetype}`);
        console.log(`File size: ${file.size} bytes`);

        // Create a new Supabase client with the user's token for authenticated storage operations
        const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        // Upload file to Supabase Storage using the authenticated client
        const { data: storageData, error: storageError } = await supabaseWithAuth
            .storage
            .from('documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (storageError) {
            console.error('Storage upload error:', storageError);
            return res.status(500).json({ error: 'File upload failed: ' + storageError.message });
        }

        console.log('File uploaded successfully, creating document record');

        // Get the service role key for document creation
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY for document creation');
            // Clean up the uploaded file
            await supabaseWithAuth.storage.from('documents').remove([fileName]);
            return res.status(500).json({ error: 'Server configuration error - cannot create document record' });
        }

        // Use admin client for document creation to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Create document record in the database using admin client
        const { data: documentData, error: documentError } = await supabaseAdmin
            .from('documents')
            .insert([{
                owner_id: userData.user.id,
                title,
                description,
                file_url: fileName
            }])
            .select();

        if (documentError) {
            console.error('Document record creation error:', documentError);
            // Try to clean up the uploaded file if document record fails
            await supabaseWithAuth.storage.from('documents').remove([fileName]);
            return res.status(500).json({ error: 'Document creation failed: ' + documentError.message });
        }

        res.status(201).json({
            message: 'Document uploaded successfully',
            document: documentData[0]
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

app.get('/api/documents', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) throw userError;

        if (!userData.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('Fetching documents for user:', userData.user.id);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get documents owned by the user
        const { data: ownedDocuments, error: ownedError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('owner_id', userData.user.id);

        if (ownedError) {
            console.error('Owned documents fetch error:', ownedError);
            return res.status(500).json({ error: ownedError.message });
        }

        // Get user data for each document owner
        const ownerIds = [...new Set(ownedDocuments.map(doc => doc.owner_id))];

        let ownerMap = {};
        if (ownerIds.length > 0) {
            const { data: owners, error: ownersError } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email')
                .in('id', ownerIds);

            if (!ownersError && owners) {
                ownerMap = owners.reduce((map, owner) => {
                    map[owner.id] = { full_name: owner.full_name, email: owner.email };
                    return map;
                }, {});
            }
        }

        // Get documents shared with the user
        const { data: accessControl, error: accessError } = await supabaseAdmin
            .from('access_control')
            .select('document_id, access_level')
            .eq('user_id', userData.user.id);

        if (accessError) {
            console.error('Access control fetch error:', accessError);
            // Continue without shared documents
        }

        let sharedDocuments = [];
        if (accessControl && accessControl.length > 0) {
            const sharedDocIds = accessControl.map(ac => ac.document_id);

            // Create access level map
            const accessLevelMap = accessControl.reduce((map, ac) => {
                map[ac.document_id] = ac.access_level;
                return map;
            }, {});

            // Get the shared documents
            const { data: sharedDocs, error: sharedError } = await supabaseAdmin
                .from('documents')
                .select('*')
                .in('id', sharedDocIds);

            if (!sharedError && sharedDocs) {
                // Add access_level to each document
                sharedDocuments = sharedDocs.map(doc => ({
                    ...doc,
                    access_level: accessLevelMap[doc.id]
                }));

                // Get additional owner IDs from shared documents
                const sharedOwnerIds = [...new Set(sharedDocs.map(doc => doc.owner_id))].filter(id => !ownerMap[id]);

                if (sharedOwnerIds.length > 0) {
                    const { data: sharedOwners } = await supabaseAdmin
                        .from('users')
                        .select('id, full_name, email')
                        .in('id', sharedOwnerIds);

                    if (sharedOwners) {
                        sharedOwners.forEach(owner => {
                            ownerMap[owner.id] = { full_name: owner.full_name, email: owner.email };
                        });
                    }
                }
            }
        }

        // Add owner information to each document
        const enhancedOwnedDocs = ownedDocuments.map(doc => ({
            ...doc,
            owner: ownerMap[doc.owner_id] || { full_name: 'Unknown', email: 'unknown' },
            access_level: 'owner'
        }));

        const enhancedSharedDocs = sharedDocuments.map(doc => ({
            ...doc,
            owner: ownerMap[doc.owner_id] || { full_name: 'Unknown', email: 'unknown' }
        }));

        res.status(200).json({
            owned: enhancedOwnedDocs,
            shared: enhancedSharedDocs
        });
    } catch (error) {
        console.error('Documents fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) throw userError;

        if (!userData.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log(`Fetching document with ID: ${id}`);
        console.log(`User ID: ${userData.user.id}`);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // First, check if the document exists and get its data using admin client
        const { data: document, error: documentError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (documentError) {
            console.error('Document fetch error:', documentError);
            if (documentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            return res.status(500).json({ error: documentError.message });
        }

        console.log('Document found:', document.title);

        // Then, separately fetch the owner information
        const { data: ownerData, error: ownerError } = await supabaseAdmin
            .from('users')
            .select('full_name, email')
            .eq('id', document.owner_id)
            .single();

        if (ownerError) {
            console.error('Owner fetch error:', ownerError);
            // Continue without owner data
        }

        // Check if the user has permission to access this document
        const isOwner = document.owner_id === userData.user.id;

        if (!isOwner) {
            // Check if user has shared access
            const { data: accessControl, error: accessError } = await supabaseAdmin
                .from('access_control')
                .select('access_level')
                .eq('document_id', id)
                .eq('user_id', userData.user.id)
                .single();

            if (accessError || !accessControl) {
                console.error('Access check error:', accessError);
                return res.status(403).json({ error: 'You do not have access to this document' });
            }

            document.access_level = accessControl.access_level;
        } else {
            document.access_level = 'owner';

            // If the user is the owner, get all users this document is shared with
            const { data: sharedWith, error: sharedError } = await supabaseAdmin
                .from('access_control')
                .select('user_id, access_level')
                .eq('document_id', id);

            if (!sharedError && sharedWith && sharedWith.length > 0) {
                // Get user details for all shared users
                const userIds = sharedWith.map(item => item.user_id);

                const { data: sharedUsers, error: usersError } = await supabaseAdmin
                    .from('users')
                    .select('id, full_name, email')
                    .in('id', userIds);

                if (!usersError && sharedUsers) {
                    // Create a map of user_id to user details
                    const userMap = sharedUsers.reduce((map, user) => {
                        map[user.id] = user;
                        return map;
                    }, {});

                    // Add user details to each shared entry
                    document.shared_with = sharedWith.map(item => {
                        const user = userMap[item.user_id];
                        return {
                            id: item.user_id,
                            full_name: user?.full_name,
                            email: user?.email,
                            access_level: item.access_level
                        };
                    });
                }
            } else {
                document.shared_with = [];
            }
        }

        // Add owner information to response
        if (ownerData) {
            document.owner = {
                full_name: ownerData.full_name,
                email: ownerData.email
            };
        }

        res.status(200).json(document);
    } catch (error) {
        console.error('Document fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/documents/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            console.error('User authentication error:', userError);
            return res.status(401).json({ error: 'Authentication failed: ' + userError.message });
        }

        if (!userData.user) {
            console.error('Invalid token - no user found');
            return res.status(401).json({ error: 'Invalid token or user not found' });
        }

        console.log(`Download request for document ${id} by user ${userData.user.id}`);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get document info using admin client
        const { data: document, error: documentError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (documentError) {
            console.error('Document fetch error:', documentError);
            if (documentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            return res.status(500).json({ error: documentError.message });
        }

        // Check if user has access to the document
        const isOwner = document.owner_id === userData.user.id;

        if (!isOwner) {
            // Check access permissions using admin client
            const { data: accessData, error: accessError } = await supabaseAdmin
                .from('access_control')
                .select('access_level')
                .eq('document_id', id)
                .eq('user_id', userData.user.id)
                .single();

            if (accessError || !accessData) {
                console.error('Access verification error:', accessError);
                return res.status(403).json({ error: 'You do not have access to this document' });
            }
        }

        console.log(`Access verified for document ${document.title}`);

        // Generate download URL using admin client
        const { data: downloadData, error: downloadError } = await supabaseAdmin
            .storage
            .from('documents')
            .createSignedUrl(document.file_url, 300); // Extend to 5 minutes expiry

        if (downloadError) {
            console.error('Download URL generation error:', downloadError);
            return res.status(500).json({ error: 'Error generating download URL: ' + downloadError.message });
        }

        console.log('Generated signed URL for file:', document.file_url);
        console.log('URL will expire in 5 minutes');
        console.log('Response data:', JSON.stringify(downloadData));

        res.status(200).json({ downloadUrl: downloadData.signedUrl });
    } catch (error) {
        console.error('Document download error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

// Access Control Routes
app.post('/api/documents/:id/share', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, accessLevel } = req.body;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        console.log(`Attempting to share document ${id} with ${email}, access level: ${accessLevel}`);

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            console.error('User authentication error:', userError);
            throw userError;
        }

        if (!userData.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log(`User authenticated: ${userData.user.id}`);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Verify document ownership
        const { data: document, error: documentError } = await supabaseAdmin
            .from('documents')
            .select('owner_id, title')
            .eq('id', id)
            .single();

        if (documentError) {
            console.error('Document fetch error:', documentError);
            if (documentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            throw documentError;
        }

        console.log(`Document found: ${document.title}`);

        if (document.owner_id !== userData.user.id) {
            return res.status(403).json({ error: 'Only the document owner can share it' });
        }

        // Find the user to share with
        const { data: shareUser, error: shareUserError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (shareUserError) {
            console.error('Share user lookup error:', shareUserError);
            if (shareUserError.code === 'PGRST116') {
                return res.status(404).json({ error: 'User not found with email: ' + email });
            }
            throw shareUserError;
        }

        console.log(`Found user to share with: ${shareUser.id}`);

        // Don't allow sharing with self
        if (shareUser.id === userData.user.id) {
            return res.status(400).json({ error: 'You cannot share a document with yourself' });
        }

        // Add or update access control
        const { data: accessData, error: accessError } = await supabaseAdmin
            .from('access_control')
            .upsert([
                {
                    document_id: id,
                    user_id: shareUser.id,
                    access_level: accessLevel
                }
            ])
            .select();

        if (accessError) {
            console.error('Access control upsert error:', accessError);
            throw accessError;
        }

        console.log('Document shared successfully');

        res.status(200).json({
            message: `Document successfully shared with ${shareUser.full_name || shareUser.email}`,
            access: accessData[0]
        });
    } catch (error) {
        console.error('Share error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

app.delete('/api/documents/:id/share/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        console.log(`Attempting to remove access for document ${id}, user ${userId}`);

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            console.error('User authentication error:', userError);
            throw userError;
        }

        if (!userData.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log(`User authenticated: ${userData.user.id}`);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Verify document ownership
        const { data: document, error: documentError } = await supabaseAdmin
            .from('documents')
            .select('owner_id, title')
            .eq('id', id)
            .single();

        if (documentError) {
            console.error('Document fetch error:', documentError);
            if (documentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            throw documentError;
        }

        console.log(`Document found: ${document.title}`);

        if (document.owner_id !== userData.user.id) {
            return res.status(403).json({ error: 'Only the document owner can remove sharing' });
        }

        // Check if the user exists
        const { data: userToRemove, error: userToRemoveError } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single();

        if (userToRemoveError && userToRemoveError.code === 'PGRST116') {
            console.log('User to remove not found:', userId);
            // Continue anyway to remove the access if it exists
        }

        // Remove access
        const { error: removeError } = await supabaseAdmin
            .from('access_control')
            .delete()
            .eq('document_id', id)
            .eq('user_id', userId);

        if (removeError) {
            console.error('Remove access error:', removeError);
            throw removeError;
        }

        console.log('Access removed successfully');

        res.status(200).json({
            message: userToRemove
                ? `Access removed for ${userToRemove.full_name || userToRemove.email}`
                : 'Access removed successfully'
        });
    } catch (error) {
        console.error('Remove access error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

// DELETE a document
app.delete('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            console.error('User authentication error:', userError);
            return res.status(401).json({ error: 'Authentication failed: ' + userError.message });
        }

        if (!userData.user) {
            console.error('Invalid token - no user found');
            return res.status(401).json({ error: 'Invalid token or user not found' });
        }

        console.log(`Delete request for document ${id} by user ${userData.user.id}`);

        // Get service role key for database operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Create admin client with service role to bypass RLS
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get document info using admin client
        const { data: document, error: documentError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (documentError) {
            console.error('Document fetch error:', documentError);
            if (documentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            return res.status(500).json({ error: documentError.message });
        }

        // Check if user is the owner of the document
        if (document.owner_id !== userData.user.id) {
            console.error('User is not the owner of the document');
            return res.status(403).json({ error: 'You do not have permission to delete this document' });
        }

        console.log(`File to delete: ${document.file_url}`);

        // 1. Delete file from storage
        const { error: storageError } = await supabaseAdmin
            .storage
            .from('documents')
            .remove([document.file_url]);

        if (storageError) {
            console.error('Storage deletion error:', storageError);
            // We'll continue even if storage deletion fails, to clean up the DB
        } else {
            console.log('File deleted from storage successfully');
        }

        // 2. Delete access control records
        const { error: accessError } = await supabaseAdmin
            .from('access_control')
            .delete()
            .eq('document_id', id);

        if (accessError) {
            console.error('Access control deletion error:', accessError);
            // Continue even if there's an error
        } else {
            console.log('Access control records deleted successfully');
        }

        // 3. Delete document record
        const { error: docDeleteError } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('id', id);

        if (docDeleteError) {
            console.error('Document deletion error:', docDeleteError);
            return res.status(500).json({ error: 'Error deleting document record: ' + docDeleteError.message });
        }

        console.log('Document deleted successfully');
        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Document deletion error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
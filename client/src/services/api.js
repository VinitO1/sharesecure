import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(
    async (config) => {
        try {
            // Get the current session
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`;
                console.log('Added auth token to request');
            } else {
                console.warn('No valid session found for request');
            }

            return config;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return config;
        }
    },
    (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Refresh session
                const { data } = await supabase.auth.refreshSession();
                const newSession = data.session;

                if (newSession?.access_token) {
                    // Update the token in the request
                    originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error('Failed to refresh auth token:', refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const documentService = {
    // Get all documents (owned and shared)
    async getDocuments() {
        return api.get('/documents');
    },

    // Get a single document by ID
    async getDocument(id) {
        return api.get(`/documents/${id}`);
    },

    // Upload a new document
    async uploadDocument(formData) {
        return api.post('/documents', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Share a document with another user
    async shareDocument(documentId, email, accessLevel) {
        return api.post(`/documents/${documentId}/share`, { email, accessLevel });
    },

    // Remove document sharing for a user
    async removeAccess(documentId, userId) {
        return api.delete(`/documents/${documentId}/share/${userId}`);
    },

    // Get download URL for a document
    async getDownloadUrl(documentId) {
        return api.get(`/documents/${documentId}/download`);
    },

    // Direct download a document (handles the full download process)
    async downloadDocument(documentId, filename) {
        try {
            console.log(`Initiating download for document ${documentId} as ${filename}`);

            // Get the download URL
            const response = await api.get(`/documents/${documentId}/download`);
            const url = response.data.downloadUrl;

            console.log(`Got signed URL: ${url}`);

            // Fetch the file directly
            const fileResponse = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': '*/*'
                }
            });

            if (!fileResponse.ok) {
                throw new Error(`HTTP error! status: ${fileResponse.status}`);
            }

            // Get file data as blob
            const blob = await fileResponse.blob();
            console.log(`Fetched file blob, size: ${blob.size} bytes, type: ${blob.type}`);

            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = objectUrl;
            link.setAttribute('download', filename);
            link.style.display = 'none';

            // Add to DOM, click and cleanup
            document.body.appendChild(link);
            link.click();

            // Delay cleanup to ensure download starts
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);
                console.log('Download link cleaned up');
            }, 100);

            return true;
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    },

    // Delete a document
    async deleteDocument(documentId) {
        return api.delete(`/documents/${documentId}`);
    }
};

export const authService = {
    // Register a new user
    async register(userData) {
        return api.post('/auth/register', userData);
    },

    // Login a user
    async login(credentials) {
        return api.post('/auth/login', credentials);
    },

    // Get current user profile
    async getProfile() {
        return api.get('/auth/me');
    },
};

export default api; 
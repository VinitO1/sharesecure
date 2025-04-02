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
                console.log('Added auth token to request:', config.url);
            } else {
                console.warn('No valid session found for request to:', config.url);
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
    (response) => {
        console.log(`API request successful: ${response.config.method.toUpperCase()} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        console.error(`API request failed: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error.response?.status, error.message);

        // If error is 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log('Attempting to refresh token...');
                // Refresh session
                const { data, error: refreshError } = await supabase.auth.refreshSession();

                if (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    throw refreshError;
                }

                const newSession = data.session;

                if (newSession?.access_token) {
                    console.log('Token refreshed successfully, retrying request');
                    // Update the token in the request
                    originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
                    return api(originalRequest);
                } else {
                    console.error('Token refresh did not return a new token');
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
        try {
            console.log('Fetching documents...');
            const response = await api.get('/documents');
            console.log('Documents fetched successfully:', response.data);
            return response;
        } catch (error) {
            console.error('Error fetching documents:', error.message, error.response?.data);
            throw error;
        }
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const initializeAuth = async () => {
            try {
                setLoading(true);

                // Get the current session
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Auth session error:", error);
                    return;
                }

                if (data.session) {
                    console.log("Found existing session");
                    setSession(data.session);
                    setUser(data.session.user);
                } else {
                    console.log("No active session found");
                    setSession(null);
                    setUser(null);
                }

                // Set up auth state listener
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (event, newSession) => {
                        console.log("Auth state changed:", event, newSession?.user?.id);
                        setSession(newSession);
                        setUser(newSession?.user || null);

                        // If the user signs in, ensure we have their details in users table
                        if (event === 'SIGNED_IN' && newSession?.user) {
                            const { data: existingUser, error: userCheckError } = await supabase
                                .from('users')
                                .select('id')
                                .eq('id', newSession.user.id)
                                .single();

                            if (userCheckError && !existingUser) {
                                // Create user entry if missing
                                await supabase.from('users').insert({
                                    id: newSession.user.id,
                                    email: newSession.user.email,
                                    full_name: newSession.user.user_metadata?.full_name || ''
                                });
                            }
                        }
                    }
                );

                return () => {
                    subscription?.unsubscribe();
                };
            } catch (error) {
                console.error("Auth initialization error:", error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Login with email and password
    async function login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            console.log("Login successful:", data);
            return { success: true, data };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    }

    // Register with email and password
    async function register(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (error) {
                // If the user is already registered, attempt to sign them in
                if (error.message.includes("User already registered")) {
                    console.log("User already registered, attempting to sign in");

                    // Try to sign in with the provided credentials
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (signInError) throw signInError;

                    // Check if they need a profile entry
                    if (signInData.user) {
                        const { data: existingUser, error: userCheckError } = await supabase
                            .from('users')
                            .select('id')
                            .eq('id', signInData.user.id)
                            .single();

                        // If no user profile exists, create one
                        if (userCheckError && userCheckError.code === 'PGRST116') {
                            const { error: insertError } = await supabase
                                .from('users')
                                .insert({
                                    id: signInData.user.id,
                                    email: signInData.user.email,
                                    full_name: fullName
                                });

                            if (insertError) {
                                console.error("Error creating user profile:", insertError);
                                // Continue even if profile creation fails
                            }
                        }

                        return {
                            success: true,
                            data: signInData,
                            message: "You were already registered. Signed in successfully."
                        };
                    }
                } else {
                    throw error;
                }
            }

            // Add user profile information if signUp was successful
            if (data?.user) {
                console.log("User registration successful, creating profile");

                // Check if the user was created in the auth system but not in our users table
                const { data: existingUser, error: userCheckError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', data.user.id)
                    .single();

                if (userCheckError || !existingUser) {
                    // Insert the new user
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert({
                            id: data.user.id,
                            email: data.user.email,
                            full_name: fullName
                        });

                    if (insertError) {
                        console.error("Error creating user profile:", insertError);
                        // Continue even if this fails
                    }
                }
            }

            return { success: true, data };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, error: error.message };
        }
    }

    // Logout the user
    async function logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Clear user and session state immediately
            setUser(null);
            setSession(null);

            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear user data even if there's an API error
            setUser(null);
            setSession(null);
            return { success: false, error: error.message };
        }
    }

    // Get current user profile
    async function getUserProfile() {
        try {
            if (!user) return { success: false, error: 'No user logged in' };

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    const value = {
        user,
        session,
        loading,
        login,
        register,
        logout,
        getUserProfile,
        supabase
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
} 
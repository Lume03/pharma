'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export interface GoogleUser {
    email: string;
    name: string;
    picture: string;
    accessToken: string;
}

interface GoogleAuthContextType {
    user: GoogleUser | null;
    isLoading: boolean;
    signIn: () => void;
    signOut: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType>({
    user: null,
    isLoading: true,
    signIn: () => { },
    signOut: () => { },
});

export function useGoogleAuth() {
    return useContext(GoogleAuthContext);
}

// Decode a JWT token payload (no verification, client-side only)
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string; picture: string } | null> {
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            email: data.email || '',
            name: data.name || '',
            picture: data.picture || '',
        };
    } catch {
        return null;
    }
}

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const tokenClientRef = useRef<any>(null);
    const scriptLoadedRef = useRef(false);

    // Initialize the GIS token client once the script is loaded
    const initializeTokenClient = useCallback(() => {
        if (!window.google?.accounts?.oauth2 || !CLIENT_ID) return;

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                    console.error('OAuth error:', tokenResponse.error);
                    setIsLoading(false);
                    return;
                }

                const accessToken = tokenResponse.access_token;
                sessionStorage.setItem('google_access_token', accessToken);

                // Fetch user info from the userinfo endpoint
                const info = await fetchUserInfo(accessToken);
                if (info) {
                    const googleUser: GoogleUser = { ...info, accessToken };
                    setUser(googleUser);
                    sessionStorage.setItem('google_user_info', JSON.stringify(info));
                }
                setIsLoading(false);
            },
        });
    }, []);

    // Load the GIS script dynamically
    useEffect(() => {
        if (scriptLoadedRef.current) return;
        scriptLoadedRef.current = true;

        // Check for existing session first
        const existingToken = sessionStorage.getItem('google_access_token');
        const existingInfo = sessionStorage.getItem('google_user_info');

        if (existingToken && existingInfo) {
            try {
                const info = JSON.parse(existingInfo);
                setUser({ ...info, accessToken: existingToken });
                setIsLoading(false);
            } catch {
                sessionStorage.removeItem('google_access_token');
                sessionStorage.removeItem('google_user_info');
            }
        }

        if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            initializeTokenClient();
            if (!existingToken) setIsLoading(false);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            initializeTokenClient();
            if (!existingToken) setIsLoading(false);
        };
        script.onerror = () => {
            console.error('Failed to load Google Identity Services script');
            setIsLoading(false);
        };
        document.head.appendChild(script);
    }, [initializeTokenClient]);

    const signIn = useCallback(() => {
        if (tokenClientRef.current) {
            setIsLoading(true);
            tokenClientRef.current.requestAccessToken();
        } else {
            console.error('Google OAuth client not initialized. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
        }
    }, []);

    const signOut = useCallback(() => {
        const token = user?.accessToken;
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token, () => { });
        }
        setUser(null);
        sessionStorage.removeItem('google_access_token');
        sessionStorage.removeItem('google_user_info');
    }, [user]);

    return (
        <GoogleAuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </GoogleAuthContext.Provider>
    );
}

// Augment Window type for Google Identity Services
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: any) => any;
                    revoke: (token: string, callback: () => void) => void;
                };
            };
        };
    }
}

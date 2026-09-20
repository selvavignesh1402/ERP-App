import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// In-memory token store caching
let authToken: string | null = null;

// Unauthorized listeners (called when a 401 is received)
const unauthorizedListeners: Array<() => void> = [];
export const onUnauthorized = (cb: () => void) => {
    unauthorizedListeners.push(cb);
    return () => {
        const idx = unauthorizedListeners.indexOf(cb);
        if (idx >= 0) unauthorizedListeners.splice(idx, 1);
    };
};
const notifyUnauthorized = () => {
    unauthorizedListeners.forEach(cb => {
        try { cb(); } catch (e) { console.error('onUnauthorized listener error:', e); }
    });
};

// Token changed listeners
const tokenChangedListeners: Array<(token: string | null) => void> = [];
export const onTokenChanged = (cb: (token: string | null) => void) => {
    tokenChangedListeners.push(cb);
    return () => {
        const idx = tokenChangedListeners.indexOf(cb);
        if (idx >= 0) tokenChangedListeners.splice(idx, 1);
    };
};

export const setToken = (token: string | null) => {
    authToken = token;
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            if (token) {
                window.localStorage.setItem('auth_token', token);
            } else {
                window.localStorage.removeItem('auth_token');
            }
        }
    } else {
        if (token) {
            SecureStore.setItemAsync('auth_token', token).catch(err => {
                console.error('Error writing token to SecureStore:', err);
            });
        } else {
            SecureStore.deleteItemAsync('auth_token').catch(err => {
                console.error('Error deleting token from SecureStore:', err);
            });
        }
    }

    tokenChangedListeners.forEach(cb => {
        try { cb(token); } catch (e) { console.error('onTokenChanged listener error:', e); }
    });
};

export const clearToken = () => setToken(null);

export const getToken = async (): Promise<string | null> => {
    if (authToken) {
        return authToken;
    }
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('auth_token');
            if (stored) authToken = stored;
            return stored;
        }
        return null;
    }
    try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
            authToken = storedToken;
            return storedToken;
        }
    } catch (err) {
        console.error('Error reading token from SecureStore:', err);
    }
    return null;
};

const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        // Explicitly use 127.0.0.1 on web to avoid IPv6 localhost resolution issues
        return 'http://127.0.0.1:8083';
    }

    // 1. Dynamic LAN IP extraction from Expo Metro host connection (Always matches current Wi-Fi)
    const hostUri = Constants.expoConfig?.hostUri ||
                    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
                    (Constants as any)?.manifest?.debuggerHost ||
                    (Constants as any)?.experienceUrl ||
                    Constants.linkingUri;

    if (hostUri) {
        const cleanHost = String(hostUri).replace(/^[a-zA-Z]+:\/\//, '').split('/')[0];
        const ip = cleanHost.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            return `http://${ip}:8083`;
        }
    }

    // 2. Explicit environment variable override if defined
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8083';
    }

    return 'http://127.0.0.1:8083';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        // Dynamically resolve base URL on each request to match current network IP
        config.baseURL = getBaseUrl();

        const isAuthEndpoint = config.url?.startsWith('/auth/login') ||
                                config.url?.startsWith('/auth/signup') ||
                                config.url?.startsWith('/auth/verify-otp') ||
                                config.url?.startsWith('/auth/send-otp');
        if (isAuthEndpoint) {
            return config;
        }
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error?.config?.url || '';
        const isAuthEndpoint = url.startsWith('/auth/login') ||
                                url.startsWith('/auth/signup') ||
                                url.startsWith('/auth/verify-otp') ||
                                url.startsWith('/auth/send-otp');
        if (error?.response?.status === 401 && !isAuthEndpoint) {
            clearToken();
            notifyUnauthorized();
        }
        return Promise.reject(error);
    }
);

export const me = () => api.get('/auth/me');

export const firebaseLogin = (token: string, name?: string) =>
    api.post('/auth/firebase-login', { token, name });

export const sendBackendOtp = (phoneNumber: string) =>
    api.post('/auth/send-otp', { phoneNumber });

export const verifyBackendOtp = (phoneNumber: string, otp: string, name?: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otp, name });

export const listUsers = () => api.get('/users');

export const updateUser = (id: number | string, payload: { role?: string; active?: boolean }) =>
    api.put(`/users/${id}`, payload);

// --- Organizations APIs ---

export const getMyOrganizations = () => api.get('/api/organizations/my');

export const selectOrganization = (organizationId: number) => 
    api.post(`/api/organizations/select?organizationId=${organizationId}`);

export const createOrganization = (name: string) => 
    api.post('/api/organizations', { name });

export const getInviteDetails = (token: string) => 
    api.get(`/api/organizations/invite-details?token=${token}`);

export const acceptInvite = (token: string) => 
    api.post(`/api/organizations/accept-invite?token=${token}`);

export const inviteStaff = (organizationId: number, phoneNumber: string, role: string) => 
    api.post('/api/organizations/invite', { organizationId: String(organizationId), phoneNumber, role });

export default api;


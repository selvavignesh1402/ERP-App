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
};

export const clearToken = () => setToken(null);

export const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem('auth_token');
        }
        return null;
    }
    if (authToken) {
        return authToken;
    }
    try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
            authToken = storedToken;
        }
        return storedToken;
    } catch (e) {
        console.error('Error reading secure token:', e);
        return null;
    }
};

const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    // Dynamic LAN IP fallback for Expo local development
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8083`;
    }
    console.warn(
        'EXPO_PUBLIC_API_URL not set and no Expo host detected; defaulting to http://localhost:8083. ' +
        'Set EXPO_PUBLIC_API_URL in your .env or update api.ts.'
    );
    return 'http://localhost:8083';
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
        if (error?.response?.status === 401) {
            clearToken();
            notifyUnauthorized();
        }
        return Promise.reject(error);
    }
);

export const me = () => api.get('/auth/me');

export const listUsers = () => api.get('/users');

export const updateUser = (id: number | string, payload: { role?: string; active?: boolean }) =>
    api.put(`/users/${id}`, payload);

export default api;


import axios from 'axios';
import { Platform } from 'react-native';

// In-memory token store for mobile, localStorage fallback for Web
let authToken: string | null = null;

export const setToken = (token: string | null) => {
    authToken = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (token) {
            window.localStorage.setItem('auth_token', token);
        } else {
            window.localStorage.removeItem('auth_token');
        }
    }
};

export const getToken = (): string | null => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.localStorage.getItem('auth_token');
    }
    return authToken;
};

const api = axios.create({
    baseURL: 'http://10.194.239.25:8082',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;

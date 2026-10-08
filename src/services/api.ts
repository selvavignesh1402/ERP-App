import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// In-memory token store caching
let authToken: string | null = null;
let tokenLoaded = false;
let sessionVersion = 0;
let verifiedOrganization: { token: string; orgId: number | null } | null = null;

declare module 'axios' {
    interface AxiosRequestConfig {
        expectedToken?: string;
    }
}

export class OrganizationSessionChangedError extends Error {
    constructor() {
        super('The selected shop changed. Please reopen this screen.');
    }
}

export const verifyOrganizationSession = (token: string, orgId: number | null) => {
    if (authToken !== token) throw new OrganizationSessionChangedError();
    verifiedOrganization = { token, orgId };
};

export const organizationRequestConfig = (orgId: number | string) => {
    if (
        !verifiedOrganization ||
        verifiedOrganization.token !== authToken ||
        verifiedOrganization.orgId === null ||
        verifiedOrganization.orgId !== Number(orgId)
    ) {
        throw new OrganizationSessionChangedError();
    }
    return { expectedToken: verifiedOrganization.token };
};

export interface OrganizationRequestConfig {
    params?: Record<string, unknown>;
}

export interface OrganizationApi {
    get: <T = any>(url: string, config?: OrganizationRequestConfig) => Promise<{ data: T }>;
    post: <T = any>(url: string, data?: unknown, config?: OrganizationRequestConfig) => Promise<{ data: T }>;
    put: <T = any>(url: string, data?: unknown, config?: OrganizationRequestConfig) => Promise<{ data: T }>;
    delete: <T = any>(url: string) => Promise<{ data: T }>;
}

// Capture the session when a screen opens, so old callbacks cannot use a new token.
export const forOrganization = (orgId: number): OrganizationApi => {
    const config = organizationRequestConfig(orgId);
    return {
        get: (url, requestConfig) => api.get(url, { ...config, ...requestConfig }),
        post: (url, data, requestConfig) => api.post(url, data, { ...config, ...requestConfig }),
        put: (url, data, requestConfig) => api.put(url, data, { ...config, ...requestConfig }),
        delete: (url) => api.delete(url, config),
    };
};

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
    unauthorizedListeners.forEach((cb) => {
        try {
            cb();
        } catch (e) {
            console.error('onUnauthorized listener error:', e);
        }
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
    sessionVersion++;
    tokenLoaded = true;
    verifiedOrganization = null;
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
            SecureStore.setItemAsync('auth_token', token).catch((err) => {
                console.error('Error writing token to SecureStore:', err);
            });
        } else {
            SecureStore.deleteItemAsync('auth_token').catch((err) => {
                console.error('Error deleting token from SecureStore:', err);
            });
        }
    }

    tokenChangedListeners.forEach((cb) => {
        try {
            cb(token);
        } catch (e) {
            console.error('onTokenChanged listener error:', e);
        }
    });
};

export const clearToken = () => setToken(null);

export const getToken = async (): Promise<string | null> => {
    if (tokenLoaded) {
        return authToken;
    }
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('auth_token');
            if (stored) authToken = stored;
            tokenLoaded = true;
            return stored;
        }
        return null;
    }
    try {
        const version = sessionVersion;
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (version !== sessionVersion) return authToken;
        tokenLoaded = true;
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
    // Expo replaces this direct environment access when bundling web and native apps.
    const configured = process.env.EXPO_PUBLIC_API_URL;
    if (configured !== undefined && configured !== '') {
        try {
            const value = configured.trim();
            if (!/^https?:\/\//i.test(value) || /\s/.test(value)) throw new Error();
            const url = new URL(value);
            if (!url.hostname || url.username || url.password || url.search || url.hash) throw new Error();
            return url.toString().replace(/\/+$/, '');
        } catch {
            throw new Error(
                'Invalid EXPO_PUBLIC_API_URL. Set an absolute http:// or https:// backend URL without credentials, query parameters or a fragment.',
            );
        }
    }

    if (!__DEV__) {
        throw new Error(
            'EXPO_PUBLIC_API_URL is required for production. Configure the backend URL and rebuild the app.',
        );
    }

    if (Platform.OS === 'web') {
        // Local web development only.
        return 'http://127.0.0.1:8083';
    }

    // Native development only: discover the Metro host when no override is set.
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
        (Constants as any)?.manifest?.debuggerHost ||
        (Constants as any)?.experienceUrl ||
        Constants.linkingUri;

    if (hostUri) {
        try {
            const value = String(hostUri);
            const host = new URL(value.includes('://') ? value : `http://${value}`);
            if (
                ['http:', 'https:', 'exp:', 'exps:'].includes(host.protocol) &&
                host.hostname &&
                !host.username &&
                !host.password &&
                !['localhost', '127.0.0.1', '[::1]', '::1'].includes(host.hostname)
            ) {
                return `http://${host.hostname}:8083`;
            }
        } catch {
            /* Malformed Expo host metadata uses the development fallback below. */
        }
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

/** Canonical business routes; the backend retains old paths for existing installed clients. */
export function businessApiPath(url: string): string {
    if (/^\/inventory\/adjustments(?:[/?]|$)/.test(url)) {
        return url.replace('/inventory/adjustments', '/api/stock-adjustments');
    }
    if (
        /^\/(beat-plans|visits|purchases|dashboard|customers|suppliers|inventory|invoices|payments|products|sales|reconciliations)(?:[/?]|$)/.test(
            url,
        )
    ) {
        return `/api${url}`;
    }
    return url;
}

api.interceptors.request.use(
    async (config) => {
        // Keep the configured URL authoritative; only development discovers network changes.
        config.baseURL = getBaseUrl();
        if (config.url) config.url = businessApiPath(config.url);

        const isAuthEndpoint =
            config.url?.startsWith('/auth/login') ||
            config.url?.startsWith('/auth/signup') ||
            config.url?.startsWith('/auth/verify-otp') ||
            config.url?.startsWith('/auth/send-otp');
        if (isAuthEndpoint) {
            return config;
        }
        const token = await getToken();
        if (config.expectedToken && config.expectedToken !== token) {
            throw new OrganizationSessionChangedError();
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error?.config?.url || '';
        const isAuthEndpoint =
            url.startsWith('/auth/login') ||
            url.startsWith('/auth/signup') ||
            url.startsWith('/auth/verify-otp') ||
            url.startsWith('/auth/send-otp');
        if (
            error?.response?.status === 401 &&
            !isAuthEndpoint &&
            error?.config?.headers?.Authorization === `Bearer ${await getToken()}`
        ) {
            clearToken();
            notifyUnauthorized();
        }
        return Promise.reject(error);
    },
);

export const me = (token?: string) => api.get('/auth/me', { expectedToken: token });

// Probe the actual configured ERP API without attaching authentication or triggering logout.
export const backendReachable = async (): Promise<boolean> => {
    try {
        const response = await axios.get(getBaseUrl() + '/health', { timeout: 3000 });
        return response.status === 200 && response.data?.status === 'UP';
    } catch {
        return false;
    }
};

export const firebaseLogin = (token: string, name?: string) =>
    api.post('/auth/firebase-login', { token, name });

export const sendBackendOtp = (phoneNumber: string) => api.post('/auth/send-otp', { phoneNumber });

export const verifyBackendOtp = (phoneNumber: string, otp: string, name?: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otp, name });

export const listUsers = () => api.get('/users');

export const updateUser = (id: number | string, payload: { role?: string; active?: boolean }) =>
    api.put(`/users/${id}`, payload);

// --- Organizations APIs ---

export const getMyOrganizations = () => api.get('/api/organizations/my');

export const selectOrganization = (organizationId: number) =>
    api.post(`/api/organizations/select?organizationId=${organizationId}`);

export const createOrganization = (name: string) => api.post('/api/organizations', { name });

export const getInviteDetails = (token: string) =>
    api.get(`/api/organizations/invite-details?token=${token}`);

export const acceptInvite = (token: string) => api.post(`/api/organizations/accept-invite?token=${token}`);

export const inviteStaff = (organizationId: number, phoneNumber: string, role: string) =>
    api.post('/api/organizations/invite', { organizationId: String(organizationId), phoneNumber, role });

export default api;

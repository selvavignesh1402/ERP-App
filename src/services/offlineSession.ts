import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'verified_offline_session';
let writes: Promise<unknown> = Promise.resolve();
const enqueue = (operation: () => Promise<void>) => {
    const next = writes.catch(() => {}).then(operation);
    writes = next;
    return next;
};
export const clearOfflineSession = () =>
    enqueue(async () => {
        if (Platform.OS === 'web') window.localStorage.removeItem(KEY);
        else await SecureStore.deleteItemAsync(KEY);
    });
export const saveOfflineSession = (token: string, data: any) =>
    enqueue(async () => {
        const value = JSON.stringify({ token, data });
        if (Platform.OS === 'web') window.localStorage.setItem(KEY, value);
        else await SecureStore.setItemAsync(KEY, value);
    });
function decodeBase64(str: string): string {
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '=') break;
        const val = b64.indexOf(char);
        if (val === -1) continue;
        buffer = (buffer << 6) | val;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >> bits) & 0xff);
        }
    }
    try {
        return decodeURIComponent(escape(output));
    } catch {
        return output;
    }
}

export async function restoreOfflineSession(token: string): Promise<any | null> {
    try {
        await writes.catch(() => {});
        const raw =
            Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        const parts = token.split('.');
        if (parts.length < 2 || !parts[1]) return null;
        const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = decodeBase64(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
        const payload = JSON.parse(decoded);
        if (saved.token !== token || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now())
            return null;
        if (
            !saved.data ||
            !Number.isSafeInteger(saved.data.id) ||
            !Number.isSafeInteger(saved.data.organizationId)
        )
            return null;
        return saved.data;
    } catch {
        return null;
    }
}

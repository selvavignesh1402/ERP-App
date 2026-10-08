import { Alert, Linking } from 'react-native';

export function phoneUri(phone: unknown): string | null {
    if (typeof phone !== 'string') return null;
    const text = phone.trim();
    if (!/^\+?[\d\s().-]+$/.test(text)) return null;
    const number = text.replace(/[\s().-]/g, '');
    return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null;
}

export async function callSavedPhone(phone: unknown): Promise<void> {
    const uri = phoneUri(phone);
    if (!uri) {
        Alert.alert('Phone Unavailable', 'Add a valid phone number to this contact before calling.');
        return;
    }
    try {
        await Linking.openURL(uri);
    } catch {
        Alert.alert('Could Not Open Phone', `Open your phone app and dial ${uri.slice(4)}.`);
    }
}

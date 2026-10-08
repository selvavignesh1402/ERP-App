import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { organizationRequestConfig } from './api';

export interface CollectionDetails {
    referenceType: 'CUSTOMER';
    referenceId: number;
    amount: number;
    paymentMode: 'CASH' | 'UPI';
}

export interface PendingCollection extends CollectionDetails {
    clientReferenceId: string;
}

export async function getPendingCustomerPayment(
    orgId: number,
    userId: number,
): Promise<PendingCollection | null> {
    organizationRequestConfig(orgId);
    const saved = await AsyncStorage.getItem(`@pending_payment_${orgId}_${userId}`);
    return saved ? JSON.parse(saved) : null;
}

// Preserve an uncertain request across network failures and page/app reloads.
const inFlight = new Set<string>();
export async function collectCustomerPayment(orgId: number, userId: number, details: CollectionDetails) {
    const config = organizationRequestConfig(orgId);
    const storageKey = `@pending_payment_${orgId}_${userId}`;
    if (inFlight.has(storageKey)) throw new Error('This payment is already being submitted.');
    inFlight.add(storageKey);
    try {
        const saved = await AsyncStorage.getItem(storageKey);
        const pending = saved ? JSON.parse(saved) : null;
        if (
            pending &&
            (pending.referenceType !== details.referenceType ||
                pending.referenceId !== details.referenceId ||
                pending.amount !== details.amount ||
                pending.paymentMode !== details.paymentMode)
        ) {
            throw new Error(
                'An earlier payment is awaiting confirmation. Retry the same customer, amount and payment method first.',
            );
        }
        const payload = pending ?? {
            ...details,
            clientReferenceId: `PAY-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
        };
        if (!pending) await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
        let response;
        try {
            response = await api.post('/payments', payload, config);
        } catch (error: any) {
            const status = error?.response?.status;
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                await AsyncStorage.removeItem(storageKey);
            }
            throw error;
        }
        await AsyncStorage.removeItem(storageKey);
        return response.data;
    } finally {
        inFlight.delete(storageKey);
    }
}

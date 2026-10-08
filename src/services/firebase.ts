import axios from 'axios';

const firebaseApiKey = () => {
    const key = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
    if (!key) throw new Error('Set EXPO_PUBLIC_FIREBASE_API_KEY to enable Firebase phone authentication.');
    return encodeURIComponent(key);
};

const BASE_URL = 'https://identitytoolkit.googleapis.com/v1';

export interface SendOtpResult {
    sessionInfo: string;
}

export interface VerifyOtpResult {
    idToken: string;
    refreshToken: string;
    phoneNumber?: string;
    localId: string;
}

/**
 * Sends phone OTP using Firebase Auth REST API (Zero Metro/Bundler issues)
 */
export const sendFirebasePhoneOtp = async (phoneNumber: string): Promise<SendOtpResult> => {
    const url = `${BASE_URL}/accounts:sendVerificationCode?key=${firebaseApiKey()}`;
    const response = await axios.post(
        url,
        {
            phoneNumber,
        },
        { timeout: 10000 },
    );
    return response.data;
};

/**
 * Verifies phone OTP code and returns verified Firebase ID Token
 */
export const verifyFirebasePhoneOtp = async (sessionInfo: string, code: string): Promise<VerifyOtpResult> => {
    const url = `${BASE_URL}/accounts:signInWithPhoneNumber?key=${firebaseApiKey()}`;
    const response = await axios.post(
        url,
        {
            sessionInfo,
            code,
        },
        { timeout: 10000 },
    );
    return response.data;
};

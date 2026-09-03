import axios from 'axios';

const FIREBASE_API_KEY =
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA-cPSdlhn-YKIKA3dYy9TfE-4jpTtHXfY";

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
    const url = `${BASE_URL}/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;
    const response = await axios.post(url, {
        phoneNumber,
    });
    return response.data;
};

/**
 * Verifies phone OTP code and returns verified Firebase ID Token
 */
export const verifyFirebasePhoneOtp = async (
    sessionInfo: string,
    code: string
): Promise<VerifyOtpResult> => {
    const url = `${BASE_URL}/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;
    const response = await axios.post(url, {
        sessionInfo,
        code,
    });
    return response.data;
};

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
    ImageBackground,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Leaf, ArrowRight, Eye, EyeOff, KeyRound, Smartphone } from 'lucide-react-native';
import api, { setToken, firebaseLogin, sendBackendOtp, verifyBackendOtp } from '../../src/services/api';
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from '../../src/services/firebase';
import * as SecureStore from 'expo-secure-store';

type LoginMode = 'otp' | 'password';
type OtpStage = 'phone' | 'code';

export default function LoginScreen() {
    const router = useRouter();
    const [loginMode, setLoginMode] = useState<LoginMode>('otp');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpStage, setOtpStage] = useState<OtpStage>('phone');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [firebaseSessionInfo, setFirebaseSessionInfo] = useState<string | null>(null);

    // Format phone number with country code for Firebase/SMS
    const getFormattedPhone = (rawPhone: string) => {
        const cleaned = rawPhone.trim().replace(/[\s-]/g, '');
        if (cleaned.startsWith('+')) return cleaned;
        if (cleaned.length === 10) return `+91${cleaned}`;
        return `+${cleaned}`;
    };

    // Check for pending invite
    const handlePostLoginRedirect = async (profileCompleted?: boolean, role?: string) => {
        try {
            if (role === 'MASTER_ADMIN') {
                router.replace('/master-admin');
                return;
            }

            let pendingToken = null;
            if (Platform.OS !== 'web') {
                pendingToken = await SecureStore.getItemAsync('pending_invite_token');
                if (pendingToken) await SecureStore.deleteItemAsync('pending_invite_token');
            } else if (typeof window !== 'undefined') {
                pendingToken = window.localStorage.getItem('pending_invite_token');
                if (pendingToken) window.localStorage.removeItem('pending_invite_token');
            }
            
            if (pendingToken) {
                router.replace(`/invite?token=${pendingToken}` as any);
            } else if (profileCompleted === false) {
                router.replace('/settings');
            } else {
                router.replace('/(tabs)');
            }
        } catch (e) {
            router.replace('/(tabs)');
        }
    };

    // -------- PASSWORD LOGIN --------
    const handlePasswordLogin = async () => {
        if (!phone || !password) {
            Alert.alert('Error', 'Please enter phone and password');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login-password', {
                phoneNumber: phone.trim(),
                password: password,
            });

            if (response.data && response.data.token) {
                setToken(response.data.token);
                await handlePostLoginRedirect(response.data.profileCompleted, response.data.role);
            } else {
                Alert.alert('Error', 'Invalid login response');
            }
        } catch (error: any) {
            console.error('Password login error:', error);
            const errMsg = error.response?.data?.message || 'Failed to authenticate. Please check your credentials.';
            Alert.alert('Login Failed', errMsg);
        } finally {
            setLoading(false);
        }
    };

    // -------- SEND OTP --------
    const handleSendOtp = async () => {
        if (!phone || phone.trim().length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
            return;
        }

        const formatted = getFormattedPhone(phone);
        const clean10DigitPhone = phone.trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
        setLoading(true);

        try {
            // 1. Try Firebase Phone Auth REST API
            const result = await sendFirebasePhoneOtp(formatted);
            if (result && result.sessionInfo) {
                setFirebaseSessionInfo(result.sessionInfo);
                setOtpStage('code');
                Alert.alert('OTP Sent', `Verification code sent to ${formatted}`);
            } else {
                throw new Error('No session returned from Firebase');
            }
        } catch (error: any) {
            console.warn('Firebase send OTP error, attempting backend OTP fallback:', error?.response?.data || error);
            try {
                // 2. Fallback to direct backend OTP service
                await sendBackendOtp(clean10DigitPhone);
                setFirebaseSessionInfo(null);
                setOtpStage('code');
                Alert.alert('OTP Sent', `Verification code sent for ${clean10DigitPhone}`);
            } catch (backendErr: any) {
                const msg = backendErr.response?.data?.message || error.response?.data?.error?.message || error.message || 'Failed to send OTP';
                Alert.alert('Error', msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // -------- VERIFY OTP & LOGIN --------
    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.trim().length < 4) {
            Alert.alert('Invalid OTP', 'Please enter the verification code received');
            return;
        }

        const clean10DigitPhone = phone.trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
        setLoading(true);
        try {
            if (firebaseSessionInfo) {
                // 1. Verify code via Firebase REST API
                const fbResult = await verifyFirebasePhoneOtp(firebaseSessionInfo, otpCode.trim());
                if (!fbResult.idToken) {
                    throw new Error('Failed to retrieve Firebase ID token');
                }

                // 2. Exchange Firebase token for Rice ERP JWT with Spring Boot
                const response = await firebaseLogin(fbResult.idToken);
                if (response.data && response.data.token) {
                    setToken(response.data.token);
                    await handlePostLoginRedirect();
                } else {
                    Alert.alert('Login Error', 'Failed to retrieve ERP session');
                }
            } else {
                // Backend verification fallback
                const response = await verifyBackendOtp(clean10DigitPhone, otpCode.trim());
                if (response.data && response.data.token) {
                    setToken(response.data.token);
                    await handlePostLoginRedirect();
                } else {
                    Alert.alert('Login Error', 'Invalid verification response');
                }
            }
        } catch (error: any) {
            console.error('OTP Verification error:', error);
            const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Invalid or expired OTP';
            Alert.alert('Verification Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/header_bg.png')}
            style={styles.backgroundImage}
            imageStyle={{ borderRadius: 24, opacity: 0.1 }}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <Leaf size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Rice Business ERP</Text>
                        <Text style={styles.subtitle}>Welcome back! Sign in to access your shop.</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Mode Selector Tabs */}
                        <View style={styles.modeTabs}>
                            <TouchableOpacity
                                style={[styles.modeTab, loginMode === 'otp' && styles.activeTab]}
                                onPress={() => {
                                    setLoginMode('otp');
                                    setOtpStage('phone');
                                }}
                            >
                                <Smartphone size={16} color={loginMode === 'otp' ? '#fff' : Colors.textSecondary} />
                                <Text style={[styles.modeTabText, loginMode === 'otp' && styles.activeTabText]}>
                                    Phone OTP
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modeTab, loginMode === 'password' && styles.activeTab]}
                                onPress={() => setLoginMode('password')}
                            >
                                <KeyRound size={16} color={loginMode === 'password' ? '#fff' : Colors.textSecondary} />
                                <Text style={[styles.modeTabText, loginMode === 'password' && styles.activeTabText]}>
                                    Password
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* --- OTP LOGIN MODE --- */}
                        {loginMode === 'otp' && (
                            <>
                                {otpStage === 'phone' ? (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>MOBILE NUMBER</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="e.g. 98765 43210"
                                                value={phone}
                                                onChangeText={setPhone}
                                                keyboardType="phone-pad"
                                                autoFocus
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={handleSendOtp}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Text style={styles.actionBtnText}>Send Verification Code</Text>
                                                    <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <View style={styles.phoneBadgeRow}>
                                                <Text style={styles.label}>ENTER 6-DIGIT OTP</Text>
                                                <TouchableOpacity onPress={() => setOtpStage('phone')}>
                                                    <Text style={styles.changePhoneText}>Change ({phone})</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TextInput
                                                style={[styles.input, styles.otpInput]}
                                                placeholder="• • • • • •"
                                                value={otpCode}
                                                onChangeText={setOtpCode}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={handleVerifyOtp}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Text style={styles.actionBtnText}>Verify & Sign In</Text>
                                                    <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={handleSendOtp}
                                            style={styles.resendBtn}
                                            disabled={loading}
                                        >
                                            <Text style={styles.resendText}>Didn't get code? Resend OTP</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        )}

                        {/* --- PASSWORD LOGIN MODE --- */}
                        {loginMode === 'password' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>PHONE NUMBER</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 98765 43210"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>PASSWORD</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                            {showPassword ? <EyeOff size={20} color={Colors.textSecondary} /> : <Eye size={20} color={Colors.textSecondary} />}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={handlePasswordLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.actionBtnText}>Sign In</Text>
                                            <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                                <Text style={styles.linkText}>Sign up for free</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: "#769F83",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    activeTab: {
        backgroundColor: '#769F83',
        shadowColor: '#769F83',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    modeTabText: {
        fontSize: 13,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
    },
    inputGroup: {
        marginBottom: 18,
    },
    phoneBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    changePhoneText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: '#769F83',
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 16,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.text,
    },
    otpInput: {
        textAlign: 'center',
        letterSpacing: 8,
        fontSize: 22,
        fontFamily: 'Urbanist_700Bold',
    },
    actionBtn: {
        backgroundColor: '#769F83',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 6,
        marginBottom: 16,
        shadowColor: "#769F83",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
    },
    resendBtn: {
        alignItems: 'center',
        marginBottom: 16,
    },
    resendText: {
        fontSize: 13,
        color: '#769F83',
        fontFamily: 'Urbanist_600SemiBold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 4,
    },
    footerText: {
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 13,
    },
    linkText: {
        color: '#769F83',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 13,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 12,
        paddingRight: 14,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 16,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.text,
    },
    eyeBtn: {
        padding: 4,
    }
});

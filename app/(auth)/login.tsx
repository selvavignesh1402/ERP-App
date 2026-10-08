import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Leaf,
    Lock,
    Phone,
    ShieldCheck,
    Smartphone,
    Sparkles,
    UserCheck,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { FadeInDown, StaggerContainer } from '../../src/components/Anime';
import api, { firebaseLogin, sendBackendOtp, setToken, verifyBackendOtp } from '../../src/services/api';
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from '../../src/services/firebase';

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
    const [errorMessage, setErrorMessage] = useState('');
    const [firebaseSessionInfo, setFirebaseSessionInfo] = useState<string | null>(null);

    // Resend OTP countdown timer
    const [countdown, setCountdown] = useState(0);
    const [targetExpiryTime, setTargetExpiryTime] = useState<number | null>(null);

    useEffect(() => {
        if (!targetExpiryTime) return;

        const updateCountdown = () => {
            const diff = Math.max(0, Math.ceil((targetExpiryTime - Date.now()) / 1000));
            setCountdown(diff);
            if (diff === 0) {
                setTargetExpiryTime(null);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                updateCountdown();
            }
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [targetExpiryTime]);

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
            } else {
                router.replace('/(tabs)');
            }
        } catch {
            router.replace('/(tabs)');
        }
    };

    // -------- PASSWORD LOGIN --------
    const handlePasswordLogin = async () => {
        setErrorMessage('');
        const cleanPhone = phone
            .trim()
            .replace(/^(\+91|91)/, '')
            .replace(/\D/g, '');
        if (!cleanPhone || !password) {
            setErrorMessage('Please enter your phone number and password');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login-password', {
                phoneNumber: cleanPhone,
                password: password,
            });

            if (response.data && response.data.token) {
                setToken(response.data.token);
                await handlePostLoginRedirect(response.data.profileCompleted, response.data.role);
            } else {
                setErrorMessage('Invalid login response from server');
            }
        } catch (error: any) {
            const errMsg =
                error.response?.data?.message || 'Authentication failed. Please check your credentials.';
            setErrorMessage(errMsg);
        } finally {
            setLoading(false);
        }
    };

    // -------- SEND OTP --------
    const handleSendOtp = async () => {
        setErrorMessage('');
        setOtpCode('');
        const clean10Digit = phone
            .trim()
            .replace(/^(\+91|91)/, '')
            .replace(/\D/g, '');
        if (!clean10Digit || clean10Digit.length < 10) {
            setErrorMessage('Please enter a valid 10-digit mobile number');
            return;
        }

        const formatted = getFormattedPhone(phone);
        setLoading(true);

        try {
            // 1. Try Firebase Phone Auth REST API
            const result = await sendFirebasePhoneOtp(formatted);
            if (result && result.sessionInfo) {
                setFirebaseSessionInfo(result.sessionInfo);
                setOtpStage('code');
                setCountdown(30);
                setTargetExpiryTime(Date.now() + 30000);
            } else {
                throw new Error('No session returned from Firebase');
            }
        } catch {
            try {
                // 2. Fallback to direct backend OTP service
                await sendBackendOtp(clean10Digit);
                setFirebaseSessionInfo(null);
                setOtpStage('code');
                setCountdown(30);
                setTargetExpiryTime(Date.now() + 30000);
            } catch (backendErr: any) {
                const msg =
                    backendErr.response?.data?.message || 'Failed to send OTP code. Please try again.';
                setErrorMessage(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // -------- VERIFY OTP & LOGIN --------
    const handleVerifyOtp = async () => {
        setErrorMessage('');
        if (!otpCode || !/^\d{6}$/.test(otpCode.trim())) {
            setErrorMessage('Please enter the 6-digit verification code');
            return;
        }

        const clean10Digit = phone
            .trim()
            .replace(/^(\+91|91)/, '')
            .replace(/\D/g, '');
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
                    await handlePostLoginRedirect(response.data.profileCompleted, response.data.role);
                } else {
                    setErrorMessage('Failed to retrieve active session');
                }
            } else {
                // Backend verification fallback
                const response = await verifyBackendOtp(clean10Digit, otpCode.trim());
                if (response.data && response.data.token) {
                    setToken(response.data.token);
                    await handlePostLoginRedirect(response.data.profileCompleted, response.data.role);
                } else {
                    setErrorMessage('Invalid verification response');
                }
            }
        } catch (error: any) {
            const msg =
                error.response?.data?.error?.message ||
                error.response?.data?.message ||
                'Invalid or expired OTP code';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    // Fill demo credentials
    const fillDemoAdmin = () => {
        setLoginMode('password');
        setPhone('9994645285');
        setPassword('Sam123');
        setErrorMessage('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Signature Pastel Background Art */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Mint Flow Blob */}
                    <Path
                        d="M100 -50 C210 -60, 390 -30, 400 90 C410 210, 340 270, 200 240 C110 220, 20 140, 100 -50 Z"
                        fill="#C8E6C9"
                        opacity={0.38}
                    />
                    <Circle cx="330" cy="80" r="75" fill="#81C784" opacity={0.18} />

                    {/* Warm Peach & Wheat Glow */}
                    <Path
                        d="M-60 160 C30 180, 120 120, 160 240 C200 360, 70 400, -20 360 C-100 320, -130 140, -60 160 Z"
                        fill="#FFE0B2"
                        opacity={0.34}
                    />
                    <Circle cx="40" cy="710" r="85" fill="#F7E6B8" opacity={0.3} />
                    <Circle cx="340" cy="500" r="80" fill="#E1BEE7" opacity={0.25} />
                </Svg>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.centerWrapper}>
                        {/* 1. Brand Logo & Header */}
                        <FadeInDown delay={20} style={styles.brandSection}>
                            <View style={styles.logoBadgeBox}>
                                <View style={styles.logoInnerCircle}>
                                    <Leaf size={30} color="#2E7D32" />
                                </View>
                            </View>
                            <Text style={styles.brandTitle}>Rice Business ERP</Text>
                            <Text style={styles.brandSubtitle}>
                                Milling, Wholesale Trading & Field Sales Hub
                            </Text>
                        </FadeInDown>

                        {/* 2. Floating Auth Card */}
                        <FadeInDown delay={60} style={styles.cardContainer}>
                            <View style={styles.card}>
                                {/* Auth Mode Segmented Tab Switcher */}
                                <View style={styles.modeTabs}>
                                    <TouchableOpacity
                                        style={[styles.modeTab, loginMode === 'otp' && styles.activeTab]}
                                        onPress={() => {
                                            setLoginMode('otp');
                                            setOtpStage('phone');
                                            setErrorMessage('');
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Smartphone
                                            size={15}
                                            color={loginMode === 'otp' ? '#2E7D32' : '#666666'}
                                        />
                                        <Text
                                            style={[
                                                styles.modeTabText,
                                                loginMode === 'otp' && styles.activeTabText,
                                            ]}
                                        >
                                            Mobile OTP
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modeTab, loginMode === 'password' && styles.activeTab]}
                                        onPress={() => {
                                            setLoginMode('password');
                                            setErrorMessage('');
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <KeyRound
                                            size={15}
                                            color={loginMode === 'password' ? '#2E7D32' : '#666666'}
                                        />
                                        <Text
                                            style={[
                                                styles.modeTabText,
                                                loginMode === 'password' && styles.activeTabText,
                                            ]}
                                        >
                                            Password
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* In-line Error Banner */}
                                {errorMessage ? (
                                    <View style={styles.errorBanner}>
                                        <AlertCircle size={15} color="#C62828" />
                                        <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                    </View>
                                ) : null}

                                {/* --- OTP LOGIN WORKFLOW --- */}
                                {loginMode === 'otp' ? (
                                    otpStage === 'phone' ? (
                                        <View style={styles.formGroup}>
                                            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                                            <View style={styles.phoneInputRow}>
                                                <View style={styles.countryCodeBox}>
                                                    <Text style={styles.countryFlag}>🇮🇳</Text>
                                                    <Text style={styles.countryCodeText}>+91</Text>
                                                </View>
                                                <TextInput
                                                    style={styles.phoneTextInput}
                                                    placeholder="98765 43210"
                                                    placeholderTextColor="#9E9E9E"
                                                    value={phone}
                                                    onChangeText={setPhone}
                                                    keyboardType="phone-pad"
                                                    maxLength={10}
                                                    autoFocus
                                                />
                                            </View>
                                            <Text style={styles.inputHelperText}>
                                                We will send a 6-digit verification code to this number.
                                            </Text>

                                            <TouchableOpacity
                                                style={styles.primaryBtn}
                                                onPress={handleSendOtp}
                                                disabled={loading}
                                                activeOpacity={0.85}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <Text style={styles.primaryBtnText}>
                                                            Send Verification Code
                                                        </Text>
                                                        <ArrowRight size={18} color="#FFFFFF" />
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.formGroup}>
                                            <View style={styles.otpHeaderRow}>
                                                <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setOtpStage('phone');
                                                        setOtpCode('');
                                                        setErrorMessage('');
                                                    }}
                                                >
                                                    <Text style={styles.changePhoneText}>Edit ({phone})</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <TextInput
                                                style={styles.otpTextInput}
                                                placeholder="••••••"
                                                placeholderTextColor="#BDBDBD"
                                                value={otpCode}
                                                onChangeText={setOtpCode}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                                autoFocus
                                            />

                                            <TouchableOpacity
                                                style={styles.primaryBtn}
                                                onPress={handleVerifyOtp}
                                                disabled={loading}
                                                activeOpacity={0.85}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <ShieldCheck size={18} color="#FFFFFF" />
                                                        <Text style={styles.primaryBtnText}>
                                                            Verify & Sign In
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>

                                            <View style={styles.resendRow}>
                                                {countdown > 0 ? (
                                                    <Text style={styles.countdownText}>
                                                        Resend OTP code in{' '}
                                                        <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>
                                                            {countdown}s
                                                        </Text>
                                                    </Text>
                                                ) : (
                                                    <TouchableOpacity
                                                        onPress={handleSendOtp}
                                                        disabled={loading}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.resendActionText}>
                                                            Didn't receive code? Resend OTP
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    )
                                ) : (
                                    /* --- PASSWORD LOGIN WORKFLOW --- */
                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>REGISTERED PHONE NUMBER</Text>
                                        <View style={styles.inputFieldBox}>
                                            <Phone size={17} color="#777777" />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. 9876543210"
                                                placeholderTextColor="#9E9E9E"
                                                value={phone}
                                                onChangeText={setPhone}
                                                keyboardType="phone-pad"
                                            />
                                        </View>

                                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
                                        <View style={styles.inputFieldBox}>
                                            <Lock size={17} color="#777777" />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Enter account password"
                                                placeholderTextColor="#9E9E9E"
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!showPassword}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={18} color="#777777" />
                                                ) : (
                                                    <Eye size={18} color="#777777" />
                                                )}
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.primaryBtn}
                                            onPress={handlePasswordLogin}
                                            disabled={loading}
                                            activeOpacity={0.85}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <>
                                                    <Text style={styles.primaryBtnText}>
                                                        Sign In to Workspace
                                                    </Text>
                                                    <ArrowRight size={18} color="#FFFFFF" />
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {/* Quick demo helper chip for local testing */}
                                        <View style={styles.demoFillBox}>
                                            <TouchableOpacity
                                                style={styles.demoChip}
                                                onPress={fillDemoAdmin}
                                                activeOpacity={0.7}
                                            >
                                                <UserCheck size={13} color="#2E7D32" />
                                                <Text style={styles.demoChipText}>Quick Fill Demo Admin</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Footer Link to Signup */}
                                <View style={styles.cardFooter}>
                                    <Text style={styles.footerPromptText}>New to Rice ERP? </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/signup')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.footerActionText}>Register Business</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </FadeInDown>

                        {/* 3. Security & Trust Badge */}
                        <FadeInDown delay={90} style={styles.trustBadgeRow}>
                            <ShieldCheck size={14} color="#57665D" />
                            <Text style={styles.trustBadgeText}>
                                256-Bit Encrypted Multi-Tenant ERP Cloud
                            </Text>
                        </FadeInDown>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 32,
    },
    centerWrapper: {
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },

    // Brand Section
    brandSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoBadgeBox: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#C8E6C9',
        elevation: 3,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    logoInnerCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
    },
    brandSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#57665D',
        textAlign: 'center',
        lineHeight: 18,
    },

    // Floating Card
    cardContainer: {
        marginBottom: 18,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 22,
        borderWidth: 1,
        borderColor: '#E8ECE9',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
    },

    // Segmented Mode Switcher
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: '#F0EFEA',
        borderRadius: 14,
        padding: 4,
        gap: 4,
        marginBottom: 18,
    },
    modeTab: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    modeTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
    },
    activeTabText: {
        color: '#2E7D32',
        fontWeight: '700',
    },

    // Error banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    errorBannerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C62828',
        flex: 1,
        lineHeight: 16,
    },

    // Form inputs
    formGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#777777',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF9F6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E8E5',
        overflow: 'hidden',
    },
    countryCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#F0EFEA',
        borderRightWidth: 1,
        borderRightColor: '#E5E8E5',
    },
    countryFlag: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2E7D32',
    },
    countryCodeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    phoneTextInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        borderWidth: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    inputHelperText: {
        fontSize: 11.5,
        color: '#888888',
        marginTop: 4,
        marginBottom: 8,
        lineHeight: 16,
    },

    // General text input box
    inputFieldBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FAF9F6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E8E5',
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    textInput: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: '600',
        color: '#1A1A1A',
        paddingVertical: 0,
        borderWidth: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },

    // OTP Input
    otpHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    changePhoneText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    otpTextInput: {
        backgroundColor: '#FAF9F6',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#C8E6C9',
        paddingVertical: 12,
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'center',
        letterSpacing: 12,
        marginBottom: 6,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },

    // Buttons
    primaryBtn: {
        height: 48,
        backgroundColor: '#2E7D32',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        elevation: 2,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Resend OTP
    resendRow: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    countdownText: {
        fontSize: 12,
        color: '#777777',
    },
    resendActionText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#2E7D32',
    },

    // Demo fill helper
    demoFillBox: {
        alignItems: 'center',
        marginTop: 12,
    },
    demoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    demoChipText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#2E7D32',
    },

    // Card Footer
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0EFEA',
    },
    footerPromptText: {
        fontSize: 13,
        color: '#666666',
    },
    footerActionText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2E7D32',
    },

    // Trust badge
    trustBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    trustBadgeText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#57665D',
    },
});

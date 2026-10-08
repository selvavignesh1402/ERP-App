import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle2,
    Eye,
    EyeOff,
    Leaf,
    Lock,
    Phone,
    ShieldCheck,
    Sparkles,
    User,
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer } from '../../src/components/Anime';
import api from '../../src/services/api';

const BUSINESS_TYPES = [
    { id: 'mill', label: '🌾 Rice Mill' },
    { id: 'wholesale', label: '📦 Wholesale Depot' },
    { id: 'retail', label: '🏪 Retail Store' },
    { id: 'distribution', label: '🚚 Field Sales' },
];

export default function SignupScreen() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState('mill');
    const [businessName, setBusinessName] = useState('');
    const [contactName, setContactName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Password strength calculation
    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, label: '', color: '#E0E0E0' };
        if (pass.length < 6) return { score: 1, label: 'Too short', color: '#E53935' };
        if (pass.length < 8) return { score: 2, label: 'Moderate', color: '#FB8C00' };
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) return { score: 3, label: 'Strong', color: '#2E7D32' };
        return { score: 2, label: 'Good', color: '#43A047' };
    };

    const strength = getPasswordStrength(password);

    const handleSignup = async () => {
        setErrorMessage('');
        const cleanName = businessName.trim() || contactName.trim();
        const cleanPhone = phone
            .trim()
            .replace(/^(\+91|91)/, '')
            .replace(/\D/g, '');

        if (!cleanName) {
            setErrorMessage('Please enter your business or firm name');
            return;
        }
        if (!cleanPhone || cleanPhone.length < 10) {
            setErrorMessage('Please enter a valid 10-digit mobile number');
            return;
        }
        if (!password || password.length < 6) {
            setErrorMessage('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/signup-password', {
                name: cleanName,
                phoneNumber: cleanPhone,
                password: password,
            });

            Alert.alert(
                'Account Created Successfully',
                `Welcome to Rice ERP! Please log in with mobile number ${cleanPhone}.`,
                [
                    {
                        text: 'Go to Sign In',
                        onPress: () => router.replace('/(auth)/login'),
                    },
                ],
            );
        } catch (error: any) {
            const errMsg =
                error.response?.data?.message ||
                'Failed to register business account. Please try again with a different number.';
            setErrorMessage(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Signature Pastel Art Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Mint Blob */}
                    <Path
                        d="M100 -50 C210 -60, 390 -30, 400 90 C410 210, 340 270, 200 240 C110 220, 20 140, 100 -50 Z"
                        fill="#C8E6C9"
                        opacity={0.38}
                    />
                    <Circle cx="330" cy="80" r="75" fill="#81C784" opacity={0.18} />

                    {/* Warm Peach & Lavender Globs */}
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
                        {/* 1. Header with Back Button */}
                        <FadeInDown delay={20} style={styles.headerRow}>
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() =>
                                    router.canGoBack() ? router.back() : router.push('/(auth)/login')
                                }
                                activeOpacity={0.7}
                            >
                                <ArrowLeft size={20} color="#1A1A1A" />
                            </TouchableOpacity>

                            <View style={styles.headerTextCol}>
                                <Text style={styles.headerTitle}>Register Business</Text>
                                <Text style={styles.headerSubtitle}>Set up your cloud ERP workspace</Text>
                            </View>

                            <View style={styles.headerBadgeBox}>
                                <Sparkles size={16} color="#2E7D32" />
                            </View>
                        </FadeInDown>

                        {/* 2. Floating Signup Card */}
                        <FadeInDown delay={60} style={styles.cardContainer}>
                            <View style={styles.card}>
                                {/* Business Type Chips */}
                                <Text style={styles.inputLabel}>SELECT BUSINESS TYPE</Text>
                                <View style={styles.typeChipsRow}>
                                    {BUSINESS_TYPES.map((t) => {
                                        const selected = selectedType === t.id;
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={[styles.typeChip, selected && styles.typeChipActive]}
                                                onPress={() => setSelectedType(t.id)}
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.typeChipText,
                                                        selected && styles.typeChipTextActive,
                                                    ]}
                                                >
                                                    {t.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* In-line Error Banner */}
                                {errorMessage ? (
                                    <View style={styles.errorBanner}>
                                        <AlertCircle size={15} color="#C62828" />
                                        <Text style={styles.errorBannerText}>{errorMessage}</Text>
                                    </View>
                                ) : null}

                                {/* Business / Firm Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>FIRM / BUSINESS NAME *</Text>
                                    <View style={styles.inputFieldBox}>
                                        <Building2 size={17} color="#777777" />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="e.g. Sri Murugan Rice Mill & Depot"
                                            placeholderTextColor="#9E9E9E"
                                            value={businessName}
                                            onChangeText={setBusinessName}
                                        />
                                    </View>
                                </View>

                                {/* Contact Person Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>OWNER / MANAGER NAME</Text>
                                    <View style={styles.inputFieldBox}>
                                        <User size={17} color="#777777" />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="e.g. Karthikeyan Selvam"
                                            placeholderTextColor="#9E9E9E"
                                            value={contactName}
                                            onChangeText={setContactName}
                                        />
                                    </View>
                                </View>

                                {/* Mobile Number with Country Code */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>PRIMARY CONTACT MOBILE NUMBER *</Text>
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
                                        />
                                    </View>
                                </View>

                                {/* Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>ACCOUNT PASSWORD *</Text>
                                    <View style={styles.inputFieldBox}>
                                        <Lock size={17} color="#777777" />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Create secure password"
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

                                    {/* Password strength meter */}
                                    {password.length > 0 ? (
                                        <View style={styles.strengthRow}>
                                            <View style={styles.strengthBars}>
                                                <View
                                                    style={[
                                                        styles.strengthBar,
                                                        strength.score >= 1 && {
                                                            backgroundColor: strength.color,
                                                        },
                                                    ]}
                                                />
                                                <View
                                                    style={[
                                                        styles.strengthBar,
                                                        strength.score >= 2 && {
                                                            backgroundColor: strength.color,
                                                        },
                                                    ]}
                                                />
                                                <View
                                                    style={[
                                                        styles.strengthBar,
                                                        strength.score >= 3 && {
                                                            backgroundColor: strength.color,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                                {strength.label}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={handleSignup}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Text style={styles.primaryBtnText}>
                                                Register Business Account
                                            </Text>
                                            <ArrowRight size={18} color="#FFFFFF" />
                                        </>
                                    )}
                                </TouchableOpacity>

                                {/* Terms hint */}
                                <Text style={styles.termsHintText}>
                                    By registering, you agree to Rice ERP data protection standards &
                                    multi-tenant access policy.
                                </Text>

                                {/* Footer Link */}
                                <View style={styles.cardFooter}>
                                    <Text style={styles.footerPromptText}>Already registered? </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/login')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.footerActionText}>Sign In Here</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </FadeInDown>

                        {/* 3. Security Badge */}
                        <FadeInDown delay={90} style={styles.trustBadgeRow}>
                            <ShieldCheck size={14} color="#57665D" />
                            <Text style={styles.trustBadgeText}>
                                Enterprise Grade ISO-Compliant Data Security
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
        paddingVertical: 24,
    },
    centerWrapper: {
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    headerTextCol: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#57665D',
        marginTop: 1,
    },
    headerBadgeBox: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },

    // Card
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

    // Business Type Chips
    typeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
        marginTop: 6,
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F0EFEA',
        borderWidth: 1,
        borderColor: '#E5E8E5',
    },
    typeChipActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
    },
    typeChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555555',
    },
    typeChipTextActive: {
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

    // Input Groups
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#777777',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
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

    // Phone input
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

    // Password strength
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
        flex: 1,
        marginRight: 12,
    },
    strengthBar: {
        height: 4,
        flex: 1,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Primary Button
    primaryBtn: {
        height: 48,
        backgroundColor: '#2E7D32',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
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
    termsHintText: {
        fontSize: 11,
        color: '#888888',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 15,
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

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
    TextInput, Switch, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Camera, BadgeCheck, Bell, Shield, User, Building2,
    ChevronRight, Briefcase, ArrowLeft, Mail, Phone,
    MapPin, Sparkles, IndianRupee, Save, Lock
} from 'lucide-react-native';
import { FadeInDown } from '../src/components/Anime';
import api, { me } from '../src/services/api';

type TabType = 'profile' | 'business' | 'notifications';

const NOTIF_KEYS = {
    lowStock: 'notif_lowStock',
    dailySales: 'notif_dailySales',
    security: 'notif_security',
    ledger: 'notif_ledger',
} as const;

const roleLabel = (role: string | undefined) => {
    switch (role) {
        case 'ADMIN': return 'Administrator';
        case 'MANAGER': return 'Operations Manager';
        case 'ACCOUNTANT': return 'Head Accountant';
        case 'SALES': return 'Sales Executive';
        case 'WAREHOUSE': return 'Warehouse Manager';
        default: return role ?? 'ERP User';
    }
};

export default function SettingsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userId, setUserId] = useState<number | null>(null);
    const [role, setRole] = useState<string>('Administrator');

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [businessName, setBusinessName] = useState('Sri Murugan Modern Rice Mill');
    const [registerNumber, setRegisterNumber] = useState('');
    const [gstNo, setGstNo] = useState('');

    // Notification Toggles
    const [toggles, setToggles] = useState({
        lowStock: true,
        dailySales: true,
        security: true,
        ledger: false,
    });

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const meRes = await me();
            const user = meRes.data;
            if (user?.id) setUserId(user.id);
            if (user?.name) setName(user.name);
            if (user?.phoneNumber) setPhone(user.phoneNumber);
            if (user?.role) setRole(roleLabel(user.role));

            if (user?.id) {
                const profileRes = await api.get(`/profile/${user.id}`);
                const profile = profileRes.data;
                if (profile) {
                    setEmail(profile.email || '');
                    setLocation(profile.location || '');
                    setRegisterNumber(profile.registerNumber || '');
                    setGstNo(profile.gstNo || '');
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadToggles = useCallback(async () => {
        try {
            const entries = await AsyncStorage.multiGet(Object.values(NOTIF_KEYS));
            const next = { ...toggles };
            entries.forEach(([key, value]) => {
                const toggleKey = (Object.keys(NOTIF_KEYS) as Array<keyof typeof NOTIF_KEYS>)
                    .find(k => NOTIF_KEYS[k] === key);
                if (toggleKey && value !== null) {
                    next[toggleKey] = value === 'true';
                }
            });
            setToggles(next);
        } catch (error) {
            console.error('Error loading notification prefs:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
            loadToggles();
        }, [loadProfile, loadToggles])
    );

    const toggleSwitch = (key: keyof typeof toggles) => {
        setToggles(prev => {
            const next = { ...prev, [key]: !prev[key] };
            AsyncStorage.setItem(NOTIF_KEYS[key], String(next[key])).catch(err =>
                console.error('Error saving notification pref:', err)
            );
            return next;
        });
    };

    const saveProfile = async () => {
        if (userId == null) return;
        setSaving(true);
        try {
            await api.put(`/profile/${userId}`, {
                email,
                location,
                registerNumber,
                gstNo,
            });
            Alert.alert('Settings Updated', 'Your ERP preferences and details have been successfully saved.');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Save failed', 'Could not update settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Standard Signature Pastel Background */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    
                    {/* Top Right Signature Soft Pink Blob */}
                    <Path
                        d="M100 -50 C200 -50, 385 -40, 395 60 C410 180, 360 250, 220 230 C120 210, 40 140, 100 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.38}
                    />
                    <Circle cx="340" cy="70" r="80" fill="#F06A8C" opacity={0.14} />

                    {/* Left Warm Gold Accent */}
                    <Path
                        d="M-60 150 C20 170, 110 110, 150 230 C190 350, 70 390, -20 350 C-100 310, -130 130, -60 150 Z"
                        fill="#F7E6B8"
                        opacity={0.32}
                    />

                    {/* Soft Center Sage & Bottom Lavender */}
                    <Circle cx="350" cy="420" r="75" fill="#DCE6DB" opacity={0.28} />
                    <Circle cx="30" cy="650" r="70" fill="#E2D4F5" opacity={0.28} />
                </Svg>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Header with Back Button */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/profile')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Settings</Text>
                            <Text style={styles.headerSubtitle}>App Preferences, Business Details & Alerts</Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. Segmented Navigation Tabs */}
                <View style={styles.tabContainer}>
                    {(['profile', 'business', 'notifications'] as TabType[]).map((t) => {
                        const active = activeTab === t;
                        const label = t === 'profile' ? 'Profile' : t === 'business' ? 'Business & Tax' : 'Alerts & Notifs';
                        return (
                            <TouchableOpacity
                                key={t}
                                style={[styles.tabItem, active && styles.tabItemActive]}
                                onPress={() => setActiveTab(t)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabItemText, active && styles.tabItemTextActive]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 3. Tab Contents */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F06A8C" />
                        <Text style={styles.loadingText}>Loading configuration...</Text>
                    </View>
                ) : (
                    <>
                        {/* TAB 1: PROFILE */}
                        {activeTab === 'profile' && (
                            <FadeInDown delay={50} style={styles.tabContentWrapper}>
                                {/* Avatar Card */}
                                <View style={styles.avatarCard}>
                                    <View style={styles.avatarLargeCircle}>
                                        <Text style={styles.avatarLargeText}>
                                            {(name || 'U').trim().charAt(0).toUpperCase()}
                                        </Text>
                                        <View style={styles.cameraIconBadge}>
                                            <Camera size={13} color="#FFFFFF" />
                                        </View>
                                    </View>

                                    <View style={styles.avatarDetails}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                            <Text style={styles.avatarName}>{name || 'Enterprise User'}</Text>
                                            <BadgeCheck size={18} color="#2FAE55" />
                                        </View>
                                        <Text style={styles.avatarRole}>{role}</Text>
                                    </View>
                                </View>

                                {/* Form Fields */}
                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionHeading}>USER CREDENTIALS</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Full Name</Text>
                                        <View style={[styles.inputField, styles.disabledInput]}>
                                            <User size={16} color="#8A8A8A" />
                                            <TextInput
                                                style={styles.textInput}
                                                value={name}
                                                editable={false}
                                            />
                                            <Lock size={14} color="#A0A0A0" />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Contact Phone Number</Text>
                                        <View style={[styles.inputField, styles.disabledInput]}>
                                            <Phone size={16} color="#8A8A8A" />
                                            <TextInput
                                                style={styles.textInput}
                                                value={phone}
                                                editable={false}
                                            />
                                            <Lock size={14} color="#A0A0A0" />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Email Address</Text>
                                        <View style={styles.inputField}>
                                            <Mail size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="e.g. admin@riceerp.com"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={email}
                                                onChangeText={setEmail}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Branch / Plant Location</Text>
                                        <View style={styles.inputField}>
                                            <MapPin size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="e.g. Salem Central Mill, Yard #2"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                value={location}
                                                onChangeText={setLocation}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </FadeInDown>
                        )}

                        {/* TAB 2: BUSINESS & TAX */}
                        {activeTab === 'business' && (
                            <FadeInDown delay={50} style={styles.tabContentWrapper}>
                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionHeading}>ENTERPRISE IDENTITY & GST</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Trade / Mill Legal Name</Text>
                                        <View style={styles.inputField}>
                                            <Building2 size={16} color="#8A8A8A" />
                                            <TextInput
                                                style={styles.textInput}
                                                value={businessName}
                                                onChangeText={setBusinessName}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>GSTIN / Business Tax Number</Text>
                                        <View style={styles.inputField}>
                                            <Briefcase size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="e.g. 33AAAAA0000A1Z5"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                autoCapitalize="characters"
                                                value={gstNo}
                                                onChangeText={setGstNo}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Mill Registration / FSSAI License</Text>
                                        <View style={styles.inputField}>
                                            <Shield size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="e.g. REG-TN-2024-8890"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                value={registerNumber}
                                                onChangeText={setRegisterNumber}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Invoicing Currency</Text>
                                        <View style={[styles.inputField, styles.disabledInput]}>
                                            <IndianRupee size={16} color="#8A8A8A" />
                                            <TextInput
                                                style={styles.textInput}
                                                value="INR (₹) - Indian Rupee"
                                                editable={false}
                                            />
                                            <Lock size={14} color="#A0A0A0" />
                                        </View>
                                    </View>
                                </View>
                            </FadeInDown>
                        )}

                        {/* TAB 3: NOTIFICATIONS */}
                        {activeTab === 'notifications' && (
                            <FadeInDown delay={50} style={styles.tabContentWrapper}>
                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionHeading}>AUTOMATED SYSTEM ALERTS</Text>

                                    {/* Low Stock */}
                                    <View style={styles.notifRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.notifTitle}>Low Inventory Alerts</Text>
                                            <Text style={styles.notifSub}>Get notified when rice bag stock falls below minimum safety levels (&lt; 20 bags)</Text>
                                        </View>
                                        <Switch
                                            value={toggles.lowStock}
                                            onValueChange={() => toggleSwitch('lowStock')}
                                            trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                            thumbColor={toggles.lowStock ? '#F06A8C' : '#FFFFFF'}
                                        />
                                    </View>

                                    {/* Daily Sales */}
                                    <View style={styles.notifRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.notifTitle}>Daily Sales Summary</Text>
                                            <Text style={styles.notifSub}>Receive a daily evening digest of total revenue, bags sold, and active invoices</Text>
                                        </View>
                                        <Switch
                                            value={toggles.dailySales}
                                            onValueChange={() => toggleSwitch('dailySales')}
                                            trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                            thumbColor={toggles.dailySales ? '#F06A8C' : '#FFFFFF'}
                                        />
                                    </View>

                                    {/* Security Alerts */}
                                    <View style={styles.notifRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.notifTitle}>Security & Access Monitoring</Text>
                                            <Text style={styles.notifSub}>Instant alerts for new login sessions and password modifications</Text>
                                        </View>
                                        <Switch
                                            value={toggles.security}
                                            onValueChange={() => toggleSwitch('security')}
                                            trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                            thumbColor={toggles.security ? '#F06A8C' : '#FFFFFF'}
                                        />
                                    </View>

                                    {/* Customer Credit Overdue */}
                                    <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.notifTitle}>Customer Credit Overdue Alerts</Text>
                                            <Text style={styles.notifSub}>Alerts when client accounts exceed 80% credit limit or 30-day payment cycle</Text>
                                        </View>
                                        <Switch
                                            value={toggles.ledger}
                                            onValueChange={() => toggleSwitch('ledger')}
                                            trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                            thumbColor={toggles.ledger ? '#F06A8C' : '#FFFFFF'}
                                        />
                                    </View>
                                </View>
                            </FadeInDown>
                        )}

                        {/* Save Action Button */}
                        <FadeInDown delay={80} style={styles.saveActionWrapper}>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={saveProfile}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#FFFFFF" />
                                        <Text style={styles.saveBtnText}>Save Preferences</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </FadeInDown>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 14,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
    },
    headerTitleCol: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    headerSubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },

    // Segmented Tab Bar
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#EAEAEA',
        borderRadius: 999,
        padding: 4,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    tabItemActive: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    tabItemText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    tabItemTextActive: {
        fontWeight: '700',
        color: '#1A1A1A',
    },

    tabContentWrapper: {
        marginBottom: 14,
    },

    // Avatar Card
    avatarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    avatarLargeCircle: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: '#F7E6B8',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarLargeText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#8D6E63',
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarDetails: {
        flex: 1,
    },
    avatarName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    avatarRole: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8A8A8A',
        marginTop: 2,
    },

    // Form Section
    formSectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    formSectionHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#555555',
        marginBottom: 4,
    },
    inputField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF7F2',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1,
        borderColor: '#ECECEC',
        gap: 8,
    },
    disabledInput: {
        backgroundColor: '#F0EFEA',
    },
    textInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
    },

    // Notifications
    notifRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
    },
    notifTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    notifSub: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        lineHeight: 15,
    },

    // Save Action
    saveActionWrapper: {
        marginTop: 10,
        marginBottom: 20,
    },
    saveBtn: {
        height: 48,
        backgroundColor: '#F06A8C',
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 2,
        shadowColor: '#F06A8C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    saveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
    },
});

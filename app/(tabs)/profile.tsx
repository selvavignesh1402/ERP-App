import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, Alert,
    TouchableOpacity, Platform
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    User, Settings, Shield, HelpCircle, Info, LogOut,
    BadgeCheck, ChevronRight, Phone, Mail, Sparkles,
    Lock, Bell, Building2, KeyRound, Users, MapPin
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import { me, clearToken } from '../../src/services/api';
import { useCurrentRole, hasRole } from '../../src/hooks/useCurrentRole';

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

export default function ProfileScreen() {
    const router = useRouter();
    const currentRole = useCurrentRole();
    const isAdmin = hasRole(currentRole, 'ADMIN');
    const [userName, setUserName] = useState<string>('Enterprise User');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('ERP User');
    const [rawRole, setRawRole] = useState<string>('');
    const [userInitial, setUserInitial] = useState<string>('A');

    const loadUser = useCallback(async () => {
        try {
            const res = await me();
            const data = res.data;
            if (data?.name) {
                setUserName(data.name);
                setUserInitial(data.name.trim().charAt(0).toUpperCase() || 'U');
            }
            if (data?.email) {
                setUserEmail(data.email);
            }
            if (data?.phoneNumber) {
                setUserPhone(data.phoneNumber);
            }
            if (data?.role) {
                setRawRole(data.role);
                setUserRole(roleLabel(data.role));
            }
        } catch (error) {
            console.error('Profile: failed to load user', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [loadUser])
    );

    const handleLogout = () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to log out from this session?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: () => {
                        clearToken();
                        router.replace('/(auth)/welcome');
                    }
                }
            ]
        );
    };

    // Fail-closed: only a confirmed ADMIN sees user-management entry points.
    // (Buttons stay hidden while the role loads or if the lookup fails.)

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
                {/* 1. Header */}
                <FadeInDown delay={20} style={styles.header}>
                    <Text style={styles.headerTitle}>Profile & Account</Text>
                    <Text style={styles.headerSubtitle}>
                        User credentials, role permissions & system preferences
                    </Text>
                </FadeInDown>

                {/* 2. User Hero Card */}
                <FadeInDown delay={50} style={styles.profileHeroSection}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeroTop}>
                            <View style={styles.avatarWrapper}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{userInitial}</Text>
                                </View>
                                <View style={styles.onlineBadge} />
                            </View>

                            <View style={styles.profileHeroDetails}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                                    <BadgeCheck size={18} color="#2FAE55" />
                                </View>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>{userRole}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Contact Meta Row */}
                        {(userPhone || userEmail) && (
                            <View style={styles.contactMetaBox}>
                                {userPhone ? (
                                    <View style={styles.contactMetaItem}>
                                        <Phone size={13} color="#666" />
                                        <Text style={styles.contactMetaText}>{userPhone}</Text>
                                    </View>
                                ) : null}
                                {userEmail ? (
                                    <View style={styles.contactMetaItem}>
                                        <Mail size={13} color="#666" />
                                        <Text style={styles.contactMetaText}>{userEmail}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {/* Quick Hero Actions */}
                        <View style={styles.heroActionsRow}>
                            <TouchableOpacity
                                style={styles.editProfileBtn}
                                onPress={() => router.push('/settings')}
                                activeOpacity={0.8}
                            >
                                <Settings size={14} color="#1A1A1A" />
                                <Text style={styles.editProfileBtnText}>Edit Preferences</Text>
                            </TouchableOpacity>

                            {isAdmin && (
                                <TouchableOpacity
                                    style={styles.teamBtn}
                                    onPress={() => router.push('/users')}
                                    activeOpacity={0.8}
                                >
                                    <Shield size={14} color="#7E57C2" />
                                    <Text style={styles.teamBtnText}>Team Roles</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </FadeInDown>

                {/* 3. Account Summary 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EDE7F6' }]}>
                                <KeyRound size={18} color="#7E57C2" />
                            </View>
                            <View style={styles.kpiBadge}>
                                <Text style={styles.kpiBadgeText}>Full</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Access Privilege</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>{rawRole}</Text>
                    </View>

                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <BadgeCheck size={18} color="#2E7D32" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Account Status</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>Verified</Text>
                    </View>
                </FadeInDown>

                {/* 4. Settings & System Management List */}
                <FadeInDown delay={110} style={styles.optionsSection}>
                    <Text style={styles.sectionHeading}>SYSTEM & CONFIGURATION</Text>

                    <View style={styles.optionsCard}>
                        {/* Settings */}
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => router.push('/settings')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBox, { backgroundColor: '#FFF3E0' }]}>
                                <Settings size={18} color="#E65100" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>App Settings & Business Info</Text>
                                <Text style={styles.optionSubtitle}>GST parameters, notifications & currency</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </TouchableOpacity>

                        {/* Team & Staff Management */}
                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => router.push('/team-management')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIconBox, { backgroundColor: '#EDE7F6' }]}>
                                    <Users size={18} color="#7E57C2" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionTitle}>Team & Staff Directory</Text>
                                    <Text style={styles.optionSubtitle}>Roles, permissions & WhatsApp invite links</Text>
                                </View>
                                <ChevronRight size={18} color="#B0B0B0" />
                            </TouchableOpacity>
                        )}

                        {/* Field Sales & Route */}
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => router.push('/field-sales')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBox, { backgroundColor: '#FBE8F0' }]}>
                                <MapPin size={18} color="#F06A8C" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Field Sales & Route Planning</Text>
                                <Text style={styles.optionSubtitle}>Store check-in, visit logs & spot bookings</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </TouchableOpacity>

                        {/* User Management */}
                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => router.push('/users')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIconBox, { backgroundColor: '#F0ECFA' }]}>
                                    <Shield size={18} color="#7E57C2" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionTitle}>Staff & User Roles</Text>
                                    <Text style={styles.optionSubtitle}>Create accounts, reset passwords & permissions</Text>
                                </View>
                                <ChevronRight size={18} color="#B0B0B0" />
                            </TouchableOpacity>
                        )}

                        {/* Help & Support */}
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => Alert.alert('Technical Support', 'For assistance, contact ERP support team at support@riceerp.com')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBox, { backgroundColor: '#EAF2FF' }]}>
                                <HelpCircle size={18} color="#3B6DD8" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Help & Support</Text>
                                <Text style={styles.optionSubtitle}>Knowledge base, FAQs & technical help</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </TouchableOpacity>

                        {/* About App */}
                        <TouchableOpacity
                            style={[styles.optionItem, { borderBottomWidth: 0 }]}
                            onPress={() => Alert.alert('Rice Mill ERP Suite', 'Version 2.4.0 (Enterprise Edition)\nSecure Cloud Data Sync Enabled')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBox, { backgroundColor: '#E8F5E9' }]}>
                                <Info size={18} color="#2E7D32" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>About Rice ERP</Text>
                                <Text style={styles.optionSubtitle}>v2.4.0 Enterprise Edition</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* 5. Logout Button */}
                <FadeInDown delay={140} style={styles.logoutSection}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.85}
                    >
                        <LogOut size={18} color="#E53935" />
                        <Text style={styles.logoutBtnText}>Log Out Account</Text>
                    </TouchableOpacity>
                </FadeInDown>
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
        paddingBottom: 95, // Clearance for bottom dock
    },
    header: {
        marginBottom: 16,
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

    // Hero Profile Card
    profileHeroSection: {
        marginBottom: 14,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    profileHeroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#EDE7F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#7E57C2',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileHeroDetails: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    userName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#EDE7F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7E57C2',
    },
    contactMetaBox: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
    },
    contactMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    contactMetaText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
    },
    heroActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    editProfileBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    editProfileBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    teamBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#EDE7F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    teamBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7E57C2',
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    kpiCard: {
        width: '48.2%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    kpiHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    kpiIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiBadge: {
        backgroundColor: '#EDE7F6',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    kpiBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#7E57C2',
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginBottom: 3,
    },
    kpiValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // Options Section
    optionsSection: {
        marginBottom: 16,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    optionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingVertical: 4,
        paddingHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
        gap: 12,
    },
    optionIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
    },

    // Logout
    logoutSection: {
        marginBottom: 20,
    },
    logoutBtn: {
        height: 48,
        borderRadius: 999,
        backgroundColor: '#FFEBEE',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    logoutBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E53935',
    },
});

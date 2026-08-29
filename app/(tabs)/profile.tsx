import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '../../src/theme/colors';
import {
    User, Settings, Shield, HelpCircle, Info, LogOut, BadgeCheck, ChevronRight
} from 'lucide-react-native';
import { FadeInDown, AnimatedPressable } from '../../src/components/Anime';
import { me, clearToken } from '../../src/services/api';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

const roleLabel = (role: string | undefined) => {
    switch (role) {
        case 'ADMIN': return 'Administrator';
        case 'MANAGER': return 'Manager';
        case 'ACCOUNTANT': return 'Accountant';
        case 'SALES': return 'Sales Staff';
        case 'WAREHOUSE': return 'Warehouse Staff';
        default: return role ?? 'User';
    }
};

export default function ProfileScreen() {
    const router = useRouter();
    const { role } = useCurrentRole();
    const [userName, setUserName] = useState<string>('User');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('User');
    const [rawRole, setRawRole] = useState<string>('USER');
    const [userInitial, setUserInitial] = useState<string>('U');

    const loadUser = React.useCallback(async () => {
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
            if (data?.role) {
                setRawRole(data.role);
                setUserRole(roleLabel(data.role));
            }
        } catch (error) {
            console.error('Profile: failed to load user', error);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadUser();
        }, [loadUser])
    );

    const handleLogout = () => {
        clearToken();
        router.replace('/(auth)/welcome');
    };

    const isAdmin = rawRole === 'ADMIN' || rawRole === 'MANAGER';

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background Organic Pastel Blob Illustration */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    <Path
                        d="M150 -50 C240 -20, 390 -30, 400 120 C410 270, 310 240, 240 220 C170 200, 70 300, 0 200 C-70 100, 70 -80, 150 -50 Z"
                        fill="#E2D4F5"
                        opacity={0.3}
                    />
                    <Circle cx="330" cy="280" r="60" fill="#F5C6D8" opacity={0.25} />
                    <Circle cx="40" cy="520" r="55" fill="#DCE6DB" opacity={0.3} />
                </Svg>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <FadeInDown delay={40}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Profile & Account</Text>
                        <Text style={styles.headerSubtitle}>User profile, settings & management</Text>
                    </View>
                </FadeInDown>

                {/* Profile Details Card */}
                <FadeInDown delay={90} style={styles.section}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileInfoRow}>
                            <View style={styles.avatarContainer}>
                                <Text style={styles.avatarText}>{userInitial}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.userName}>{userName}</Text>
                                    <BadgeCheck size={18} color="#2FAE55" />
                                </View>
                                <Text style={styles.userRole}>{userRole}</Text>
                                {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
                            </View>
                        </View>
                    </View>
                </FadeInDown>

                {/* Account Actions Section */}
                <FadeInDown delay={160} style={styles.section}>
                    <Text style={styles.sectionLabel}>ACCOUNT OPTIONS</Text>
                    <View style={styles.menuList}>

                        {/* Settings Page */}
                        <AnimatedPressable
                            style={styles.menuItem}
                            onPress={() => router.push('/settings')}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: '#FEF4E6' }]}>
                                <Settings size={20} color="#F0A93C" />
                            </View>
                            <View style={styles.menuTexts}>
                                <Text style={styles.menuTitle}>Settings</Text>
                                <Text style={styles.menuSubtitle}>App preferences & configuration</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </AnimatedPressable>

                        {/* User Management (Visible if Admin / Manager) */}
                        {isAdmin && (
                            <AnimatedPressable
                                style={styles.menuItem}
                                onPress={() => router.push('/users')}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: '#EAF2FF' }]}>
                                    <Shield size={20} color="#5B8DEF" />
                                </View>
                                <View style={styles.menuTexts}>
                                    <Text style={styles.menuTitle}>User Management</Text>
                                    <Text style={styles.menuSubtitle}>Manage team members, roles & permissions</Text>
                                </View>
                                <ChevronRight size={18} color="#B0B0B0" />
                            </AnimatedPressable>
                        )}

                        {/* Help & Support */}
                        <AnimatedPressable
                            style={styles.menuItem}
                            onPress={() => Alert.alert('Help & Support', 'FAQs & Contact Support')}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: '#F0ECFA' }]}>
                                <HelpCircle size={20} color="#7B6FE0" />
                            </View>
                            <View style={styles.menuTexts}>
                                <Text style={styles.menuTitle}>Help & Support</Text>
                                <Text style={styles.menuSubtitle}>FAQs & contact assistance</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </AnimatedPressable>

                        {/* About App */}
                        <AnimatedPressable
                            style={[styles.menuItem, { borderBottomWidth: 0 }]}
                            onPress={() => Alert.alert('Rice ERP', 'Version 1.0.0')}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: '#E8F5E9' }]}>
                                <Info size={20} color="#5BC27A" />
                            </View>
                            <View style={styles.menuTexts}>
                                <Text style={styles.menuTitle}>About Rice ERP</Text>
                                <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
                            </View>
                            <ChevronRight size={18} color="#B0B0B0" />
                        </AnimatedPressable>

                    </View>
                </FadeInDown>

                {/* Logout Button */}
                <FadeInDown delay={230} style={styles.section}>
                    <AnimatedPressable style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={18} color="#E5493F" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </AnimatedPressable>
                </FadeInDown>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        padding: 16,
        paddingTop: 12,
        paddingBottom: 80,
    },
    headerTextContainer: {
        marginBottom: 20,
        paddingHorizontal: 4,
        paddingTop: 6,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: '#5C7362',
    },
    section: {
        marginBottom: 20,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    profileInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 22,
        fontFamily: 'Urbanist_700Bold',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 18,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
    },
    userRole: {
        fontSize: 13,
        fontFamily: 'Urbanist_600SemiBold',
        color: '#2FAE55',
        marginTop: 2,
    },
    userEmail: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: '#8A8A8A',
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: '#8A8A8A',
        marginBottom: 10,
        marginLeft: 4,
    },
    menuList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F7F7F9',
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuTexts: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 11,
        fontFamily: 'Urbanist_400Regular',
        color: '#8A8A8A',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FBE1DE',
        paddingVertical: 14,
        borderRadius: 18,
        gap: 8,
    },
    logoutText: {
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
        color: '#E5493F',
    }
});

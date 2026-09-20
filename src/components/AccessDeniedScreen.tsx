import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { ShieldAlert, ArrowLeft, ArrowRight, Home } from 'lucide-react-native';
import { FadeInDown } from './Anime';
import { usePermission } from '../hooks/usePermission';

interface AccessDeniedScreenProps {
    requiredPermission?: string;
    customMessage?: string;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
    requiredPermission,
    customMessage,
}) => {
    const router = useRouter();
    const { role } = usePermission();

    const roleColors: Record<string, { bg: string; text: string; border: string }> = {
        ADMIN: { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
        MANAGER: { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
        ACCOUNTANT: { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' },
        SALES: { bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' },
        WAREHOUSE: { bg: '#F5F5F0', text: '#424242', border: '#E0E0D8' },
        DEFAULT: { bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' },
    };

    const activeRoleColor = role ? (roleColors[role] || roleColors.DEFAULT) : roleColors.DEFAULT;

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Pastel Artwork */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    <Path
                        d="M90 -50 C200 -60, 390 -30, 400 90 C410 220, 320 280, 180 250 C90 230, 10 140, 90 -50 Z"
                        fill="#E0E7FF"
                        opacity={0.35}
                    />
                    <Circle cx="330" cy="80" r="80" fill="#C7D2FE" opacity={0.20} />
                    <Circle cx="40" cy="680" r="75" fill="#FEF3C7" opacity={0.35} />
                </Svg>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Access Control</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <FadeInDown delay={50} style={styles.card}>
                    <View style={styles.iconCircle}>
                        <ShieldAlert size={36} color="#4F46E5" />
                    </View>

                    <Text style={styles.title}>Feature Restricted</Text>
                    <Text style={styles.description}>
                        {customMessage || "This workspace module is not assigned to your current role profile. Contact your shop administrator if you require access."}
                    </Text>

                    {role && (
                        <View style={styles.roleContainer}>
                            <Text style={styles.roleLabel}>CURRENT ROLE</Text>
                            <View style={[styles.roleBadge, { backgroundColor: activeRoleColor.bg, borderColor: activeRoleColor.border }]}>
                                <Text style={[styles.roleBadgeText, { color: activeRoleColor.text }]}>{role}</Text>
                            </View>
                        </View>
                    )}

                    {requiredPermission && (
                        <View style={styles.permissionStrip}>
                            <Text style={styles.permissionLabel}>REQUIRED PERMISSION</Text>
                            <Text style={styles.permissionValue}>{requiredPermission}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.replace('/(tabs)')}
                        activeOpacity={0.85}
                    >
                        <Home size={18} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Back to My Workspace</Text>
                        <ArrowRight size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </FadeInDown>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        elevation: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 26,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 13.5,
        fontWeight: '500',
        color: '#666666',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
    },
    roleContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    roleLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#888888',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    permissionStrip: {
        width: '100%',
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDEBE6',
        marginBottom: 22,
    },
    permissionLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 2,
    },
    permissionValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#4F46E5',
    },
    actionBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        paddingVertical: 14,
        elevation: 2,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

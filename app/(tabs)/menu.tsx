import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    MapPin, Box, Users, BookOpen, Truck,
    UserCheck, BarChart2, ChevronRight
} from 'lucide-react-native';
import { StaggerContainer, FadeInDown } from '../../src/components/Anime';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

const MODULES = [
    {
        id: 'field-sales',
        title: 'Field Sales',
        subtitle: 'Beat route plans & visits',
        icon: MapPin,
        bgColor: '#E8F5E9',
        iconColor: '#36B37E',
        route: '/field-sales',
        roles: ['ADMIN', 'MANAGER', 'SALES']
    },
    {
        id: 'purchase',
        title: 'Purchase',
        subtitle: 'Orders, bills & GRN',
        icon: Box,
        bgColor: '#FEF4E6',
        iconColor: '#F5A34C',
        route: '/purchases',
        roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'WAREHOUSE']
    },
    {
        id: 'customers',
        title: 'Customers',
        subtitle: 'Directory & balances',
        icon: Users,
        bgColor: '#EAF2FF',
        iconColor: '#5B8DEF',
        route: '/customers',
        roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT']
    },
    {
        id: 'accounts',
        title: 'Accounts',
        subtitle: 'Ledgers, cash & vouchers',
        icon: BookOpen,
        bgColor: '#F0ECFA',
        iconColor: '#7B6FE0',
        route: '/(tabs)/ledger',
        roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
    },
    {
        id: 'suppliers',
        title: 'Suppliers',
        subtitle: 'Vendor directory & payables',
        icon: Truck,
        bgColor: '#FBE1DE',
        iconColor: '#F0574E',
        route: '/suppliers',
        roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'WAREHOUSE']
    },
    {
        id: 'employees',
        title: 'Employees',
        subtitle: 'Staff profiles & RBAC access',
        icon: UserCheck,
        bgColor: '#F3E5F5',
        iconColor: '#9B6FE0',
        route: '/users',
        roles: ['ADMIN']
    },
    {
        id: 'reports',
        title: 'Reports',
        subtitle: 'Analytics & P&L insights',
        icon: BarChart2,
        bgColor: '#E3F2FD',
        iconColor: '#4C8CE0',
        route: '/reports',
        roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT']
    }
];

export default function MenuScreen() {
    const router = useRouter();
    const { role, ready } = useCurrentRole();

    const handleModulePress = (route: string) => {
        router.push(route as any);
    };

    // Fail closed: show no privileged modules until the role is confirmed by the backend.
    const visibleModules = ready && role ? MODULES.filter(item => item.roles.includes(role)) : [];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background Organic Pastel Blob Illustration per DESIGN.md (Olive / Sage Green theme) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    {/* Sage Green / Olive Top Header Blob */}
                    <Path
                        d="M-40 -40 C100 -20, 250 -50, 320 40 C390 130, 340 180, 260 160 C180 140, 70 210, -20 160 C-110 110, -180 -10, -40 -40 Z"
                        fill="#A9AD6E"
                        opacity={0.22}
                    />
                    <Circle cx="340" cy="90" r="60" fill="#DCE6DB" opacity={0.35} />
                    <Circle cx="30" cy="500" r="70" fill="#F7E6B8" opacity={0.25} />
                    <Circle cx="340" cy="620" r="80" fill="#E2D4F5" opacity={0.25} />
                </Svg>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Clean Header */}
                <FadeInDown delay={30}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Modules</Text>
                        <Text style={styles.headerSubtitle}>Manage your business operations</Text>
                    </View>
                </FadeInDown>

                {/* 2-Column Grid of Modules */}
                <FadeInDown delay={70} style={styles.section}>
                    <StaggerContainer stagger={35} delay={100}>
                        <View style={styles.modulesGrid}>
                            {visibleModules.map((item) => {
                                const IconComponent = item.icon;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.moduleTileCard}
                                        onPress={() => handleModulePress(item.route)}
                                        activeOpacity={0.75}
                                    >
                                        {/* Top Row: Icon + Chevron */}
                                        <View style={styles.tileHeaderRow}>
                                            <View style={[styles.moduleIconBox, { backgroundColor: item.bgColor }]}>
                                                <IconComponent size={20} color={item.iconColor} />
                                            </View>
                                            <ChevronRight size={18} color="#B0B0B0" />
                                        </View>

                                        {/* Bottom Row: Title + Subtitle */}
                                        <View style={styles.tileTextContainer}>
                                            <Text style={styles.tileTitle} numberOfLines={1} ellipsizeMode="tail">
                                                {item.title}
                                            </Text>
                                            <Text style={styles.tileSubtitle} numberOfLines={2} ellipsizeMode="tail">
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </StaggerContainer>
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
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 95, // Adequate space above the bottom dock
    },
    headerTextContainer: {
        marginBottom: 16,
        paddingHorizontal: 4,
        paddingTop: 4,
    },
    headerTitle: {
        fontSize: 26,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 3,
    },
    headerSubtitle: {
        fontSize: 13,
        fontFamily: 'Urbanist_500Medium',
        color: '#7C8A7E',
    },
    section: {
        marginBottom: 16,
    },
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    moduleTileCard: {
        width: '48.2%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 14,
        height: 128,
        flexDirection: 'column',
        justifyContent: 'space-between',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    tileHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    moduleIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileTextContainer: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    tileTitle: {
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 2,
        letterSpacing: -0.2,
    },
    tileSubtitle: {
        fontSize: 11.5,
        fontFamily: 'Urbanist_500Medium',
        color: '#8A8A8A',
        lineHeight: 15,
    },
});

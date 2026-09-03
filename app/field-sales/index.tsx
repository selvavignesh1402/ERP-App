import React from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    CalendarDays, MapPin, Store, ShoppingCart, BarChart2,
    ClipboardList, ArrowLeft, ChevronRight, Navigation,
    IndianRupee, TrendingUp, Users, CheckCircle2, Sparkles
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

const SALES_MODULES = [
    {
        id: 'today-route',
        title: "Today's Route",
        subtitle: 'Live shop check-ins & order collection',
        icon: Navigation,
        bg: '#E8F5E9',
        iconColor: '#2E7D32',
        route: '/field-sales/today-route',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
        badge: 'Live GPS',
    },
    {
        id: 'beat-plan',
        title: 'Weekly Beat Plan',
        subtitle: 'Schedule weekly store routes',
        icon: CalendarDays,
        bg: '#EAF2FF',
        iconColor: '#3B6DD8',
        route: '/field-sales/beat-plan',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
        badge: 'Weekly',
    },
    {
        id: 'manager-dashboard',
        title: 'Team Dashboard',
        subtitle: 'Real-time salesperson tracking',
        icon: BarChart2,
        bg: '#F3E5F5',
        iconColor: '#8E24AA',
        route: '/field-sales/manager-dashboard',
        roles: ['ADMIN', 'MANAGER'],
        badge: 'Manager',
    },
    {
        id: 'customers',
        title: 'Retail Stores',
        subtitle: 'Customer shop directory & credit',
        icon: Store,
        bg: '#FBE8F0',
        iconColor: '#F06A8C',
        route: '/customers',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
        badge: null,
    },
    {
        id: 'orders',
        title: 'Field Orders',
        subtitle: 'Book rice bags & generate bill',
        icon: ShoppingCart,
        bg: '#FFF3E0',
        iconColor: '#E65100',
        route: '/sales',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
        badge: 'Sales',
    },
    {
        id: 'collections',
        title: 'Payment Receipts',
        subtitle: 'Cash, UPI & credit settlements',
        icon: IndianRupee,
        bg: '#E0F2F1',
        iconColor: '#00897B',
        route: '/sales',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
        badge: 'Finance',
    },
];

export default function FieldSalesHub() {
    const router = useRouter();
    const { role } = useCurrentRole();

    // Fail closed: no confirmed role means no privileged modules.
    const visibleModules = role ? SALES_MODULES.filter(m => m.roles.includes(role)) : [];

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
                            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/menu')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Field Sales Hub</Text>
                            <Text style={styles.headerSubtitle}>Route Optimization, Visits & Collections</Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. Today's Route Live Action Banner */}
                <FadeInDown delay={50} style={styles.bannerContainer}>
                    <TouchableOpacity
                        style={styles.liveBanner}
                        onPress={() => router.push('/field-sales/today-route' as any)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.bannerIconBox}>
                            <Navigation size={24} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.bannerTagRow}>
                                <View style={styles.liveDot} />
                                <Text style={styles.bannerTagText}>ACTIVE BEAT ROUTE</Text>
                            </View>
                            <Text style={styles.bannerTitle}>Start Today's Route</Text>
                            <Text style={styles.bannerSubtitle}>8 Retail Stores Assigned · GPS Check-in</Text>
                        </View>
                        <ChevronRight size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. KPI Metrics Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <Navigation size={18} color="#2E7D32" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Assigned Shops</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>8 Stores</Text>
                    </View>

                    {/* KPI 2 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EAF2FF' }]}>
                                <CalendarDays size={18} color="#3B6DD8" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Weekly Beats</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>6 Routes</Text>
                    </View>

                    {/* KPI 3 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <ShoppingCart size={18} color="#E65100" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Today's Orders</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>14 Bags</Text>
                    </View>

                    {/* KPI 4 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <IndianRupee size={18} color="#F06A8C" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Collections</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>₹ 42,500</Text>
                    </View>
                </FadeInDown>

                {/* 4. Sales Operations Modules Grid */}
                <FadeInDown delay={110} style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sales Operations</Text>
                    <Text style={styles.sectionSubtitle}>Select a workflow to proceed</Text>
                </FadeInDown>

                <StaggerContainer stagger={30} delay={130}>
                    <View style={styles.modulesGrid}>
                        {visibleModules.map((mod) => (
                            <TouchableOpacity
                                key={mod.id}
                                style={styles.moduleCard}
                                onPress={() => router.push(mod.route as any)}
                                activeOpacity={0.75}
                            >
                                <View style={styles.moduleCardTop}>
                                    <View style={[styles.moduleIconBox, { backgroundColor: mod.bg }]}>
                                        <mod.icon size={22} color={mod.iconColor} />
                                    </View>
                                    {mod.badge && (
                                        <View style={styles.moduleBadge}>
                                            <Text style={styles.moduleBadgeText}>{mod.badge}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.moduleTitle}>{mod.title}</Text>
                                <Text style={styles.moduleSubtitle} numberOfLines={2}>{mod.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </StaggerContainer>
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

    // Live Route Banner
    bannerContainer: {
        marginBottom: 16,
    },
    liveBanner: {
        backgroundColor: '#00897B',
        borderRadius: 22,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 3,
        shadowColor: '#00897B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    bannerIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    bannerTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#E0F2F1',
        letterSpacing: 0.6,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    bannerSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#B2DFDB',
        marginTop: 1,
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginBottom: 18,
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
    trendBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    trendBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#2E7D32',
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginBottom: 3,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // Section
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    moduleCard: {
        width: '48.2%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    moduleCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    moduleIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleBadge: {
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    moduleBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
    },
    moduleTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 3,
    },
    moduleSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        lineHeight: 15,
    },
});

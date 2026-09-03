import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    MapPin, ChevronRight, AlertCircle, CheckCircle2, Clock,
    ArrowLeft, Phone, Store, Navigation, Calendar,
    Play
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import api from '../../src/services/api';

interface RouteItem {
    scheduleId: number;
    customerId: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    creditLimit: number;
    outstandingBalance: number;
    visitOrder: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
    lastVisitDate?: string;
    lastOrderAmount?: number;
    lastOrderDate?: string;
    checkInId?: number;
    checkInTime?: string;
}

const statusConfig = {
    PENDING: {
        color: '#E65100',
        bg: '#FFF3E0',
        border: '#FFE0B2',
        label: 'Pending',
        icon: Clock,
        btnLabel: 'Start Visit',
        btnBg: '#F06A8C',
    },
    IN_PROGRESS: {
        color: '#7C3AED',
        bg: '#EDE7F6',
        border: '#D1C4E9',
        label: 'In Progress',
        icon: Navigation,
        btnLabel: 'Resume Visit',
        btnBg: '#7C3AED',
    },
    COMPLETED: {
        color: '#2E7D32',
        bg: '#E8F5E9',
        border: '#C8E6C9',
        label: 'Completed',
        icon: CheckCircle2,
        btnLabel: 'View Summary',
        btnBg: '#2E7D32',
    },
    MISSED: {
        color: '#C62828',
        bg: '#FFEBEE',
        border: '#FFCDD2',
        label: 'Missed',
        icon: AlertCircle,
        btnLabel: 'Retry Visit',
        btnBg: '#C62828',
    },
};

type FilterTab = 'ALL' | 'PENDING' | 'COMPLETED' | 'MISSED';

export default function TodayRouteScreen() {
    const router = useRouter();
    const [route, setRoute] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

    const todayDateFormatted = useMemo(() => {
        const d = new Date();
        return {
            full: d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }),
            day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
            dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        };
    }, []);

    const fetchRoute = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/beat-plans/my-route');
            const raw: any[] = res.data || [];
            
            // Check active check-in persistence for every route stop
            const checkedStops = await Promise.all(raw.map(async (item) => {
                if (item.status === 'PENDING') {
                    const localSaved = await AsyncStorage.getItem(`active_visit_${item.scheduleId}`);
                    if (localSaved || item.checkInId) {
                        return { ...item, status: 'IN_PROGRESS' as const };
                    }
                }
                return item;
            }));

            setRoute(checkedStops);
        } catch (err) {
            console.error('Failed to fetch route:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        fetchRoute();
    }, [fetchRoute]));

    const stats = useMemo(() => {
        const total = route.length;
        const completed = route.filter(r => r.status === 'COMPLETED').length;
        const pending = route.filter(r => r.status === 'PENDING').length;
        const missed = route.filter(r => r.status === 'MISSED').length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, pending, missed, pct };
    }, [route]);

    const filteredRoute = useMemo(() => {
        if (activeFilter === 'ALL') return route;
        return route.filter(r => r.status === activeFilter);
    }, [route, activeFilter]);

    const handleCallCustomer = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 1. Custom Navigation & Route SVG Illustration Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Emerald-Mint GPS Flow Blob */}
                    <Path
                        d="M120 -40 C220 -50, 390 -30, 400 80 C410 200, 340 260, 200 240 C110 220, 20 150, 120 -40 Z"
                        fill="#C8E6C9"
                        opacity={0.35}
                    />
                    <Circle cx="330" cy="80" r="75" fill="#81C784" opacity={0.16} />

                    {/* Warm Peach Flow Blob */}
                    <Path
                        d="M-50 160 C30 180, 120 120, 160 230 C200 340, 80 380, -10 350 C-90 310, -120 140, -50 160 Z"
                        fill="#FFE0B2"
                        opacity={0.30}
                    />

                    {/* Route GPS Trajectory Dashed Path Illustration */}
                    <Path
                        d="M 50 100 Q 150 180, 280 130 T 360 300"
                        stroke="#43A047"
                        strokeWidth="1.5"
                        strokeDasharray="5,6"
                        fill="none"
                        opacity={0.25}
                    />
                    <Circle cx="50" cy="100" r="4" fill="#2E7D32" opacity={0.35} />
                    <Circle cx="280" cy="130" r="4" fill="#F06A8C" opacity={0.35} />
                    <Circle cx="360" cy="300" r="5" fill="#388E3C" opacity={0.35} />

                    {/* Soft Lavender & Sage Ambience Blobs */}
                    <Circle cx="340" cy="480" r="85" fill="#E1BEE7" opacity={0.22} />
                    <Circle cx="30" cy="700" r="80" fill="#DCEDC8" opacity={0.30} />
                </Svg>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchRoute();
                        }}
                        colors={['#2E7D32', '#F06A8C']}
                    />
                }
            >
                {/* 2. Top Navigation Bar */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/field-sales')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Today's Route</Text>
                            <Text style={styles.headerSubtitle}>
                                Live Field Check-ins & Stores
                            </Text>
                        </View>

                        <View style={styles.liveGpsPill}>
                            <View style={styles.liveGpsPulse} />
                            <Navigation size={13} color="#2E7D32" />
                            <Text style={styles.liveGpsText}>Live</Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 3. Progress Hero Card */}
                <FadeInDown delay={60}>
                    <View style={styles.heroCard}>
                        <View style={styles.heroTopRow}>
                            <View style={styles.heroDateBox}>
                                <Calendar size={14} color="#2E7D32" />
                                <Text style={styles.heroDateText}>{todayDateFormatted.full}</Text>
                            </View>
                            <View style={styles.heroPctPill}>
                                <Text style={styles.heroPctText}>{stats.pct}% Visited</Text>
                            </View>
                        </View>

                        <View style={styles.heroMainRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.heroProgressNumbers}>
                                    <Text style={styles.heroProgressBig}>{stats.completed}</Text>
                                    <Text style={styles.heroProgressSmall}> / {stats.total} Stores</Text>
                                </Text>
                                <Text style={styles.heroProgressDesc}>
                                    {stats.pending === 0 && stats.total > 0
                                        ? '🎉 All planned visits completed for today!'
                                        : `${stats.pending} remaining store stops on today's beat`}
                                </Text>
                            </View>

                            <View style={styles.heroStatMiniCol}>
                                <View style={[styles.heroMiniTag, { backgroundColor: '#E8F5E9' }]}>
                                    <CheckCircle2 size={12} color="#2E7D32" />
                                    <Text style={[styles.heroMiniTagText, { color: '#2E7D32' }]}>{stats.completed} Done</Text>
                                </View>
                                <View style={[styles.heroMiniTag, { backgroundColor: '#FFF3E0', marginTop: 4 }]}>
                                    <Clock size={12} color="#E65100" />
                                    <Text style={[styles.heroMiniTagText, { color: '#E65100' }]}>{stats.pending} Left</Text>
                                </View>
                            </View>
                        </View>

                        {/* Visual Progress Bar */}
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.min(100, Math.max(stats.pct, stats.total > 0 ? 4 : 0))}%` }
                                ]}
                            />
                        </View>
                    </View>
                </FadeInDown>

                {/* 4. Filter Tabs Bar */}
                <FadeInDown delay={100}>
                    <View style={styles.filterBar}>
                        {(['ALL', 'PENDING', 'COMPLETED', 'MISSED'] as FilterTab[]).map((tab) => {
                            const active = activeFilter === tab;
                            let count = stats.total;
                            if (tab === 'PENDING') count = stats.pending;
                            if (tab === 'COMPLETED') count = stats.completed;
                            if (tab === 'MISSED') count = stats.missed;

                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.filterChip, active && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(tab)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                        {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                    </Text>
                                    <View style={[styles.filterCountBadge, active && styles.filterCountBadgeActive]}>
                                        <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                                            {count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </FadeInDown>

                {/* 5. Route Stops List */}
                {loading && route.length === 0 ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#2E7D32" />
                        <Text style={styles.loadingText}>Loading today's route...</Text>
                    </View>
                ) : filteredRoute.length === 0 ? (
                    <FadeInDown delay={140}>
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconCircle}>
                                <Store size={36} color="#888888" />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeFilter === 'ALL' ? 'No Stores Scheduled' : `No ${activeFilter.toLowerCase()} visits`}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeFilter === 'ALL'
                                    ? "There are no stores assigned to your beat plan for today. Check the weekly Beat Plan to schedule visits."
                                    : `There are currently no stops with status "${activeFilter.toLowerCase()}".`}
                            </Text>
                            {activeFilter === 'ALL' && (
                                <TouchableOpacity
                                    style={styles.emptyActionBtn}
                                    onPress={() => router.push('/field-sales/beat-plan')}
                                    activeOpacity={0.8}
                                >
                                    <Calendar size={15} color="#FFFFFF" />
                                    <Text style={styles.emptyActionBtnText}>Open Beat Plan</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </FadeInDown>
                ) : (
                    <StaggerContainer stagger={40} delay={120}>
                        <View style={styles.stopsListContainer}>
                            {filteredRoute.map((item, idx) => {
                                const cfg = statusConfig[item.status] || statusConfig.PENDING;
                                const StatusIcon = cfg.icon;
                                const isCompleted = item.status === 'COMPLETED';

                                return (
                                    <AnimatedPressable
                                        key={item.scheduleId}
                                        style={styles.stopCard}
                                        onPress={() => router.push({
                                            pathname: '/field-sales/visit/[id]',
                                            params: { id: item.scheduleId, customerName: item.customerName }
                                        } as any)}
                                    >
                                        {/* Card Top Row: Stop Badge, Status Badge */}
                                        <View style={styles.stopCardHeader}>
                                            <View style={styles.stopOrderPill}>
                                                <Text style={styles.stopOrderText}>STOP #{item.visitOrder || (idx + 1)}</Text>
                                            </View>

                                            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                                                <StatusIcon size={12} color={cfg.color} />
                                                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
                                                    {cfg.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Shop Info Block */}
                                        <View style={styles.shopInfoRow}>
                                            <View style={[styles.shopAvatarBox, { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0' }]}>
                                                <Store size={22} color={isCompleted ? '#2E7D32' : '#E65100'} />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.shopNameText} numberOfLines={1}>
                                                    {item.customerName}
                                                </Text>
                                                <View style={styles.shopAddressRow}>
                                                    <MapPin size={12} color="#777777" />
                                                    <Text style={styles.shopAddressText} numberOfLines={1}>
                                                        {item.customerAddress || 'Address not listed'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Instant Call Button */}
                                            {item.customerPhone ? (
                                                <TouchableOpacity
                                                    style={styles.quickCallBtn}
                                                    onPress={() => handleCallCustomer(item.customerPhone)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Phone size={15} color="#2E7D32" />
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>

                                        {/* Financial / History Snapshot Grid */}
                                        <View style={styles.statsStrip}>
                                            <View style={styles.statCol}>
                                                <Text style={styles.statLabel}>LAST ORDER</Text>
                                                <Text style={styles.statValue}>
                                                    {item.lastOrderAmount ? `₹${item.lastOrderAmount.toLocaleString('en-IN')}` : '—'}
                                                </Text>
                                            </View>

                                            <View style={styles.statDivider} />

                                            <View style={styles.statCol}>
                                                <Text style={styles.statLabel}>OUTSTANDING</Text>
                                                <Text style={[styles.statValue, item.outstandingBalance > 0 && { color: '#E53935' }]}>
                                                    {item.outstandingBalance > 0
                                                        ? `₹${item.outstandingBalance.toLocaleString('en-IN')}`
                                                        : '₹0'}
                                                </Text>
                                            </View>

                                            <View style={styles.statDivider} />

                                            <View style={styles.statCol}>
                                                <Text style={styles.statLabel}>LAST VISIT</Text>
                                                <Text style={styles.statValue}>
                                                    {item.lastVisitDate
                                                        ? new Date(item.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                        : '—'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Button: Start / Summary */}
                                        <TouchableOpacity
                                            style={[styles.visitActionBtn, isCompleted && styles.visitActionBtnCompleted]}
                                            onPress={() => router.push({
                                                pathname: '/field-sales/visit/[id]',
                                                params: { id: item.scheduleId, customerName: item.customerName }
                                            } as any)}
                                            activeOpacity={0.85}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 size={16} color="#2E7D32" />
                                            ) : (
                                                <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                                            )}
                                            <Text style={[styles.visitActionText, isCompleted && styles.visitActionTextCompleted]}>
                                                {cfg.btnLabel}
                                            </Text>
                                            <ChevronRight size={16} color={isCompleted ? '#2E7D32' : '#FFFFFF'} />
                                        </TouchableOpacity>
                                    </AnimatedPressable>
                                );
                            })}
                        </View>
                    </StaggerContainer>
                )}
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
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 40,
    },

    // Header
    header: {
        marginBottom: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    headerTitleCol: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    liveGpsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    liveGpsPulse: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2E7D32',
    },
    liveGpsText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2E7D32',
    },

    // Hero Progress Card
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#ECEAE4',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        marginBottom: 16,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    heroDateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroDateText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    heroPctPill: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    heroPctText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2E7D32',
    },
    heroMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    heroProgressNumbers: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    heroProgressBig: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    heroProgressSmall: {
        fontSize: 15,
        fontWeight: '600',
        color: '#777777',
    },
    heroProgressDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666666',
        marginTop: 2,
    },
    heroStatMiniCol: {
        alignItems: 'flex-end',
    },
    heroMiniTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    heroMiniTagText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    progressBarTrack: {
        height: 7,
        borderRadius: 999,
        backgroundColor: '#ECEAE4',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#2E7D32',
    },

    // Filter Chips
    filterBar: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    filterChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E6E0',
    },
    filterChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    filterChipText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#666666',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    filterCountBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
        backgroundColor: '#F0EFEA',
    },
    filterCountBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666666',
    },
    filterCountTextActive: {
        color: '#FFFFFF',
    },

    // Stops List
    stopsListContainer: {
        gap: 12,
    },
    stopCard: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    stopCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    stopOrderPill: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ECEAE4',
    },
    stopOrderText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#666666',
        letterSpacing: 0.3,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },

    // Shop Info Row
    shopInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    shopAvatarBox: {
        width: 46,
        height: 46,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopNameText: {
        fontSize: 15.5,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 3,
    },
    shopAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    shopAddressText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        flex: 1,
    },
    quickCallBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },

    // Stats Strip
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F0EFEA',
    },
    statCol: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E2E0D8',
        alignSelf: 'center',
    },
    statLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 3,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // Visit Button
    visitActionBtn: {
        height: 44,
        borderRadius: 13,
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        elevation: 1,
    },
    visitActionBtnCompleted: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    visitActionText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    visitActionTextCompleted: {
        color: '#2E7D32',
    },

    // Loading & Empty
    loadingBox: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
        color: '#777777',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDEBE6',
        marginTop: 10,
    },
    emptyIconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#F5F5F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#777777',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    emptyActionBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

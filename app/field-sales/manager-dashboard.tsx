import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    ArrowLeft, CheckCircle2, AlertCircle, Clock, TrendingUp,
    AlertTriangle, Users, IndianRupee, Store, Navigation,
    ChevronRight, BarChart2, ShieldCheck, Sparkles, RefreshCw
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import api from '../../src/services/api';

export default function ManagerDashboardScreen() {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const todayDateFormatted = useMemo(() => {
        const d = new Date();
        return {
            full: d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }),
            timeStr: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
    }, []);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/beat-plans/manager-dashboard');
            setDashboard(res.data);
        } catch (err) {
            console.error('Failed to load manager dashboard:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        fetchDashboard();
    }, [fetchDashboard]));

    const team: any[] = dashboard?.team || [];
    const alerts: any[] = dashboard?.alerts || [];

    const totalVisits = useMemo(() => team.reduce((s: number, m: any) => s + (m.totalScheduled || 0), 0), [team]);
    const totalCompleted = useMemo(() => team.reduce((s: number, m: any) => s + (m.completed || 0), 0), [team]);
    const totalOrders = useMemo(() => team.reduce((s: number, m: any) => s + (m.totalOrders || 0), 0), [team]);
    const totalCollections = useMemo(() => team.reduce((s: number, m: any) => s + (m.totalCollections || 0), 0), [team]);
    const completionPct = totalVisits > 0 ? Math.round((totalCompleted / totalVisits) * 100) : 0;

    const formatCompact = (amount: number) => {
        if (!amount || amount === 0) return '₹0';
        if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
        if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
        if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + ' K';
        return '₹' + amount.toLocaleString('en-IN');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 1. Executive Analytics Pastel SVG Illustration Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Right Regal Amethyst / Purple Flow Blob */}
                    <Path
                        d="M100 -40 C200 -50, 390 -30, 400 90 C410 210, 330 270, 190 240 C100 220, 10 150, 100 -40 Z"
                        fill="#E1BEE7"
                        opacity={0.36}
                    />
                    <Circle cx="340" cy="70" r="75" fill="#BA68C8" opacity={0.16} />

                    {/* Cyber Blue Flow Blob */}
                    <Path
                        d="M-60 140 C20 160, 110 100, 150 220 C190 340, 70 380, -20 340 C-100 300, -130 120, -60 140 Z"
                        fill="#BBDEFB"
                        opacity={0.32}
                    />

                    {/* Subtle Sparkline Analytics Dashed Curve */}
                    <Path
                        d="M 40 180 Q 140 110, 240 160 T 360 110"
                        stroke="#8E24AA"
                        strokeWidth="1.5"
                        strokeDasharray="4,6"
                        fill="none"
                        opacity={0.22}
                    />
                    <Circle cx="40" cy="180" r="4" fill="#8E24AA" opacity={0.35} />
                    <Circle cx="240" cy="160" r="4" fill="#1976D2" opacity={0.35} />
                    <Circle cx="360" cy="110" r="5" fill="#8E24AA" opacity={0.35} />

                    {/* Soft Ambience Rings */}
                    <Circle cx="340" cy="460" r="80" fill="#FFE0B2" opacity={0.25} />
                    <Circle cx="40" cy="680" r="75" fill="#D1C4E9" opacity={0.30} />
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
                            fetchDashboard();
                        }}
                        colors={['#8E24AA', '#1976D2']}
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
                            <Text style={styles.headerTitle}>Team Dashboard</Text>
                            <Text style={styles.headerSubtitle}>
                                Field Sales Performance & Operations
                            </Text>
                        </View>

                        <View style={styles.liveManagerPill}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.liveManagerText}>Live GPS</Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 3. Date & Live Operations Card */}
                <FadeInDown delay={50}>
                    <View style={styles.dateBarCard}>
                        <View style={styles.dateBarLeft}>
                            <Clock size={15} color="#8E24AA" />
                            <Text style={styles.dateBarText}>{todayDateFormatted.full}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.dateRefreshBtn}
                            onPress={fetchDashboard}
                            activeOpacity={0.7}
                        >
                            <RefreshCw size={14} color="#666666" />
                            <Text style={styles.dateRefreshText}>Sync</Text>
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* 4. Top 4-Grid Executive KPIs */}
                <FadeInDown delay={80}>
                    <View style={styles.kpiGrid}>
                        {/* 1. Visits Progress */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiCardHeader}>
                                <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
                                    <CheckCircle2 size={18} color="#2E7D32" />
                                </View>
                                <View style={styles.kpiTagPill}>
                                    <Text style={styles.kpiTagText}>{completionPct}%</Text>
                                </View>
                            </View>
                            <Text style={styles.kpiValueText}>{totalCompleted}/{totalVisits}</Text>
                            <Text style={styles.kpiLabelText}>Visits Completed</Text>
                        </View>

                        {/* 2. Active Sales Reps */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiCardHeader}>
                                <View style={[styles.kpiIconBox, { backgroundColor: '#F3E5F5' }]}>
                                    <Users size={18} color="#8E24AA" />
                                </View>
                                <View style={[styles.kpiTagPill, { backgroundColor: '#F3E5F5' }]}>
                                    <Text style={[styles.kpiTagText, { color: '#8E24AA' }]}>Active</Text>
                                </View>
                            </View>
                            <Text style={styles.kpiValueText}>{team.length}</Text>
                            <Text style={styles.kpiLabelText}>Sales Reps on Field</Text>
                        </View>

                        {/* 3. Orders Value */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiCardHeader}>
                                <View style={[styles.kpiIconBox, { backgroundColor: '#FFF3E0' }]}>
                                    <TrendingUp size={18} color="#E65100" />
                                </View>
                                <View style={[styles.kpiTagPill, { backgroundColor: '#FFF3E0' }]}>
                                    <Text style={[styles.kpiTagText, { color: '#E65100' }]}>Orders</Text>
                                </View>
                            </View>
                            <Text style={styles.kpiValueText}>{formatCompact(totalOrders)}</Text>
                            <Text style={styles.kpiLabelText}>Total Orders Booked</Text>
                        </View>

                        {/* 4. Total Collections */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiCardHeader}>
                                <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2F1' }]}>
                                    <IndianRupee size={18} color="#00897B" />
                                </View>
                                <View style={[styles.kpiTagPill, { backgroundColor: '#E0F2F1' }]}>
                                    <Text style={[styles.kpiTagText, { color: '#00897B' }]}>Collected</Text>
                                </View>
                            </View>
                            <Text style={styles.kpiValueText}>{formatCompact(totalCollections)}</Text>
                            <Text style={styles.kpiLabelText}>Daily Collections</Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 5. Smart Alerts */}
                {alerts.length > 0 && (
                    <FadeInDown delay={110} style={styles.alertsContainer}>
                        <View style={styles.alertsHeaderRow}>
                            <AlertTriangle size={16} color="#E53935" />
                            <Text style={styles.alertsHeaderTitle}>Smart Attention Alerts</Text>
                        </View>
                        {alerts.map((alert: any, i: number) => {
                            const isDanger = alert.type === 'DANGER';
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.alertCard,
                                        isDanger ? styles.alertCardDanger : styles.alertCardWarn
                                    ]}
                                >
                                    <AlertCircle
                                        size={16}
                                        color={isDanger ? '#D32F2F' : '#F57F17'}
                                    />
                                    <Text style={[styles.alertCardText, isDanger && { color: '#C62828' }]}>
                                        {alert.message}
                                    </Text>
                                </View>
                            );
                        })}
                    </FadeInDown>
                )}

                {/* 6. Sales Team Roster & Tracking */}
                <FadeInDown delay={130}>
                    <View style={styles.teamSectionHeader}>
                        <Text style={styles.teamSectionTitle}>Sales Reps ({team.length})</Text>
                        <Text style={styles.teamSectionSubtitle}>Real-time store check-ins & routes</Text>
                    </View>
                </FadeInDown>

                {loading && !dashboard ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#8E24AA" />
                        <Text style={styles.loadingText}>Fetching team operations...</Text>
                    </View>
                ) : team.length === 0 ? (
                    <FadeInDown delay={150}>
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconCircle}>
                                <Users size={36} color="#888888" />
                            </View>
                            <Text style={styles.emptyTitle}>No Sales Visits Scheduled Today</Text>
                            <Text style={styles.emptySubtitle}>
                                There are no active beat plans scheduled for today. Assign stores in the weekly Beat Plan to start live tracking.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyActionBtn}
                                onPress={() => router.push('/field-sales/beat-plan')}
                                activeOpacity={0.8}
                            >
                                <BarChart2 size={15} color="#FFFFFF" />
                                <Text style={styles.emptyActionBtnText}>Schedule Beat Plans</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInDown>
                ) : (
                    <StaggerContainer stagger={45} delay={140}>
                        <View style={styles.teamListContainer}>
                            {team.map((member: any) => {
                                const scheduled = member.totalScheduled || 0;
                                const completed = member.completed || 0;
                                const missed = member.missed || 0;
                                const pending = member.pending || 0;
                                const pct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
                                const initials = member.salespersonName?.slice(0, 2).toUpperCase() || 'SP';

                                return (
                                    <AnimatedPressable
                                        key={member.salespersonId}
                                        style={styles.repCard}
                                        onPress={() => router.push({
                                            pathname: '/field-sales/today-route',
                                        } as any)}
                                    >
                                        {/* Card Top Row: Rep Avatar, Name, Pct Badge */}
                                        <View style={styles.repHeaderRow}>
                                            <View style={styles.repAvatarBox}>
                                                <Text style={styles.repAvatarText}>{initials}</Text>
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <View style={styles.repNameRow}>
                                                    <Text style={styles.repNameText}>{member.salespersonName}</Text>
                                                    <View style={styles.repRolePill}>
                                                        <Text style={styles.repRoleText}>Sales Rep</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.repSubtext}>
                                                    {completed} of {scheduled} stores visited
                                                </Text>
                                            </View>

                                            <View style={[styles.repPctBadge, pct === 100 && styles.repPctBadgeDone]}>
                                                <Text style={[styles.repPctText, pct === 100 && styles.repPctTextDone]}>
                                                    {pct}%
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Visual Progress Bar */}
                                        <View style={styles.repProgressTrack}>
                                            <View
                                                style={[
                                                    styles.repProgressFill,
                                                    {
                                                        width: `${Math.min(100, Math.max(pct, scheduled > 0 ? 5 : 0))}%`,
                                                        backgroundColor: pct === 100 ? '#2E7D32' : '#8E24AA'
                                                    }
                                                ]}
                                            />
                                        </View>

                                        {/* Store Status Breakdown Chips */}
                                        <View style={styles.repBreakdownRow}>
                                            <View style={[styles.repChip, { backgroundColor: '#E8F5E9' }]}>
                                                <CheckCircle2 size={13} color="#2E7D32" />
                                                <Text style={[styles.repChipText, { color: '#2E7D32' }]}>
                                                    {completed} Done
                                                </Text>
                                            </View>

                                            <View style={[styles.repChip, { backgroundColor: '#FFF3E0' }]}>
                                                <Clock size={13} color="#E65100" />
                                                <Text style={[styles.repChipText, { color: '#E65100' }]}>
                                                    {pending} Pending
                                                </Text>
                                            </View>

                                            {missed > 0 && (
                                                <View style={[styles.repChip, { backgroundColor: '#FFEBEE' }]}>
                                                    <AlertCircle size={13} color="#C62828" />
                                                    <Text style={[styles.repChipText, { color: '#C62828' }]}>
                                                        {missed} Missed
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Financial Performance Strip */}
                                        <View style={styles.repFinancialStrip}>
                                            <View style={styles.repFinCol}>
                                                <View style={styles.repFinLabelRow}>
                                                    <TrendingUp size={12} color="#8E24AA" />
                                                    <Text style={styles.repFinLabel}>ORDERS</Text>
                                                </View>
                                                <Text style={styles.repFinValue}>
                                                    {formatCompact(member.totalOrders || 0)}
                                                </Text>
                                            </View>

                                            <View style={styles.repFinDivider} />

                                            <View style={styles.repFinCol}>
                                                <View style={styles.repFinLabelRow}>
                                                    <IndianRupee size={12} color="#00897B" />
                                                    <Text style={styles.repFinLabel}>COLLECTIONS</Text>
                                                </View>
                                                <Text style={styles.repFinValue}>
                                                    {formatCompact(member.totalCollections || 0)}
                                                </Text>
                                            </View>
                                        </View>
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
        marginBottom: 12,
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
    liveManagerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E1BEE7',
    },
    livePulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#8E24AA',
    },
    liveManagerText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E24AA',
    },

    // Date Bar
    dateBarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        marginBottom: 14,
    },
    dateBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    dateBarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    dateRefreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
    },
    dateRefreshText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666666',
    },

    // 4-Grid KPI Matrix
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    kpiCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    kpiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    kpiIconBox: {
        width: 36,
        height: 36,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiTagPill: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    kpiTagText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#2E7D32',
    },
    kpiValueText: {
        fontSize: 19,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    kpiLabelText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
    },

    // Alerts
    alertsContainer: {
        marginBottom: 16,
    },
    alertsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    alertsHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E53935',
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        marginBottom: 6,
        borderWidth: 1,
    },
    alertCardDanger: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FFCDD2',
    },
    alertCardWarn: {
        backgroundColor: '#FFF8E1',
        borderColor: '#FFE082',
    },
    alertCardText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#E65100',
    },

    // Team Section
    teamSectionHeader: {
        marginBottom: 12,
    },
    teamSectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    teamSectionSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    teamListContainer: {
        gap: 12,
    },
    repCard: {
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
    repHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    repAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F3E5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    repAvatarText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#8E24AA',
    },
    repNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    repNameText: {
        fontSize: 15.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    repRolePill: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ECEAE4',
    },
    repRoleText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#777777',
    },
    repSubtext: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 2,
    },
    repPctBadge: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8E6E0',
    },
    repPctBadgeDone: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    repPctText: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#666666',
    },
    repPctTextDone: {
        color: '#2E7D32',
    },

    // Progress Bar
    repProgressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: '#ECEAE4',
        overflow: 'hidden',
        marginBottom: 12,
    },
    repProgressFill: {
        height: '100%',
        borderRadius: 999,
    },

    // Breakdown Chips
    repBreakdownRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    repChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
    },
    repChipText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Financial Strip
    repFinancialStrip: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#F0EFEA',
    },
    repFinCol: {
        flex: 1,
    },
    repFinLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    repFinLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
    },
    repFinValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    repFinDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E2E0D8',
        alignSelf: 'center',
        marginHorizontal: 8,
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
        textAlign: 'center',
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
        backgroundColor: '#8E24AA',
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

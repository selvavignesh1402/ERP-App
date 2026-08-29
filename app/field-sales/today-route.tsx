import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { MapPin, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react-native';
import { FadeInDown } from '../../src/components/Anime';
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
    status: 'PENDING' | 'COMPLETED' | 'MISSED';
    lastVisitDate?: string;
    lastOrderAmount?: number;
    lastOrderDate?: string;
    checkInId?: number;
    checkInTime?: string;
}

const statusConfig = {
    PENDING: { color: '#9E9E9E', bg: '#F5F5F5', label: 'Pending', icon: Clock },
    COMPLETED: { color: '#43A047', bg: '#E8F5E9', label: 'Completed', icon: CheckCircle2 },
    MISSED: { color: '#E53935', bg: '#FFEBEE', label: 'Missed', icon: AlertCircle },
};

export default function TodayRouteScreen() {
    const router = useRouter();
    const [route, setRoute] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric'
    });

    const fetchRoute = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/beat-plans/my-route');
            setRoute(res.data || []);
        } catch (err) {
            console.error('Failed to fetch route:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchRoute(); }, [fetchRoute]));

    const completed = route.filter(r => r.status === 'COMPLETED').length;
    const total = route.length;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoute(); }} colors={[Colors.primary]} />}
            >
                {/* Header */}
                <FadeInDown delay={0}>
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={styles.dateText}>{today}</Text>
                                <Text style={styles.headerTitle}>Today's Route</Text>
                            </View>
                            <View style={styles.progressBadge}>
                                <Text style={styles.progressText}>{completed}/{total}</Text>
                                <Text style={styles.progressLabel}>Done</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: total > 0 ? `${(completed / total) * 100}%` : '0%' }]} />
                        </View>

                        <Text style={styles.subText}>
                            {total === 0 ? 'No shops scheduled for today' : `${total} shops scheduled • ${completed} visited`}
                        </Text>
                    </View>
                </FadeInDown>

                {loading && route.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : total === 0 ? (
                    <View style={styles.emptyState}>
                        <MapPin size={48} color={Colors.textSecondary} style={{ opacity: 0.3 }} />
                        <Text style={styles.emptyTitle}>No visits scheduled</Text>
                        <Text style={styles.emptyText}>Your manager hasn't assigned any shops for today.</Text>
                    </View>
                ) : (
                    route.map((item, idx) => {
                        const cfg = statusConfig[item.status];
                        const StatusIcon = cfg.icon;
                        return (
                            <FadeInDown key={item.scheduleId} delay={100 + idx * 60}>
                                <TouchableOpacity
                                    style={styles.shopCard}
                                    onPress={() => router.push({ pathname: '/field-sales/visit/[id]', params: { id: item.scheduleId, customerName: item.customerName } } as any)}
                                    activeOpacity={0.7}
                                >
                                    {/* Status indicator */}
                                    <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />

                                    <View style={styles.cardBody}>
                                        <View style={styles.cardTop}>
                                            <View style={styles.cardTitleRow}>
                                                <Text style={styles.shopName}>{item.customerName}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                                    <StatusIcon size={12} color={cfg.color} />
                                                    <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                                </View>
                                            </View>
                                            {item.customerAddress ? (
                                                <Text style={styles.shopAddress} numberOfLines={1}>{item.customerAddress}</Text>
                                            ) : null}
                                        </View>

                                        <View style={styles.cardStats}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Last Order</Text>
                                                <Text style={styles.statValue}>
                                                    {item.lastOrderAmount ? `₹${item.lastOrderAmount.toLocaleString('en-IN')}` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.statDivider} />
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Outstanding</Text>
                                                <Text style={[styles.statValue, item.outstandingBalance > 0 && { color: '#E53935' }]}>
                                                    {item.outstandingBalance > 0 ? `₹${item.outstandingBalance.toLocaleString('en-IN')}` : '₹0'}
                                                </Text>
                                            </View>
                                            <View style={styles.statDivider} />
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Last Visit</Text>
                                                <Text style={styles.statValue}>
                                                    {item.lastVisitDate ? new Date(item.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                                </Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.startBtn, item.status === 'COMPLETED' && styles.startBtnDone]}
                                            onPress={() => router.push({ pathname: '/field-sales/visit/[id]', params: { id: item.scheduleId, customerName: item.customerName } } as any)}
                                        >
                                            <Text style={[styles.startBtnText, item.status === 'COMPLETED' && styles.startBtnTextDone]}>
                                                {item.status === 'COMPLETED' ? 'View Visit' : 'Start Visit'}
                                            </Text>
                                            <ChevronRight size={16} color={item.status === 'COMPLETED' ? Colors.textSecondary : '#fff'} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </FadeInDown>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    header: {
        backgroundColor: Colors.primary,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    dateText: { fontSize: 13, fontFamily: 'Urbanist_500Medium', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    headerTitle: { fontSize: 24, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    progressBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 10 },
    progressText: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    progressLabel: { fontSize: 11, fontFamily: 'Urbanist_500Medium', color: 'rgba(255,255,255,0.8)' },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 10 },
    progressBarFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
    subText: { fontSize: 13, fontFamily: 'Urbanist_400Regular', color: 'rgba(255,255,255,0.75)' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, textAlign: 'center', maxWidth: '70%' },
    shopCard: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        marginBottom: 14,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statusDot: { width: 5, borderRadius: 5 },
    cardBody: { flex: 1, padding: 16 },
    cardTop: { marginBottom: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    shopName: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text, flex: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    statusLabel: { fontSize: 11, fontFamily: 'Urbanist_600SemiBold' },
    shopAddress: { fontSize: 12, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    cardStats: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 12, marginBottom: 14 },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: Colors.border },
    statLabel: { fontSize: 11, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 14, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    startBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    startBtnDone: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
    startBtnText: { fontSize: 14, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    startBtnTextDone: { color: Colors.textSecondary },
});

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { ChevronLeft, CheckCircle2, AlertCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { IndianRupee } from '../../src/components/IndianRupee';
import api from '../../src/services/api';

export default function ManagerDashboardScreen() {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

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

    useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));

    const team: any[] = dashboard?.team || [];
    const alerts: any[] = dashboard?.alerts || [];

    const totalVisits = team.reduce((s: number, m: any) => s + m.totalScheduled, 0);
    const totalCompleted = team.reduce((s: number, m: any) => s + m.completed, 0);
    const totalOrders = team.reduce((s: number, m: any) => s + (m.totalOrders || 0), 0);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Team Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !dashboard ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} colors={[Colors.primary]} />}
                >
                    {/* Date + Summary */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryDate}>{today}</Text>
                        <Text style={styles.summaryTitle}>Field Sales Overview</Text>
                        <View style={styles.summaryKpis}>
                            <View style={styles.skpi}>
                                <Text style={styles.skpiValue}>{totalCompleted}/{totalVisits}</Text>
                                <Text style={styles.skpiLabel}>Visits Done</Text>
                            </View>
                            <View style={styles.skpiDiv} />
                            <View style={styles.skpi}>
                                <Text style={styles.skpiValue}>{team.length}</Text>
                                <Text style={styles.skpiLabel}>Salespersons</Text>
                            </View>
                            <View style={styles.skpiDiv} />
                            <View style={styles.skpi}>
                                <Text style={styles.skpiValue}>₹{totalOrders > 0 ? (totalOrders / 1000).toFixed(1) + 'K' : '0'}</Text>
                                <Text style={styles.skpiLabel}>Orders</Text>
                            </View>
                        </View>
                    </View>

                    {/* Smart Alerts */}
                    {alerts.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>⚠ Smart Alerts</Text>
                            {alerts.map((alert: any, i: number) => (
                                <View key={i} style={[
                                    styles.alertRow,
                                    alert.type === 'DANGER' ? styles.alertDanger : styles.alertWarn
                                ]}>
                                    <AlertTriangle size={15} color={alert.type === 'DANGER' ? '#E53935' : '#F9A825'} />
                                    <Text style={[styles.alertText, alert.type === 'DANGER' && styles.alertTextDanger]}>
                                        {alert.message}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Team Cards */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sales Team</Text>
                        {team.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No scheduled visits for today.</Text>
                            </View>
                        ) : (
                            team.map((member: any) => {
                                const pct = member.totalScheduled > 0
                                    ? Math.round((member.completed / member.totalScheduled) * 100) : 0;
                                return (
                                    <View key={member.salespersonId} style={styles.memberCard}>
                                        <View style={styles.memberHeader}>
                                            <View style={styles.memberAvatar}>
                                                <Text style={styles.memberAvatarText}>
                                                    {member.salespersonName?.slice(0, 2).toUpperCase() || '??'}
                                                </Text>
                                            </View>
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberName}>{member.salespersonName}</Text>
                                                <Text style={styles.memberProgress}>
                                                    {member.completed} of {member.totalScheduled} visits completed
                                                </Text>
                                            </View>
                                            <Text style={[styles.pctBadge, pct === 100 && styles.pctBadgeFull]}>
                                                {pct}%
                                            </Text>
                                        </View>

                                        {/* Progress bar */}
                                        <View style={styles.progressBg}>
                                            <View style={[styles.progressFill, { width: `${pct}%` }]} />
                                        </View>

                                        {/* Visit status breakdown */}
                                        <View style={styles.visitBreakdown}>
                                            <View style={styles.vbItem}>
                                                <CheckCircle2 size={14} color='#43A047' />
                                                <Text style={styles.vbText}>{member.completed} Done</Text>
                                            </View>
                                            <View style={styles.vbItem}>
                                                <AlertCircle size={14} color='#E53935' />
                                                <Text style={styles.vbText}>{member.missed} Missed</Text>
                                            </View>
                                            <View style={styles.vbItem}>
                                                <Clock size={14} color='#9E9E9E' />
                                                <Text style={styles.vbText}>{member.pending} Pending</Text>
                                            </View>
                                        </View>

                                        {/* Revenue */}
                                        <View style={styles.revenueRow}>
                                            <View style={styles.revenueItem}>
                                                <TrendingUp size={15} color={Colors.primary} />
                                                <Text style={styles.revenueLabel}>Orders</Text>
                                                <Text style={styles.revenueValue}>₹{(member.totalOrders || 0).toLocaleString('en-IN')}</Text>
                                            </View>
                                            <View style={styles.revenueDivider} />
                                            <View style={styles.revenueItem}>
                                                <IndianRupee size={15} color='#1E88E5' />
                                                <Text style={styles.revenueLabel}>Collections</Text>
                                                <Text style={styles.revenueValue}>₹{(member.totalCollections || 0).toLocaleString('en-IN')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    content: { padding: 16, paddingBottom: 40 },
    summaryCard: {
        backgroundColor: Colors.primary, borderRadius: 24, padding: 20, marginBottom: 20,
    },
    summaryDate: { fontSize: 12, fontFamily: 'Urbanist_500Medium', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    summaryTitle: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: '#fff', marginBottom: 16 },
    summaryKpis: { flexDirection: 'row' },
    skpi: { flex: 1, alignItems: 'center' },
    skpiValue: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: '#fff', marginBottom: 4 },
    skpiLabel: { fontSize: 11, fontFamily: 'Urbanist_400Regular', color: 'rgba(255,255,255,0.75)' },
    skpiDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 12 },
    alertRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
        borderRadius: 12, marginBottom: 8,
    },
    alertDanger: { backgroundColor: '#FFEBEE' },
    alertWarn: { backgroundColor: '#FFFDE7' },
    alertText: { flex: 1, fontSize: 13, fontFamily: 'Urbanist_500Medium', color: '#F9A825' },
    alertTextDanger: { color: '#E53935' },
    emptyState: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    memberCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 16, marginBottom: 14 },
    memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    memberAvatar: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accent,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    memberAvatarText: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.primary },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 2 },
    memberProgress: { fontSize: 12, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    pctBadge: {
        fontSize: 14, fontFamily: 'Urbanist_700Bold', color: Colors.textSecondary,
        backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 10,
    },
    pctBadgeFull: { color: '#43A047', backgroundColor: '#E8F5E9' },
    progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 14 },
    progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
    visitBreakdown: { flexDirection: 'row', gap: 16, marginBottom: 14 },
    vbItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    vbText: { fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: Colors.textSecondary },
    revenueRow: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 12 },
    revenueItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    revenueDivider: { width: 1, backgroundColor: Colors.border },
    revenueLabel: { fontSize: 12, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    revenueValue: { fontSize: 13, fontFamily: 'Urbanist_700Bold', color: Colors.text },
});

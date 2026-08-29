import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarDays } from 'lucide-react-native';
import api from '../../src/services/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BeatPlanScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(0);
    const [showPlanModal, setShowPlanModal] = useState(false);

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/beat-plans');
            setPlans(res.data || []);
        } catch (err) {
            console.error('Failed to load beat plans:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchPlans(); }, [fetchPlans]));

    const handleGenerateWeek = async () => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const weekStart = monday.toISOString().split('T')[0];

        Alert.alert('Generate Week', `Generate visit schedules for the week of ${weekStart}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Generate', onPress: async () => {
                    try {
                        const res = await api.post(`/beat-plans/generate-week?weekStart=${weekStart}`);
                        Alert.alert('Done', `${res.data.schedulesCreated} visit schedules created`);
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.message || 'Failed to generate schedules');
                    }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Beat Plan</Text>
                <TouchableOpacity onPress={() => setShowPlanModal(true)} style={styles.addBtn}>
                    <Plus size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Day selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
                {SHORT_DAYS.map((d, i) => (
                    <TouchableOpacity
                        key={d}
                        style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                        onPress={() => setSelectedDay(i)}
                    >
                        <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Generate week button */}
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateWeek}>
                <CalendarDays size={18} color={Colors.primary} />
                <Text style={styles.generateBtnText}>Generate This Week's Schedules</Text>
                <ChevronRight size={18} color={Colors.primary} />
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {plans.length === 0 ? (
                        <View style={styles.emptyState}>
                            <CalendarDays size={48} color={Colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={styles.emptyTitle}>No Beat Plans</Text>
                            <Text style={styles.emptyText}>Create a beat plan to assign weekly routes to salespersons.</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => setShowPlanModal(true)}>
                                <Plus size={18} color='#fff' />
                                <Text style={styles.createBtnText}>Create Beat Plan</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        plans.map((plan: any) => {
                            const dayEntries = (plan.entries || []).filter((e: any) => e.dayOfWeek === DAYS[selectedDay]);
                            return (
                                <View key={plan.id} style={styles.planCard}>
                                    <View style={styles.planCardHeader}>
                                        <View>
                                            <Text style={styles.planName}>{plan.name}</Text>
                                            <Text style={styles.planSalesperson}>{plan.salespersonName}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, !plan.isActive && styles.statusBadgeInactive]}>
                                            <Text style={[styles.statusText, !plan.isActive && styles.statusTextInactive]}>
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>

                                    {dayEntries.length === 0 ? (
                                        <Text style={styles.noEntries}>No shops on {SHORT_DAYS[selectedDay]}</Text>
                                    ) : (
                                        dayEntries
                                            .sort((a: any, b: any) => a.visitOrder - b.visitOrder)
                                            .map((entry: any, idx: number) => (
                                                <View key={entry.id} style={styles.entryRow}>
                                                    <View style={styles.entryNum}>
                                                        <Text style={styles.entryNumText}>{idx + 1}</Text>
                                                    </View>
                                                    <Text style={styles.entryCustomer}>{entry.customerName}</Text>
                                                    <ChevronRight size={16} color={Colors.textSecondary} />
                                                </View>
                                            ))
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Create Plan Modal (simplified) */}
            <Modal visible={showPlanModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Create Beat Plan</Text>
                        <Text style={styles.modalSub}>
                            Beat plan creation requires selecting a salesperson and assigning shops per day.
                            Use the admin web panel for full beat plan configuration,
                            or contact your manager.
                        </Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPlanModal(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    dayScroll: { flexGrow: 0 },
    dayScrollContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
    dayChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.card },
    dayChipActive: { backgroundColor: Colors.primary },
    dayChipText: { fontSize: 14, fontFamily: 'Urbanist_600SemiBold', color: Colors.textSecondary },
    dayChipTextActive: { color: '#fff' },
    generateBtn: {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: Colors.accent,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    generateBtnText: { flex: 1, fontSize: 14, fontFamily: 'Urbanist_600SemiBold', color: Colors.primary },
    content: { padding: 16, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, textAlign: 'center', maxWidth: '72%', marginBottom: 20 },
    createBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', gap: 8 },
    createBtnText: { fontSize: 15, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    planCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 16, marginBottom: 14 },
    planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    planName: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 2 },
    planSalesperson: { fontSize: 13, fontFamily: 'Urbanist_500Medium', color: Colors.textSecondary },
    statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusBadgeInactive: { backgroundColor: '#F5F5F5' },
    statusText: { fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: Colors.primary },
    statusTextInactive: { color: Colors.textSecondary },
    noEntries: { fontSize: 13, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, paddingVertical: 4 },
    entryRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    entryNum: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent,
        justifyContent: 'center', alignItems: 'center',
    },
    entryNumText: { fontSize: 13, fontFamily: 'Urbanist_700Bold', color: Colors.primary },
    entryCustomer: { flex: 1, fontSize: 15, fontFamily: 'Urbanist_600SemiBold', color: Colors.text },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 8 },
    modalSub: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, lineHeight: 22, marginBottom: 20 },
    closeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    closeBtnText: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: '#fff' },
});

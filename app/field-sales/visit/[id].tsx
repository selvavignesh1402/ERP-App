import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../../src/theme/colors';
import {
    Phone, MapPin, CreditCard, ShoppingCart,
    ClipboardList, MessageSquare, CheckCircle2, ChevronLeft, AlertTriangle
} from 'lucide-react-native';
import { IndianRupee } from '../../../src/components/IndianRupee';
import api from '../../../src/services/api';

type VisitOutcome = 'ORDER_PLACED' | 'PAYMENT_COLLECTED' | 'BOTH' | 'NO_ORDER' | 'SHOP_CLOSED' | 'CUSTOMER_UNAVAILABLE' | 'FOLLOW_UP';

const OUTCOMES: { value: VisitOutcome; label: string; color: string }[] = [
    { value: 'ORDER_PLACED', label: 'Order Placed', color: '#43A047' },
    { value: 'PAYMENT_COLLECTED', label: 'Payment Collected', color: '#1E88E5' },
    { value: 'BOTH', label: 'Order + Payment', color: '#8E24AA' },
    { value: 'NO_ORDER', label: 'No Order', color: '#FB8C00' },
    { value: 'SHOP_CLOSED', label: 'Shop Closed', color: '#E53935' },
    { value: 'CUSTOMER_UNAVAILABLE', label: 'Customer Unavailable', color: '#E53935' },
    { value: 'FOLLOW_UP', label: 'Follow Up Required', color: '#F9A825' },
];

export default function VisitScreen() {
    const { id, customerName } = useLocalSearchParams<{ id: string; customerName: string }>();
    const router = useRouter();

    const [scheduleDetails, setScheduleDetails] = useState<any>(null);
    const [checkInRecord, setCheckInRecord] = useState<any>(null);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Check-out modal state
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | null>(null);
    const [notes, setNotes] = useState('');
    const [checkingOut, setCheckingOut] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch today's route to get this schedule's details
            const routeRes = await api.get('/beat-plans/my-route');
            const found = routeRes.data?.find((r: any) => String(r.scheduleId) === String(id));
            if (found) {
                setScheduleDetails(found);
                // Fetch visit history for customer
                const histRes = await api.get(`/visits/customer/${found.customerId}/history`);
                setVisitHistory(histRes.data || []);
                // Current check-in record
                if (found.checkInId) {
                    setCheckInRecord({ id: found.checkInId, checkInTime: found.checkInTime });
                }
            }
        } catch (err) {
            console.error('Failed to load visit details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const handleCheckIn = async () => {
        try {
            const res = await api.post(`/visits/${id}/check-in`, { latitude: null, longitude: null });
            setCheckInRecord(res.data);
            Alert.alert('Checked In', `You've checked in at ${customerName}`);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Check-in failed');
        }
    };

    const handleCheckOut = async () => {
        if (!selectedOutcome) { Alert.alert('Select outcome', 'Please select a visit outcome'); return; }
        try {
            setCheckingOut(true);
            await api.put(`/visits/${checkInRecord.id}/check-out`, { outcome: selectedOutcome, notes });
            setShowCheckOut(false);
            Alert.alert('Visit Completed', 'Visit recorded successfully');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Check-out failed');
        } finally {
            setCheckingOut(false);
        }
    };

    const isCheckedIn = !!checkInRecord?.id;
    const isCompleted = scheduleDetails?.status === 'COMPLETED';

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{customerName || 'Visit'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Customer Card */}
                {scheduleDetails && (
                    <View style={styles.customerCard}>
                        <View style={styles.customerAvatar}>
                            <Text style={styles.avatarText}>
                                {scheduleDetails.customerName?.slice(0, 2).toUpperCase() || 'SH'}
                            </Text>
                        </View>
                        <Text style={styles.customerName}>{scheduleDetails.customerName}</Text>
                        {scheduleDetails.customerPhone && (
                            <View style={styles.infoRow}>
                                <Phone size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.infoText}>{scheduleDetails.customerPhone}</Text>
                            </View>
                        )}
                        {scheduleDetails.customerAddress && (
                            <View style={styles.infoRow}>
                                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.infoText}>{scheduleDetails.customerAddress}</Text>
                            </View>
                        )}

                        {/* KPIs */}
                        <View style={styles.kpiRow}>
                            <View style={styles.kpi}>
                                <Text style={styles.kpiValue}>
                                    ₹{(scheduleDetails.creditLimit || 0).toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.kpiLabel}>Credit Limit</Text>
                            </View>
                            <View style={styles.kpiDivider} />
                            <View style={styles.kpi}>
                                <Text style={[styles.kpiValue, scheduleDetails.outstandingBalance > 0 && { color: '#FFCDD2' }]}>
                                    ₹{(scheduleDetails.outstandingBalance || 0).toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.kpiLabel}>Outstanding</Text>
                            </View>
                            <View style={styles.kpiDivider} />
                            <View style={styles.kpi}>
                                <Text style={styles.kpiValue}>
                                    {scheduleDetails.lastVisitDate
                                        ? new Date(scheduleDetails.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                        : '—'}
                                </Text>
                                <Text style={styles.kpiLabel}>Last Visit</Text>
                            </View>
                        </View>

                        {/* Outstanding Alert */}
                        {scheduleDetails.outstandingBalance > 0 && (
                            <View style={styles.outstandingAlert}>
                                <AlertTriangle size={14} color='#FF8A65' />
                                <Text style={styles.outstandingAlertText}>
                                    ₹{scheduleDetails.outstandingBalance.toLocaleString('en-IN')} outstanding — collect on this visit
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Previous Activity */}
                {scheduleDetails?.lastOrderAmount > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Previous Activity</Text>
                        <View style={styles.activityCard}>
                            <View style={styles.activityRow}>
                                <Text style={styles.activityLabel}>Last Order</Text>
                                <Text style={styles.activityValue}>
                                    ₹{scheduleDetails.lastOrderAmount?.toLocaleString('en-IN')}
                                </Text>
                            </View>
                            {scheduleDetails.lastOrderDate && (
                                <View style={styles.activityRow}>
                                    <Text style={styles.activityLabel}>Order Date</Text>
                                    <Text style={styles.activityValue}>{scheduleDetails.lastOrderDate}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions</Text>

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.push('/sales' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                                <ShoppingCart size={22} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionLabel}>Create Order</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.push('/sales' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                                <IndianRupee size={22} color='#1E88E5' />
                            </View>
                            <Text style={styles.actionLabel}>Collect Payment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => { }}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E8EAF6' }]}>
                                <ClipboardList size={22} color='#3F51B5' />
                            </View>
                            <Text style={styles.actionLabel}>View History</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => { }}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                                <MessageSquare size={22} color='#FB8C00' />
                            </View>
                            <Text style={styles.actionLabel}>Add Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Check-in / Check-out */}
                {!isCompleted && (
                    <View style={styles.section}>
                        {!isCheckedIn ? (
                            <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
                                <MapPin size={20} color='#fff' />
                                <Text style={styles.checkInBtnText}>Check In at this Shop</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.checkOutBtn} onPress={() => setShowCheckOut(true)}>
                                <CheckCircle2 size={20} color='#fff' />
                                <Text style={styles.checkInBtnText}>Complete Visit</Text>
                            </TouchableOpacity>
                        )}
                        {isCheckedIn && (
                            <Text style={styles.checkedInNote}>
                                Checked in at {checkInRecord.checkInTime
                                    ? new Date(checkInRecord.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                            </Text>
                        )}
                    </View>
                )}

                {isCompleted && (
                    <View style={[styles.completedBanner]}>
                        <CheckCircle2 size={18} color='#43A047' />
                        <Text style={styles.completedText}>Visit completed</Text>
                    </View>
                )}

                {/* Visit History */}
                {visitHistory.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Visit History</Text>
                        {visitHistory.slice(0, 5).map((v: any) => (
                            <View key={v.id} style={styles.historyRow}>
                                <Text style={styles.historyDate}>
                                    {v.checkInTime ? new Date(v.checkInTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                </Text>
                                <Text style={styles.historyOutcome}>{v.outcome?.replace(/_/g, ' ') || 'No outcome'}</Text>
                                {v.notes ? <Text style={styles.historyNotes} numberOfLines={1}>{v.notes}</Text> : null}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Check-out Modal */}
            <Modal visible={showCheckOut} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Complete Visit</Text>
                        <Text style={styles.modalSub}>Select what happened during this visit</Text>

                        <View style={styles.outcomeGrid}>
                            {OUTCOMES.map(o => (
                                <TouchableOpacity
                                    key={o.value}
                                    style={[styles.outcomeChip, selectedOutcome === o.value && { backgroundColor: o.color, borderColor: o.color }]}
                                    onPress={() => setSelectedOutcome(o.value)}
                                >
                                    <Text style={[styles.outcomeChipText, selectedOutcome === o.value && { color: '#fff' }]}>{o.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.notesInput}
                            placeholder="Add notes (optional)..."
                            placeholderTextColor={Colors.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={[styles.confirmBtn, !selectedOutcome && { opacity: 0.5 }]}
                            onPress={handleCheckOut}
                            disabled={checkingOut}
                        >
                            {checkingOut ? <ActivityIndicator color='#fff' /> : <Text style={styles.confirmBtnText}>Confirm & Complete</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCheckOut(false)} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
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
    headerTitle: { fontSize: 18, fontFamily: 'Urbanist_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    customerCard: {
        backgroundColor: Colors.primary, borderRadius: 24, padding: 20, marginBottom: 20,
        alignItems: 'center',
    },
    customerAvatar: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    avatarText: { fontSize: 24, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    customerName: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: '#fff', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoText: { fontSize: 13, fontFamily: 'Urbanist_500Medium', color: 'rgba(255,255,255,0.8)' },
    kpiRow: { flexDirection: 'row', marginTop: 16, width: '100%' },
    kpi: { flex: 1, alignItems: 'center' },
    kpiValue: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: '#fff', marginBottom: 4 },
    kpiLabel: { fontSize: 11, fontFamily: 'Urbanist_400Regular', color: 'rgba(255,255,255,0.7)' },
    kpiDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    outstandingAlert: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
        marginTop: 14, width: '100%',
    },
    outstandingAlertText: { fontSize: 12, fontFamily: 'Urbanist_500Medium', color: '#FF8A65', flex: 1 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 12 },
    activityCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 14 },
    activityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    activityLabel: { fontSize: 13, fontFamily: 'Urbanist_500Medium', color: Colors.textSecondary },
    activityValue: { fontSize: 13, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionBtn: {
        width: '47%', backgroundColor: Colors.card, borderRadius: 16,
        padding: 16, alignItems: 'center',
    },
    actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 13, fontFamily: 'Urbanist_600SemiBold', color: Colors.text, textAlign: 'center' },
    checkInBtn: {
        backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    checkOutBtn: {
        backgroundColor: '#43A047', borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    checkInBtnText: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    checkedInNote: { textAlign: 'center', marginTop: 8, fontSize: 12, fontFamily: 'Urbanist_500Medium', color: Colors.textSecondary },
    completedBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#E8F5E9', borderRadius: 14, padding: 14, marginBottom: 20,
    },
    completedText: { fontSize: 15, fontFamily: 'Urbanist_700Bold', color: '#43A047' },
    historyRow: {
        backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginBottom: 8,
        flexDirection: 'row', gap: 10, alignItems: 'center',
    },
    historyDate: { fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: Colors.textSecondary, minWidth: 60 },
    historyOutcome: { fontSize: 13, fontFamily: 'Urbanist_600SemiBold', color: Colors.text, flex: 1 },
    historyNotes: { fontSize: 12, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary, marginBottom: 20 },
    outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    outcomeChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    outcomeChipText: { fontSize: 13, fontFamily: 'Urbanist_600SemiBold', color: Colors.text },
    notesInput: {
        borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14,
        fontFamily: 'Urbanist_400Regular', color: Colors.text, fontSize: 14,
        textAlignVertical: 'top', minHeight: 80, marginBottom: 20,
    },
    confirmBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
    confirmBtnText: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: '#fff' },
    cancelBtn: { alignItems: 'center', paddingVertical: 8 },
    cancelBtnText: { fontSize: 14, fontFamily: 'Urbanist_600SemiBold', color: Colors.textSecondary },
});

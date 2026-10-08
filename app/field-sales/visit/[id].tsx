import { styles } from '../../../src/features/fieldSales/styles';
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    Linking,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Phone,
    MapPin,
    CreditCard,
    ShoppingCart,
    ClipboardList,
    MessageSquare,
    CheckCircle2,
    ArrowLeft,
    AlertTriangle,
    ShieldCheck,
    Clock,
    Lock,
    Check,
    Navigation,
    IndianRupee,
    Store,
    FileText,
    ChevronRight,
    X,
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../../src/components/Anime';
import { RoleGate } from '../../../src/components/RoleGate';
import { OrgScopedScreen } from '../../../src/components/OrgScopedScreen';
import { OrganizationApi } from '../../../src/services/api';
import {
    collectCustomerPayment,
    getPendingCustomerPayment,
    PendingCollection,
} from '../../../src/services/paymentCollection';
import { useRoleContext } from '../../../src/contexts/RoleContext';

type VisitOutcome =
    | 'ORDER_PLACED'
    | 'PAYMENT_COLLECTED'
    | 'BOTH'
    | 'NO_ORDER'
    | 'SHOP_CLOSED'
    | 'CUSTOMER_UNAVAILABLE'
    | 'FOLLOW_UP';

const OUTCOMES: { value: VisitOutcome; label: string; color: string; bg: string }[] = [
    { value: 'ORDER_PLACED', label: 'Order Placed', color: '#2E7D32', bg: '#E8F5E9' },
    { value: 'PAYMENT_COLLECTED', label: 'Payment Collected', color: '#1565C0', bg: '#E3F2FD' },
    { value: 'BOTH', label: 'Order + Payment', color: '#6A1B9A', bg: '#F3E5F5' },
    { value: 'NO_ORDER', label: 'No Order', color: '#E65100', bg: '#FFF3E0' },
    { value: 'SHOP_CLOSED', label: 'Shop Closed', color: '#C62828', bg: '#FFEBEE' },
    { value: 'CUSTOMER_UNAVAILABLE', label: 'Customer Unavailable', color: '#C62828', bg: '#FFEBEE' },
    { value: 'FOLLOW_UP', label: 'Follow Up Required', color: '#F57F17', bg: '#FFFDE7' },
];

export default function VisitScreen() {
    return (
        <RoleGate permission="visit:execute">
            <OrgScopedScreen emptyMessage="Select a shop to record visits.">
                {(api) => <VisitScreenContent api={api} />}
            </OrgScopedScreen>
        </RoleGate>
    );
}

function VisitScreenContent({ api }: { api: OrganizationApi }) {
    const { orgId, userId } = useRoleContext();
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
    const [checkingIn, setCheckingIn] = useState(false);

    // Spot Payment Modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingCollection | null>(null);
    const [pendingCustomerName, setPendingCustomerName] = useState('');
    const [paymentError, setPaymentError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const routeRes = await api.get('/beat-plans/my-route');
            const found = routeRes.data?.find((r: any) => String(r.scheduleId) === String(id));
            if (found) {
                let latestBalance = found.outstandingBalance;
                try {
                    const custRes = await api.get(`/customers/${found.customerId}`);
                    if (custRes.data && typeof custRes.data.creditBalance !== 'undefined') {
                        latestBalance = custRes.data.creditBalance;
                    }
                } catch (e) {
                    // Fallback to found.outstandingBalance if direct get fails
                }
                const updatedFound = { ...found, outstandingBalance: latestBalance };
                setScheduleDetails(updatedFound);
                if (latestBalance > 0) {
                    setPaymentAmount(String(latestBalance));
                }
                const histRes = await api
                    .get(`/visits/customer/${found.customerId}/history`)
                    .catch(() => ({ data: [] }));
                setVisitHistory(histRes.data || []);
                if (found.checkInId) {
                    setCheckInRecord({ id: found.checkInId, checkInTime: found.checkInTime });
                    await AsyncStorage.setItem(
                        `active_visit_${id}`,
                        JSON.stringify({ id: found.checkInId, checkInTime: found.checkInTime }),
                    );
                } else {
                    const localSaved = await AsyncStorage.getItem(`active_visit_${id}`);
                    if (localSaved) {
                        setCheckInRecord(JSON.parse(localSaved));
                    }
                }
            } else {
                // Fallback for direct testing
                const localSaved = await AsyncStorage.getItem(`active_visit_${id}`);
                if (localSaved) {
                    setCheckInRecord(JSON.parse(localSaved));
                }
            }
        } catch (err) {
            console.error('Failed to load visit details:', err);
            const localSaved = await AsyncStorage.getItem(`active_visit_${id}`);
            if (localSaved) {
                setCheckInRecord(JSON.parse(localSaved));
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData]),
    );

    const isCompleted = scheduleDetails?.status === 'COMPLETED';
    const isCheckedIn = !!checkInRecord?.id;

    // Find the latest completed check-in for this visit if completed
    const currentCompletedRecord = useMemo(() => {
        if (!isCompleted) return null;
        if (visitHistory.length > 0) {
            return visitHistory[0]; // Most recent check-in
        }
        return null;
    }, [isCompleted, visitHistory]);

    const handleCheckIn = async () => {
        try {
            setCheckingIn(true);
            const res = await api.post(`/visits/${id}/check-in`, { latitude: null, longitude: null });
            const record = res.data;
            if (!record?.id) throw new Error('The server did not confirm the check-in.');
            setCheckInRecord(record);
            await AsyncStorage.setItem(`active_visit_${id}`, JSON.stringify(record));
            Alert.alert(
                'Checked In Successfully',
                `You are now checked in at ${customerName || 'the store'}.`,
            );
            fetchData();
        } catch (err: any) {
            Alert.alert(
                'Check-in Failed',
                err?.response?.data?.message ||
                    'Check-in was not confirmed. Please refresh the visit and try again.',
            );
        } finally {
            setCheckingIn(false);
        }
    };

    const handleCheckOut = async () => {
        if (!checkInRecord?.id) {
            Alert.alert('Check-In Required', 'Check in successfully before completing this visit.');
            return;
        }
        if (!selectedOutcome) {
            Alert.alert('Outcome Required', 'Please select what happened during this store visit.');
            return;
        }
        try {
            setCheckingOut(true);
            if (checkInRecord?.id) {
                await api.put(`/visits/${checkInRecord.id}/check-out`, { outcome: selectedOutcome, notes });
            }
            await AsyncStorage.removeItem(`active_visit_${id}`);
            setShowCheckOut(false);
            Alert.alert('Visit Finalized', 'Store visit recorded and marked as completed.');
            fetchData();
        } catch (err: any) {
            Alert.alert(
                'Check-out Failed',
                err?.response?.data?.message ||
                    'Completion was not confirmed. Please refresh the visit and try again.',
            );
        } finally {
            setCheckingOut(false);
        }
    };

    const handleCreateOrder = () => {
        if (isCompleted) {
            Alert.alert('Visit Finalized', 'This visit is already completed and locked.');
            return;
        }
        if (!isCheckedIn) {
            Alert.alert(
                'Check-In Required',
                `Please check in at ${customerName || 'the store'} first before creating orders.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Check In Now', onPress: handleCheckIn },
                ],
            );
            return;
        }

        router.push({
            pathname: '/(tabs)/sales',
            params: {
                action: 'new',
                customerId: String(scheduleDetails?.customerId || ''),
                customerName: scheduleDetails?.customerName || customerName || '',
                customerPhone: scheduleDetails?.customerPhone || '',
            },
        });
    };

    const handleCollectPaymentSubmit = async () => {
        const amt = pendingPayment?.amount ?? Number(paymentAmount);
        if (!Number.isFinite(amt) || amt <= 0 || !/^\d+(\.\d{1,2})?$/.test(paymentAmount.trim())) {
            Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
            return;
        }
        if (orgId === null || userId === null || !scheduleDetails?.customerId) {
            Alert.alert('Payment Unavailable', 'Refresh the visit before collecting a payment.');
            return;
        }

        setSubmittingPayment(true);
        setPaymentError('');
        try {
            await collectCustomerPayment(
                orgId,
                userId,
                pendingPayment ?? {
                    referenceType: 'CUSTOMER',
                    referenceId: scheduleDetails?.customerId,
                    amount: amt,
                    paymentMode: paymentMode,
                },
            );

            Alert.alert(
                'Payment Recorded',
                `Confirmed ₹${amt.toLocaleString('en-IN')} via ${pendingPayment?.paymentMode || paymentMode} from ${pendingPayment ? pendingCustomerName : scheduleDetails?.customerName || customerName}.`,
            );
            setPendingPayment(null);
            setShowPaymentModal(false);
            fetchData();
        } catch (error: any) {
            setPaymentError(
                error?.response?.data?.message ||
                    error?.message ||
                    'Payment not confirmed. Retry this saved payment; do not collect the money again.',
            );
            try {
                const saved = await getPendingCustomerPayment(orgId, userId);
                setPendingPayment(saved);
                if (saved) {
                    setPaymentAmount(String(saved.amount));
                    setPaymentMode(saved.paymentMode);
                    setPendingCustomerName(
                        String(saved.referenceId) === String(scheduleDetails?.customerId)
                            ? scheduleDetails?.customerName ||
                                  customerName ||
                                  `Customer #${saved.referenceId}`
                            : `Customer #${saved.referenceId}`,
                    );
                }
            } catch {
                setPaymentError(
                    'Could not read the saved payment. Close and reopen this screen before retrying.',
                );
            }
        } finally {
            setSubmittingPayment(false);
        }
    };

    const handleActionClick = async (actionName: string, path: string) => {
        if (actionName === 'Create Order') {
            handleCreateOrder();
            return;
        }

        if (actionName === 'Collect Payment') {
            if (isCompleted) {
                Alert.alert('Visit Finalized', 'This visit is already completed and locked.');
                return;
            }
            if (!isCheckedIn) {
                Alert.alert('Check-In Required', 'Please check in first before collecting payment.');
                return;
            }
            if (orgId === null || userId === null) return;
            try {
                const pending = await getPendingCustomerPayment(orgId, userId);
                setPendingPayment(pending);
                setPaymentError('');
                setPendingCustomerName(scheduleDetails?.customerName || customerName || '');
                if (pending) {
                    setPaymentAmount(String(pending.amount));
                    setPaymentMode(pending.paymentMode);
                    if (String(pending.referenceId) !== String(scheduleDetails?.customerId)) {
                        setPendingCustomerName(`Customer #${pending.referenceId}`);
                        const result = await api.get(`/customers/${pending.referenceId}`).catch(() => null);
                        if (result?.data?.customerName) setPendingCustomerName(result.data.customerName);
                    }
                } else {
                    setPaymentAmount(String(scheduleDetails?.outstandingBalance || ''));
                    setPaymentMode('CASH');
                }
                setShowPaymentModal(true);
            } catch {
                Alert.alert('Payment Unavailable', 'Could not load the saved payment. Please try again.');
            }
            return;
        }

        router.push(path as any);
    };

    const handleCallCustomer = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    };

    const handleOpenMap = (customerName?: string, customerAddress?: string) => {
        const query = [customerName, customerAddress].filter(Boolean).join(', ');
        if (!query) {
            Alert.alert('Location Unavailable', 'No address listed for this store.');
            return;
        }
        const encoded = encodeURIComponent(query);
        const mapUrl = Platform.select({
            ios: `maps:0,0?q=${encoded}`,
            android: `geo:0,0?q=${encoded}`,
            default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        });
        Linking.openURL(mapUrl).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
        });
    };

    if (loading && !scheduleDetails) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.loadingText}>Loading visit details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 1. Custom Pastel SVG Illustration Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Mint-Emerald Flow Blob */}
                    <Path
                        d="M100 -40 C210 -50, 390 -30, 400 80 C410 200, 340 260, 200 240 C110 220, 20 150, 100 -40 Z"
                        fill="#C8E6C9"
                        opacity={0.34}
                    />
                    <Circle cx="330" cy="80" r="75" fill="#81C784" opacity={0.16} />

                    {/* Warm Peach Glow */}
                    <Path
                        d="M-50 150 C30 170, 120 110, 160 220 C200 330, 80 370, -10 340 C-90 300, -120 130, -50 150 Z"
                        fill="#FFE0B2"
                        opacity={0.3}
                    />

                    {/* Ambient Lavender & Sage circles */}
                    <Circle cx="340" cy="480" r="85" fill="#E1BEE7" opacity={0.22} />
                    <Circle cx="40" cy="700" r="80" fill="#BBDEFB" opacity={0.25} />
                </Svg>
            </View>

            {/* 2. Top Navigation Header */}
            <FadeInDown delay={20} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() =>
                            router.canGoBack() ? router.back() : router.push('/field-sales/today-route')
                        }
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={20} color="#1A1A1A" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleCol}>
                        <Text style={styles.headerTitle}>
                            {isCompleted ? 'Visit Summary' : 'Store Visit'}
                        </Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {scheduleDetails?.customerName || customerName || 'Store Details'}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusPill,
                            isCompleted
                                ? styles.statusPillCompleted
                                : isCheckedIn
                                  ? styles.statusPillActive
                                  : styles.statusPillPending,
                        ]}
                    >
                        {isCompleted ? (
                            <>
                                <CheckCircle2 size={12} color="#2E7D32" />
                                <Text style={[styles.statusPillText, { color: '#2E7D32' }]}>Completed</Text>
                            </>
                        ) : isCheckedIn ? (
                            <>
                                <View style={styles.pulseDot} />
                                <Text style={[styles.statusPillText, { color: '#E65100' }]}>In Progress</Text>
                            </>
                        ) : (
                            <>
                                <Clock size={12} color="#666666" />
                                <Text style={[styles.statusPillText, { color: '#666666' }]}>Pending</Text>
                            </>
                        )}
                    </View>
                </View>
            </FadeInDown>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* 3. Store Info Hero Card */}
                {scheduleDetails && (
                    <FadeInDown delay={50}>
                        <View style={styles.storeCard}>
                            <View style={styles.storeHeaderRow}>
                                <View
                                    style={[
                                        styles.storeAvatarBox,
                                        { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0' },
                                    ]}
                                >
                                    <Store size={26} color={isCompleted ? '#2E7D32' : '#E65100'} />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.storeNameText}>{scheduleDetails.customerName}</Text>
                                    <TouchableOpacity
                                        style={styles.storeMetaRow}
                                        onPress={() =>
                                            handleOpenMap(
                                                scheduleDetails.customerName,
                                                scheduleDetails.customerAddress,
                                            )
                                        }
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open Google Maps for ${scheduleDetails.customerName}`}
                                    >
                                        <MapPin size={13} color="#1565C0" />
                                        <Text style={styles.storeMetaText} numberOfLines={1}>
                                            {scheduleDetails.customerAddress || 'View on Google Maps'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Action Buttons: Navigate Map + Call */}
                                <View style={styles.quickActionsGroup}>
                                    <TouchableOpacity
                                        style={styles.quickMapBtn}
                                        onPress={() =>
                                            handleOpenMap(
                                                scheduleDetails.customerName,
                                                scheduleDetails.customerAddress,
                                            )
                                        }
                                        activeOpacity={0.75}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open Google Maps directions for ${scheduleDetails.customerName}`}
                                    >
                                        <Navigation size={16} color="#1565C0" />
                                    </TouchableOpacity>

                                    {scheduleDetails.customerPhone ? (
                                        <TouchableOpacity
                                            style={styles.quickCallBtn}
                                            onPress={() => handleCallCustomer(scheduleDetails.customerPhone)}
                                            activeOpacity={0.75}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Call ${scheduleDetails.customerName}`}
                                        >
                                            <Phone size={16} color="#2E7D32" />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>

                            {/* Financial Matrix */}
                            <View style={styles.financialMatrix}>
                                <View style={styles.finCol}>
                                    <Text style={styles.finLabel}>CREDIT LIMIT</Text>
                                    <Text style={styles.finValue}>
                                        ₹{(scheduleDetails.creditLimit || 0).toLocaleString('en-IN')}
                                    </Text>
                                </View>

                                <View style={styles.finDivider} />

                                <View style={styles.finCol}>
                                    <Text style={styles.finLabel}>OUTSTANDING</Text>
                                    <Text
                                        style={[
                                            styles.finValue,
                                            scheduleDetails.outstandingBalance > 0 && { color: '#E53935' },
                                        ]}
                                    >
                                        ₹{(scheduleDetails.outstandingBalance || 0).toLocaleString('en-IN')}
                                    </Text>
                                </View>

                                <View style={styles.finDivider} />

                                <View style={styles.finCol}>
                                    <Text style={styles.finLabel}>LAST VISIT</Text>
                                    <Text style={styles.finValue}>
                                        {scheduleDetails.lastVisitDate
                                            ? new Date(scheduleDetails.lastVisitDate).toLocaleDateString(
                                                  'en-IN',
                                                  { day: '2-digit', month: 'short' },
                                              )
                                            : '—'}
                                    </Text>
                                </View>
                            </View>

                            {/* Outstanding Credit Warning */}
                            {scheduleDetails.outstandingBalance > 0 && (
                                <View style={styles.outstandingWarning}>
                                    <AlertTriangle size={14} color="#E65100" />
                                    <Text style={styles.outstandingWarningText}>
                                        ₹{scheduleDetails.outstandingBalance.toLocaleString('en-IN')} balance
                                        pending — collect payment on this visit.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </FadeInDown>
                )}

                {/* 4. COMPLETED VISIT SUMMARY BANNER (When Visit is Finished) */}
                {isCompleted && (
                    <FadeInDown delay={80}>
                        <View style={styles.completedSummaryCard}>
                            <View style={styles.completedHeaderRow}>
                                <View style={styles.completedShieldBox}>
                                    <ShieldCheck size={22} color="#2E7D32" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.completedTitle}>Visit Finalized & Completed</Text>
                                    <Text style={styles.completedSub}>
                                        {currentCompletedRecord?.checkOutTime
                                            ? `Checked out at ${new Date(currentCompletedRecord.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                                            : 'All visit operations successfully saved'}
                                    </Text>
                                </View>
                                <View style={styles.lockedPill}>
                                    <Lock size={12} color="#777777" />
                                    <Text style={styles.lockedPillText}>Locked</Text>
                                </View>
                            </View>

                            {/* Recorded Outcome & Notes */}
                            <View style={styles.summaryDetailsBox}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryRowLabel}>Recorded Outcome</Text>
                                    <View style={styles.outcomeBadge}>
                                        <CheckCircle2 size={12} color="#2E7D32" />
                                        <Text style={styles.outcomeBadgeText}>
                                            {currentCompletedRecord?.outcome?.replace(/_/g, ' ') ||
                                                'Visit Completed'}
                                        </Text>
                                    </View>
                                </View>

                                {currentCompletedRecord?.checkInTime && (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryRowLabel}>Check-In Time</Text>
                                        <Text style={styles.summaryRowVal}>
                                            {new Date(currentCompletedRecord.checkInTime).toLocaleTimeString(
                                                'en-IN',
                                                { hour: '2-digit', minute: '2-digit' },
                                            )}
                                        </Text>
                                    </View>
                                )}

                                {currentCompletedRecord?.notes ? (
                                    <View
                                        style={[styles.summaryRow, { borderBottomWidth: 0, paddingTop: 6 }]}
                                    >
                                        <Text style={styles.summaryRowLabel}>Visit Notes</Text>
                                        <Text style={styles.summaryNotesText}>
                                            "{currentCompletedRecord.notes}"
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Lock Notice */}
                            <View style={styles.lockNoticeRow}>
                                <Lock size={13} color="#888888" />
                                <Text style={styles.lockNoticeText}>
                                    Actions are restricted because this store visit has ended. Orders &
                                    payments are recorded in the ledger.
                                </Text>
                            </View>
                        </View>
                    </FadeInDown>
                )}

                {/* 5. ACTIVE ACTIONS GRID (Disabled / Restricted when Completed) */}
                <FadeInDown delay={isCompleted ? 110 : 80}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Field Actions</Text>
                            {isCompleted ? (
                                <Text style={styles.sectionRestrictedText}>Finalized</Text>
                            ) : !isCheckedIn ? (
                                <Text style={styles.sectionHintText}>Check in required</Text>
                            ) : null}
                        </View>

                        <View style={styles.actionsGrid}>
                            {/* 1. Create Order */}
                            <TouchableOpacity
                                style={[styles.actionCard, isCompleted && styles.actionCardDisabled]}
                                onPress={() => handleActionClick('Create Order', '/sales')}
                                activeOpacity={isCompleted ? 1 : 0.75}
                            >
                                <View
                                    style={[
                                        styles.actionIconBox,
                                        { backgroundColor: isCompleted ? '#F0EFEA' : '#E8F5E9' },
                                    ]}
                                >
                                    <ShoppingCart size={22} color={isCompleted ? '#888888' : '#2E7D32'} />
                                </View>
                                <Text
                                    style={[
                                        styles.actionTitleText,
                                        isCompleted && styles.actionTitleTextDisabled,
                                    ]}
                                >
                                    Create Order
                                </Text>
                                <Text style={styles.actionDescText}>
                                    {isCompleted ? 'Visit closed' : 'Book rice bags'}
                                </Text>
                            </TouchableOpacity>

                            {/* 2. Collect Payment */}
                            <TouchableOpacity
                                style={[styles.actionCard, isCompleted && styles.actionCardDisabled]}
                                onPress={() => handleActionClick('Collect Payment', '/sales')}
                                activeOpacity={isCompleted ? 1 : 0.75}
                            >
                                <View
                                    style={[
                                        styles.actionIconBox,
                                        { backgroundColor: isCompleted ? '#F0EFEA' : '#E3F2FD' },
                                    ]}
                                >
                                    <IndianRupee size={22} color={isCompleted ? '#888888' : '#1565C0'} />
                                </View>
                                <Text
                                    style={[
                                        styles.actionTitleText,
                                        isCompleted && styles.actionTitleTextDisabled,
                                    ]}
                                >
                                    Collect Payment
                                </Text>
                                <Text style={styles.actionDescText}>
                                    {isCompleted ? 'Visit closed' : 'Cash or UPI settlement'}
                                </Text>
                            </TouchableOpacity>

                            {/* 3. Retail History / Order Ledger (Filtered for this store) */}
                            <TouchableOpacity
                                style={styles.actionCard}
                                disabled={!scheduleDetails?.customerId}
                                onPress={() =>
                                    router.push({
                                        pathname: '/field-sales/store-ledger/[customerId]',
                                        params: {
                                            customerId: String(scheduleDetails?.customerId || ''),
                                            customerName: scheduleDetails?.customerName || customerName || '',
                                            customerPhone: scheduleDetails?.customerPhone || '',
                                            customerAddress: scheduleDetails?.customerAddress || '',
                                            creditLimit: String(scheduleDetails?.creditLimit || '0'),
                                            outstandingBalance: String(
                                                scheduleDetails?.outstandingBalance || '0',
                                            ),
                                            visitId: String(id || ''),
                                        },
                                    })
                                }
                                activeOpacity={0.75}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: '#F3E5F5' }]}>
                                    <ClipboardList size={22} color="#8E24AA" />
                                </View>
                                <Text style={styles.actionTitleText}>Store Ledger</Text>
                                <Text style={styles.actionDescText}>Invoices, payments & balance</Text>
                            </TouchableOpacity>

                            {/* 4. Customer Profile / Store Directory (Filtered for this store) */}
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() =>
                                    router.push({
                                        pathname: '/customers',
                                        params: {
                                            searchCustomer:
                                                scheduleDetails?.customerName || customerName || '',
                                        },
                                    })
                                }
                                activeOpacity={0.75}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: '#FFF3E0' }]}>
                                    <Store size={22} color="#E65100" />
                                </View>
                                <Text style={styles.actionTitleText}>Shop Profile</Text>
                                <Text style={styles.actionDescText}>Credit & contact details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </FadeInDown>

                {/* 6. CHECK-IN / CHECK-OUT PRIMARY BUTTON (Only when not completed) */}
                {!isCompleted && (
                    <FadeInDown delay={110}>
                        <View style={styles.checkInOutSection}>
                            {!isCheckedIn ? (
                                <TouchableOpacity
                                    style={styles.checkInMainBtn}
                                    onPress={handleCheckIn}
                                    disabled={checkingIn}
                                    activeOpacity={0.85}
                                >
                                    {checkingIn ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MapPin size={20} color="#FFFFFF" />
                                            <Text style={styles.checkInMainBtnText}>
                                                Check In at this Store
                                            </Text>
                                            <ChevronRight size={18} color="#FFFFFF" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.inProgressContainer}>
                                    <View style={styles.inProgressBanner}>
                                        <View style={styles.inProgressPulse} />
                                        <Text style={styles.inProgressText}>
                                            Checked in at{' '}
                                            {checkInRecord?.checkInTime
                                                ? new Date(checkInRecord.checkInTime).toLocaleTimeString(
                                                      'en-IN',
                                                      { hour: '2-digit', minute: '2-digit' },
                                                  )
                                                : 'Store'}{' '}
                                            • In Progress
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.completeVisitBtn}
                                        onPress={() => setShowCheckOut(true)}
                                        activeOpacity={0.85}
                                    >
                                        <CheckCircle2 size={20} color="#FFFFFF" />
                                        <Text style={styles.completeVisitBtnText}>
                                            Complete Visit & Record Outcome
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </FadeInDown>
                )}

                {/* 7. PREVIOUS ACTIVITY & VISIT HISTORY */}
                <FadeInDown delay={140}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Store Visit History</Text>
                        {visitHistory.length === 0 ? (
                            <View style={styles.emptyHistoryCard}>
                                <Clock size={28} color="#888888" />
                                <Text style={styles.emptyHistoryText}>
                                    No past visits recorded for this store.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.historyList}>
                                {visitHistory.slice(0, 5).map((v: any, index: number) => {
                                    const outcome = OUTCOMES.find((o) => o.value === v.outcome);
                                    return (
                                        <View key={v.id || index} style={styles.historyCard}>
                                            <View style={styles.historyCardHeader}>
                                                <Text style={styles.historyDateText}>
                                                    {v.checkInTime
                                                        ? new Date(v.checkInTime).toLocaleDateString(
                                                              'en-IN',
                                                              {
                                                                  day: '2-digit',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              },
                                                          )
                                                        : 'Recent Visit'}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.historyOutcomePill,
                                                        { backgroundColor: outcome?.bg || '#F5F5F0' },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.historyOutcomeText,
                                                            { color: outcome?.color || '#555555' },
                                                        ]}
                                                    >
                                                        {outcome?.label ||
                                                            v.outcome?.replace(/_/g, ' ') ||
                                                            'Completed'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {v.notes ? (
                                                <Text style={styles.historyNoteText} numberOfLines={2}>
                                                    "{v.notes}"
                                                </Text>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </FadeInDown>
            </ScrollView>

            {/* 8. Check-Out Modal Drawer */}
            <Modal
                visible={showCheckOut}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCheckOut(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeaderRow}>
                            <View>
                                <Text style={styles.modalTitle}>Complete Store Visit</Text>
                                <Text style={styles.modalSub}>
                                    Select outcome for {scheduleDetails?.customerName || customerName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowCheckOut(false)}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>VISIT OUTCOME</Text>
                        <View style={styles.outcomeGrid}>
                            {OUTCOMES.map((o) => {
                                const selected = selectedOutcome === o.value;
                                return (
                                    <TouchableOpacity
                                        key={o.value}
                                        style={[
                                            styles.outcomeChip,
                                            selected && { backgroundColor: o.color, borderColor: o.color },
                                        ]}
                                        onPress={() => setSelectedOutcome(o.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.outcomeChipText,
                                                selected && { color: '#FFFFFF', fontWeight: '700' },
                                            ]}
                                        >
                                            {o.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.modalLabel}>VISIT NOTES (OPTIONAL)</Text>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Add meeting observations, stock requirements, or follow-up notes..."
                            placeholderTextColor="#888888"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={[styles.confirmBtn, !selectedOutcome && styles.confirmBtnDisabled]}
                            onPress={handleCheckOut}
                            disabled={checkingOut || !selectedOutcome}
                            activeOpacity={0.85}
                        >
                            {checkingOut ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Check size={18} color="#FFFFFF" />
                                    <Text style={styles.confirmBtnText}>Finalize & Complete Visit</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 9. Spot Payment Collection Modal Drawer */}
            <Modal
                visible={showPaymentModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeaderRow}>
                            <View>
                                <Text style={styles.modalTitle}>Collect Payment</Text>
                                <Text style={styles.modalSub}>
                                    {pendingPayment
                                        ? pendingCustomerName
                                        : scheduleDetails?.customerName || customerName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowPaymentModal(false)}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {pendingPayment && (
                            <Text style={{ color: '#805500', marginBottom: 16 }}>
                                An earlier payment for {pendingCustomerName} needs confirmation. Its original
                                amount and method are restored below. Retry to confirm it without creating a
                                duplicate. Do not collect the money again.
                            </Text>
                        )}
                        {!!paymentError && (
                            <Text accessibilityRole="alert" style={{ color: '#B91C1C', marginBottom: 16 }}>
                                {paymentError}
                            </Text>
                        )}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>PAYMENT AMOUNT (₹)</Text>
                            <TextInput
                                style={styles.paymentInput}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                editable={!pendingPayment && !submittingPayment}
                            />
                        </View>

                        <Text style={styles.modalLabel}>PAYMENT METHOD</Text>
                        <View style={styles.payModeRow}>
                            <TouchableOpacity
                                style={[styles.payModeBtn, paymentMode === 'CASH' && styles.payModeBtnActive]}
                                onPress={() => setPaymentMode('CASH')}
                                disabled={!!pendingPayment || submittingPayment}
                            >
                                <Text
                                    style={[
                                        styles.payModeBtnText,
                                        paymentMode === 'CASH' && styles.payModeBtnTextActive,
                                    ]}
                                >
                                    💵 Cash
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.payModeBtn, paymentMode === 'UPI' && styles.payModeBtnActive]}
                                onPress={() => setPaymentMode('UPI')}
                                disabled={!!pendingPayment || submittingPayment}
                            >
                                <Text
                                    style={[
                                        styles.payModeBtnText,
                                        paymentMode === 'UPI' && styles.payModeBtnTextActive,
                                    ]}
                                >
                                    📱 UPI / QR
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                { backgroundColor: '#1565C0', borderColor: '#1565C0' },
                            ]}
                            onPress={handleCollectPaymentSubmit}
                            disabled={submittingPayment}
                            activeOpacity={0.85}
                        >
                            {submittingPayment ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Check size={18} color="#FFFFFF" />
                                    <Text style={styles.confirmBtnText}>
                                        {pendingPayment ? 'Retry Saved Payment' : 'Record Payment Receipt'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

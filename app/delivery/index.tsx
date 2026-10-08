import { ReceivedItems } from '../../src/features/delivery/ReceivedItems';
import { confirmationItems } from '../../src/features/delivery/confirmation';
import { PackingItems } from '../../src/features/delivery/PackingItems';
import { styles } from '../../src/features/delivery/styles';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Platform,
    useWindowDimensions,
    Animated,
    Image,
} from 'react-native';
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import {
    ArrowLeft,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    AlertCircle,
    MapPin,
    Check,
    X,
    ShieldCheck,
    Store,
    IndianRupee,
    FileText,
    User,
    Navigation,
    Plus,
    Minus,
    AlertTriangle,
    Layers,
    Search,
    ChevronRight,
    RefreshCw,
    Calendar,
    SlidersHorizontal,
    ExternalLink,
    Cloud,
    Navigation2,
    ShieldAlert,
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import { RoleGate } from '../../src/components/RoleGate';
import { OrgScopedScreen } from '../../src/components/OrgScopedScreen';
import { useRoleContext } from '../../src/contexts/RoleContext';
import { OrganizationApi } from '../../src/services/api';
import { DispatchItems } from '../../src/features/delivery/DispatchItems';
import { tripDetails, optionalTripText } from '../../src/features/delivery/tripDetails';
import { warehouseWorkflow, matchesWarehouseFilter } from '../../src/features/delivery/warehouseWorkflow';
import { warehouseOrderDetails } from '../../src/features/delivery/warehouseOrderDetails';
import { DeliveryShareButton } from '../../src/features/delivery/DeliveryShareButton';
import { ContactCallButton } from '../../src/features/delivery/ContactCallButton';
import { DeliveryItems } from '../../src/features/delivery/DeliveryItems';
import { tripStatus } from '../../src/features/delivery/tripStatus';
import { dispatchItems } from '../../src/features/delivery/dispatch';
import { availableToDispatch } from '../../src/services/deliveryQuantities';

function WarehouseHeroIllustration() {
    return (
        <Image
            source={require('../../assets/illustrations/warehouse.png')}
            style={{ width: 145, height: 110 }}
            resizeMode="contain"
        />
    );
}

function DeliveryHeroIllustration() {
    return (
        <Image
            source={require('../../assets/illustrations/delivery.png')}
            style={{ width: 145, height: 110 }}
            resizeMode="contain"
        />
    );
}

function StatusBoxIllustration() {
    return (
        <Svg width={72} height={52} viewBox="0 0 72 52" fill="none">
            {/* Soft ground glow */}
            <Circle cx="36" cy="42" r="24" fill="#FEF3C7" opacity={0.65} />

            {/* 3D Isometric Cardboard Box */}
            {/* Left face */}
            <Path d="M20 20 L36 29 V47 L20 38 Z" fill="#D97706" />
            {/* Right face */}
            <Path d="M36 29 L52 20 V38 L36 47 Z" fill="#B45309" />
            {/* Top face */}
            <Path d="M36 11 L52 20 L36 29 L20 20 Z" fill="#F59E0B" />
            {/* Tape line */}
            <Path
                d="M28 15.5 L44 24.5 M28 24.5 L28 42.5"
                stroke="#FEF3C7"
                strokeWidth="1.2"
                strokeLinecap="round"
            />

            {/* Motion rays */}
            <Path
                d="M9 22 L15 24 M7 28 L14 29 M10 34 L16 33"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* Green Checkmark Badge */}
            <Circle cx="56" cy="14" r="8.5" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.2" />
            <Path
                d="M52.5 14 L55 16.5 L60 11.5"
                stroke="#059669"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

type HubTab = 'WAREHOUSE' | 'TRIPS';

export default function UnifiedDispatchDeliveryHub() {
    return (
        <RoleGate role={['ADMIN', 'MANAGER', 'WAREHOUSE']}>
            <OrgScopedScreen emptyMessage="Select a shop to manage dispatch.">
                {(api) => <UnifiedDispatchDeliveryHubContent api={api} />}
            </OrgScopedScreen>
        </RoleGate>
    );
}

function UnifiedDispatchDeliveryHubContent({ api }: { api: OrganizationApi }) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWide = width >= 768;
    const params = useLocalSearchParams<{ tab?: string }>();
    const { userId: currentUserId, role: currentRole, hasRole } = useRoleContext();

    const [activeHubTab, setActiveHubTab] = useState<HubTab>(params.tab === 'trips' ? 'TRIPS' : 'WAREHOUSE');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Check if the current logged in user is an Admin/Manager or the Assigned Driver
    const isManagerOrAdmin = hasRole(['ADMIN', 'MASTER_ADMIN', 'MANAGER', 'WAREHOUSE']);
    const isAssignedDriver = useCallback(
        (del: any) => {
            if (!del || !del.deliveryPerson) return false;
            const driverId = del.deliveryPerson.id ?? del.deliveryPerson.userId;
            if (!driverId || !currentUserId) return false;
            return Number(driverId) === Number(currentUserId);
        },
        [currentUserId],
    );

    const canOperateDelivery = useCallback(
        (del: any) => {
            if (isManagerOrAdmin) return true;
            return isAssignedDriver(del);
        },
        [isManagerOrAdmin, isAssignedDriver],
    );

    useEffect(() => {
        if (params.tab === 'trips') {
            setActiveHubTab('TRIPS');
        } else if (params.tab === 'warehouse') {
            setActiveHubTab('WAREHOUSE');
        }
    }, [params.tab]);

    // Data states
    const [orders, setOrders] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Search & Filter
    const [warehouseSearch, setWarehouseSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState<'ALL' | 'NEW' | 'READY' | 'DELIVERED'>('ALL');

    const [tripSearch, setTripSearch] = useState('');
    const [tripFilter, setTripFilter] = useState<'ALL' | 'IN_TRANSIT' | 'ASSIGNED' | 'DELIVERED'>('ALL');

    // ─────────────────────────────────────────────
    // ─────────────────────────────────────────────
    // MODAL 0: Warehouse Stock Check & Packaging (Stage 1)
    // ─────────────────────────────────────────────
    const [packModalVisible, setPackModalVisible] = useState(false);
    const [selectedOrderForPack, setSelectedOrderForPack] = useState<any | null>(null);

    const [submittingPack, setSubmittingPack] = useState(false);

    // ─────────────────────────────────────────────
    // MODAL 1: Warehouse Dispatch & Van Assignment (Stage 2)
    // ─────────────────────────────────────────────
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<any | null>(null);
    const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<number | null>(null);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [submittingAssign, setSubmittingAssign] = useState(false);

    // ─────────────────────────────────────────────
    // MODAL 2: In-Place Delivery Verification & Drop-off
    // ─────────────────────────────────────────────
    const [verifyModalVisible, setVerifyModalVisible] = useState(false);
    const [selectedDeliveryForVerify, setSelectedDeliveryForVerify] = useState<any | null>(null);
    const [deliveredQtys, setDeliveredQtys] = useState<Record<number, string>>({});
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'CASH' | 'UPI'>('CREDIT');
    const [submittingVerify, setSubmittingVerify] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // ─────────────────────────────────────────────
    // MODAL 3: Detailed Delivery Info Modal
    // ─────────────────────────────────────────────
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedDeliveryForDetail, setSelectedDeliveryForDetail] = useState<any | null>(null);

    // ─────────────────────────────────────────────
    // DATA FETCHING
    // ─────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ordersRes, deliveriesRes, staffRes] = await Promise.all([
                api.get('/api/sales-orders').catch(() => ({ data: [] })),
                api.get('/api/deliveries').catch(() => ({ data: [] })),
                api.get('/api/organizations/members').catch(() => ({ data: [] })),
            ]);

            setOrders(ordersRes.data || []);
            setDeliveries(deliveriesRes.data || []);
            setStaffList(staffRes.data || []);
        } catch (error: any) {
            console.error('Failed to load dispatch data:', error);
            if (error?.response?.status === 403) {
                Alert.alert('Access Denied', 'You do not have permission to view delivery data.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData]),
    );

    // ─────────────────────────────────────────────
    // COMPUTED METRICS & FILTERED DATA
    // ─────────────────────────────────────────────
    const getOrderTotalOrdered = (o: any) => {
        return (o.items || []).reduce((s: number, it: any) => s + (it.orderedQuantity || 0), 0);
    };

    const warehouseCounts = useMemo(
        () => ({
            ALL: orders.filter((o) => matchesWarehouseFilter(o, 'ALL', deliveries)).length,
            NEW: orders.filter((o) => matchesWarehouseFilter(o, 'NEW', deliveries)).length,
            READY: orders.filter((o) => matchesWarehouseFilter(o, 'READY', deliveries)).length,
            DELIVERED: orders.filter((o) => matchesWarehouseFilter(o, 'DELIVERED', deliveries)).length,
        }),
        [orders, deliveries],
    );

    const tripCounts = useMemo(
        () => ({
            ALL: deliveries.length,
            IN_TRANSIT: deliveries.filter((d) => d.status === 'OUT_FOR_DELIVERY').length,
            ASSIGNED: deliveries.filter((d) => d.status === 'ASSIGNED').length,
            DELIVERED: deliveries.filter((d) => d.status === 'DELIVERED').length,
        }),
        [deliveries],
    );

    const ordersInQueue = warehouseCounts.NEW;

    const filteredOrders = useMemo(() => {
        let list = orders.filter((o) => matchesWarehouseFilter(o, warehouseFilter, deliveries));

        if (warehouseSearch.trim()) {
            const q = warehouseSearch.toLowerCase().trim();
            list = list.filter(
                (o) =>
                    (o.orderNumber || '').toLowerCase().includes(q) ||
                    (o.customer?.customerName || '').toLowerCase().includes(q) ||
                    (o.salesperson?.name || '').toLowerCase().includes(q),
            );
        }
        return list;
    }, [orders, deliveries, warehouseFilter, warehouseSearch]);

    const filteredDeliveries = useMemo(() => {
        let list = deliveries;
        if (tripFilter === 'IN_TRANSIT') {
            list = list.filter((d) => d.status === 'OUT_FOR_DELIVERY');
        } else if (tripFilter === 'ASSIGNED') {
            list = list.filter((d) => d.status === 'ASSIGNED');
        } else if (tripFilter === 'DELIVERED') {
            list = list.filter((d) => d.status === 'DELIVERED');
        }

        if (tripSearch.trim()) {
            const q = tripSearch.toLowerCase().trim();
            list = list.filter((d) => {
                const cust = d.customer || d.salesOrder?.customer || {};
                const custName = cust.customerName || '';
                const custAddr = cust.address || d.deliveryNotes || '';
                const driverName = d.deliveryPerson?.name || d.deliveryPerson?.fullName || '';
                const veh = d.vehicleNumber || '';
                const num = d.deliveryNumber || '';
                return (
                    num.toLowerCase().includes(q) ||
                    custName.toLowerCase().includes(q) ||
                    driverName.toLowerCase().includes(q) ||
                    veh.toLowerCase().includes(q) ||
                    custAddr.toLowerCase().includes(q)
                );
            });
        }
        return list;
    }, [deliveries, tripFilter, tripSearch]);

    // ─────────────────────────────────────────────
    // ACTIONS: STAGE 1 - WAREHOUSE STOCK PACKING
    // ─────────────────────────────────────────────
    const openPackModal = (order: any) => {
        const state = warehouseWorkflow(order, deliveries);
        if (!state.canPack) {
            Alert.alert(state.label, state.explanation);
            return;
        }
        setSelectedOrderForPack(order);
        setPackModalVisible(true);
    };

    const handleConfirmPackingSubmit = async () => {
        if (!selectedOrderForPack || submittingPack) return;
        const state = warehouseWorkflow(selectedOrderForPack, deliveries);
        if (!state.canPack) {
            Alert.alert(state.label, state.explanation);
            return;
        }
        setSubmittingPack(true);
        try {
            await api.put(`/api/sales-orders/${selectedOrderForPack.id}/status?status=READY_FOR_DELIVERY`);
            Alert.alert(
                'Order Ready to Ship',
                `Order #${selectedOrderForPack.orderNumber} is verified and marked Ready to Ship! It is now in the "Ready to Ship" tab for driver assignment.`,
                [{ text: 'View Ready Orders', onPress: () => setWarehouseFilter('READY') }],
            );
            setPackModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Packing Error', error.response?.data?.message || 'Could not update order status');
        } finally {
            setSubmittingPack(false);
        }
    };

    // ─────────────────────────────────────────────
    // ACTIONS: STAGE 2 - WAREHOUSE DISPATCH & DRIVER ASSIGNMENT
    // ─────────────────────────────────────────────
    const [deliveringQtysForAssign, setDeliveringQtysForAssign] = useState<Record<number, string>>({});
    const dispatchPreview = (order: any) =>
        (order?.items || []).map((item: any) => ({
            product: item.product,
            availableQuantity: availableToDispatch(order, item, deliveries),
        }));

    const openAssignModal = (order: any) => {
        setSelectedOrderForAssign(order);
        setSelectedDeliveryPersonId(staffList.length > 0 ? (staffList[0].userId ?? staffList[0].id) : null);
        setVehicleNumber('');
        setDeliveryNotes('');

        const initialQtys: Record<number, string> = {};
        (order.items || []).forEach((it: any) => {
            initialQtys[it.product?.id] = String(availableToDispatch(order, it, deliveries));
        });
        setDeliveringQtysForAssign(initialQtys);
        setAssignModalVisible(true);
    };

    const handleCreateDeliveryNoteSubmit = async () => {
        if (!selectedOrderForAssign || submittingAssign) return;
        let items;
        try {
            items = dispatchItems(dispatchPreview(selectedOrderForAssign), deliveringQtysForAssign);
        } catch (error) {
            Alert.alert(
                'Check Dispatch Quantities',
                error instanceof Error ? error.message : 'Check the quantities before assigning a trip.',
            );
            return;
        }
        setSubmittingAssign(true);
        try {
            const payload = {
                salesOrderId: selectedOrderForAssign.id,
                deliveryPersonId: selectedDeliveryPersonId,
                vehicleNumber: optionalTripText(vehicleNumber),
                deliveryNotes: deliveryNotes.trim(),
                items,
            };

            await api.post('/api/deliveries', payload);
            Alert.alert(
                'Delivery Note Created',
                'The selected quantities are assigned to this trip. Start it from Driver Trips when ready.',
                [{ text: 'OK', onPress: () => setActiveHubTab('TRIPS') }],
            );
            setAssignModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Dispatch Error', error.response?.data?.message || 'Could not assign van');
        } finally {
            setSubmittingAssign(false);
        }
    };

    // ─────────────────────────────────────────────
    // ACTIONS: DRIVER TRIPS & IN-PLACE VERIFICATION
    // ─────────────────────────────────────────────
    const handleStartTrip = async (deliveryId: number, deliveryObj?: any) => {
        if (!tripStatus(deliveryObj?.status).canStart) {
            Alert.alert(
                'Trip Unavailable',
                'Only an assigned trip can be started. Refresh the delivery list.',
            );
            return;
        }
        if (deliveryObj && !canOperateDelivery(deliveryObj)) {
            const driverName =
                deliveryObj.deliveryPerson?.name || deliveryObj.deliveryPerson?.fullName || 'another driver';
            Alert.alert(
                'Permission Denied',
                `This trip is assigned to ${driverName}. Only ${driverName} or a manager can start this delivery.`,
            );
            return;
        }
        setActionLoadingId(deliveryId);
        try {
            await api.put(`/api/deliveries/${deliveryId}/start`);
            Alert.alert('Trip Started', 'Van is now Out for Delivery.');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Could not start trip');
        } finally {
            setActionLoadingId(null);
        }
    };

    const openVerifyModal = (delivery: any) => {
        if (!tripStatus(delivery?.status).canConfirm) {
            Alert.alert(
                'Trip Unavailable',
                'Only a trip that is out for delivery can be confirmed. Refresh the delivery list.',
            );
            return;
        }
        if (delivery && !canOperateDelivery(delivery)) {
            const driverName =
                delivery.deliveryPerson?.name || delivery.deliveryPerson?.fullName || 'another driver';
            Alert.alert(
                'Permission Denied',
                `This trip is assigned to ${driverName}. Only ${driverName} or a manager can complete this drop-off.`,
            );
            return;
        }
        setSelectedDeliveryForVerify(delivery);
        const cust = delivery.customer || delivery.salesOrder?.customer || {};
        setReceiverName(cust.customerName || '');
        setReceiverPhone(cust.phone || cust.phoneNumber || '');
        setVerificationNotes('');
        setPaymentMode('CREDIT');

        const initialQtys: Record<number, string> = {};
        (delivery.items || []).forEach((it: any) => {
            if (it.product?.id != null)
                initialQtys[it.product.id] =
                    it.deliveringQuantity == null ? '' : String(it.deliveringQuantity);
        });
        setDeliveredQtys(initialQtys);
        setVerifyModalVisible(true);
    };

    const handleConfirmDeliverySubmit = async () => {
        if (!selectedDeliveryForVerify || submittingVerify) return;
        if (!tripStatus(selectedDeliveryForVerify.status).canConfirm) return;
        if (!receiverName.trim()) {
            Alert.alert('Receiver Name Required', 'Please enter the name of the person receiving the goods.');
            return;
        }

        let confirmedItems;
        try {
            confirmedItems = confirmationItems(selectedDeliveryForVerify.items || [], deliveredQtys);
        } catch (error) {
            Alert.alert(
                'Check Received Quantities',
                error instanceof Error ? error.message : 'Check each received quantity.',
            );
            return;
        }
        setSubmittingVerify(true);
        try {
            const payload = {
                receiverName: receiverName.trim(),
                receiverPhone: receiverPhone.trim(),
                deliveryNotes: verificationNotes.trim(),
                paymentMode: paymentMode,
                items: confirmedItems,
            };

            await api.post(`/api/deliveries/${selectedDeliveryForVerify.id}/confirm`, payload);
            Alert.alert(
                'Delivery Recorded',
                confirmedItems.some((item) => item.deliveredQuantity > 0)
                    ? 'Received quantities have been recorded and billed. Undelivered goods remain outstanding on the order.'
                    : 'No goods were recorded as received. No invoice was generated; the goods remain outstanding on the order.',
                [
                    ...(confirmedItems.some((item) => item.deliveredQuantity > 0)
                        ? [{ text: 'View Invoices', onPress: () => router.push('/sales') }]
                        : []),
                    { text: 'Done', onPress: () => {} },
                ],
            );
            setVerifyModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Verification Error', error.response?.data?.message || 'Could not complete delivery');
        } finally {
            setSubmittingVerify(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Logistics Custom Organic SVG Background Canvas (Dynamically adapts palette to active tab) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF8F5" />

                    {/* Prominent Header Background Glow Shape (Mint for Warehouse / Rose for Trips) */}
                    <Path
                        d="M-50 -50 C120 -50, 410 -30, 420 160 C425 260, 260 220, 110 200 C-20 180, -60 80, -50 -50 Z"
                        fill={activeHubTab === 'WAREHOUSE' ? '#E8F5E9' : '#FDECEF'}
                        opacity={0.8}
                    />
                    <Circle
                        cx="330"
                        cy="75"
                        r="85"
                        fill={activeHubTab === 'WAREHOUSE' ? '#C8E6C9' : '#FCE7F3'}
                        opacity={0.4}
                    />

                    {/* Supporting Soft Floating Accent */}
                    <Path
                        d="M-40 280 C30 290, 110 260, 140 340 C170 420, 70 460, -20 420 C-80 390, -100 270, -40 280 Z"
                        fill={activeHubTab === 'WAREHOUSE' ? '#E8F5E9' : '#FFF1F2'}
                        opacity={0.4}
                    />

                    {/* Dotted Route Curve (Cleanly positioned below header) */}
                    <Path
                        d="M30 155 Q130 125 230 155 T340 140"
                        stroke={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'}
                        strokeWidth="1.3"
                        strokeDasharray="4 4"
                        fill="none"
                        opacity={0.25}
                    />
                    <Circle
                        cx="30"
                        cy="155"
                        r="3"
                        fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'}
                        opacity={0.35}
                    />
                    <Circle
                        cx="230"
                        cy="155"
                        r="3"
                        fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'}
                        opacity={0.35}
                    />
                    <Circle
                        cx="340"
                        cy="140"
                        r="4"
                        fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'}
                        opacity={0.4}
                    />
                </Svg>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchData();
                        }}
                        colors={['#1A1A1A']}
                        tintColor="#1A1A1A"
                    />
                }
            >
                {/* ───────────────────────────────────────────── */}
                {/* 1. TOP HEADER                                 */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerLeftRow}>
                        <TouchableOpacity
                            style={styles.backCircleBtn}
                            onPress={() => router.back()}
                            activeOpacity={0.75}
                        >
                            <ArrowLeft size={18} color="#1A1A1A" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleBox}>
                            <Text style={styles.headerTitle}>
                                {activeHubTab === 'WAREHOUSE' ? 'Warehouse Queue' : 'Delivery Queue'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {activeHubTab === 'WAREHOUSE'
                                    ? 'Pick. Pack. Move forward.'
                                    : 'On the move for your business.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRightActions}>
                        <View style={styles.syncIconBtn}>
                            <Cloud size={18} color="#059669" strokeWidth={2.3} />
                        </View>
                        <TouchableOpacity
                            style={styles.refreshCircleBtn}
                            onPress={fetchData}
                            activeOpacity={0.75}
                        >
                            <RefreshCw size={15} color="#4B5563" />
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 2. HERO ILLUSTRATION SECTION (DIRECTLY BELOW) */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={40} style={styles.heroSectionWrapper}>
                    {activeHubTab === 'WAREHOUSE' ? (
                        <View style={styles.heroSectionWarehouse}>
                            <View style={styles.heroSectionTextBox}>
                                <Text style={styles.heroSectionTitle}>
                                    Every{'\n'}order closer{'\n'}to a happy{'\n'}customer.
                                </Text>
                            </View>
                            <View style={styles.heroSectionIllustrationBox}>
                                <WarehouseHeroIllustration />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.heroSectionTrips}>
                            <View style={styles.heroSectionIllustrationBox}>
                                <DeliveryHeroIllustration />
                            </View>
                            <View style={styles.heroSectionTextBoxTrips}>
                                <Text style={styles.heroSectionTitleTrips}>
                                    Track.{'\n'}Deliver.{'\n'}Build trust.
                                </Text>
                            </View>
                        </View>
                    )}
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 3. DUAL-CARD SEGMENT SWITCHER                 */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={60} style={styles.segmentWrapper}>
                    <View style={styles.segmentContainerRedesigned}>
                        <TouchableOpacity
                            style={[
                                styles.segmentTabCard,
                                activeHubTab === 'WAREHOUSE'
                                    ? styles.segmentTabCardActiveWarehouse
                                    : styles.segmentTabCardInactive,
                            ]}
                            onPress={() => setActiveHubTab('WAREHOUSE')}
                            activeOpacity={0.8}
                        >
                            <Package
                                size={16}
                                color={activeHubTab === 'WAREHOUSE' ? '#059669' : '#6B7280'}
                                strokeWidth={2.3}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.segmentTabCardTitle,
                                    activeHubTab === 'WAREHOUSE'
                                        ? styles.segmentTabCardTitleActive
                                        : styles.segmentTabCardTitleInactive,
                                ]}
                            >
                                Warehouse Queue
                            </Text>
                            <View
                                style={[
                                    styles.segmentTabCardBadge,
                                    activeHubTab === 'WAREHOUSE'
                                        ? styles.segmentTabCardBadgeActiveWarehouse
                                        : styles.segmentTabCardBadgeInactive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.segmentTabCardBadgeText,
                                        activeHubTab === 'WAREHOUSE'
                                            ? styles.segmentTabCardBadgeTextActiveWarehouse
                                            : styles.segmentTabCardBadgeTextInactive,
                                    ]}
                                >
                                    {ordersInQueue}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentTabCard,
                                activeHubTab === 'TRIPS'
                                    ? styles.segmentTabCardActiveTrips
                                    : styles.segmentTabCardInactive,
                            ]}
                            onPress={() => setActiveHubTab('TRIPS')}
                            activeOpacity={0.8}
                        >
                            <Truck
                                size={16}
                                color={activeHubTab === 'TRIPS' ? '#E11D48' : '#6B7280'}
                                strokeWidth={2.3}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.segmentTabCardTitle,
                                    activeHubTab === 'TRIPS'
                                        ? styles.segmentTabCardTitleActive
                                        : styles.segmentTabCardTitleInactive,
                                ]}
                            >
                                Delivery Queue
                            </Text>
                            <View
                                style={[
                                    styles.segmentTabCardBadge,
                                    activeHubTab === 'TRIPS'
                                        ? styles.segmentTabCardBadgeActiveTrips
                                        : styles.segmentTabCardBadgeInactive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.segmentTabCardBadgeText,
                                        activeHubTab === 'TRIPS'
                                            ? styles.segmentTabCardBadgeTextActiveTrips
                                            : styles.segmentTabCardBadgeTextInactive,
                                    ]}
                                >
                                    {tripCounts.ALL}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 4. TOP KPI METRIC CARDS                       */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={80}>
                    {activeHubTab === 'WAREHOUSE' ? (
                        <View style={styles.kpiCardsRow}>
                            {/* Card 1: Total Orders */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    warehouseFilter === 'ALL' && styles.kpiCardItemActive,
                                ]}
                                onPress={() => setWarehouseFilter('ALL')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#ECFDF5' }]}>
                                    <Package size={15} color="#059669" />
                                </View>
                                <Text style={styles.kpiCardTitle}>Total Orders</Text>
                                <Text style={styles.kpiCardBigNum}>{warehouseCounts.ALL}</Text>
                                <Text style={styles.kpiCardSub}>Across all routes</Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#D1FAE5' }]} />
                            </TouchableOpacity>

                            {/* Card 2: To Dispatch */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    warehouseFilter === 'NEW' && styles.kpiCardItemActive,
                                ]}
                                onPress={() => setWarehouseFilter('NEW')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#FEF3C7' }]}>
                                    <Clock size={15} color="#D97706" />
                                </View>
                                <Text style={styles.kpiCardTitle}>To Dispatch</Text>
                                <Text style={styles.kpiCardBigNum}>{warehouseCounts.NEW}</Text>
                                <Text style={styles.kpiCardSub}>
                                    {warehouseCounts.NEW === 0
                                        ? 'Nothing waiting'
                                        : `${warehouseCounts.NEW} order waiting`}
                                </Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#FEF3C7' }]} />
                            </TouchableOpacity>

                            {/* Card 3: Assigned / Ready */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    warehouseFilter === 'READY' && styles.kpiCardItemActive,
                                ]}
                                onPress={() => setWarehouseFilter('READY')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#EFF6FF' }]}>
                                    <Layers size={15} color="#2563EB" />
                                </View>
                                <Text style={styles.kpiCardTitle}>Ready to Ship</Text>
                                <Text style={styles.kpiCardBigNum}>{warehouseCounts.READY}</Text>
                                <Text style={styles.kpiCardSub}>Ready for pickup</Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#E0F2FE' }]} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.kpiCardsRow}>
                            {/* Card 1: Total Deliveries */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    tripFilter === 'ALL' && styles.kpiCardItemActiveTrips,
                                ]}
                                onPress={() => setTripFilter('ALL')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#FFE4E6' }]}>
                                    <Truck size={15} color="#E11D48" />
                                </View>
                                <Text style={styles.kpiCardTitle}>Total Deliveries</Text>
                                <Text style={styles.kpiCardBigNum}>{tripCounts.ALL}</Text>
                                <Text style={styles.kpiCardSub}>Today's routes</Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#FECDD3' }]} />
                            </TouchableOpacity>

                            {/* Card 2: In Transit */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    tripFilter === 'IN_TRANSIT' && styles.kpiCardItemActiveTrips,
                                ]}
                                onPress={() => setTripFilter('IN_TRANSIT')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#FEF3C7' }]}>
                                    <Clock size={15} color="#D97706" />
                                </View>
                                <Text style={styles.kpiCardTitle}>In Transit</Text>
                                <Text style={styles.kpiCardBigNum}>{tripCounts.IN_TRANSIT}</Text>
                                <Text style={styles.kpiCardSub}>
                                    {tripCounts.IN_TRANSIT === 0
                                        ? 'No delayed routes'
                                        : `${tripCounts.IN_TRANSIT} active on road`}
                                </Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#FEF3C7' }]} />
                            </TouchableOpacity>

                            {/* Card 3: Delivered */}
                            <TouchableOpacity
                                style={[
                                    styles.kpiCardItem,
                                    tripFilter === 'DELIVERED' && styles.kpiCardItemActiveTrips,
                                ]}
                                onPress={() => setTripFilter('DELIVERED')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#ECFDF5' }]}>
                                    <CheckCircle2 size={15} color="#059669" />
                                </View>
                                <Text style={styles.kpiCardTitle}>Delivered</Text>
                                <Text style={styles.kpiCardBigNum}>{tripCounts.DELIVERED}</Text>
                                <Text style={styles.kpiCardSub}>
                                    {tripCounts.ALL > 0
                                        ? Math.round((tripCounts.DELIVERED / tripCounts.ALL) * 100)
                                        : 100}
                                    % completed
                                </Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#D1FAE5' }]} />
                            </TouchableOpacity>
                        </View>
                    )}
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 5. FILTER PILLS WITH COUNTS                   */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={100}>
                    <View style={styles.subFilterBar}>
                        <View style={styles.subFilterPillsGroup}>
                            {activeHubTab === 'WAREHOUSE' ? (
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            warehouseFilter === 'ALL' && styles.subFilterPillActive,
                                        ]}
                                        onPress={() => setWarehouseFilter('ALL')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                warehouseFilter === 'ALL' && styles.subFilterPillTextActive,
                                            ]}
                                        >
                                            All ({warehouseCounts.ALL})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            warehouseFilter === 'NEW' && styles.subFilterPillActive,
                                        ]}
                                        onPress={() => setWarehouseFilter('NEW')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                warehouseFilter === 'NEW' && styles.subFilterPillTextActive,
                                            ]}
                                        >
                                            To Dispatch ({warehouseCounts.NEW})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            warehouseFilter === 'READY' && styles.subFilterPillActive,
                                        ]}
                                        onPress={() => setWarehouseFilter('READY')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                warehouseFilter === 'READY' && styles.subFilterPillTextActive,
                                            ]}
                                        >
                                            Ready ({warehouseCounts.READY})
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            tripFilter === 'ALL' && styles.subFilterPillActiveTrips,
                                        ]}
                                        onPress={() => setTripFilter('ALL')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                tripFilter === 'ALL' && styles.subFilterPillTextActiveTrips,
                                            ]}
                                        >
                                            All ({tripCounts.ALL})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            tripFilter === 'IN_TRANSIT' && styles.subFilterPillActiveTrips,
                                        ]}
                                        onPress={() => setTripFilter('IN_TRANSIT')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                tripFilter === 'IN_TRANSIT' &&
                                                    styles.subFilterPillTextActiveTrips,
                                            ]}
                                        >
                                            In Transit ({tripCounts.IN_TRANSIT})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.subFilterPill,
                                            tripFilter === 'DELIVERED' && styles.subFilterPillActiveTrips,
                                        ]}
                                        onPress={() => setTripFilter('DELIVERED')}
                                    >
                                        <Text
                                            style={[
                                                styles.subFilterPillText,
                                                tripFilter === 'DELIVERED' &&
                                                    styles.subFilterPillTextActiveTrips,
                                            ]}
                                        >
                                            Delivered ({tripCounts.DELIVERED})
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 6. SEARCH BAR WITH FILTER ICON                */}
                {/* ───────────────────────────────────────────── */}
                <FadeInDown delay={110}>
                    <View style={styles.searchControlsRow}>
                        <View style={styles.searchPillBox}>
                            <Search size={16} color="#8A8A8A" />
                            <TextInput
                                placeholder={
                                    activeHubTab === 'WAREHOUSE'
                                        ? 'Search orders, items or customer...'
                                        : 'Search by order, customer or location...'
                                }
                                placeholderTextColor="#8A8A8A"
                                style={styles.searchPillInput}
                                value={activeHubTab === 'WAREHOUSE' ? warehouseSearch : tripSearch}
                                onChangeText={
                                    activeHubTab === 'WAREHOUSE' ? setWarehouseSearch : setTripSearch
                                }
                            />
                            {(activeHubTab === 'WAREHOUSE' ? warehouseSearch : tripSearch).length > 0 && (
                                <TouchableOpacity
                                    onPress={() =>
                                        activeHubTab === 'WAREHOUSE'
                                            ? setWarehouseSearch('')
                                            : setTripSearch('')
                                    }
                                >
                                    <X size={14} color="#8A8A8A" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity style={styles.filterBtnCapsule} activeOpacity={0.8}>
                            <SlidersHorizontal size={15} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* ───────────────────────────────────────────── */}
                {/* 7. REDESIGNED ORDERS / TRIPS CARDS LIST       */}
                {/* ───────────────────────────────────────────── */}
                {activeHubTab === 'WAREHOUSE' ? (
                    loading && orders.length === 0 ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="small" color="#1A1A1A" />
                            <Text style={styles.loadingText}>Loading warehouse queue...</Text>
                        </View>
                    ) : filteredOrders.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Image
                                source={require('../../assets/illustrations/empty_orders.png')}
                                style={{ width: 84, height: 60, marginBottom: 8 }}
                                resizeMode="contain"
                            />
                            <Text style={styles.emptyTitle}>No Orders Found</Text>
                            <Text style={styles.emptySubtitle}>
                                All booked orders are dispatched or adjust your search filter.
                            </Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={80}>
                            <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                                {filteredOrders.map((order) => {
                                    const workflow = warehouseWorkflow(order, deliveries);
                                    const isDelivered = workflow.delivered;
                                    const isReady = workflow.canAssign;
                                    const orderDetails = warehouseOrderDetails(order);

                                    // Badge configuration
                                    const badgeLabel = workflow.label;
                                    const badgeBg = isDelivered ? '#ECFDF5' : isReady ? '#EFF6FF' : '#FEF3C7';
                                    const badgeText = isDelivered
                                        ? '#059669'
                                        : isReady
                                          ? '#2563EB'
                                          : '#D97706';

                                    // Left Square Icon Style
                                    const iconBg = isDelivered ? '#ECFDF5' : isReady ? '#EFF6FF' : '#FEF3C7';
                                    const iconBorder = isDelivered
                                        ? '#A7F3D0'
                                        : isReady
                                          ? '#BFDBFE'
                                          : '#FDE68A';
                                    const iconColor = isDelivered
                                        ? '#059669'
                                        : isReady
                                          ? '#2563EB'
                                          : '#D97706';

                                    return (
                                        <AnimatedPressable
                                            key={order.id}
                                            style={
                                                [
                                                    styles.imageStyleOrderCard,
                                                    isWide && styles.imageStyleOrderCardWide,
                                                ] as any
                                            }
                                            onPress={() => {
                                                if (isDelivered) {
                                                    Alert.alert('Order Delivered', workflow.explanation, [
                                                        {
                                                            text: 'View Delivery Queue',
                                                            onPress: () => setActiveHubTab('TRIPS'),
                                                        },
                                                        { text: 'Close', style: 'cancel' },
                                                    ]);
                                                } else if (isReady) {
                                                    // Stage 2: Ready to ship -> Assign driver & vehicle
                                                    openAssignModal(order);
                                                } else {
                                                    // Stage 1: Packaging -> Verify stock & pack
                                                    openPackModal(order);
                                                }
                                            }}
                                        >
                                            {/* Left Rounded Colored Box with 3D Box Icon */}
                                            <View
                                                style={[
                                                    styles.imageCardIconSquare,
                                                    { backgroundColor: iconBg, borderColor: iconBorder },
                                                ]}
                                            >
                                                <Package size={22} color={iconColor} strokeWidth={2} />
                                            </View>

                                            {/* Middle Details */}
                                            <View style={styles.imageCardDetailsCol}>
                                                <Text style={styles.imageCardOrderNum}>
                                                    {orderDetails.orderNumber}
                                                </Text>
                                                <Text style={styles.imageCardCustomerName} numberOfLines={1}>
                                                    {orderDetails.customer}
                                                </Text>
                                                <View style={styles.imageCardMetaRow}>
                                                    <Text style={styles.imageCardMetaText} numberOfLines={1}>
                                                        {orderDetails.itemLabel}
                                                    </Text>
                                                </View>
                                                <View style={styles.imageCardDateRow}>
                                                    <Calendar size={11} color="#9CA3AF" />
                                                    <Text style={styles.imageCardDateText}>
                                                        {orderDetails.dateLabel}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Right Status Pill & Arrow */}
                                            <View style={styles.imageCardRightCol}>
                                                <View
                                                    style={[
                                                        styles.imageCardStatusPill,
                                                        { backgroundColor: badgeBg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.imageCardStatusText,
                                                            { color: badgeText },
                                                        ]}
                                                    >
                                                        {badgeLabel}
                                                    </Text>
                                                </View>
                                                <ChevronRight size={16} color="#9CA3AF" />
                                            </View>
                                        </AnimatedPressable>
                                    );
                                })}
                            </View>
                        </StaggerContainer>
                    )
                ) : loading && deliveries.length === 0 ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#1A1A1A" />
                        <Text style={styles.loadingText}>Loading driver trips...</Text>
                    </View>
                ) : filteredDeliveries.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Image
                            source={require('../../assets/illustrations/map_tracking.png')}
                            style={{ width: 84, height: 60, marginBottom: 8 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>No Trips Found</Text>
                        <Text style={styles.emptySubtitle}>
                            Dispatch orders from the Warehouse Queue to create driver drop-off routes.
                        </Text>
                    </View>
                ) : (
                    <StaggerContainer stagger={25} delay={80}>
                        <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                            {filteredDeliveries.map((del) => {
                                const status = tripStatus(del.status, del.generatedInvoiceId);

                                const details = tripDetails(del);
                                const dateStr = details.assignedLabel;
                                const custName = details.customerName;
                                const addressStr = details.address;

                                const badgeLabel = status.label;
                                const badgeBg = status.background;
                                const badgeText = status.color;
                                const iconBg = status.background;
                                const iconBorder = status.border;
                                const iconColor = status.color;

                                return (
                                    <AnimatedPressable
                                        key={del.id}
                                        style={
                                            [
                                                styles.imageStyleOrderCard,
                                                isWide && styles.imageStyleOrderCardWide,
                                            ] as any
                                        }
                                        onPress={() => {
                                            setSelectedDeliveryForDetail(del);
                                            setDetailModalVisible(true);
                                        }}
                                    >
                                        {/* Left Rounded Colored Box with Truck Icon */}
                                        <View
                                            style={[
                                                styles.imageCardIconSquare,
                                                { backgroundColor: iconBg, borderColor: iconBorder },
                                            ]}
                                        >
                                            <Truck size={22} color={iconColor} strokeWidth={2} />
                                        </View>

                                        {/* Middle Details */}
                                        <View style={styles.imageCardDetailsCol}>
                                            <Text style={styles.imageCardOrderNum}>{details.number}</Text>
                                            <Text style={styles.imageCardCustomerName} numberOfLines={1}>
                                                {custName}
                                            </Text>
                                            <View style={styles.imageCardMetaRow}>
                                                <MapPin size={11} color="#6B7280" />
                                                <Text style={styles.imageCardMetaText} numberOfLines={1}>
                                                    {addressStr}
                                                </Text>
                                            </View>
                                            <View style={styles.imageCardDateRow}>
                                                <Calendar size={11} color="#9CA3AF" />
                                                <Text style={styles.imageCardDateText}>
                                                    {dateStr} • {details.vehicle}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Status Pill & Arrow */}
                                        <View style={styles.imageCardRightCol}>
                                            <View
                                                style={[
                                                    styles.imageCardStatusPill,
                                                    { backgroundColor: badgeBg },
                                                ]}
                                            >
                                                <Text
                                                    style={[styles.imageCardStatusText, { color: badgeText }]}
                                                >
                                                    {badgeLabel}
                                                </Text>
                                            </View>
                                            <ChevronRight size={16} color="#9CA3AF" />
                                        </View>
                                    </AnimatedPressable>
                                );
                            })}
                        </View>
                    </StaggerContainer>
                )}

                {/* Footer Sync Notice */}
                <View style={styles.footerSyncNotice}>
                    <Text style={styles.footerSyncText}>Delivery updates are synced with Sales</Text>
                    <ExternalLink size={12} color="#8A8A8A" />
                </View>
            </ScrollView>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 0: STAGE 1 - PACK & VERIFY STOCK */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={packModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPackModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Pack & Verify Stock</Text>
                                <Text style={styles.modalSub}>
                                    {selectedOrderForPack?.orderNumber} •{' '}
                                    {selectedOrderForPack?.customer?.customerName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setPackModalVisible(false)}
                            >
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                            {/* Order Info Banner */}
                            <View
                                style={{
                                    backgroundColor: '#FFFDF0',
                                    borderRadius: 12,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: '#FDE68A',
                                    marginBottom: 14,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View>
                                        <Text
                                            style={{
                                                fontSize: 10,
                                                fontWeight: '800',
                                                color: '#D97706',
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            STAGE 1: PACKAGING & STOCK CHECK
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: '#111827',
                                                marginTop: 2,
                                            }}
                                        >
                                            Verify goods present in godown
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#FEF3C7',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Package size={16} color="#D97706" />
                                    </View>
                                </View>
                            </View>

                            <PackingItems items={selectedOrderForPack?.items || []} />
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.modalSubmitBtn, { backgroundColor: '#D97706' }]}
                            onPress={handleConfirmPackingSubmit}
                            disabled={submittingPack}
                            activeOpacity={0.85}
                        >
                            {submittingPack ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={styles.modalSubmitBtnText}>Mark Order Ready to Ship</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 1: STAGE 2 - ASSIGN DRIVER       */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Assign Driver & Dispatch</Text>
                                <Text style={styles.modalSub}>
                                    {selectedOrderForAssign?.orderNumber} •{' '}
                                    {selectedOrderForAssign?.customer?.customerName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setAssignModalVisible(false)}
                            >
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                            {/* Ready Status Banner */}
                            <View
                                style={{
                                    backgroundColor: '#EFF6FF',
                                    borderRadius: 12,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                    marginBottom: 14,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View>
                                        <Text
                                            style={{
                                                fontSize: 10,
                                                fontWeight: '800',
                                                color: '#2563EB',
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            STAGE 2: READY AT DOCK
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: '#111827',
                                                marginTop: 2,
                                            }}
                                        >
                                            Goods packed & ready for pickup
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#DBEAFE',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Truck size={16} color="#2563EB" />
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>ASSIGN DELIVERY DRIVER</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginBottom: 12 }}
                            >
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {staffList.length === 0 ? (
                                        <View style={[styles.driverChip, styles.driverChipActive]}>
                                            <User size={13} color="#FFFFFF" />
                                            <Text
                                                style={[styles.driverChipText, styles.driverChipTextActive]}
                                            >
                                                Default Driver
                                            </Text>
                                        </View>
                                    ) : (
                                        staffList.map((member: any) => {
                                            const memberId = member.userId ?? member.id;
                                            const isSel = selectedDeliveryPersonId === memberId;
                                            const memberName =
                                                member.name ||
                                                member.fullName ||
                                                member.username ||
                                                `Driver #${memberId}`;
                                            return (
                                                <TouchableOpacity
                                                    key={memberId}
                                                    style={[
                                                        styles.driverChip,
                                                        isSel && styles.driverChipActive,
                                                    ]}
                                                    onPress={() => setSelectedDeliveryPersonId(memberId)}
                                                    activeOpacity={0.8}
                                                >
                                                    <User size={13} color={isSel ? '#FFFFFF' : '#4B5563'} />
                                                    <Text
                                                        style={[
                                                            styles.driverChipText,
                                                            isSel && styles.driverChipTextActive,
                                                        ]}
                                                    >
                                                        {memberName}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            </ScrollView>

                            <Text style={styles.inputLabel}>VEHICLE / VAN NUMBER</Text>
                            <TextInput
                                style={styles.cleanInput}
                                placeholder="e.g. TN-30-AB-1234 / Van 01"
                                placeholderTextColor="#9CA3AF"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                            />

                            <Text style={styles.inputLabel}>UNALLOCATED ITEMS TO DISPATCH</Text>
                            <View
                                style={{
                                    backgroundColor: '#FAFAF8',
                                    borderRadius: 12,
                                    padding: 10,
                                    borderWidth: 1,
                                    borderColor: '#ECEBE4',
                                    marginBottom: 12,
                                }}
                            >
                                <DispatchItems
                                    items={dispatchPreview(selectedOrderForAssign)}
                                    quantities={deliveringQtysForAssign}
                                    onChange={(id, value) =>
                                        setDeliveringQtysForAssign((previous) => ({
                                            ...previous,
                                            [id]: value,
                                        }))
                                    }
                                />
                            </View>

                            <Text style={styles.inputLabel}>DELIVERY ROUTE / NOTES (OPTIONAL)</Text>
                            <TextInput
                                style={[styles.cleanInput, { height: 60 }]}
                                placeholder="Route instructions, customer landmarks..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                value={deliveryNotes}
                                onChangeText={setDeliveryNotes}
                            />
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
                            onPress={handleCreateDeliveryNoteSubmit}
                            disabled={submittingAssign}
                            activeOpacity={0.85}
                        >
                            {submittingAssign ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Truck size={16} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={styles.modalSubmitBtnText}>Dispatch to Delivery Queue</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 2: IN-PLACE DROP-OFF VERIFICATION */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={verifyModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setVerifyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Verify & Complete Drop-off</Text>
                                <Text style={styles.modalSub}>
                                    {selectedDeliveryForVerify?.deliveryNumber} •{' '}
                                    {selectedDeliveryForVerify?.customer?.customerName ||
                                        selectedDeliveryForVerify?.salesOrder?.customer?.customerName ||
                                        'Store Customer'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setVerifyModalVisible(false)}
                            >
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Dispatched Items to Deliver (Fixed / Read-only) */}
                            <Text style={styles.inputLabel}>DISPATCHED ITEMS (DELIVERED QUANTITY)</Text>
                            <View
                                style={{
                                    backgroundColor: '#FAFAF8',
                                    borderRadius: 12,
                                    padding: 10,
                                    borderWidth: 1,
                                    borderColor: '#ECEBE4',
                                    marginBottom: 12,
                                }}
                            >
                                <ReceivedItems
                                    items={selectedDeliveryForVerify?.items || []}
                                    quantities={deliveredQtys}
                                    onChange={(id, value) =>
                                        setDeliveredQtys((previous) => ({ ...previous, [id]: value }))
                                    }
                                />
                            </View>

                            {/* Receiver Name & Phone */}
                            <Text style={styles.inputLabel}>RECEIVER CONTACT NAME *</Text>
                            <TextInput
                                style={styles.cleanInput}
                                placeholder="Name of person accepting delivery..."
                                placeholderTextColor="#9CA3AF"
                                value={receiverName}
                                onChangeText={setReceiverName}
                            />

                            <Text style={styles.inputLabel}>RECEIVER PHONE NUMBER</Text>
                            <TextInput
                                style={styles.cleanInput}
                                placeholder="10-digit mobile number..."
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                                value={receiverPhone}
                                onChangeText={setReceiverPhone}
                            />

                            {/* Payment Settlement Mode */}
                            <Text style={styles.inputLabel}>PAYMENT SETTLEMENT</Text>
                            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                                {[
                                    { key: 'CREDIT', label: 'Store Credit' },
                                    { key: 'CASH', label: 'Cash on Delivery' },
                                    { key: 'UPI', label: 'Instant UPI' },
                                ].map((p) => {
                                    const active = paymentMode === p.key;
                                    return (
                                        <TouchableOpacity
                                            key={p.key}
                                            style={[
                                                styles.driverChip,
                                                active && styles.driverChipActive,
                                                { flex: 1, justifyContent: 'center' },
                                            ]}
                                            onPress={() => setPaymentMode(p.key as any)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.driverChipText,
                                                    active && styles.driverChipTextActive,
                                                ]}
                                            >
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                            onPress={handleConfirmDeliverySubmit}
                            disabled={submittingVerify}
                            activeOpacity={0.85}
                        >
                            {submittingVerify ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={styles.modalSubmitBtnText}>Confirm Received Quantities</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 3: REDESIGNED DELIVERY DETAILS  */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.designDetailModalSheet}>
                        <View style={styles.modalGrabHandle} />

                        {/* Top Tag & Close Row */}
                        <View style={styles.detailModalTopHeader}>
                            <View style={styles.detailModalTagRow}>
                                <View style={styles.detailModalGreenTag}>
                                    <Text style={styles.detailModalGreenTagText}>DELIVERY</Text>
                                </View>
                                <Text style={styles.detailModalDateText}>
                                    {tripDetails(selectedDeliveryForDetail).assignedLabel}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setDetailModalVisible(false)}
                                activeOpacity={0.75}
                            >
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        {/* Large Delivery Number & Route Sub */}
                        <Text style={styles.detailModalMainTitle}>
                            {tripDetails(selectedDeliveryForDetail).number}
                        </Text>
                        <Text style={styles.detailModalSubRoute}>
                            Dispatch record • {tripDetails(selectedDeliveryForDetail).address}
                        </Text>

                        {selectedDeliveryForDetail &&
                            (() => {
                                const cust =
                                    selectedDeliveryForDetail.customer ||
                                    selectedDeliveryForDetail.salesOrder?.customer ||
                                    {};
                                const details = tripDetails(selectedDeliveryForDetail);
                                const custName = details.customerName;
                                const custAddress = details.address;
                                const custPhone = cust.phone || cust.phoneNumber || '';
                                const driver = selectedDeliveryForDetail.deliveryPerson;
                                const driverName = details.driver;
                                const driverPhone = driver?.phoneNumber || driver?.phone || '';
                                const canOperate = canOperateDelivery(selectedDeliveryForDetail);

                                const status = tripStatus(
                                    selectedDeliveryForDetail.status,
                                    selectedDeliveryForDetail.generatedInvoiceId,
                                );
                                const isDelivered = status.delivered;
                                const isTransit = status.canConfirm;
                                const isAssigned = status.canStart;
                                const statusTitle = status.label;
                                const statusColor = status.color;
                                const cardBg = status.background;
                                const cardBorder = status.border;

                                return (
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={{ maxHeight: 620 }}
                                    >
                                        {/* Warm Yellowish Status Card Matching Design */}
                                        <View
                                            style={[
                                                styles.detailStatusWarmCard,
                                                { backgroundColor: cardBg, borderColor: cardBorder },
                                            ]}
                                        >
                                            <View style={styles.detailStatusCardTopRow}>
                                                <View>
                                                    <Text style={styles.detailStatusLabel}>TRIP STATUS</Text>
                                                    <Text
                                                        style={[
                                                            styles.detailStatusBigVal,
                                                            { color: statusColor },
                                                        ]}
                                                    >
                                                        {statusTitle}
                                                    </Text>
                                                </View>
                                                <StatusBoxIllustration />
                                            </View>

                                            {/* Stepper Progress Indicator */}
                                            {status.showProgress ? (
                                                <View style={styles.stepperContainer}>
                                                    <View style={styles.stepperLabelsRow}>
                                                        <Text
                                                            style={[
                                                                styles.stepperLabelText,
                                                                { textAlign: 'left', flex: 1 },
                                                                styles.stepperLabelActive,
                                                                isAssigned && {
                                                                    color: '#D97706',
                                                                    fontWeight: '800',
                                                                },
                                                            ]}
                                                        >
                                                            Assigned
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.stepperLabelText,
                                                                { textAlign: 'center', flex: 1 },
                                                                (isTransit || isDelivered) &&
                                                                    styles.stepperLabelActive,
                                                                isTransit && {
                                                                    color: '#0284C7',
                                                                    fontWeight: '800',
                                                                },
                                                            ]}
                                                        >
                                                            In Transit
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.stepperLabelText,
                                                                { textAlign: 'right', flex: 1 },
                                                                isDelivered && [
                                                                    styles.stepperLabelActive,
                                                                    { color: '#059669', fontWeight: '800' },
                                                                ],
                                                            ]}
                                                        >
                                                            Delivered
                                                        </Text>
                                                    </View>

                                                    <View style={styles.stepperTrackBar}>
                                                        {/* Segment 1: Assigned to In Transit (0% to 50%) */}
                                                        <View
                                                            style={[
                                                                styles.stepperSegment,
                                                                {
                                                                    backgroundColor: isTransit
                                                                        ? '#0284C7'
                                                                        : isDelivered
                                                                          ? '#059669'
                                                                          : '#E5E7EB',
                                                                },
                                                            ]}
                                                        />
                                                        {/* Segment 2: In Transit to Delivered (50% to 100%) */}
                                                        <View
                                                            style={[
                                                                styles.stepperSegment,
                                                                {
                                                                    backgroundColor: isDelivered
                                                                        ? '#059669'
                                                                        : '#E5E7EB',
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            ) : (
                                                <Text
                                                    style={{
                                                        color: status.color,
                                                        marginTop: 12,
                                                        lineHeight: 20,
                                                    }}
                                                >
                                                    {status.explanation}
                                                </Text>
                                            )}
                                        </View>

                                        {/* 2-Column Info Grid: Customer & Driver */}
                                        <View style={styles.detailInfoColsRow}>
                                            {/* Box 1: Customer */}
                                            <View style={styles.detailInfoBoxItem}>
                                                <Text style={styles.detailInfoBoxLabel}>CUSTOMER</Text>
                                                <View style={styles.detailInfoAvatarRow}>
                                                    <View style={styles.detailAvatarCircleMint}>
                                                        <Text style={styles.detailAvatarTextMint}>
                                                            {custName.slice(0, 2).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.detailInfoBoxVal} numberOfLines={1}>
                                                        {custName}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Box 2: Assigned Driver */}
                                            <View style={styles.detailInfoBoxItem}>
                                                <Text style={styles.detailInfoBoxLabel}>ASSIGNED TO</Text>
                                                <View style={styles.detailInfoAvatarRow}>
                                                    <View style={styles.detailAvatarCircleMint}>
                                                        <Text style={styles.detailAvatarTextMint}>
                                                            {driverName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1, minWidth: 0 }}>
                                                        <Text
                                                            style={styles.detailInfoBoxVal}
                                                            numberOfLines={1}
                                                        >
                                                            {driverName}
                                                        </Text>
                                                        <Text style={styles.detailInfoBoxSub}>
                                                            {details.vehicle}
                                                        </Text>
                                                    </View>
                                                    <ContactCallButton
                                                        phone={driverPhone}
                                                        label="Call Driver"
                                                        compact
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                        {details.notes && (
                                            <Text style={{ marginBottom: 12 }}>
                                                Delivery notes: {details.notes}
                                            </Text>
                                        )}
                                        <DeliveryItems
                                            items={selectedDeliveryForDetail.items || []}
                                            status={selectedDeliveryForDetail.status}
                                        />

                                        {/* Action Buttons */}
                                        <View style={{ gap: 8, marginTop: 4, marginBottom: 16 }}>
                                            {!canOperate && (status.canStart || status.canConfirm) ? (
                                                <View
                                                    style={{
                                                        backgroundColor: '#FFFBEB',
                                                        borderColor: '#FDE68A',
                                                        borderWidth: 1,
                                                        borderRadius: 12,
                                                        padding: 12,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                    }}
                                                >
                                                    <ShieldAlert size={18} color="#D97706" />
                                                    <Text
                                                        style={{
                                                            flex: 1,
                                                            fontSize: 12,
                                                            color: '#92400E',
                                                            fontWeight: '500',
                                                            lineHeight: 17,
                                                        }}
                                                    >
                                                        Assigned to{' '}
                                                        <Text style={{ fontWeight: '700' }}>
                                                            {driverName}
                                                        </Text>
                                                        . Only {driverName} or a manager can execute this
                                                        delivery.
                                                    </Text>
                                                </View>
                                            ) : (
                                                <>
                                                    {isAssigned && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.modalSubmitBtn,
                                                                { backgroundColor: '#0284C7', height: 46 },
                                                            ]}
                                                            onPress={async () => {
                                                                await handleStartTrip(
                                                                    selectedDeliveryForDetail.id,
                                                                    selectedDeliveryForDetail,
                                                                );
                                                                setDetailModalVisible(false);
                                                            }}
                                                            disabled={
                                                                actionLoadingId ===
                                                                selectedDeliveryForDetail.id
                                                            }
                                                            activeOpacity={0.85}
                                                        >
                                                            {actionLoadingId ===
                                                            selectedDeliveryForDetail.id ? (
                                                                <ActivityIndicator color="#FFFFFF" />
                                                            ) : (
                                                                <>
                                                                    <Truck
                                                                        size={16}
                                                                        color="#FFFFFF"
                                                                        strokeWidth={2.2}
                                                                    />
                                                                    <Text style={styles.modalSubmitBtnText}>
                                                                        Start Out for Delivery
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    )}

                                                    {isTransit && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.modalSubmitBtn,
                                                                { backgroundColor: '#10B981', height: 46 },
                                                            ]}
                                                            onPress={() => {
                                                                const cur = selectedDeliveryForDetail;
                                                                setDetailModalVisible(false);
                                                                setTimeout(() => openVerifyModal(cur), 200);
                                                            }}
                                                            activeOpacity={0.85}
                                                        >
                                                            <CheckCircle2
                                                                size={16}
                                                                color="#FFFFFF"
                                                                strokeWidth={2.2}
                                                            />
                                                            <Text style={styles.modalSubmitBtnText}>
                                                                Verify Drop-off & Settle
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}

                                                    {status.canViewInvoice && (
                                                        <TouchableOpacity
                                                            style={styles.detailViewInvoiceBtn}
                                                            onPress={() => {
                                                                setDetailModalVisible(false);
                                                                router.push('/sales');
                                                            }}
                                                            activeOpacity={0.85}
                                                        >
                                                            <FileText size={16} color="#FFFFFF" />
                                                            <Text style={styles.detailViewInvoiceBtnText}>
                                                                View invoice in Sales
                                                            </Text>
                                                            <ExternalLink size={13} color="#FFFFFF" />
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                        </View>

                                        {/* Delivery Utility Buttons */}
                                        <View style={styles.modalUtilityRow}>
                                            <TouchableOpacity
                                                style={styles.modalUtilityBtn}
                                                onPress={() => Alert.alert('Customer Address', custAddress)}
                                                activeOpacity={0.75}
                                            >
                                                <View style={styles.modalUtilityIconCircle}>
                                                    <Navigation size={18} color="#1A1A1A" />
                                                </View>
                                                <Text style={styles.modalUtilityLabel}>View Address</Text>
                                            </TouchableOpacity>

                                            <ContactCallButton phone={custPhone} label="Call Customer" />

                                            <DeliveryShareButton delivery={selectedDeliveryForDetail} />
                                        </View>
                                    </ScrollView>
                                );
                            })()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Platform, Linking, useWindowDimensions,
    Animated, Image
} from 'react-native';
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import {
    ArrowLeft, Truck, Package, CheckCircle2, Clock, AlertCircle,
    Phone, MapPin, Check, X, ShieldCheck, Store, IndianRupee,
    FileText, User, Navigation, Plus, Minus, AlertTriangle,
    Layers, Search, ChevronRight, RefreshCw, Calendar, SlidersHorizontal, ExternalLink,
    Cloud, Navigation2, MoreVertical, Share2, ShieldAlert
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import { RoleGate } from '../../src/components/RoleGate';
import { useRoleContext } from '../../src/contexts/RoleContext';
import api from '../../src/services/api';

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
            <Path d="M28 15.5 L44 24.5 M28 24.5 L28 42.5" stroke="#FEF3C7" strokeWidth="1.2" strokeLinecap="round" />

            {/* Motion rays */}
            <Path d="M9 22 L15 24 M7 28 L14 29 M10 34 L16 33" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />

            {/* Green Checkmark Badge */}
            <Circle cx="56" cy="14" r="8.5" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.2" />
            <Path d="M52.5 14 L55 16.5 L60 11.5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ProductBottleThumbnail() {
    return (
        <View style={styles.productThumbnailBox}>
            <Image
                source={require('../../assets/illustrations/products.png')}
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
            />
        </View>
    );
}

type HubTab = 'WAREHOUSE' | 'TRIPS';

export default function UnifiedDispatchDeliveryHub() {
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
    const isAssignedDriver = useCallback((del: any) => {
        if (!del || !del.deliveryPerson) return false;
        const driverId = del.deliveryPerson.id ?? del.deliveryPerson.userId;
        if (!driverId || !currentUserId) return false;
        return Number(driverId) === Number(currentUserId);
    }, [currentUserId]);

    const canOperateDelivery = useCallback((del: any) => {
        if (isManagerOrAdmin) return true;
        return isAssignedDriver(del);
    }, [isManagerOrAdmin, isAssignedDriver]);

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
    const [packingQtys, setPackingQtys] = useState<Record<number, number>>({});
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
    const [deliveredQtys, setDeliveredQtys] = useState<Record<number, number>>({});
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
                api.get('/api/organizations/members').catch(() => ({ data: [] }))
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

    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));

    // ─────────────────────────────────────────────
    // COMPUTED METRICS & FILTERED DATA
    // ─────────────────────────────────────────────
    const getOrderRemaining = (o: any) => {
        return (o.items || []).reduce((s: number, it: any) => s + (it.remainingQuantity != null ? it.remainingQuantity : Math.max(0, (it.orderedQuantity || 0) - (it.deliveredQuantity || 0))), 0);
    };

    const getOrderDelivered = (o: any) => {
        return (o.items || []).reduce((s: number, it: any) => s + (it.deliveredQuantity || 0), 0);
    };

    const getOrderTotalOrdered = (o: any) => {
        return (o.items || []).reduce((s: number, it: any) => s + (it.orderedQuantity || 0), 0);
    };

    const warehouseCounts = useMemo(() => ({
        ALL: orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED').length,
        NEW: orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'READY_FOR_DELIVERY' && o.status !== 'OUT_FOR_DELIVERY').length,
        READY: orders.filter(o => o.status === 'READY_FOR_DELIVERY').length,
        DELIVERED: orders.filter(o => o.status === 'DELIVERED' || getOrderRemaining(o) === 0).length,
    }), [orders]);

    const tripCounts = useMemo(() => ({
        ALL: deliveries.length,
        IN_TRANSIT: deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY').length,
        ASSIGNED: deliveries.filter(d => d.status === 'ASSIGNED').length,
        DELIVERED: deliveries.filter(d => d.status === 'DELIVERED').length,
    }), [deliveries]);

    const ordersInQueue = warehouseCounts.NEW;

    const filteredOrders = useMemo(() => {
        let list = orders.filter(o => o.status !== 'CANCELLED');
        if (warehouseFilter === 'NEW') {
            list = list.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'READY_FOR_DELIVERY' && o.status !== 'OUT_FOR_DELIVERY');
        } else if (warehouseFilter === 'READY') {
            list = list.filter(o => o.status === 'READY_FOR_DELIVERY');
        } else if (warehouseFilter === 'DELIVERED') {
            list = list.filter(o => o.status === 'DELIVERED' || getOrderRemaining(o) === 0);
        }

        if (warehouseSearch.trim()) {
            const q = warehouseSearch.toLowerCase().trim();
            list = list.filter(o =>
                (o.orderNumber || '').toLowerCase().includes(q) ||
                (o.customer?.customerName || '').toLowerCase().includes(q) ||
                (o.salesperson?.name || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [orders, warehouseFilter, warehouseSearch]);

    const filteredDeliveries = useMemo(() => {
        let list = deliveries;
        if (tripFilter === 'IN_TRANSIT') {
            list = list.filter(d => d.status === 'OUT_FOR_DELIVERY');
        } else if (tripFilter === 'ASSIGNED') {
            list = list.filter(d => d.status === 'ASSIGNED');
        } else if (tripFilter === 'DELIVERED') {
            list = list.filter(d => d.status === 'DELIVERED');
        }

        if (tripSearch.trim()) {
            const q = tripSearch.toLowerCase().trim();
            list = list.filter(d => {
                const cust = d.customer || d.salesOrder?.customer || {};
                const custName = cust.customerName || '';
                const custAddr = cust.address || d.deliveryNotes || '';
                const driverName = d.deliveryPerson?.name || d.deliveryPerson?.fullName || '';
                const veh = d.vehicleNumber || '';
                const num = d.deliveryNumber || '';
                return num.toLowerCase().includes(q) ||
                    custName.toLowerCase().includes(q) ||
                    driverName.toLowerCase().includes(q) ||
                    veh.toLowerCase().includes(q) ||
                    custAddr.toLowerCase().includes(q);
            });
        }
        return list;
    }, [deliveries, tripFilter, tripSearch]);

    // ─────────────────────────────────────────────
    // ACTIONS: STAGE 1 - WAREHOUSE STOCK PACKING
    // ─────────────────────────────────────────────
    const openPackModal = (order: any) => {
        setSelectedOrderForPack(order);
        const initialQtys: Record<number, number> = {};
        (order.items || []).forEach((it: any) => {
            const rem = it.remainingQuantity != null ? it.remainingQuantity : Math.max(0, (it.orderedQuantity || 0) - (it.deliveredQuantity || 0));
            initialQtys[it.id] = rem > 0 ? rem : (it.orderedQuantity || 1);
        });
        setPackingQtys(initialQtys);
        setPackModalVisible(true);
    };

    const handleConfirmPackingSubmit = async () => {
        if (!selectedOrderForPack) return;
        setSubmittingPack(true);
        try {
            await api.put(`/api/sales-orders/${selectedOrderForPack.id}/status?status=READY_FOR_DELIVERY`);
            Alert.alert(
                'Order Packed & Ready',
                `Order #${selectedOrderForPack.orderNumber} is verified and marked Ready to Ship! It is now in the "Ready to Ship" tab for driver assignment.`,
                [{ text: 'View Ready Orders', onPress: () => setWarehouseFilter('READY') }]
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
    const [deliveringQtysForAssign, setDeliveringQtysForAssign] = useState<Record<number, number>>({});

    const openAssignModal = (order: any) => {
        setSelectedOrderForAssign(order);
        setSelectedDeliveryPersonId(staffList.length > 0 ? (staffList[0].userId ?? staffList[0].id) : null);
        setVehicleNumber('Van 01');
        setDeliveryNotes('');

        const initialQtys: Record<number, number> = {};
        (order.items || []).forEach((it: any) => {
            const rem = it.remainingQuantity != null ? it.remainingQuantity : Math.max(0, (it.orderedQuantity || 0) - (it.deliveredQuantity || 0));
            initialQtys[it.id] = rem > 0 ? rem : (it.orderedQuantity || 1);
        });
        setDeliveringQtysForAssign(initialQtys);
        setAssignModalVisible(true);
    };

    const handleCreateDeliveryNoteSubmit = async () => {
        if (!selectedOrderForAssign) return;
        setSubmittingAssign(true);
        try {
            const payload = {
                salesOrderId: selectedOrderForAssign.id,
                deliveryPersonId: selectedDeliveryPersonId,
                vehicleNumber: vehicleNumber.trim() || 'Van 01',
                deliveryNotes: deliveryNotes.trim(),
                items: (selectedOrderForAssign.items || []).map((it: any) => ({
                    salesOrderItemId: it.id,
                    productId: it.product.id,
                    deliveringQuantity: deliveringQtysForAssign[it.id] ?? it.remainingQuantity ?? it.orderedQuantity,
                })).filter((it: any) => it.deliveringQuantity > 0)
            };

            if (payload.items.length === 0) {
                Alert.alert('No Items Selected', 'Please specify a dispatch quantity greater than 0 for at least one item.');
                setSubmittingAssign(false);
                return;
            }

            await api.post('/api/deliveries', payload);
            Alert.alert(
                'Van Assigned & Dispatched',
                'Delivery note created successfully! Switched to Driver Trips view.',
                [{ text: 'OK', onPress: () => setActiveHubTab('TRIPS') }]
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
        if (deliveryObj && !canOperateDelivery(deliveryObj)) {
            const driverName = deliveryObj.deliveryPerson?.name || deliveryObj.deliveryPerson?.fullName || 'another driver';
            Alert.alert('Permission Denied', `This trip is assigned to ${driverName}. Only ${driverName} or a manager can start this delivery.`);
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
        if (delivery && !canOperateDelivery(delivery)) {
            const driverName = delivery.deliveryPerson?.name || delivery.deliveryPerson?.fullName || 'another driver';
            Alert.alert('Permission Denied', `This trip is assigned to ${driverName}. Only ${driverName} or a manager can complete this drop-off.`);
            return;
        }
        setSelectedDeliveryForVerify(delivery);
        const cust = delivery.customer || delivery.salesOrder?.customer || {};
        setReceiverName(cust.customerName || '');
        setReceiverPhone(cust.phone || cust.phoneNumber || '');
        setVerificationNotes('');
        setPaymentMode('CREDIT');

        const initialQtys: Record<number, number> = {};
        (delivery.items || []).forEach((it: any) => {
            const pId = it.product?.id || it.id;
            initialQtys[pId] = it.deliveringQuantity || it.orderedQuantity || 0;
        });
        setDeliveredQtys(initialQtys);
        setVerifyModalVisible(true);
    };

    const handleConfirmDeliverySubmit = async () => {
        if (!selectedDeliveryForVerify) return;
        if (!receiverName.trim()) {
            Alert.alert('Receiver Name Required', 'Please enter the name of the person receiving the goods.');
            return;
        }

        setSubmittingVerify(true);
        try {
            const payload = {
                receiverName: receiverName.trim(),
                receiverPhone: receiverPhone.trim(),
                deliveryNotes: verificationNotes.trim(),
                paymentMode: paymentMode,
                items: (selectedDeliveryForVerify.items || []).map((it: any) => ({
                    productId: it.product.id,
                    deliveredQuantity: it.deliveringQuantity || it.orderedQuantity || 0,
                }))
            };

            await api.post(`/api/deliveries/${selectedDeliveryForVerify.id}/confirm`, payload);
            Alert.alert(
                '🎉 Drop-off Verified & Billed!',
                `Goods verified and delivered to ${receiverName}.\nA official Tax Invoice has been generated and settled to customer account.`,
                [{ text: 'View Invoices', onPress: () => router.push('/sales') }, { text: 'Done', onPress: () => {} }]
            );
            setVerifyModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Verification Error', error.response?.data?.message || 'Could not complete delivery');
        } finally {
            setSubmittingVerify(false);
        }
    };

    const handleCallPhone = (phone?: string) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch(() => {
                Alert.alert('Phone Call', `Dialing: ${phone}`);
            });
        }
    };

    return (
        <RoleGate role={['ADMIN', 'MANAGER', 'WAREHOUSE']}>
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
                    <Circle cx="30" cy="155" r="3" fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'} opacity={0.35} />
                    <Circle cx="230" cy="155" r="3" fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'} opacity={0.35} />
                    <Circle cx="340" cy="140" r="4" fill={activeHubTab === 'WAREHOUSE' ? '#059669' : '#E11D48'} opacity={0.4} />
                </Svg>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchData(); }}
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
                        <TouchableOpacity style={styles.backCircleBtn} onPress={() => router.back()} activeOpacity={0.75}>
                            <ArrowLeft size={18} color="#1A1A1A" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleBox}>
                            <Text style={styles.headerTitle}>
                                {activeHubTab === 'WAREHOUSE' ? 'Warehouse Queue' : 'Delivery Queue'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {activeHubTab === 'WAREHOUSE' ? 'Pick. Pack. Move forward.' : 'On the move for your business.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRightActions}>
                        <View style={styles.syncIconBtn}>
                            <Cloud size={18} color="#059669" strokeWidth={2.3} />
                        </View>
                        <TouchableOpacity style={styles.refreshCircleBtn} onPress={fetchData} activeOpacity={0.75}>
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
                                activeHubTab === 'WAREHOUSE' ? styles.segmentTabCardActiveWarehouse : styles.segmentTabCardInactive
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
                                    activeHubTab === 'WAREHOUSE' ? styles.segmentTabCardTitleActive : styles.segmentTabCardTitleInactive
                                ]}
                            >
                                Warehouse Queue
                            </Text>
                            <View
                                style={[
                                    styles.segmentTabCardBadge,
                                    activeHubTab === 'WAREHOUSE' ? styles.segmentTabCardBadgeActiveWarehouse : styles.segmentTabCardBadgeInactive
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.segmentTabCardBadgeText,
                                        activeHubTab === 'WAREHOUSE' ? styles.segmentTabCardBadgeTextActiveWarehouse : styles.segmentTabCardBadgeTextInactive
                                    ]}
                                >
                                    {ordersInQueue}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentTabCard,
                                activeHubTab === 'TRIPS' ? styles.segmentTabCardActiveTrips : styles.segmentTabCardInactive
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
                                    activeHubTab === 'TRIPS' ? styles.segmentTabCardTitleActive : styles.segmentTabCardTitleInactive
                                ]}
                            >
                                Delivery Queue
                            </Text>
                            <View
                                style={[
                                    styles.segmentTabCardBadge,
                                    activeHubTab === 'TRIPS' ? styles.segmentTabCardBadgeActiveTrips : styles.segmentTabCardBadgeInactive
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.segmentTabCardBadgeText,
                                        activeHubTab === 'TRIPS' ? styles.segmentTabCardBadgeTextActiveTrips : styles.segmentTabCardBadgeTextInactive
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
                                style={[styles.kpiCardItem, warehouseFilter === 'ALL' && styles.kpiCardItemActive]}
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
                                style={[styles.kpiCardItem, warehouseFilter === 'NEW' && styles.kpiCardItemActive]}
                                onPress={() => setWarehouseFilter('NEW')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#FEF3C7' }]}>
                                    <Clock size={15} color="#D97706" />
                                </View>
                                <Text style={styles.kpiCardTitle}>To Dispatch</Text>
                                <Text style={styles.kpiCardBigNum}>{warehouseCounts.NEW}</Text>
                                <Text style={styles.kpiCardSub}>{warehouseCounts.NEW === 0 ? 'Nothing waiting' : `${warehouseCounts.NEW} order waiting`}</Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#FEF3C7' }]} />
                            </TouchableOpacity>

                            {/* Card 3: Assigned / Ready */}
                            <TouchableOpacity
                                style={[styles.kpiCardItem, warehouseFilter === 'READY' && styles.kpiCardItemActive]}
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
                                style={[styles.kpiCardItem, tripFilter === 'ALL' && styles.kpiCardItemActiveTrips]}
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
                                style={[styles.kpiCardItem, tripFilter === 'IN_TRANSIT' && styles.kpiCardItemActiveTrips]}
                                onPress={() => setTripFilter('IN_TRANSIT')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#FEF3C7' }]}>
                                    <Clock size={15} color="#D97706" />
                                </View>
                                <Text style={styles.kpiCardTitle}>In Transit</Text>
                                <Text style={styles.kpiCardBigNum}>{tripCounts.IN_TRANSIT}</Text>
                                <Text style={styles.kpiCardSub}>{tripCounts.IN_TRANSIT === 0 ? 'No delayed routes' : `${tripCounts.IN_TRANSIT} active on road`}</Text>
                                <View style={[styles.kpiCornerDecor, { backgroundColor: '#FEF3C7' }]} />
                            </TouchableOpacity>

                            {/* Card 3: Delivered */}
                            <TouchableOpacity
                                style={[styles.kpiCardItem, tripFilter === 'DELIVERED' && styles.kpiCardItemActiveTrips]}
                                onPress={() => setTripFilter('DELIVERED')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiCircleBadge, { backgroundColor: '#ECFDF5' }]}>
                                    <CheckCircle2 size={15} color="#059669" />
                                </View>
                                <Text style={styles.kpiCardTitle}>Delivered</Text>
                                <Text style={styles.kpiCardBigNum}>{tripCounts.DELIVERED}</Text>
                                <Text style={styles.kpiCardSub}>{tripCounts.ALL > 0 ? Math.round((tripCounts.DELIVERED / tripCounts.ALL) * 100) : 100}% completed</Text>
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
                                        style={[styles.subFilterPill, warehouseFilter === 'ALL' && styles.subFilterPillActive]}
                                        onPress={() => setWarehouseFilter('ALL')}
                                    >
                                        <Text style={[styles.subFilterPillText, warehouseFilter === 'ALL' && styles.subFilterPillTextActive]}>
                                            All ({warehouseCounts.ALL})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.subFilterPill, warehouseFilter === 'NEW' && styles.subFilterPillActive]}
                                        onPress={() => setWarehouseFilter('NEW')}
                                    >
                                        <Text style={[styles.subFilterPillText, warehouseFilter === 'NEW' && styles.subFilterPillTextActive]}>
                                            To Dispatch ({warehouseCounts.NEW})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.subFilterPill, warehouseFilter === 'READY' && styles.subFilterPillActive]}
                                        onPress={() => setWarehouseFilter('READY')}
                                    >
                                        <Text style={[styles.subFilterPillText, warehouseFilter === 'READY' && styles.subFilterPillTextActive]}>
                                            Ready ({warehouseCounts.READY})
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.subFilterPill, tripFilter === 'ALL' && styles.subFilterPillActiveTrips]}
                                        onPress={() => setTripFilter('ALL')}
                                    >
                                        <Text style={[styles.subFilterPillText, tripFilter === 'ALL' && styles.subFilterPillTextActiveTrips]}>
                                            All ({tripCounts.ALL})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.subFilterPill, tripFilter === 'IN_TRANSIT' && styles.subFilterPillActiveTrips]}
                                        onPress={() => setTripFilter('IN_TRANSIT')}
                                    >
                                        <Text style={[styles.subFilterPillText, tripFilter === 'IN_TRANSIT' && styles.subFilterPillTextActiveTrips]}>
                                            In Transit ({tripCounts.IN_TRANSIT})
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.subFilterPill, tripFilter === 'DELIVERED' && styles.subFilterPillActiveTrips]}
                                        onPress={() => setTripFilter('DELIVERED')}
                                    >
                                        <Text style={[styles.subFilterPillText, tripFilter === 'DELIVERED' && styles.subFilterPillTextActiveTrips]}>
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
                                placeholder={activeHubTab === 'WAREHOUSE' ? 'Search orders, items or customer...' : 'Search by order, customer or location...'}
                                placeholderTextColor="#8A8A8A"
                                style={styles.searchPillInput}
                                value={activeHubTab === 'WAREHOUSE' ? warehouseSearch : tripSearch}
                                onChangeText={activeHubTab === 'WAREHOUSE' ? setWarehouseSearch : setTripSearch}
                            />
                            {(activeHubTab === 'WAREHOUSE' ? warehouseSearch : tripSearch).length > 0 && (
                                <TouchableOpacity onPress={() => (activeHubTab === 'WAREHOUSE' ? setWarehouseSearch('') : setTripSearch(''))}>
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
                            <Text style={styles.emptySubtitle}>All booked orders are dispatched or adjust your search filter.</Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={80}>
                            <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                                {filteredOrders.map(order => {
                                    const totalBags = getOrderTotalOrdered(order);
                                    const deliveredBags = getOrderDelivered(order);
                                    const totalRemaining = getOrderRemaining(order);
                                    const isDelivered = order.status === 'DELIVERED' || totalRemaining === 0;
                                    const isPartial = !isDelivered && (order.status === 'PARTIALLY_DELIVERED' || deliveredBags > 0);
                                    const isReady = order.status === 'READY_FOR_DELIVERY';

                                    const dateStr = order.orderDate
                                        ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                        : 'Today, 10:30 AM';

                                    const firstItem = (order.items || [])[0] || {};
                                    const driverName = order.salesperson?.name || 'Selva';

                                    // Badge configuration
                                    const badgeLabel = isDelivered ? 'Delivered' : isReady ? 'Ready to Ship' : 'To Pack';
                                    const badgeBg = isDelivered ? '#ECFDF5' : isReady ? '#EFF6FF' : '#FEF3C7';
                                    const badgeText = isDelivered ? '#059669' : isReady ? '#2563EB' : '#D97706';

                                    // Left Square Icon Style
                                    const iconBg = isDelivered ? '#ECFDF5' : isReady ? '#EFF6FF' : '#FEF3C7';
                                    const iconBorder = isDelivered ? '#A7F3D0' : isReady ? '#BFDBFE' : '#FDE68A';
                                    const iconColor = isDelivered ? '#059669' : isReady ? '#2563EB' : '#D97706';

                                    return (
                                        <AnimatedPressable
                                            key={order.id}
                                            style={[styles.imageStyleOrderCard, isWide && styles.imageStyleOrderCardWide] as any}
                                            onPress={() => {
                                                if (isDelivered) {
                                                    Alert.alert(
                                                        'Order Dispatched',
                                                        `Sales Order #${order.orderNumber} is completely dispatched.`,
                                                        [
                                                            { text: 'View Delivery Queue', onPress: () => setActiveHubTab('TRIPS') },
                                                            { text: 'Close', style: 'cancel' }
                                                        ]
                                                    );
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
                                            <View style={[styles.imageCardIconSquare, { backgroundColor: iconBg, borderColor: iconBorder }]}>
                                                <Package size={22} color={iconColor} strokeWidth={2} />
                                            </View>

                                            {/* Middle Details */}
                                            <View style={styles.imageCardDetailsCol}>
                                                <Text style={styles.imageCardOrderNum}>
                                                    #{order.orderNumber}
                                                </Text>
                                                <Text style={styles.imageCardCustomerName} numberOfLines={1}>
                                                    {order.customer?.customerName || 'Store Customer'}
                                                </Text>
                                                <View style={styles.imageCardMetaRow}>
                                                    <Text style={styles.imageCardMetaText} numberOfLines={1}>
                                                        {totalBags} items • {totalBags * 25} kg ({firstItem.product?.productName || 'Rice'})
                                                    </Text>
                                                </View>
                                                <View style={styles.imageCardDateRow}>
                                                    <Calendar size={11} color="#9CA3AF" />
                                                    <Text style={styles.imageCardDateText}>
                                                        {dateStr}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Right Status Pill & Arrow */}
                                            <View style={styles.imageCardRightCol}>
                                                <View style={[styles.imageCardStatusPill, { backgroundColor: badgeBg }]}>
                                                    <Text style={[styles.imageCardStatusText, { color: badgeText }]}>
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
                ) : (
                    loading && deliveries.length === 0 ? (
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
                            <Text style={styles.emptySubtitle}>Dispatch orders from the Warehouse Queue to create driver drop-off routes.</Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={80}>
                            <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                                {filteredDeliveries.map(del => {
                                    const isAssigned = del.status === 'ASSIGNED';
                                    const isTransit = del.status === 'OUT_FOR_DELIVERY';
                                    const isDelivered = del.status === 'DELIVERED';

                                    const dateStr = del.dispatchDate
                                        ? new Date(del.dispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                        : 'Today, 11:00 AM';

                                    const cust = del.customer || del.salesOrder?.customer || {};
                                    const custName = cust.customerName || 'Store Customer';
                                    const driverName = del.deliveryPerson?.name || del.deliveryPerson?.fullName || 'Sam';
                                    const addressStr = cust.address || del.deliveryNotes || 'Store Location';

                                    // Badge configuration
                                    const badgeLabel = isDelivered ? 'Delivered' : isTransit ? 'In Transit' : 'Assigned';
                                    const badgeBg = isDelivered ? '#ECFDF5' : isTransit ? '#EFF6FF' : '#FFFBEB';
                                    const badgeText = isDelivered ? '#059669' : isTransit ? '#0284C7' : '#D97706';

                                    // Left Square Icon Style
                                    const iconBg = isDelivered ? '#ECFDF5' : isTransit ? '#EFF6FF' : '#FEF3C7';
                                    const iconBorder = isDelivered ? '#A7F3D0' : isTransit ? '#BAE6FD' : '#FDE68A';
                                    const iconColor = isDelivered ? '#059669' : isTransit ? '#0284C7' : '#D97706';

                                    return (
                                        <AnimatedPressable
                                            key={del.id}
                                            style={[styles.imageStyleOrderCard, isWide && styles.imageStyleOrderCardWide] as any}
                                            onPress={() => {
                                                setSelectedDeliveryForDetail(del);
                                                setDetailModalVisible(true);
                                            }}
                                        >
                                            {/* Left Rounded Colored Box with Truck Icon */}
                                            <View style={[styles.imageCardIconSquare, { backgroundColor: iconBg, borderColor: iconBorder }]}>
                                                <Truck size={22} color={iconColor} strokeWidth={2} />
                                            </View>

                                            {/* Middle Details */}
                                            <View style={styles.imageCardDetailsCol}>
                                                <Text style={styles.imageCardOrderNum}>
                                                    #{del.deliveryNumber}
                                                </Text>
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
                                                        {dateStr} • {del.vehicleNumber || 'Van 01'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Right Status Pill & Arrow */}
                                            <View style={styles.imageCardRightCol}>
                                                <View style={[styles.imageCardStatusPill, { backgroundColor: badgeBg }]}>
                                                    <Text style={[styles.imageCardStatusText, { color: badgeText }]}>
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
            <Modal visible={packModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Pack & Verify Stock</Text>
                                <Text style={styles.modalSub}>{selectedOrderForPack?.orderNumber} • {selectedOrderForPack?.customer?.customerName}</Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPackModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                            {/* Order Info Banner */}
                            <View style={{ backgroundColor: '#FFFDF0', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706', letterSpacing: 0.5 }}>STAGE 1: PACKAGING & STOCK CHECK</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 }}>Verify goods present in godown</Text>
                                    </View>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                                        <Package size={16} color="#D97706" />
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>VERIFY & PACK PHYSICAL BAGS</Text>
                            <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 14 }}>
                                {(selectedOrderForPack?.items || []).map((it: any) => {
                                    const rem = it.remainingQuantity != null ? it.remainingQuantity : Math.max(0, (it.orderedQuantity - (it.deliveredQuantity || 0)));
                                    const maxAllowed = rem > 0 ? rem : (it.orderedQuantity || 1);
                                    const currentStock = it.product?.stock != null ? Math.floor(it.product.stock) : null;
                                    const currQty = packingQtys[it.id] ?? maxAllowed;

                                    return (
                                        <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                                                    {it.product?.productName}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                                    <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                                        Ordered: <Text style={{ fontWeight: '700', color: '#111827' }}>{it.orderedQuantity} Bags</Text>
                                                    </Text>
                                                    {currentStock != null && (
                                                        <>
                                                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>•</Text>
                                                            <Text style={{ fontSize: 11, color: currentStock >= rem ? '#059669' : '#DC2626', fontWeight: '600' }}>
                                                                Godown Stock: {currentStock}
                                                            </Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <TouchableOpacity
                                                    style={{ paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}
                                                    onPress={() => setPackingQtys(prev => ({ ...prev, [it.id]: maxAllowed }))}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#1D4ED8' }}>Max</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}
                                                    onPress={() => setPackingQtys(prev => ({ ...prev, [it.id]: Math.max(0, currQty - 1) }))}
                                                    activeOpacity={0.7}
                                                >
                                                    <Minus size={13} color="#1A1A1A" />
                                                </TouchableOpacity>

                                                <TextInput
                                                    style={{ width: 44, height: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}
                                                    keyboardType="numeric"
                                                    value={String(currQty)}
                                                    onChangeText={(val) => {
                                                        const parsed = parseInt(val) || 0;
                                                        setPackingQtys(prev => ({ ...prev, [it.id]: Math.min(rem, Math.max(0, parsed)) }));
                                                    }}
                                                />

                                                <TouchableOpacity
                                                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}
                                                    onPress={() => setPackingQtys(prev => ({ ...prev, [it.id]: Math.min(rem, currQty + 1) }))}
                                                    activeOpacity={0.7}
                                                >
                                                    <Plus size={13} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
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
                                    <Text style={styles.modalSubmitBtnText}>Confirm Packed & Mark Ready to Ship</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 1: STAGE 2 - ASSIGN DRIVER       */}
            {/* ───────────────────────────────────────────── */}
            <Modal visible={assignModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Assign Driver & Dispatch</Text>
                                <Text style={styles.modalSub}>{selectedOrderForAssign?.orderNumber} • {selectedOrderForAssign?.customer?.customerName}</Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAssignModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                            {/* Ready Status Banner */}
                            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563EB', letterSpacing: 0.5 }}>STAGE 2: READY AT DOCK</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 }}>Goods packed & ready for pickup</Text>
                                    </View>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' }}>
                                        <Truck size={16} color="#2563EB" />
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>ASSIGN DELIVERY DRIVER</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {staffList.length === 0 ? (
                                        <View style={[styles.driverChip, styles.driverChipActive]}>
                                            <User size={13} color="#FFFFFF" />
                                            <Text style={[styles.driverChipText, styles.driverChipTextActive]}>
                                                Default Driver
                                            </Text>
                                        </View>
                                    ) : (
                                        staffList.map((member: any) => {
                                            const memberId = member.userId ?? member.id;
                                            const isSel = selectedDeliveryPersonId === memberId;
                                            const memberName = member.name || member.fullName || member.username || `Driver #${memberId}`;
                                            return (
                                                <TouchableOpacity
                                                    key={memberId}
                                                    style={[styles.driverChip, isSel && styles.driverChipActive]}
                                                    onPress={() => setSelectedDeliveryPersonId(memberId)}
                                                    activeOpacity={0.8}
                                                >
                                                    <User size={13} color={isSel ? '#FFFFFF' : '#4B5563'} />
                                                    <Text style={[styles.driverChipText, isSel && styles.driverChipTextActive]}>
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

                            <Text style={styles.inputLabel}>PACKED ITEMS TO DELIVER</Text>
                            <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                {(selectedOrderForAssign?.items || []).map((it: any) => {
                                    const rem = it.remainingQuantity != null ? it.remainingQuantity : Math.max(0, (it.orderedQuantity - (it.deliveredQuantity || 0)));
                                    const qty = deliveringQtysForAssign[it.id] ?? rem;

                                    return (
                                        <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                                                    {it.product?.productName}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                                                    Unit Price: ₹{it.unitPrice?.toLocaleString('en-IN') || 0}
                                                </Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                                                <Check size={12} color="#2563EB" strokeWidth={2.5} />
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>
                                                    {qty} Bags Packed
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
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
            <Modal visible={verifyModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Verify & Complete Drop-off</Text>
                                <Text style={styles.modalSub}>
                                    {selectedDeliveryForVerify?.deliveryNumber} • {(selectedDeliveryForVerify?.customer?.customerName || selectedDeliveryForVerify?.salesOrder?.customer?.customerName || 'Store Customer')}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setVerifyModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Dispatched Items to Deliver (Fixed / Read-only) */}
                            <Text style={styles.inputLabel}>DISPATCHED ITEMS (DELIVERED QUANTITY)</Text>
                            <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                {(selectedDeliveryForVerify?.items || []).map((it: any) => {
                                    const qty = it.deliveringQuantity || it.orderedQuantity || 0;
                                    const pId = it.product?.id || it.id;

                                    return (
                                        <View key={pId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                                                    {it.product?.productName}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                                                    Unit Price: ₹{it.unitPrice?.toLocaleString('en-IN') || 0}
                                                </Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                                                <Check size={12} color="#059669" strokeWidth={2.5} />
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                                                    {qty} Bags
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
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
                                    { key: 'UPI', label: 'Instant UPI' }
                                ].map(p => {
                                    const active = paymentMode === p.key;
                                    return (
                                        <TouchableOpacity
                                            key={p.key}
                                            style={[styles.driverChip, active && styles.driverChipActive, { flex: 1, justifyContent: 'center' }]}
                                            onPress={() => setPaymentMode(p.key as any)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.driverChipText, active && styles.driverChipTextActive]}>
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
                                    <Text style={styles.modalSubmitBtnText}>Confirm Drop-off & Generate Invoice</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 3: REDESIGNED DELIVERY DETAILS  */}
            {/* ───────────────────────────────────────────── */}
            <Modal visible={detailModalVisible} animationType="slide" transparent>
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
                                    {selectedDeliveryForDetail?.dispatchDate
                                        ? new Date(selectedDeliveryForDetail.dispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : 'Today, 10 Sept 2024'}
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
                            {selectedDeliveryForDetail?.deliveryNumber ? selectedDeliveryForDetail.deliveryNumber.replace('#', '') : 'DN-1788981356432'}
                        </Text>
                        <Text style={styles.detailModalSubRoute}>
                            Dispatch record • {(selectedDeliveryForDetail?.customer?.address || selectedDeliveryForDetail?.salesOrder?.customer?.address || selectedDeliveryForDetail?.deliveryNotes || 'Store Location')}
                        </Text>

                        {selectedDeliveryForDetail && (() => {
                            const cust = selectedDeliveryForDetail.customer || selectedDeliveryForDetail.salesOrder?.customer || {};
                            const custName = cust.customerName || selectedDeliveryForDetail.salesOrder?.orderNumber || 'Store Customer';
                            const custAddress = cust.address || selectedDeliveryForDetail.deliveryNotes || 'Store Location';
                            const custPhone = cust.phone || cust.phoneNumber || '';
                            const driver = selectedDeliveryForDetail.deliveryPerson;
                            const driverName = driver?.name || driver?.fullName || 'Assigned Driver';
                            const driverPhone = driver?.phoneNumber || driver?.phone || '';
                            const canOperate = canOperateDelivery(selectedDeliveryForDetail);

                            const isDelivered = selectedDeliveryForDetail.status === 'DELIVERED';
                            const isTransit = selectedDeliveryForDetail.status === 'OUT_FOR_DELIVERY';
                            const isAssigned = !isDelivered && !isTransit;

                            const statusTitle = isDelivered ? 'Delivered' : isTransit ? 'In Transit' : 'Assigned';
                            const statusColor = isDelivered ? '#059669' : isTransit ? '#0284C7' : '#D97706';
                            const cardBg = isDelivered ? '#F0FDF4' : isTransit ? '#F0F9FF' : '#FFFDF0';
                            const cardBorder = isDelivered ? '#BBF7D0' : isTransit ? '#BAE6FD' : '#FDE68A';

                            return (
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 620 }}>
                                    {/* Warm Yellowish Status Card Matching Design */}
                                    <View style={[styles.detailStatusWarmCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                        <View style={styles.detailStatusCardTopRow}>
                                            <View>
                                                <Text style={styles.detailStatusLabel}>TRIP STATUS</Text>
                                                <Text style={[styles.detailStatusBigVal, { color: statusColor }]}>
                                                    {statusTitle}
                                                </Text>
                                            </View>
                                            <StatusBoxIllustration />
                                        </View>

                                        {/* Stepper Progress Indicator */}
                                        <View style={styles.stepperContainer}>
                                            <View style={styles.stepperLabelsRow}>
                                                <Text style={[
                                                    styles.stepperLabelText,
                                                    { textAlign: 'left', flex: 1 },
                                                    styles.stepperLabelActive,
                                                    isAssigned && { color: '#D97706', fontWeight: '800' }
                                                ]}>
                                                    Assigned
                                                </Text>
                                                <Text style={[
                                                    styles.stepperLabelText,
                                                    { textAlign: 'center', flex: 1 },
                                                    (isTransit || isDelivered) && styles.stepperLabelActive,
                                                    isTransit && { color: '#0284C7', fontWeight: '800' }
                                                ]}>
                                                    In Transit
                                                </Text>
                                                <Text style={[
                                                    styles.stepperLabelText,
                                                    { textAlign: 'right', flex: 1 },
                                                    isDelivered && [styles.stepperLabelActive, { color: '#059669', fontWeight: '800' }]
                                                ]}>
                                                    Delivered
                                                </Text>
                                            </View>

                                            <View style={styles.stepperTrackBar}>
                                                {/* Segment 1: Assigned to In Transit (0% to 50%) */}
                                                <View style={[styles.stepperSegment, { backgroundColor: isTransit ? '#0284C7' : isDelivered ? '#059669' : '#E5E7EB' }]} />
                                                {/* Segment 2: In Transit to Delivered (50% to 100%) */}
                                                <View style={[styles.stepperSegment, { backgroundColor: isDelivered ? '#059669' : '#E5E7EB' }]} />
                                            </View>
                                        </View>
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
                                                    <Text style={styles.detailInfoBoxVal} numberOfLines={1}>
                                                        {driverName}
                                                    </Text>
                                                    <Text style={styles.detailInfoBoxSub}>
                                                        {selectedDeliveryForDetail.vehicleNumber || 'Van 01'}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.detailPhoneMiniBtn}
                                                    onPress={() => handleCallPhone(driverPhone || '9994645285')}
                                                >
                                                    <Phone size={13} color="#4B5563" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Line Items Box with Product Thumbnail */}
                                    {(selectedDeliveryForDetail.items || []).map((it: any, idx: number) => {
                                        const qty = it.deliveringQuantity || it.orderedQuantity || 2;
                                        const price = qty * (it.unitPrice || 720);
                                        const productName = it.product?.productName || 'Fortune Sunflower Oil';

                                        return (
                                            <View key={it.id || idx} style={styles.detailItemRowCard}>
                                                <ProductBottleThumbnail />
                                                <View style={{ flex: 1, paddingRight: 8, minWidth: 0 }}>
                                                    <Text style={styles.designProductName} numberOfLines={1}>
                                                        {productName}
                                                    </Text>
                                                    <Text style={styles.designProductSub}>
                                                        {qty} bags • {qty * 15} kg each
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <MapPin size={11} color="#6B7280" />
                                                        <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>
                                                            {custAddress}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.designProductPrice}>
                                                    ₹ {(price || 1440).toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        );
                                    })}

                                    {/* Action Buttons */}
                                    <View style={{ gap: 8, marginTop: 4, marginBottom: 16 }}>
                                        {!canOperate && !isDelivered ? (
                                            <View style={{
                                                backgroundColor: '#FFFBEB',
                                                borderColor: '#FDE68A',
                                                borderWidth: 1,
                                                borderRadius: 12,
                                                padding: 12,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                            }}>
                                                <ShieldAlert size={18} color="#D97706" />
                                                <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500', lineHeight: 17 }}>
                                                    Assigned to <Text style={{ fontWeight: '700' }}>{driverName}</Text>. Only {driverName} or a manager can execute this delivery.
                                                </Text>
                                            </View>
                                        ) : (
                                            <>
                                                {isAssigned && (
                                                    <TouchableOpacity
                                                        style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7', height: 46 }]}
                                                        onPress={async () => {
                                                            await handleStartTrip(selectedDeliveryForDetail.id, selectedDeliveryForDetail);
                                                            setDetailModalVisible(false);
                                                        }}
                                                        disabled={actionLoadingId === selectedDeliveryForDetail.id}
                                                        activeOpacity={0.85}
                                                    >
                                                        {actionLoadingId === selectedDeliveryForDetail.id ? (
                                                            <ActivityIndicator color="#FFFFFF" />
                                                        ) : (
                                                            <>
                                                                <Truck size={16} color="#FFFFFF" strokeWidth={2.2} />
                                                                <Text style={styles.modalSubmitBtnText}>Start Out for Delivery</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                )}

                                                {isTransit && (
                                                    <TouchableOpacity
                                                        style={[styles.modalSubmitBtn, { backgroundColor: '#10B981', height: 46 }]}
                                                        onPress={() => {
                                                            const cur = selectedDeliveryForDetail;
                                                            setDetailModalVisible(false);
                                                            setTimeout(() => openVerifyModal(cur), 200);
                                                        }}
                                                        activeOpacity={0.85}
                                                    >
                                                        <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                                                        <Text style={styles.modalSubmitBtnText}>Verify Drop-off & Settle</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {isDelivered && (
                                                    <TouchableOpacity
                                                        style={styles.detailViewInvoiceBtn}
                                                        onPress={() => {
                                                            setDetailModalVisible(false);
                                                            router.push('/sales');
                                                        }}
                                                        activeOpacity={0.85}
                                                    >
                                                        <FileText size={16} color="#FFFFFF" />
                                                        <Text style={styles.detailViewInvoiceBtnText}>View invoice in Sales</Text>
                                                        <ExternalLink size={13} color="#FFFFFF" />
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}
                                    </View>

                                    {/* Bottom 4-Action Utility Buttons Bar */}
                                    <View style={styles.modalUtilityRow}>
                                        <TouchableOpacity
                                            style={styles.modalUtilityBtn}
                                            onPress={() => Alert.alert('Route Navigation', `Opening navigation to ${custAddress}...`)}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.modalUtilityIconCircle}>
                                                <Navigation size={18} color="#1A1A1A" />
                                            </View>
                                            <Text style={styles.modalUtilityLabel}>View Route</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.modalUtilityBtn}
                                            onPress={() => handleCallPhone(custPhone || '9876543210')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.modalUtilityIconCircle}>
                                                <Phone size={18} color="#1A1A1A" />
                                            </View>
                                            <Text style={styles.modalUtilityLabel}>Call Customer</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.modalUtilityBtn}
                                            onPress={() => Alert.alert('Share Delivery', `Sharing delivery #${selectedDeliveryForDetail.deliveryNumber}...`)}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.modalUtilityIconCircle}>
                                                <Share2 size={18} color="#1A1A1A" />
                                            </View>
                                            <Text style={styles.modalUtilityLabel}>Share</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.modalUtilityBtn}
                                            onPress={() => Alert.alert('More Options', 'Export note, print delivery label or reassign driver.')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.modalUtilityIconCircle}>
                                                <MoreVertical size={18} color="#1A1A1A" />
                                            </View>
                                            <Text style={styles.modalUtilityLabel}>More</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
        </RoleGate>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : 12,
        paddingBottom: 70,
    },

    // ─────────────────────────────────────────────
    // 1. TOP HEADER (Matching Sales Screen Style)
    // ─────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 30, // Moved down 20px
        marginBottom: 16,
    },
    headerLeftRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backCircleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    headerTitleBox: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 1,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    syncIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    refreshCircleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },

    // ─────────────────────────────────────────────
    // 2. REDESIGNED DUAL-CARD SEGMENT SWITCHER
    // ─────────────────────────────────────────────
    segmentWrapper: {
        marginBottom: 14,
    },
    segmentContainerRedesigned: {
        flexDirection: 'row',
        gap: 6,
    },
    segmentTabCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 9,
        paddingHorizontal: 5,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
    },
    segmentTabCardActiveWarehouse: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#059669',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentTabCardActiveTrips: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#0284C7',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentTabCardInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    segmentTabCardTitle: {
        fontSize: 11.5,
        letterSpacing: -0.1,
        flexShrink: 1,
    },
    segmentTabCardTitleActive: {
        fontWeight: '700',
        color: '#111827',
    },
    segmentTabCardTitleInactive: {
        fontWeight: '600',
        color: '#6B7280',
    },
    segmentTabCardBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 999,
        flexShrink: 0,
    },
    segmentTabCardBadgeActiveWarehouse: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    segmentTabCardBadgeActiveTrips: {
        backgroundColor: '#F0F9FF',
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    segmentTabCardBadgeInactive: {
        backgroundColor: '#ECEAE4',
    },
    segmentTabCardBadgeText: {
        fontSize: 9.5,
        fontWeight: '800',
    },
    segmentTabCardBadgeTextActiveWarehouse: {
        color: '#059669',
    },
    segmentTabCardBadgeTextActiveTrips: {
        color: '#0284C7',
    },
    segmentTabCardBadgeTextInactive: {
        color: '#6B7280',
    },

    // ─────────────────────────────────────────────
    // 3. 3 KPI METRIC CARDS
    // ─────────────────────────────────────────────
    kpiCardsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    kpiCardItem: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 10,
        minHeight: 96,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    kpiCardItemActive: {
        borderColor: '#059669',
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    kpiCardItemActiveTrips: {
        borderColor: '#0284C7',
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    kpiCircleBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    kpiCardTitle: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 1,
    },
    kpiCardBigNum: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
        lineHeight: 24,
    },
    kpiCardSub: {
        fontSize: 9,
        color: '#8A8A8A',
        marginTop: 1,
    },
    kpiCornerDecor: {
        position: 'absolute',
        top: -16,
        right: -16,
        width: 44,
        height: 44,
        borderRadius: 22,
        opacity: 0.45,
    },

    // ─────────────────────────────────────────────
    // 4. HERO SECTION WITH ILLUSTRATIONS
    // ─────────────────────────────────────────────
    heroSectionWrapper: {
        marginBottom: 12,
    },
    heroSectionWarehouse: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        minHeight: 115,
    },
    heroSectionTrips: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        minHeight: 115,
    },
    heroSectionTextBox: {
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 4,
        paddingRight: 12,
    },
    heroSectionTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 23,
        letterSpacing: -0.3,
        textAlign: 'left',
    },
    heroSectionTextBoxTrips: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 22,
        paddingRight: 4,
    },
    heroSectionTitleTrips: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 23,
        letterSpacing: -0.3,
        textAlign: 'left',
    },
    heroSectionIllustrationBox: {
        width: 145,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ─────────────────────────────────────────────
    // 5. SECTION TITLE & FILTER / SEARCH
    // ─────────────────────────────────────────────
    sectionHeaderRow: {
        marginBottom: 10,
    },
    sectionTitleWithCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionMainTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.2,
    },
    titleCountBadge: {
        backgroundColor: '#ECEAE4',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DFD6',
    },
    titleCountBadgeText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#4B5563',
    },
    sectionSubtitle: {
        fontSize: 11.5,
        color: '#6B7280',
        marginTop: 2,
    },
    searchControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    searchPillBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        paddingHorizontal: 12,
        height: 40,
        gap: 8,
    },
    searchPillInput: {
        flex: 1,
        fontSize: 12.5,
        color: '#1A1A1A',
    },
    filterBtnCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        paddingHorizontal: 12,
        height: 40,
    },
    filterBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    subFilterBar: {
        marginBottom: 12,
        width: '100%',
    },
    subFilterPillsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: '100%',
    },
    subFilterPill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6.5,
        paddingHorizontal: 4,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    subFilterPillActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#059669',
        borderWidth: 1.5,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    subFilterPillActiveTrips: {
        backgroundColor: '#FDECEF',
        borderColor: '#F43F5E',
        borderWidth: 1.5,
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    subFilterPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
    },
    subFilterPillTextActive: {
        color: '#059669',
        fontWeight: '800',
        textAlign: 'center',
    },
    subFilterPillTextActiveTrips: {
        color: '#E11D48',
        fontWeight: '800',
        textAlign: 'center',
    },

    // ─────────────────────────────────────────────
    // 6. ORDER & TRIP CARDS GRID (MATCHING REFERENCE IMAGE)
    // ─────────────────────────────────────────────
    cardsGrid: {
        gap: 10,
    },
    cardsGridWide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    imageStyleOrderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
        gap: 12,
    },
    imageStyleOrderCardWide: {
        width: '48.8%',
    },
    imageCardIconSquare: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        flexShrink: 0,
        marginRight: 12,
    },
    imageCardDetailsCol: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        gap: 2,
        paddingRight: 8,
    },
    imageCardOrderNum: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.2,
    },
    imageCardCustomerName: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#374151',
    },
    imageCardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
    },
    imageCardMetaText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    imageCardDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    imageCardDateText: {
        fontSize: 10.5,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    imageCardRightCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 6,
        minWidth: 55,
        flexShrink: 0,
        marginLeft: 6,
    },
    imageCardStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    imageCardStatusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    cardQuickActionBtn: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardQuickActionText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#059669',
    },
    designOrderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    designOrderCardWide: {
        width: '48.5%',
    },
    designCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    soNumberTagGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    soPrefixPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    soPrefixText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6B7280',
    },
    soNumberText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    designStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 999,
        borderWidth: 1,
    },
    designStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    designStatusText: {
        fontSize: 10.5,
        fontWeight: '800',
    },
    designCustomerName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    designCardSubtitle: {
        fontSize: 11.5,
        color: '#6B7280',
        marginTop: 2,
        marginBottom: 12,
    },

    // Product Box inside Card
    designProductBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAF8',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        marginBottom: 12,
    },
    designProductIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    designProductName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    designProductSub: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },
    designProductPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A1A',
    },

    // Progress bar inside Card
    designProgressSection: {
        marginBottom: 12,
    },
    designProgressHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    designProgressLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#8A8A8A',
        letterSpacing: 0.5,
    },
    designProgressStatus: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#4B5563',
    },
    designProgressTrack: {
        height: 6,
        backgroundColor: '#ECEAE4',
        borderRadius: 999,
        overflow: 'hidden',
    },
    designProgressFill: {
        height: '100%',
        borderRadius: 999,
    },

    // Footer with driver avatar and action button
    designCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F3EE',
    },
    designDriverInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    designDriverAvatarCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    designDriverAvatarText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#065F46',
    },
    designDriverName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    designDriverSub: {
        fontSize: 9.5,
        color: '#8A8A8A',
    },
    designDispatchActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    designDispatchActionText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    designViewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    designViewDetailsText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#4B5563',
    },

    // Footer notice
    footerSyncNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 24,
        marginBottom: 16,
    },
    footerSyncText: {
        fontSize: 11.5,
        color: '#8A8A8A',
        fontWeight: '500',
    },

    // ─────────────────────────────────────────────
    // 6. MODALS & DRAWERS
    // ─────────────────────────────────────────────
    loadingBox: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
        marginTop: 8,
    },
    emptyTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 8,
        marginBottom: 3,
    },
    emptySubtitle: {
        fontSize: 11.5,
        color: '#6B7280',
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalSheet: {
        width: '100%',
        maxWidth: 580,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 18,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '90%',
    },
    modalGrabHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    modalSub: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },
    modalCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#4B5563',
        marginBottom: 5,
        letterSpacing: 0.3,
    },
    driverChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 9,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    driverChipActive: {
        backgroundColor: '#059669',
        borderColor: '#047857',
        borderWidth: 1,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    driverChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    driverChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    cleanInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 7,
        fontSize: 12.5,
        color: '#1A1A1A',
        marginBottom: 10,
    },
    modalSubmitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 999,
        marginTop: 8,
    },
    modalSubmitBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Redesigned Detail Modal Styles
    designDetailModalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        maxHeight: '94%',
    },
    detailModalTopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailModalTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailModalGreenTag: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    detailModalGreenTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#059669',
        letterSpacing: 0.5,
    },
    detailModalDateText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
    },
    detailModalMainTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    detailModalSubRoute: {
        fontSize: 11.5,
        color: '#6B7280',
        marginTop: 1,
        marginBottom: 10,
    },
    // Warm Status Card (Screen 3 Matching Design)
    detailStatusWarmCard: {
        backgroundColor: '#FFFDF0',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 10,
    },
    detailStatusCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailStatusLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#8A8A8A',
        letterSpacing: 0.8,
    },
    detailStatusBigVal: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: 2,
    },
    stepperContainer: {
        gap: 6,
    },
    stepperLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepperLabelText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    stepperLabelActive: {
        color: '#111827',
        fontWeight: '800',
    },
    stepperTrackBar: {
        flexDirection: 'row',
        gap: 4,
        height: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    stepperSegment: {
        flex: 1,
        height: '100%',
        borderRadius: 999,
    },
    detailInfoColsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    detailInfoBoxItem: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ECEBE4',
    },
    detailInfoBoxLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    detailInfoAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailAvatarCircleMint: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailAvatarTextMint: {
        fontSize: 11,
        fontWeight: '800',
        color: '#065F46',
    },
    detailInfoBoxVal: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    detailInfoBoxSub: {
        fontSize: 10.5,
        color: '#6B7280',
    },
    detailPhoneMiniBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailItemRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAF8',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        marginBottom: 12,
    },
    productThumbnailBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    detailViewInvoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        height: 46,
        borderRadius: 999,
        marginBottom: 4,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    detailViewInvoiceBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalUtilityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    modalUtilityBtn: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    modalUtilityIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalUtilityLabel: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#4B5563',
    },
});

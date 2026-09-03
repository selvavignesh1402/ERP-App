import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Platform, Linking
} from 'react-native';
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    ArrowLeft, Truck, Package, CheckCircle2, Clock, AlertCircle,
    Phone, MapPin, Check, X, ShieldCheck, Store, IndianRupee,
    FileText, User, Navigation, Plus, Minus, AlertTriangle,
    Layers, Search, ChevronRight, RefreshCw, Calendar
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import api from '../../src/services/api';

type HubTab = 'WAREHOUSE' | 'TRIPS';

export default function UnifiedDispatchDeliveryHub() {
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [activeHubTab, setActiveHubTab] = useState<HubTab>(params.tab === 'trips' ? 'TRIPS' : 'WAREHOUSE');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
    const [warehouseFilter, setWarehouseFilter] = useState<'ALL' | 'NEW' | 'READY'>('ALL');

    const [tripSearch, setTripSearch] = useState('');
    const [tripFilter, setTripFilter] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');

    // ─────────────────────────────────────────────
    // MODAL 1: Warehouse Dispatch & Van Assignment
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
        } catch (error) {
            console.error('Failed to load dispatch data:', error);
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
    const warehouseCounts = useMemo(() => ({
        ALL: orders.length,
        NEW: orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length,
        READY: orders.filter(o => o.status === 'READY_FOR_DELIVERY').length,
    }), [orders]);

    const tripCounts = useMemo(() => ({
        ALL: deliveries.length,
        IN_TRANSIT: deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY' || d.status === 'ASSIGNED').length,
        DELIVERED: deliveries.filter(d => d.status === 'DELIVERED').length,
    }), [deliveries]);

    const filteredOrders = useMemo(() => {
        let list = orders;
        if (warehouseFilter === 'NEW') {
            list = list.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCESSING');
        } else if (warehouseFilter === 'READY') {
            list = list.filter(o => o.status === 'READY_FOR_DELIVERY');
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
            list = list.filter(d => d.status === 'OUT_FOR_DELIVERY' || d.status === 'ASSIGNED');
        } else if (tripFilter === 'DELIVERED') {
            list = list.filter(d => d.status === 'DELIVERED');
        }

        if (tripSearch.trim()) {
            const q = tripSearch.toLowerCase().trim();
            list = list.filter(d =>
                (d.deliveryNumber || '').toLowerCase().includes(q) ||
                (d.customer?.customerName || '').toLowerCase().includes(q) ||
                (d.deliveryPerson?.name || '').toLowerCase().includes(q) ||
                (d.vehicleNumber || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [deliveries, tripFilter, tripSearch]);

    // ─────────────────────────────────────────────
    // ACTIONS: WAREHOUSE DISPATCH
    // ─────────────────────────────────────────────
    const openAssignModal = (order: any) => {
        setSelectedOrderForAssign(order);
        setSelectedDeliveryPersonId(staffList.length > 0 ? staffList[0].userId : null);
        setVehicleNumber('Van 01');
        setDeliveryNotes('');
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
                    deliveringQuantity: it.orderedQuantity,
                }))
            };

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
    const handleStartTrip = async (deliveryId: number) => {
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
        setSelectedDeliveryForVerify(delivery);
        setReceiverName(delivery.customer?.customerName || '');
        setReceiverPhone(delivery.customer?.phoneNumber || '');
        setVerificationNotes('');
        setPaymentMode('CREDIT');

        const initialQtys: Record<number, number> = {};
        (delivery.items || []).forEach((it: any) => {
            initialQtys[it.product.id] = it.deliveringQuantity || it.orderedQuantity || 0;
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
                    deliveredQuantity: deliveredQtys[it.product.id] ?? it.deliveringQuantity,
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
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background SVG Decor */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    <Path d="M240 -20 C320 -10, 400 60, 390 180 C380 300, 270 330, 160 290 C60 250, 0 160, 50 -10 Z" fill="#EFF6FF" opacity={0.45} />
                    <Circle cx="40" cy="480" r="95" fill="#FEF3C7" opacity={0.3} />
                </Svg>
            </View>

            {/* Clean Top App Bar */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
                    <ArrowLeft size={18} color="#1A1A1A" />
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Dispatch & Delivery Hub</Text>
                    <Text style={styles.headerSubtitle}>Warehouse packing & van logistics</Text>
                </View>

                <TouchableOpacity style={styles.refreshBtn} onPress={fetchData} activeOpacity={0.75}>
                    <RefreshCw size={15} color="#4B5563" />
                </TouchableOpacity>
            </View>

            {/* ───────────────────────────────────────────── */}
            {/* UNIFIED HUB SEGMENT SWITCHER */}
            {/* ───────────────────────────────────────────── */}
            <View style={styles.segmentWrapper}>
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeHubTab === 'WAREHOUSE' && styles.segmentBtnActive]}
                        onPress={() => setActiveHubTab('WAREHOUSE')}
                        activeOpacity={0.8}
                    >
                        <Package size={15} color={activeHubTab === 'WAREHOUSE' ? '#FFFFFF' : '#6B7280'} />
                        <Text style={[styles.segmentBtnText, activeHubTab === 'WAREHOUSE' && styles.segmentBtnTextActive]}>
                            Warehouse Queue
                        </Text>
                        <View style={[styles.segmentBadge, activeHubTab === 'WAREHOUSE' ? styles.segmentBadgeActive : styles.segmentBadgeInactive]}>
                            <Text style={[styles.segmentBadgeText, activeHubTab === 'WAREHOUSE' ? styles.segmentBadgeTextActive : styles.segmentBadgeTextInactive]}>
                                {warehouseCounts.NEW}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.segmentBtn, activeHubTab === 'TRIPS' && styles.segmentBtnActive]}
                        onPress={() => setActiveHubTab('TRIPS')}
                        activeOpacity={0.8}
                    >
                        <Truck size={15} color={activeHubTab === 'TRIPS' ? '#FFFFFF' : '#6B7280'} />
                        <Text style={[styles.segmentBtnText, activeHubTab === 'TRIPS' && styles.segmentBtnTextActive]}>
                            Driver Trips
                        </Text>
                        <View style={[styles.segmentBadge, activeHubTab === 'TRIPS' ? styles.segmentBadgeActive : styles.segmentBadgeInactive]}>
                            <Text style={[styles.segmentBadgeText, activeHubTab === 'TRIPS' ? styles.segmentBadgeTextActive : styles.segmentBadgeTextInactive]}>
                                {tripCounts.IN_TRANSIT}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            >
                {/* ═════════════════════════════════════════════ */}
                {/* TAB 1: WAREHOUSE QUEUE (Packing & Dispatch) */}
                {/* ═════════════════════════════════════════════ */}
                {activeHubTab === 'WAREHOUSE' ? (
                    <FadeInDown delay={40}>
                        {/* KPI Filter Ribbons */}
                        <View style={styles.kpiRibbon}>
                            <TouchableOpacity
                                style={[styles.kpiCard, warehouseFilter === 'ALL' && styles.kpiCardActive]}
                                onPress={() => setWarehouseFilter('ALL')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                    <Layers size={13} color="#1A1A1A" />
                                </View>
                                <Text style={styles.kpiCount}>{warehouseCounts.ALL}</Text>
                                <Text style={styles.kpiLabel}>All Orders</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.kpiCard, warehouseFilter === 'NEW' && styles.kpiCardActive]}
                                onPress={() => setWarehouseFilter('NEW')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#FEF3C7' }]}>
                                    <Package size={13} color="#D97706" />
                                </View>
                                <Text style={styles.kpiCount}>{warehouseCounts.NEW}</Text>
                                <Text style={styles.kpiLabel}>To Dispatch</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.kpiCard, warehouseFilter === 'READY' && styles.kpiCardActive]}
                                onPress={() => setWarehouseFilter('READY')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#D1FAE5' }]}>
                                    <Truck size={13} color="#059669" />
                                </View>
                                <Text style={styles.kpiCount}>{warehouseCounts.READY}</Text>
                                <Text style={styles.kpiLabel}>Assigned</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchBar}>
                            <Search size={15} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search order #, customer, sales rep..."
                                placeholderTextColor="#8A8A8A"
                                style={styles.searchInput}
                                value={warehouseSearch}
                                onChangeText={setWarehouseSearch}
                            />
                            {warehouseSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setWarehouseSearch('')}>
                                    <X size={15} color="#8A8A8A" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Orders List */}
                        {loading && orders.length === 0 ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="small" color="#1A1A1A" />
                                <Text style={styles.loadingText}>Loading warehouse queue...</Text>
                            </View>
                        ) : filteredOrders.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Package size={32} color="#9CA3AF" />
                                <Text style={styles.emptyTitle}>No Orders Found</Text>
                                <Text style={styles.emptySubtitle}>All booked orders are dispatched or adjust your search filter.</Text>
                            </View>
                        ) : (
                            <StaggerContainer stagger={25} delay={80}>
                                <View style={styles.cardsList}>
                                    {filteredOrders.map(order => {
                                        const isReady = order.status === 'READY_FOR_DELIVERY';
                                        const totalBags = (order.items || []).reduce((s: number, it: any) => s + (it.orderedQuantity || 0), 0);
                                        const dateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

                                        return (
                                            <AnimatedPressable key={order.id} style={styles.itemCard}>
                                                {/* Header Row */}
                                                <View style={styles.cardHeaderRow}>
                                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                                        <View style={styles.orderIdLine}>
                                                            <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                                                            <Text style={styles.dateDotText}>• {dateStr}</Text>
                                                        </View>
                                                        <Text style={styles.customerNameText} numberOfLines={1}>
                                                            {order.customer?.customerName || 'Store Customer'}
                                                        </Text>
                                                    </View>

                                                    <View style={[
                                                        styles.statusBadge,
                                                        {
                                                            backgroundColor: isReady ? '#ECFDF5' : '#FFFBEB',
                                                            borderColor: isReady ? '#A7F3D0' : '#FDE68A'
                                                        }
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusBadgeText,
                                                            { color: isReady ? '#059669' : '#D97706' }
                                                        ]}>
                                                            {isReady ? 'Assigned' : 'To Dispatch'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Clean Inline Metadata */}
                                                <View style={styles.cleanInfoRow}>
                                                    <View style={styles.infoTag}>
                                                        <Package size={12} color="#4B5563" />
                                                        <Text style={styles.infoTagText}>{totalBags} Bags</Text>
                                                    </View>
                                                    {order.salesperson ? (
                                                        <>
                                                            <View style={styles.infoDot} />
                                                            <View style={styles.infoTag}>
                                                                <User size={12} color="#4B5563" />
                                                                <Text style={styles.infoTagText}>{order.salesperson.name}</Text>
                                                            </View>
                                                        </>
                                                    ) : null}
                                                    {order.customer?.address ? (
                                                        <>
                                                            <View style={styles.infoDot} />
                                                            <View style={[styles.infoTag, { flex: 1 }]}>
                                                                <MapPin size={12} color="#4B5563" />
                                                                <Text style={styles.infoTagText} numberOfLines={1}>
                                                                    {order.customer.address}
                                                                </Text>
                                                            </View>
                                                        </>
                                                    ) : null}
                                                </View>

                                                {/* Items summary */}
                                                <View style={styles.cleanItemsList}>
                                                    {(order.items || []).map((item: any, idx: number) => {
                                                        const currentStock = item.product?.stock ?? 0;
                                                        const avail = currentStock >= item.orderedQuantity;
                                                        return (
                                                            <View key={item.id || idx} style={styles.cleanItemRow}>
                                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                                    <Text style={styles.itemNameText} numberOfLines={1}>
                                                                        {item.product?.productName || 'Rice Product'}
                                                                    </Text>
                                                                    <Text style={styles.itemQtySubtext}>
                                                                        {item.orderedQuantity} Bags × ₹{item.unitPrice?.toLocaleString('en-IN') || 0}
                                                                    </Text>
                                                                </View>
                                                                <View style={[styles.stockPill, { backgroundColor: avail ? '#ECFDF5' : '#FEF2F2' }]}>
                                                                    <Text style={[styles.stockPillText, { color: avail ? '#059669' : '#DC2626' }]}>
                                                                        {avail ? `Stock: ${currentStock}` : `Low: ${currentStock}`}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>

                                                {/* Card Footer */}
                                                <View style={styles.cardFooterRow}>
                                                    <View>
                                                        <Text style={styles.orderValueLabel}>Order Total</Text>
                                                        <Text style={styles.orderValueText}>
                                                            ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
                                                        </Text>
                                                    </View>

                                                    {!isReady ? (
                                                        <TouchableOpacity
                                                            style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
                                                            onPress={() => openAssignModal(order)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Truck size={13} color="#FFFFFF" strokeWidth={2.2} />
                                                            <Text style={styles.primaryActionBtnText}>Dispatch & Assign Van</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View style={styles.readyStatusPill}>
                                                            <CheckCircle2 size={13} color="#059669" />
                                                            <Text style={styles.readyStatusPillText}>Ready for Driver</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </AnimatedPressable>
                                        );
                                    })}
                                </View>
                            </StaggerContainer>
                        )}
                    </FadeInDown>
                ) : (
                    /* ═════════════════════════════════════════════ */
                    /* TAB 2: DRIVER & VAN TRIPS (Active Drop-offs)  */
                    /* ═════════════════════════════════════════════ */
                    <FadeInDown delay={40}>
                        {/* KPI Filter Ribbons */}
                        <View style={styles.kpiRibbon}>
                            <TouchableOpacity
                                style={[styles.kpiCard, tripFilter === 'ALL' && styles.kpiCardActive]}
                                onPress={() => setTripFilter('ALL')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                    <Layers size={13} color="#1A1A1A" />
                                </View>
                                <Text style={styles.kpiCount}>{tripCounts.ALL}</Text>
                                <Text style={styles.kpiLabel}>Total Dispatches</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.kpiCard, tripFilter === 'IN_TRANSIT' && styles.kpiCardActive]}
                                onPress={() => setTripFilter('IN_TRANSIT')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#E0F2FE' }]}>
                                    <Truck size={13} color="#0284C7" />
                                </View>
                                <Text style={styles.kpiCount}>{tripCounts.IN_TRANSIT}</Text>
                                <Text style={styles.kpiLabel}>In Progress</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.kpiCard, tripFilter === 'DELIVERED' && styles.kpiCardActive]}
                                onPress={() => setTripFilter('DELIVERED')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.kpiIconCircle, { backgroundColor: '#D1FAE5' }]}>
                                    <CheckCircle2 size={13} color="#059669" />
                                </View>
                                <Text style={styles.kpiCount}>{tripCounts.DELIVERED}</Text>
                                <Text style={styles.kpiLabel}>Delivered</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchBar}>
                            <Search size={15} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search DN #, store, driver, van..."
                                placeholderTextColor="#8A8A8A"
                                style={styles.searchInput}
                                value={tripSearch}
                                onChangeText={setTripSearch}
                            />
                            {tripSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setTripSearch('')}>
                                    <X size={15} color="#8A8A8A" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Trips List */}
                        {loading && deliveries.length === 0 ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="small" color="#1A1A1A" />
                                <Text style={styles.loadingText}>Loading driver trips...</Text>
                            </View>
                        ) : filteredDeliveries.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Truck size={32} color="#9CA3AF" />
                                <Text style={styles.emptyTitle}>No Trips in this View</Text>
                                <Text style={styles.emptySubtitle}>Dispatch orders from the Warehouse Queue to create driver drop-off routes.</Text>
                            </View>
                        ) : (
                            <StaggerContainer stagger={25} delay={80}>
                                <View style={styles.cardsList}>
                                    {filteredDeliveries.map(del => {
                                        const isAssigned = del.status === 'ASSIGNED';
                                        const isTransit = del.status === 'OUT_FOR_DELIVERY';
                                        const isDelivered = del.status === 'DELIVERED';
                                        const isActing = actionLoadingId === del.id;

                                        const totalBags = (del.items || []).reduce((s: number, it: any) => s + (it.deliveringQuantity || it.orderedQuantity || 0), 0);
                                        const dateStr = del.dispatchDate ? new Date(del.dispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today';

                                        return (
                                            <AnimatedPressable
                                                key={del.id}
                                                style={styles.itemCard}
                                                onPress={() => {
                                                    setSelectedDeliveryForDetail(del);
                                                    setDetailModalVisible(true);
                                                }}
                                            >
                                                {/* Header Row */}
                                                <View style={styles.cardHeaderRow}>
                                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                                        <View style={styles.orderIdLine}>
                                                            <Text style={styles.orderNumberText}>{del.deliveryNumber}</Text>
                                                            <Text style={styles.dateDotText}>• {dateStr}</Text>
                                                        </View>
                                                        <Text style={styles.customerNameText} numberOfLines={1}>
                                                            {del.customer?.customerName || 'Store Customer'}
                                                        </Text>
                                                    </View>

                                                    <View style={[
                                                        styles.statusBadge,
                                                        {
                                                            backgroundColor: isDelivered ? '#ECFDF5' : isTransit ? '#F0F9FF' : '#FFFBEB',
                                                            borderColor: isDelivered ? '#A7F3D0' : isTransit ? '#BAE6FD' : '#FDE68A'
                                                        }
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusBadgeText,
                                                            { color: isDelivered ? '#059669' : isTransit ? '#0284C7' : '#D97706' }
                                                        ]}>
                                                            {isDelivered ? 'Delivered' : isTransit ? 'In Transit' : 'Assigned'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Clean Inline Metadata with 1-Tap Phone Call */}
                                                <View style={styles.cleanInfoRow}>
                                                    <View style={styles.infoTag}>
                                                        <Package size={12} color="#4B5563" />
                                                        <Text style={styles.infoTagText}>{totalBags} Bags</Text>
                                                    </View>
                                                    <View style={styles.infoDot} />
                                                    <View style={styles.infoTag}>
                                                        <Truck size={12} color="#4B5563" />
                                                        <Text style={styles.infoTagText}>{del.vehicleNumber || 'Van 01'}</Text>
                                                    </View>
                                                    {del.deliveryPerson?.name ? (
                                                        <>
                                                            <View style={styles.infoDot} />
                                                            <View style={styles.infoTag}>
                                                                <User size={12} color="#4B5563" />
                                                                <Text style={styles.infoTagText}>{del.deliveryPerson.name}</Text>
                                                            </View>
                                                        </>
                                                    ) : null}
                                                </View>

                                                {/* Line Items Preview */}
                                                <View style={styles.cleanItemsList}>
                                                    {(del.items || []).map((it: any, idx: number) => (
                                                        <View key={it.id || idx} style={styles.cleanItemRow}>
                                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                                <Text style={styles.itemNameText} numberOfLines={1}>
                                                                    {it.product?.productName || 'Rice Product'}
                                                                </Text>
                                                                <Text style={styles.itemQtySubtext}>
                                                                    {it.deliveringQuantity || it.orderedQuantity} Bags loaded
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.itemPriceText}>
                                                                ₹{((it.deliveringQuantity || it.orderedQuantity) * (it.unitPrice || 0)).toLocaleString('en-IN')}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>

                                                {/* Customer Address & Call Line */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAF8', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 10 }}>
                                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingRight: 6 }}>
                                                        <MapPin size={12} color="#6B7280" style={{ marginTop: 2 }} />
                                                        <Text style={{ fontSize: 11.5, color: '#4B5563' }} numberOfLines={1}>
                                                            {del.customer?.address || 'Store Location'}
                                                        </Text>
                                                    </View>

                                                    {del.customer?.phoneNumber ? (
                                                        <TouchableOpacity
                                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#A7F3D0' }}
                                                            onPress={() => handleCallPhone(del.customer.phoneNumber)}
                                                            activeOpacity={0.75}
                                                        >
                                                            <Phone size={11} color="#059669" />
                                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Call</Text>
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>

                                                {/* Card Footer with Direct Actions */}
                                                <View style={styles.cardFooterRow}>
                                                    <TouchableOpacity
                                                        style={[styles.readyStatusPill, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}
                                                        onPress={() => {
                                                            setSelectedDeliveryForDetail(del);
                                                            setDetailModalVisible(true);
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <FileText size={12} color="#1A1A1A" />
                                                        <Text style={[styles.readyStatusPillText, { color: '#1A1A1A' }]}>Details</Text>
                                                    </TouchableOpacity>

                                                    {isAssigned && (
                                                        <TouchableOpacity
                                                            style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
                                                            onPress={() => handleStartTrip(del.id)}
                                                            disabled={isActing}
                                                            activeOpacity={0.85}
                                                        >
                                                            {isActing ? (
                                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                                            ) : (
                                                                <>
                                                                    <Navigation size={13} color="#FFFFFF" />
                                                                    <Text style={styles.primaryActionBtnText}>Start Trip</Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    )}

                                                    {isTransit && (
                                                        <TouchableOpacity
                                                            style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
                                                            onPress={() => openVerifyModal(del)}
                                                            activeOpacity={0.85}
                                                        >
                                                            <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.2} />
                                                            <Text style={styles.primaryActionBtnText}>Verify & Drop-off</Text>
                                                        </TouchableOpacity>
                                                    )}

                                                    {isDelivered && (
                                                        <TouchableOpacity
                                                            style={[styles.readyStatusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                                                            onPress={() => router.push('/sales' as any)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Check size={12} color="#059669" />
                                                            <Text style={styles.readyStatusPillText}>Delivered</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </AnimatedPressable>
                                        );
                                    })}
                                </View>
                            </StaggerContainer>
                        )}
                    </FadeInDown>
                )}
            </ScrollView>

            {/* ───────────────────────────────────────────── */}
            {/* DRAWER MODAL 1: DISPATCH & ASSIGN VAN */}
            {/* ───────────────────────────────────────────── */}
            <Modal visible={assignModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Dispatch Van</Text>
                                <Text style={styles.modalSub}>{selectedOrderForAssign?.orderNumber} • {selectedOrderForAssign?.customer?.customerName}</Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAssignModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>ASSIGN DELIVERY DRIVER</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {staffList.map((member: any) => {
                                    const isSel = selectedDeliveryPersonId === member.userId;
                                    return (
                                        <TouchableOpacity
                                            key={member.userId}
                                            style={[styles.driverChip, isSel && styles.driverChipActive]}
                                            onPress={() => setSelectedDeliveryPersonId(member.userId)}
                                            activeOpacity={0.8}
                                        >
                                            <User size={13} color={isSel ? '#FFF' : '#4B5563'} />
                                            <Text style={[styles.driverChipText, isSel && styles.driverChipTextActive]}>
                                                {member.fullName || member.username}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
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

                        <Text style={styles.inputLabel}>DELIVERY INSTRUCTIONS (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.cleanInput, { height: 60 }]}
                            placeholder="Notes for driver..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            value={deliveryNotes}
                            onChangeText={setDeliveryNotes}
                        />

                        <TouchableOpacity
                            style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                            onPress={handleCreateDeliveryNoteSubmit}
                            disabled={submittingAssign}
                            activeOpacity={0.85}
                        >
                            {submittingAssign ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Truck size={16} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={styles.modalSubmitBtnText}>Create Delivery Note & Dispatch</Text>
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
                                <Text style={styles.modalSub}>{selectedDeliveryForVerify?.deliveryNumber} • {selectedDeliveryForVerify?.customer?.customerName}</Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setVerifyModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Physical Bag Confirmation Steppers */}
                            <Text style={styles.inputLabel}>VERIFY PHYSICAL BAGS DELIVERED</Text>
                            <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                {(selectedDeliveryForVerify?.items || []).map((it: any) => {
                                    const pId = it.product.id;
                                    const maxQty = it.deliveringQuantity || it.orderedQuantity || 0;
                                    const currQty = deliveredQtys[pId] ?? maxQty;

                                    return (
                                        <View key={pId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                                                    {it.product.productName}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#6B7280' }}>Dispatched: {maxQty} Bags</Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}
                                                    onPress={() => setDeliveredQtys(p => ({ ...p, [pId]: Math.max(0, currQty - 1) }))}
                                                >
                                                    <Minus size={13} color="#1A1A1A" />
                                                </TouchableOpacity>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A', minWidth: 20, textAlign: 'center' }}>
                                                    {currQty}
                                                </Text>
                                                <TouchableOpacity
                                                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}
                                                    onPress={() => setDeliveredQtys(p => ({ ...p, [pId]: Math.min(maxQty, currQty + 1) }))}
                                                >
                                                    <Plus size={13} color="#FFFFFF" />
                                                </TouchableOpacity>
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
            {/* DRAWER MODAL 3: FULL DELIVERY DETAILS MODAL   */}
            {/* ───────────────────────────────────────────── */}
            <Modal visible={detailModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalGrabHandle} />

                        {/* Modal Header */}
                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>{selectedDeliveryForDetail?.deliveryNumber || 'Delivery Note'}</Text>
                                <Text style={styles.modalSub}>
                                    Order: {selectedDeliveryForDetail?.salesOrder?.orderNumber || 'SO-000'} • Dispatched on {selectedDeliveryForDetail?.dispatchDate ? new Date(selectedDeliveryForDetail.dispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailModalVisible(false)}>
                                <X size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        {selectedDeliveryForDetail && (
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                                {/* Status & Logistics Banner */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAF8', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Trip Status</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginTop: 2 }}>{selectedDeliveryForDetail.status?.replace(/_/g, ' ')}</Text>
                                    </View>
                                    <View style={{ backgroundColor: selectedDeliveryForDetail.status === 'DELIVERED' ? '#ECFDF5' : selectedDeliveryForDetail.status === 'OUT_FOR_DELIVERY' ? '#F0F9FF' : '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: selectedDeliveryForDetail.status === 'DELIVERED' ? '#A7F3D0' : selectedDeliveryForDetail.status === 'OUT_FOR_DELIVERY' ? '#BAE6FD' : '#FDE68A' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: selectedDeliveryForDetail.status === 'DELIVERED' ? '#059669' : selectedDeliveryForDetail.status === 'OUT_FOR_DELIVERY' ? '#0284C7' : '#D97706' }}>
                                            {selectedDeliveryForDetail.status?.replace(/_/g, ' ')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Customer Card */}
                                <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Store size={15} color="#1A1A1A" />
                                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1A1A1A' }}>{selectedDeliveryForDetail.customer?.customerName || 'Store Customer'}</Text>
                                        </View>
                                        {selectedDeliveryForDetail.customer?.phoneNumber ? (
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#A7F3D0' }}
                                                onPress={() => handleCallPhone(selectedDeliveryForDetail.customer.phoneNumber)}
                                            >
                                                <Phone size={11} color="#059669" />
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Call</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                    {selectedDeliveryForDetail.customer?.address ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                                            <MapPin size={12} color="#6B7280" style={{ marginTop: 2 }} />
                                            <Text style={{ fontSize: 11.5, color: '#6B7280', flex: 1 }}>{selectedDeliveryForDetail.customer.address}</Text>
                                        </View>
                                    ) : null}

                                    {/* Van & Driver details */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Truck size={12} color="#4B5563" />
                                            <Text style={{ fontSize: 11.5, color: '#4B5563', fontWeight: '600' }}>{selectedDeliveryForDetail.vehicleNumber || 'Van 01'}</Text>
                                        </View>
                                        {selectedDeliveryForDetail.deliveryPerson?.name ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <User size={12} color="#4B5563" />
                                                <Text style={{ fontSize: 11.5, color: '#4B5563', fontWeight: '600' }}>Driver: {selectedDeliveryForDetail.deliveryPerson.name}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>

                                {/* Line Items Table */}
                                <Text style={styles.inputLabel}>VERIFIED DISPATCH ITEMS</Text>
                                <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 12 }}>
                                    {(selectedDeliveryForDetail.items || []).map((it: any, idx: number) => {
                                        const qty = it.deliveringQuantity || it.orderedQuantity || 0;
                                        const delivered = it.deliveredQuantity ?? qty;
                                        return (
                                            <View key={it.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: idx < (selectedDeliveryForDetail.items?.length || 0) - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{it.product?.productName || 'Rice Product'}</Text>
                                                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                                                        {selectedDeliveryForDetail.status === 'DELIVERED' ? `Delivered: ${delivered} Bags` : `Dispatched: ${qty} Bags`}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A' }}>
                                                    ₹{((delivered || qty) * (it.unitPrice || 0)).toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                {selectedDeliveryForDetail.receiverName ? (
                                    <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#059669' }}>
                                            ✓ Received by: {selectedDeliveryForDetail.receiverName} {selectedDeliveryForDetail.receiverPhone ? `(${selectedDeliveryForDetail.receiverPhone})` : ''}
                                        </Text>
                                        {selectedDeliveryForDetail.paymentMode ? (
                                            <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                                                Payment Settlement: {selectedDeliveryForDetail.paymentMode}
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : null}

                                {/* Action button in modal */}
                                <View style={{ gap: 8, marginTop: 4 }}>
                                    {selectedDeliveryForDetail.status === 'ASSIGNED' && (
                                        <TouchableOpacity
                                            style={[styles.modalSubmitBtn, { backgroundColor: '#2563EB' }]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleStartTrip(selectedDeliveryForDetail.id);
                                            }}
                                        >
                                            <Navigation size={15} color="#FFFFFF" />
                                            <Text style={styles.modalSubmitBtnText}>Start Trip (Depart Warehouse)</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedDeliveryForDetail.status === 'OUT_FOR_DELIVERY' && (
                                        <TouchableOpacity
                                            style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                openVerifyModal(selectedDeliveryForDetail);
                                            }}
                                        >
                                            <CheckCircle2 size={15} color="#FFFFFF" />
                                            <Text style={styles.modalSubmitBtnText}>Verify & Complete Drop-off</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedDeliveryForDetail.status === 'DELIVERED' && (
                                        <TouchableOpacity
                                            style={[styles.modalSubmitBtn, { backgroundColor: '#1A1A1A' }]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                router.push('/sales' as any);
                                            }}
                                        >
                                            <FileText size={15} color="#FFFFFF" />
                                            <Text style={styles.modalSubmitBtnText}>View Invoice in Sales</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={{ height: 42, borderRadius: 999, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
                                        onPress={() => setDetailModalVisible(false)}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 26 : 12,
        paddingBottom: 8,
        backgroundColor: 'transparent',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
    },
    headerTitles: {
        flex: 1,
        marginLeft: 10,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: 1,
    },
    refreshBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
    },

    // ─────────────────────────────────────────────
    // SEGMENT SWITCHER
    // ─────────────────────────────────────────────
    segmentWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#ECEAE2',
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
    },
    segmentBtnActive: {
        backgroundColor: '#1A1A1A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    segmentBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#6B7280',
    },
    segmentBtnTextActive: {
        color: '#FFFFFF',
    },
    segmentBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 999,
    },
    segmentBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    segmentBadgeInactive: {
        backgroundColor: '#DCD9CF',
    },
    segmentBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    segmentBadgeTextActive: {
        color: '#FFFFFF',
    },
    segmentBadgeTextInactive: {
        color: '#4B5563',
    },

    // ─────────────────────────────────────────────
    // SCROLL CONTENT & KPI RIBBON
    // ─────────────────────────────────────────────
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 40,
    },
    kpiRibbon: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEBE4',
    },
    kpiCardActive: {
        borderColor: '#1A1A1A',
        backgroundColor: '#F9FAFB',
    },
    kpiIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
    },
    kpiCount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    kpiLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 1,
    },

    // Search Bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        paddingHorizontal: 12,
        height: 40,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 12.5,
        color: '#1A1A1A',
    },

    // ─────────────────────────────────────────────
    // CARDS LIST & ITEM CARDS
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
    cardsList: {
        gap: 10,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    orderIdLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    orderNumberText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    dateDotText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    customerNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2B2B2B',
    },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // Clean inline info row
    cleanInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: '#FAFAF8',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EFEFEA',
    },
    infoTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    infoDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#D1D5DB',
    },

    // Clean Items List
    cleanItemsList: {
        backgroundColor: '#FAFAF8',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EFEFEA',
    },
    cleanItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemNameText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    itemQtySubtext: {
        fontSize: 10.5,
        color: '#6B7280',
        marginTop: 1,
    },
    itemPriceText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    stockPill: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    stockPillText: {
        fontSize: 9.5,
        fontWeight: '700',
    },

    // Card Footer
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    orderValueLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#8A8A8A',
    },
    orderValueText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A1A',
        marginTop: 1,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
    },
    primaryActionBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    readyStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    readyStatusPillText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#059669',
    },

    // ─────────────────────────────────────────────
    // MODALS / DRAWERS
    // ─────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        padding: 18,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '90%',
    },
    modalGrabHandle: {
        width: 32,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 10,
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
        width: 28,
        height: 28,
        borderRadius: 14,
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
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    driverChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    driverChipText: {
        fontSize: 11,
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
        marginTop: 6,
    },
    modalSubmitBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

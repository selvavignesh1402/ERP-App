import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal, Linking, Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    ArrowLeft, Truck, Package, CheckCircle2, Clock,
    AlertCircle, Phone, MapPin, Check, X, ShieldCheck,
    Store, IndianRupee, FileText, User, Navigation,
    Plus, Minus, AlertTriangle, ArrowRight
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import api from '../../src/services/api';

interface DeliveryItem {
    id: number;
    product: {
        id: number;
        productName: string;
        brand?: string;
        unit?: string;
    };
    orderedQuantity: number;
    deliveringQuantity: number;
    deliveredQuantity: number;
    unitPrice: number;
}

export default function DeliveryDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [delivery, setDelivery] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Delivery confirmation inputs
    const [deliveredQtys, setDeliveredQtys] = useState<Record<number, number>>({});
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'CASH' | 'UPI'>('CREDIT');
    const [submittingConfirm, setSubmittingConfirm] = useState(false);
    const [startingTrip, setStartingTrip] = useState(false);

    // Failed Delivery Modal
    const [failModalVisible, setFailModalVisible] = useState(false);
    const [selectedFailReason, setSelectedFailReason] = useState<string>('SHOP_CLOSED');
    const [failNotes, setFailNotes] = useState('');
    const [submittingFail, setSubmittingFail] = useState(false);

    const fetchDelivery = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/deliveries/${id}`);
            const data = res.data;
            setDelivery(data);

            // Initialize delivered quantities to match delivering quantities
            const initialQtys: Record<number, number> = {};
            (data.items || []).forEach((it: any) => {
                initialQtys[it.product.id] = it.deliveringQuantity;
            });
            setDeliveredQtys(initialQtys);
        } catch (error) {
            console.error('Failed to load delivery details:', error);
            Alert.alert('Error', 'Failed to load delivery details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => {
        fetchDelivery();
    }, [fetchDelivery]));

    const handleStartTrip = async () => {
        setStartingTrip(true);
        try {
            await api.put(`/api/deliveries/${id}/start`);
            Alert.alert('Trip Started', 'Delivery is now in transit (OUT FOR DELIVERY).');
            fetchDelivery();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Could not start trip');
        } finally {
            setStartingTrip(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!receiverName.trim()) {
            Alert.alert('Receiver Name Required', 'Please enter the name of the person receiving the goods.');
            return;
        }

        setSubmittingConfirm(true);
        try {
            const payload = {
                receiverName: receiverName.trim(),
                receiverPhone: receiverPhone.trim(),
                deliveryNotes: deliveryNotes.trim(),
                paymentMode: paymentMode,
                items: (delivery.items || []).map((it: any) => ({
                    productId: it.product.id,
                    deliveredQuantity: deliveredQtys[it.product.id] ?? it.deliveringQuantity,
                }))
            };

            await api.post(`/api/deliveries/${id}/confirm`, payload);
            Alert.alert(
                'Delivery Confirmed!',
                `Goods verified and delivered to ${receiverName}.\nAn actual sales invoice has been automatically generated and billed to customer ledger.`,
                [{ text: 'View Invoices', onPress: () => router.push('/sales') }, { text: 'OK', onPress: () => fetchDelivery() }]
            );
        } catch (error: any) {
            Alert.alert('Confirmation Error', error.response?.data?.message || 'Could not confirm delivery');
        } finally {
            setSubmittingConfirm(false);
        }
    };

    const handleFailDelivery = async () => {
        setSubmittingFail(true);
        try {
            await api.put(`/api/deliveries/${id}/fail`, {
                failureReason: selectedFailReason,
                deliveryNotes: failNotes.trim(),
            });
            Alert.alert('Delivery Logged as Failed', 'Status recorded. The order has returned to warehouse queue.');
            setFailModalVisible(false);
            fetchDelivery();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to record failure');
        } finally {
            setSubmittingFail(false);
        }
    };

    const adjustQty = (productId: number, delta: number, maxQty: number) => {
        setDeliveredQtys(prev => {
            const current = prev[productId] ?? maxQty;
            const updated = Math.max(0, Math.min(maxQty, current + delta));
            return { ...prev, [productId]: updated };
        });
    };

    if (loading || !delivery) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1A1A1A" />
                <Text style={styles.loadingText}>Loading delivery details...</Text>
            </SafeAreaView>
        );
    }

    const isAssigned = delivery.status === 'ASSIGNED';
    const isInTransit = delivery.status === 'OUT_FOR_DELIVERY';
    const isCompleted = delivery.status === 'DELIVERED' || delivery.status === 'PARTIALLY_DELIVERED';
    const isFailed = delivery.status === 'FAILED';

    const totalBags = (delivery.items || []).reduce((sum: number, it: any) => sum + it.deliveringQuantity, 0);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Background */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    <Path d="M150 -40 C250 -60, 420 -20, 430 110 C440 230, 340 280, 220 250 C120 220, 50 150, 150 -40 Z" fill="#E8F4F8" opacity={0.5} />
                </Svg>
            </View>

            {/* Clean Header Bar */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
                    <ArrowLeft size={18} color="#1A1A1A" />
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>{delivery.deliveryNumber}</Text>
                    <Text style={styles.headerSubtitle}>Order {delivery.salesOrder?.orderNumber}</Text>
                </View>

                <View style={[styles.statusPill, {
                    backgroundColor: isCompleted ? '#ECFDF5' : isInTransit ? '#F0F9FF' : isFailed ? '#FEF2F2' : '#FFFBEB',
                    borderColor: isCompleted ? '#A7F3D0' : isInTransit ? '#BAE6FD' : isFailed ? '#FECACA' : '#FDE68A',
                }]}>
                    <Text style={[styles.statusPillText, {
                        color: isCompleted ? '#059669' : isInTransit ? '#0284C7' : isFailed ? '#DC2626' : '#D97706',
                    }]}>
                        {delivery.status.replace(/_/g, ' ')}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 1. Clean Store & Route Profile Card */}
                <FadeInDown delay={40}>
                    <View style={styles.card}>
                        <View style={styles.storeHeaderRow}>
                            <View style={styles.storeAvatarBox}>
                                <Store size={18} color="#1A1A1A" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.storeName}>{delivery.salesOrder?.customer?.customerName}</Text>
                                <View style={styles.addressRow}>
                                    <MapPin size={11} color="#6B7280" style={{ marginTop: 1 }} />
                                    <Text style={styles.addressText} numberOfLines={2}>
                                        {delivery.salesOrder?.customer?.address || 'Store location on file'}
                                    </Text>
                                </View>
                            </View>
                            {delivery.salesOrder?.customer?.phoneNumber ? (
                                <TouchableOpacity
                                    style={styles.phoneBtn}
                                    onPress={() => Linking.openURL(`tel:${delivery.salesOrder?.customer?.phoneNumber}`)}
                                    activeOpacity={0.75}
                                >
                                    <Phone size={13} color="#059669" />
                                    <Text style={styles.phoneBtnText}>Call</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={styles.divider} />

                        {/* Snapshot Chips */}
                        <View style={styles.metaChipsRow}>
                            <View style={styles.metaChip}>
                                <Text style={styles.metaChipText}>📦 {totalBags} Total Bags</Text>
                            </View>
                            <View style={styles.metaChip}>
                                <Text style={styles.metaChipText}>🚐 {delivery.vehicleNumber || 'Van 01'}</Text>
                            </View>
                            <View style={styles.metaChip}>
                                <Text style={styles.metaChipText}>💰 ₹{delivery.salesOrder?.grandTotal?.toLocaleString('en-IN') || 0}</Text>
                            </View>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. TRIP CONTROLLER BANNER */}
                {isAssigned && (
                    <FadeInDown delay={70}>
                        <View style={styles.card}>
                            <View style={styles.bannerRow}>
                                <Clock size={18} color="#D97706" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bannerTitle}>Assigned for Dispatch</Text>
                                    <Text style={styles.bannerSub}>Start your trip when departing from warehouse.</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryActionBtn}
                                onPress={handleStartTrip}
                                disabled={startingTrip}
                                activeOpacity={0.85}
                            >
                                {startingTrip ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Truck size={16} color="#FFF" strokeWidth={2.2} />
                                        <Text style={styles.primaryActionBtnText}>Start Delivery (Out for Delivery)</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </FadeInDown>
                )}

                {/* 3. ITEMS CHECKLIST & CONFIRMATION (When Out for Delivery) */}
                {isInTransit && (
                    <FadeInDown delay={70}>
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Delivery Verification Checklist</Text>
                            <Text style={styles.sectionSubtitle}>Verify bags delivered. Adjust quantities if partial drop-off.</Text>

                            <View style={styles.checklistWrapper}>
                                {delivery.items.map((item: any) => {
                                    const deliveredCount = deliveredQtys[item.product.id] ?? item.deliveringQuantity;
                                    return (
                                        <View key={item.id} style={styles.checkItemRow}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={styles.itemNameText} numberOfLines={1}>{item.product.productName}</Text>
                                                <Text style={styles.itemRateSub}>₹{item.unitPrice?.toLocaleString('en-IN')} / Bag • Max: {item.deliveringQuantity} Bags</Text>
                                            </View>

                                            <View style={styles.stepperContainer}>
                                                <TouchableOpacity
                                                    style={styles.stepBtn}
                                                    onPress={() => adjustQty(item.product.id, -1, item.deliveringQuantity)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Minus size={12} color="#1A1A1A" />
                                                </TouchableOpacity>
                                                <Text style={styles.stepCountText}>{deliveredCount}</Text>
                                                <TouchableOpacity
                                                    style={styles.stepBtn}
                                                    onPress={() => adjustQty(item.product.id, 1, item.deliveringQuantity)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Plus size={12} color="#1A1A1A" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.divider} />

                            {/* Receiver Info */}
                            <Text style={styles.inputLabel}>RECEIVER NAME *</Text>
                            <TextInput
                                style={styles.cleanInput}
                                placeholder="e.g. Karthik (Store Owner)"
                                placeholderTextColor="#9CA3AF"
                                value={receiverName}
                                onChangeText={setReceiverName}
                            />

                            <Text style={styles.inputLabel}>RECEIVER PHONE (OPTIONAL)</Text>
                            <TextInput
                                style={styles.cleanInput}
                                placeholder="e.g. 9876543210"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                                value={receiverPhone}
                                onChangeText={setReceiverPhone}
                            />

                            {/* Payment Mode Selector */}
                            <Text style={styles.inputLabel}>PAYMENT SETTLEMENT</Text>
                            <View style={styles.payModeRow}>
                                {[
                                    { key: 'CREDIT', label: '📒 Store Credit' },
                                    { key: 'CASH', label: '💵 Cash' },
                                    { key: 'UPI', label: '📱 UPI' },
                                ].map(m => {
                                    const isSel = paymentMode === m.key;
                                    return (
                                        <TouchableOpacity
                                            key={m.key}
                                            style={[styles.payModeChip, isSel && styles.payModeChipActive]}
                                            onPress={() => setPaymentMode(m.key as any)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.payModeChipText, isSel && styles.payModeChipTextActive]}>
                                                {m.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryActionBtn, { backgroundColor: '#059669', marginTop: 14 }]}
                                onPress={handleConfirmDelivery}
                                disabled={submittingConfirm}
                                activeOpacity={0.85}
                            >
                                {submittingConfirm ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Check size={16} color="#FFF" strokeWidth={2.4} />
                                        <Text style={styles.primaryActionBtnText}>Confirm Delivery & Generate Invoice</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.failLinkBtn}
                                onPress={() => setFailModalVisible(true)}
                                activeOpacity={0.8}
                            >
                                <AlertTriangle size={12} color="#DC2626" />
                                <Text style={styles.failLinkBtnText}>Report Delivery Issue / Shop Closed</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInDown>
                )}

                {/* 4. COMPLETED DELIVERY SUMMARY */}
                {isCompleted && (
                    <FadeInDown delay={70}>
                        <View style={[styles.card, { borderColor: '#A7F3D0' }]}>
                            <View style={styles.completedHeaderRow}>
                                <CheckCircle2 size={20} color="#059669" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.completedTitle}>Delivery Successfully Finalized</Text>
                                    <Text style={styles.completedSub}>
                                        Received by {delivery.receiverName || 'Store Staff'} on {new Date(delivery.deliveredAt || delivery.assignedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionTitle}>Delivered Items Summary</Text>
                            <View style={styles.checklistWrapper}>
                                {delivery.items.map((item: any) => (
                                    <View key={item.id} style={styles.completedItemRow}>
                                        <Text style={styles.itemNameText}>{item.product.productName}</Text>
                                        <Text style={styles.completedItemQty}>📦 {item.deliveredQuantity} / {item.deliveringQuantity} Bags</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryActionBtn, { backgroundColor: '#2563EB', marginTop: 14 }]}
                                onPress={() => router.push('/sales')}
                                activeOpacity={0.85}
                            >
                                <FileText size={16} color="#FFF" />
                                <Text style={styles.primaryActionBtnText}>View Generated Sales Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInDown>
                )}
            </ScrollView>

            {/* Delivery Failure Modal */}
            <Modal visible={failModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Report Delivery Issue</Text>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setFailModalVisible(false)}>
                                <X size={15} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>SELECT REASON</Text>
                        <View style={styles.failReasonsGrid}>
                            {[
                                { key: 'SHOP_CLOSED', label: '🏪 Shop Closed' },
                                { key: 'CUSTOMER_UNAVAILABLE', label: '👤 Customer Not Available' },
                                { key: 'GOODS_REJECTED', label: '❌ Goods Rejected' },
                                { key: 'ADDRESS_ISSUE', label: '📍 Address Issue' },
                                { key: 'OTHER', label: '⚠️ Other' },
                            ].map(r => {
                                const isSel = selectedFailReason === r.key;
                                return (
                                    <TouchableOpacity
                                        key={r.key}
                                        style={[styles.reasonChip, isSel && styles.reasonChipActive]}
                                        onPress={() => setSelectedFailReason(r.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.reasonChipText, isSel && styles.reasonChipTextActive]}>
                                            {r.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>EXPLANATION / NOTES</Text>
                        <TextInput
                            style={[styles.cleanInput, { height: 60 }]}
                            placeholder="Add any additional details..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            value={failNotes}
                            onChangeText={setFailNotes}
                        />

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: '#DC2626', marginTop: 4 }]}
                            onPress={handleFailDelivery}
                            disabled={submittingFail}
                            activeOpacity={0.85}
                        >
                            {submittingFail ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.primaryActionBtnText}>Submit Issue & Return to Queue</Text>
                            )}
                        </TouchableOpacity>
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FAF7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 12.5,
        fontWeight: '600',
        color: '#6B7280',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 26 : 12,
        paddingBottom: 10,
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
        fontSize: 18,
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
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: 10.5,
        fontWeight: '800',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Card Base
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: '#ECEBE4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
        marginBottom: 12,
    },
    storeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    storeAvatarBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 3,
        marginTop: 2,
    },
    addressText: {
        fontSize: 11,
        color: '#6B7280',
        flex: 1,
    },
    phoneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    phoneBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#059669',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 10,
    },
    metaChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    metaChip: {
        backgroundColor: '#F7F7F5',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ECEBE4',
    },
    metaChipText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#4B5563',
    },

    // Banner
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFBEB',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 10,
    },
    bannerTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#B45309',
    },
    bannerSub: {
        fontSize: 11,
        color: '#78350F',
        marginTop: 1,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 999,
        backgroundColor: '#0284C7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryActionBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Verification Checklist
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 10,
    },
    checklistWrapper: {
        backgroundColor: '#FAFAF8',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#EFEFEA',
    },
    checkItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemNameText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    itemRateSub: {
        fontSize: 10.5,
        color: '#6B7280',
        marginTop: 1,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    stepBtn: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepCountText: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#1A1A1A',
        minWidth: 18,
        textAlign: 'center',
    },

    // Inputs
    inputLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#4B5563',
        marginBottom: 5,
        letterSpacing: 0.3,
    },
    cleanInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#1A1A1A',
        marginBottom: 10,
    },
    payModeRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
    },
    payModeChip: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    payModeChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    payModeChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4B5563',
    },
    payModeChipTextActive: {
        color: '#FFFFFF',
    },
    failLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 10,
        paddingVertical: 6,
    },
    failLinkBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#DC2626',
    },

    // Completed View
    completedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    completedTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#059669',
    },
    completedSub: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },
    completedItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
    },
    completedItemQty: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#059669',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 18,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '80%',
    },
    modalHandle: {
        width: 32,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    modalCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    failReasonsGrid: {
        gap: 6,
        marginBottom: 12,
    },
    reasonChip: {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reasonChipActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    reasonChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    reasonChipTextActive: {
        color: '#DC2626',
        fontWeight: '700',
    },
});

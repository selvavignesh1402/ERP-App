import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { Plus, Search, Calendar, ShoppingBag, X, ArrowRight, CheckCircle2, Truck } from 'lucide-react-native';
import api from '../src/services/api';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: '#FFB74D',
    PENDING_APPROVAL: '#64B5F6',
    APPROVED: '#81C784',
    ORDERED: '#9575CD',
    PARTIALLY_RECEIVED: '#4FC3F7',
    RECEIVED: '#4CAF50',
    COMPLETED: '#2E7D32',
    CANCELLED: '#E57373',
};

const STATUS_ACTIONS: Record<string, { label: string; target: string } | null> = {
    DRAFT: { label: 'Submit', target: 'submit' },
    PENDING_APPROVAL: { label: 'Approve', target: 'approve' },
    APPROVED: { label: 'Mark Ordered', target: 'order' },
    ORDERED: { label: 'Receive Goods', target: 'receive' },
    PARTIALLY_RECEIVED: { label: 'Receive Goods', target: 'receive' },
    RECEIVED: { label: 'Complete', target: 'complete' },
    COMPLETED: null,
    CANCELLED: null,
};

export default function PurchasesScreen() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    // Form inputs state
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
    const [selectedSupplierName, setSelectedSupplierName] = useState('');
    const [cartItems, setCartItems] = useState<any[]>([]);

    // Cart row state
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductName, setSelectedProductName] = useState('');
    const [itemQty, setItemQty] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // Dropdowns visibility
    const [supplierDropdownVisible, setSupplierDropdownVisible] = useState(false);
    const [productDropdownVisible, setProductDropdownVisible] = useState(false);

    // Goods receiving modal state
    const [receivingVisible, setReceivingVisible] = useState(false);
    const [receivingPurchase, setReceivingPurchase] = useState<any>(null);
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptItems, setReceiptItems] = useState<any[]>([]);
    const [receiptLoading, setReceiptLoading] = useState(false);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const response = await api.get('/purchases');
            setPurchases(response.data || []);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            Alert.alert('Error', 'Failed to fetch purchases');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [suppliersRes, productsRes] = await Promise.all([
                api.get('/suppliers'),
                api.get('/products')
            ]);
            setSuppliers(suppliersRes.data || []);
            setProducts(productsRes.data || []);
        } catch (error) {
            console.error('Error loading form list data:', error);
        }
    };

    useEffect(() => {
        fetchPurchases();
        fetchDropdownData();
    }, []);

    const handleAddToCart = () => {
        if (!selectedProductId || !itemQty || !itemPrice) {
            Alert.alert('Details Missing', 'Please select a product and enter weight/quantity & cost rate.');
            return;
        }

        const qtyVal = parseFloat(itemQty);
        const priceVal = parseFloat(itemPrice);

        if (isNaN(qtyVal) || qtyVal <= 0 || isNaN(priceVal) || priceVal <= 0) {
            Alert.alert('Invalid Values', 'Quantity and price must be greater than zero.');
            return;
        }

        const existingItemIndex = cartItems.findIndex(i => i.productId === selectedProductId);
        if (existingItemIndex > -1) {
            const updated = [...cartItems];
            updated[existingItemIndex].quantity += qtyVal;
            updated[existingItemIndex].price = priceVal;
            setCartItems(updated);
        } else {
            setCartItems([
                ...cartItems,
                {
                    productId: selectedProductId,
                    productName: selectedProductName,
                    quantity: qtyVal,
                    price: priceVal
                }
            ]);
        }

        // Reset row
        setSelectedProductId(null);
        setSelectedProductName('');
        setItemQty('');
        setItemPrice('');
    };

    const handleRemoveFromCart = (index: number) => {
        const updated = [...cartItems];
        updated.splice(index, 1);
        setCartItems(updated);
    };

    const handleSavePurchase = async () => {
        if (!selectedSupplierId) {
            Alert.alert('Error', 'Please select a supplier');
            return;
        }
        if (!invoiceNumber) {
            Alert.alert('Error', 'Please enter Invoice Number');
            return;
        }
        if (cartItems.length === 0) {
            Alert.alert('Error', 'Please add at least one item to purchase list');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                supplierId: selectedSupplierId,
                invoiceNumber: invoiceNumber,
                status: 'DRAFT',
                items: cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }))
            };
            await api.post('/purchases', payload);
            Alert.alert('Success', 'Purchase logged successfully');
            setModalVisible(false);
            setInvoiceNumber('');
            setSelectedSupplierId(null);
            setSelectedSupplierName('');
            setCartItems([]);
            fetchPurchases();
        } catch (error: any) {
            console.error('Error logging purchase:', error);
            const msg = error.response?.data?.message || 'Failed to save purchase';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const getCartTotal = () => {
        return cartItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    };

    const getFilteredPurchases = () => {
        if (!searchQuery) return purchases;
        return purchases.filter((item: any) =>
            item.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.supplier?.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const handleStatusAction = async (item: any, target: string) => {
        if (target === 'receive') {
            openReceiveModal(item);
            return;
        }
        setLoading(true);
        try {
            if (target === 'complete') {
                await api.put(`/purchases/${item.id}/status`, { status: 'COMPLETED' });
            } else {
                await api.put(`/purchases/${item.id}/${target}`);
            }
            Alert.alert('Success', `Purchase marked as ${target.toUpperCase()}`);
            fetchPurchases();
        } catch (error: any) {
            console.error('Error updating purchase status:', error);
            const msg = error.response?.data?.message || 'Failed to update purchase status';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPurchase = async (item: any) => {
        setLoading(true);
        try {
            await api.put(`/purchases/${item.id}/cancel`);
            Alert.alert('Success', 'Purchase cancelled');
            fetchPurchases();
        } catch (error: any) {
            console.error('Error cancelling purchase:', error);
            const msg = error.response?.data?.message || 'Failed to cancel purchase';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const openReceiveModal = async (purchase: any) => {
        setReceivingPurchase(purchase);
        setReceiptNumber('');
        setReceiptItems([]);
        setReceivingVisible(true);
        try {
            const itemsRes = await api.get(`/purchases/${purchase.id}/items`);
            const ordered = itemsRes.data || [];
            const receivedRes = await api.get(`/purchases/${purchase.id}/receipts`);
            const receipts = receivedRes.data || [];
            let receivedMap: Record<number, number> = {};
            for (const receipt of receipts) {
                const itemsOfReceipt = await api.get(`/purchases/${purchase.id}/receipts/${receipt.id}/items`);
                for (const it of itemsOfReceipt.data || []) {
                    receivedMap[it.product.id] = (receivedMap[it.product.id] || 0) + it.receivedQty;
                }
            }
            setReceiptItems(ordered.map((pi: any) => {
                const remaining = Math.max(0, pi.quantity - (receivedMap[pi.product?.id] || 0));
                return {
                    productId: pi.product?.id,
                    productName: pi.product?.productName,
                    orderedQty: pi.quantity,
                    alreadyReceived: receivedMap[pi.product?.id] || 0,
                    remaining: remaining,
                    receivedQty: remaining > 0 ? String(remaining) : '0',
                    unitPrice: pi.price,
                };
            }));
        } catch (error) {
            console.error('Error loading purchase items:', error);
            Alert.alert('Error', 'Failed to load purchase items');
        }
    };

    const updateReceiptQty = (productId: number, value: string) => {
        setReceiptItems(prev => prev.map(i => {
            if (i.productId === productId) {
                let qty = parseFloat(value) || 0;
                if (qty > i.remaining) {
                    Alert.alert('Over-receiving', `Only ${i.remaining} remaining to receive.`);
                    qty = i.remaining;
                }
                return { ...i, receivedQty: qty > 0 ? String(qty) : '0' };
            }
            return i;
        }));
    };

    const handleSaveReceipt = async () => {
        const payloadItems = receiptItems
            .filter(i => parseFloat(i.receivedQty) > 0)
            .map(i => ({
                productId: i.productId,
                receivedQty: parseFloat(i.receivedQty),
                unitPrice: i.unitPrice,
            }));
        if (payloadItems.length === 0) {
            Alert.alert('Error', 'Enter a quantity for at least one item.');
            return;
        }
        setReceiptLoading(true);
        try {
            await api.post(`/purchases/${receivingPurchase.id}/receipts`, {
                receiptNumber: receiptNumber || undefined,
                items: payloadItems,
            });
            Alert.alert('Success', 'Goods received and stock updated');
            setReceivingVisible(false);
            fetchPurchases();
        } catch (error: any) {
            console.error('Error creating receipt:', error);
            const msg = error.response?.data?.message || 'Failed to save goods receipt';
            Alert.alert('Error', msg);
        } finally {
            setReceiptLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Purchases</Text>
                    <Text style={styles.subtitle}>Log stock intakes and view purchase invoices.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Add Purchase Button */}
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus size={20} color={Colors.card} />
                    <Text style={styles.addButtonText}>Add Purchase</Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search invoices or suppliers..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Purchases List */}
                {loading && purchases.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={getFilteredPurchases()}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <Card style={styles.purchaseCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.invNumber}>Inv: {item.invoiceNumber}</Text>
                                        <Text style={styles.supplierText}>{item.supplier?.supplierName}</Text>
                                    </View>
                                    <Text style={styles.totalAmt}>₹ {item.totalAmount}</Text>
                                </View>
                                <View style={styles.cardFooter}>
                                    <View style={styles.dateLabel}>
                                        <Calendar size={14} color={Colors.textSecondary} />
                                        <Text style={styles.dateText}>
                                            {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: (STATUS_COLORS[item.status] || '#E0E0E0') + '22' }]}>
                                        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || Colors.textSecondary }]}>
                                            {item.status?.replace(/_/g, ' ')}
                                        </Text>
                                    </View>
                                </View>
                                {STATUS_ACTIONS[item.status] && (
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => handleStatusAction(item, STATUS_ACTIONS[item.status]!.target)}
                                        >
                                            {STATUS_ACTIONS[item.status]!.target === 'receive' ? (
                                                <Truck size={14} color="#fff" />
                                            ) : (
                                                <ArrowRight size={14} color="#fff" />
                                            )}
                                            <Text style={styles.actionBtnText}>{STATUS_ACTIONS[item.status]!.label}</Text>
                                        </TouchableOpacity>
                                        {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                                            <TouchableOpacity
                                                style={styles.cancelActionBtn}
                                                onPress={() => handleCancelPurchase(item)}
                                            >
                                                <Text style={styles.cancelActionText}>Cancel</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </Card>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {modalVisible && (
                <Modal animationType="slide" transparent={true} visible={modalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Purchase Invoice</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>INVOICE NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. PUR-2026-001"
                                        style={styles.input}
                                        value={invoiceNumber}
                                        onChangeText={setInvoiceNumber}
                                    />
                                </View>

                                {/* Supplier Dropdown Selection */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>SUPPLIER</Text>
                                    <TouchableOpacity
                                        style={[styles.input, styles.dropdownTrigger]}
                                        onPress={() => setSupplierDropdownVisible(!supplierDropdownVisible)}
                                    >
                                        <Text style={{ color: selectedSupplierId ? Colors.text : Colors.textSecondary }}>
                                            {selectedSupplierName || 'Select a supplier'}
                                        </Text>
                                    </TouchableOpacity>
                                    {supplierDropdownVisible && (
                                        <View style={styles.dropdownMenu}>
                                            {suppliers.map(s => (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    style={styles.dropdownOption}
                                                    onPress={() => {
                                                        setSelectedSupplierId(s.id);
                                                        setSelectedSupplierName(s.supplierName);
                                                        setSupplierDropdownVisible(false);
                                                    }}
                                                >
                                                    <Text style={styles.optionText}>{s.supplierName}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {suppliers.length === 0 && (
                                                <Text style={styles.noOptionText}>No suppliers found. Please add suppliers first.</Text>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Cart builder title */}
                                <View style={styles.cartTitleRow}>
                                    <ShoppingBag size={18} color={Colors.primary} />
                                    <Text style={styles.cartTitle}>Purchase Items</Text>
                                </View>

                                {/* Add new item row */}
                                <View style={styles.cartBuilderBox}>
                                    {/* Product Select dropdown */}
                                    <TouchableOpacity
                                        style={[styles.input, styles.dropdownTrigger, { marginBottom: 8 }]}
                                        onPress={() => setProductDropdownVisible(!productDropdownVisible)}
                                    >
                                        <Text style={{ color: selectedProductId ? Colors.text : Colors.textSecondary }}>
                                            {selectedProductName || 'Select product'}
                                        </Text>
                                    </TouchableOpacity>

                                    {productDropdownVisible && (
                                        <View style={styles.dropdownMenu}>
                                            {products.map(p => (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={styles.dropdownOption}
                                                    onPress={() => {
                                                        setSelectedProductId(p.id);
                                                        setSelectedProductName(`${p.brand ? p.brand + ' ' : ''}${p.productName}`);
                                                        setProductDropdownVisible(false);
                                                    }}
                                                >
                                                    <Text style={styles.optionText}>{p.productName} ({p.brand})</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {products.length === 0 && (
                                                <Text style={styles.noOptionText}>No products found. Please add inventory/stock first.</Text>
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.qtyPriceRow}>
                                        <TextInput
                                            placeholder="Qty (Bags)"
                                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                                            keyboardType="numeric"
                                            value={itemQty}
                                            onChangeText={setItemQty}
                                        />
                                        <TextInput
                                            placeholder="Rate (₹/Bag)"
                                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                                            keyboardType="numeric"
                                            value={itemPrice}
                                            onChangeText={setItemPrice}
                                        />
                                        <TouchableOpacity style={styles.innerAddBtn} onPress={handleAddToCart}>
                                            <Text style={styles.innerAddBtnText}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Render Added Cart Items */}
                                {cartItems.map((item, idx) => (
                                    <View key={idx} style={styles.cartItemRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cartProdName}>{item.productName}</Text>
                                            <Text style={styles.cartProdMeta}>{item.quantity} bags • ₹{item.price}/bag</Text>
                                        </View>
                                        <Text style={styles.cartSubtotal}>₹{item.quantity * item.price}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveFromCart(idx)} style={styles.cartDelete}>
                                            <X size={16} color={Colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {cartItems.length > 0 && (
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Grand Total:</Text>
                                        <Text style={styles.grandAmt}>₹ {getCartTotal()}</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSavePurchase} style={styles.saveBtn}>
                                    <Text style={styles.saveText}>Save Invoice</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {receivingVisible && (
                <Modal animationType="slide" transparent={true} visible={receivingVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Receive Goods</Text>
                                <TouchableOpacity onPress={() => setReceivingVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.receiptMeta}>
                                {receivingPurchase?.invoiceNumber} • {receivingPurchase?.supplier?.supplierName}
                            </Text>

                            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>RECEIPT NUMBER (optional)</Text>
                                    <TextInput
                                        placeholder="e.g. GRN-2026-001"
                                        style={styles.input}
                                        value={receiptNumber}
                                        onChangeText={setReceiptNumber}
                                    />
                                </View>

                                {receiptItems.map((item, idx) => (
                                    <View key={item.productId ?? idx} style={styles.receiptRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cartProdName}>{item.productName}</Text>
                                            <Text style={styles.cartProdMeta}>
                                                Ordered {item.orderedQty} • Already received {item.alreadyReceived}
                                            </Text>
                                        </View>
                                        <TextInput
                                            placeholder="0"
                                            style={styles.receiptQtyInput}
                                            keyboardType="numeric"
                                            value={item.receivedQty}
                                            onChangeText={(v) => updateReceiptQty(item.productId, v)}
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setReceivingVisible(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveReceipt}
                                    style={styles.saveBtn}
                                    disabled={receiptLoading}
                                >
                                    {receiptLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveText}>Save Receipt</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginBottom: 20,
    },
    addButtonText: {
        color: Colors.card,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    listContent: {
        paddingBottom: 20,
    },
    purchaseCard: {
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    invNumber: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 16,
        color: Colors.text,
    },
    supplierText: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    totalAmt: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 16,
        color: Colors.primary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 8,
    },
    dateLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 12,
        color: Colors.textSecondary,
        marginLeft: 6,
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 10,
        color: Colors.primary,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    actionBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    actionBtnText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 12,
        marginLeft: 6,
    },
    cancelActionBtn: {
        marginLeft: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    cancelActionText: {
        color: Colors.error,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 12,
    },
    receiptMeta: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    receiptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    receiptQtyInput: {
        width: 70,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        textAlign: 'center',
        backgroundColor: '#FAFAFA',
        marginLeft: 10,
    },
    // Modal Overlay and form styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    closeText: {
        fontSize: 24,
        color: Colors.textSecondary,
    },
    formGroup: {
        marginBottom: 14,
        position: 'relative',
    },
    label: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 16,
        backgroundColor: '#FAFAFA',
    },
    dropdownTrigger: {
        justifyContent: 'center',
        minHeight: 48,
    },
    dropdownMenu: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 4,
        padding: 4,
        maxHeight: 155,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dropdownOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    optionText: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    noOptionText: {
        fontFamily: 'Urbanist_400Regular',
        fontSize: 12,
        color: Colors.error,
        padding: 10,
    },
    cartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 12,
    },
    cartTitle: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
        color: Colors.text,
        marginLeft: 8,
    },
    cartBuilderBox: {
        backgroundColor: '#F5F8F6',
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
    },
    qtyPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    innerAddBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerAddBtnText: {
        color: Colors.card,
        fontFamily: 'Urbanist_700Bold',
        fontSize: 14,
    },
    cartItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    cartProdName: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 14,
        color: Colors.text,
    },
    cartProdMeta: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    cartSubtotal: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 14,
        color: Colors.text,
        marginRight: 10,
    },
    cartDelete: {
        padding: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: Colors.border,
    },
    totalLabel: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 15,
        color: Colors.text,
    },
    grandAmt: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 18,
        color: Colors.primary,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    cancelBtn: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    cancelText: {
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
        fontSize: 16,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 30,
    },
    saveText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    },
});

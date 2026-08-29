import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Card } from '../src/components/Card';
import { Plus, Search, Calendar, ShoppingBag, X, Scale, RefreshCw } from 'lucide-react-native';
import api from '../src/services/api';

const INVOICE_STATUS_COLORS: Record<string, string> = {
    RECEIVED: '#64B5F6',
    MATCHED: '#4CAF50',
    MISMATCHED: '#E57373',
    PAID: '#2E7D32',
};

export default function InvoicesScreen() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [reconcileVisible, setReconcileVisible] = useState(false);
    const [reconcileInvoice, setReconcileInvoice] = useState<any>(null);
    const [reconcilePurchaseId, setReconcilePurchaseId] = useState<number | null>(null);
    const [reconciliation, setReconciliation] = useState<any>(null);
    const [reconcileLoading, setReconcileLoading] = useState(false);

    // Form inputs
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
    const [selectedSupplierName, setSelectedSupplierName] = useState('');
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [supplierDropdownVisible, setSupplierDropdownVisible] = useState(false);
    const [productDropdownVisible, setProductDropdownVisible] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductName, setSelectedProductName] = useState('');
    const [itemQty, setItemQty] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            Alert.alert('Error', 'Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [suppliersRes, productsRes, purchasesRes] = await Promise.all([
                api.get('/suppliers'),
                api.get('/products'),
                api.get('/purchases')
            ]);
            setSuppliers(suppliersRes.data || []);
            setProducts(productsRes.data || []);
            setPurchases((purchasesRes.data || []).filter((p: any) =>
                p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'RECEIVED' || p.status === 'COMPLETED'
            ));
        } catch (error) {
            console.error('Error loading form list data:', error);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchDropdownData();
    }, []);

    const handleAddToCart = () => {
        if (!selectedProductId || !itemQty || !itemPrice) {
            Alert.alert('Details Missing', 'Please select a product and enter quantity & rate.');
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
            setCartItems([...cartItems, {
                productId: selectedProductId,
                productName: selectedProductName,
                quantity: qtyVal,
                price: priceVal
            }]);
        }
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

    const handleSaveInvoice = async () => {
        if (!selectedSupplierId) {
            Alert.alert('Error', 'Please select a supplier');
            return;
        }
        if (!invoiceNumber) {
            Alert.alert('Error', 'Please enter Invoice Number');
            return;
        }
        if (cartItems.length === 0) {
            Alert.alert('Error', 'Please add at least one item');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                invoiceNumber,
                supplierId: selectedSupplierId,
                purchaseId: null,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.price
                }))
            };
            await api.post('/invoices', payload);
            Alert.alert('Success', 'Invoice recorded successfully');
            setModalVisible(false);
            setInvoiceNumber('');
            setSelectedSupplierId(null);
            setSelectedSupplierName('');
            setCartItems([]);
            fetchInvoices();
        } catch (error: any) {
            console.error('Error recording invoice:', error);
            const msg = error.response?.data?.message || 'Failed to save invoice';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const getCartTotal = () => {
        return cartItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    };

    const openReconcile = (invoice: any) => {
        setReconcileInvoice(invoice);
        setReconcilePurchaseId(null);
        setReconciliation(null);
        setReconcileVisible(true);
    };

    const handleReconcile = async () => {
        if (!reconcilePurchaseId) {
            Alert.alert('Error', 'Please select a purchase to reconcile against');
            return;
        }
        setReconcileLoading(true);
        setReconciliation(null);
        try {
            const response = await api.post('/reconciliations', null, {
                params: { purchaseId: reconcilePurchaseId, invoiceId: reconcileInvoice.id }
            });
            setReconciliation(response.data);
            fetchInvoices();
        } catch (error: any) {
            console.error('Error reconciling:', error);
            const msg = error.response?.data?.message || 'Reconciliation failed';
            Alert.alert('Error', msg);
        } finally {
            setReconcileLoading(false);
        }
    };

    const getFilteredInvoices = () => {
        if (!searchQuery) return invoices;
        return invoices.filter((item: any) =>
            item.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.supplier?.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Supplier Invoices</Text>
                    <Text style={styles.subtitle}>Record invoices and run 3-way reconciliation.</Text>
                </View>
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus size={20} color={Colors.card} />
                    <Text style={styles.addButtonText}>Add Invoice</Text>
                </TouchableOpacity>

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

                {loading && invoices.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={getFilteredInvoices()}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <Card style={styles.invoiceCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.invNumber}>{item.invoiceNumber}</Text>
                                        <Text style={styles.supplierText}>{item.supplier?.supplierName}</Text>
                                    </View>
                                    <Text style={styles.totalAmt}>₹ {item.totalAmount}</Text>
                                </View>
                                <View style={styles.cardFooter}>
                                    <View style={styles.dateLabel}>
                                        <Calendar size={14} color={Colors.textSecondary} />
                                        <Text style={styles.dateText}>
                                            {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: (INVOICE_STATUS_COLORS[item.status] || '#E0E0E0') + '22' }]}>
                                        <Text style={[styles.statusText, { color: INVOICE_STATUS_COLORS[item.status] || Colors.textSecondary }]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardActions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openReconcile(item)}>
                                        <Scale size={14} color="#fff" />
                                        <Text style={styles.actionBtnText}>Reconcile</Text>
                                    </TouchableOpacity>
                                </View>
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
                                <Text style={styles.modalTitle}>New Supplier Invoice</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>INVOICE NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. INV-2026-001"
                                        style={styles.input}
                                        value={invoiceNumber}
                                        onChangeText={setInvoiceNumber}
                                    />
                                </View>

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
                                        </View>
                                    )}
                                </View>

                                <View style={styles.cartTitleRow}>
                                    <ShoppingBag size={18} color={Colors.primary} />
                                    <Text style={styles.cartTitle}>Invoice Items</Text>
                                </View>

                                <View style={styles.cartBuilderBox}>
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
                                        </View>
                                    )}

                                    <View style={styles.qtyPriceRow}>
                                        <TextInput
                                            placeholder="Qty"
                                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                                            keyboardType="numeric"
                                            value={itemQty}
                                            onChangeText={setItemQty}
                                        />
                                        <TextInput
                                            placeholder="Rate (₹)"
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

                                {cartItems.map((item, idx) => (
                                    <View key={idx} style={styles.cartItemRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cartProdName}>{item.productName}</Text>
                                            <Text style={styles.cartProdMeta}>{item.quantity} × ₹{item.price}</Text>
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
                                <TouchableOpacity onPress={handleSaveInvoice} style={styles.saveBtn}>
                                    <Text style={styles.saveText}>Save Invoice</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {reconcileVisible && (
                <Modal animationType="slide" transparent={true} visible={reconcileVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reconcile Invoice</Text>
                                <TouchableOpacity onPress={() => setReconcileVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.receiptMeta}>
                                {reconcileInvoice?.invoiceNumber} • ₹{reconcileInvoice?.totalAmount}
                            </Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>PURCHASE ORDER</Text>
                                <ScrollView style={styles.purchaseList} nestedScrollEnabled>
                                    {purchases.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.purchaseOption, reconcilePurchaseId === p.id && styles.purchaseOptionSelected]}
                                            onPress={() => setReconcilePurchaseId(p.id)}
                                        >
                                            <Text style={styles.optionText}>
                                                {p.invoiceNumber} • ₹{p.totalAmount} • {p.supplier?.supplierName}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {purchases.length === 0 && (
                                        <Text style={styles.noOptionText}>No orderable purchases available.</Text>
                                    )}
                                </ScrollView>
                            </View>

                            {reconciliation && (
                                <View style={[styles.resultBox, { backgroundColor: reconciliation.status === 'MATCHED' ? '#E8F5E9' : '#FFEBEE' }]}>
                                    <Text style={styles.resultTitle}>
                                        {reconciliation.status === 'MATCHED' ? '✓ MATCHED' : '✕ MISMATCHED'}
                                    </Text>
                                    <Text style={styles.resultLine}>Purchase total: ₹{reconciliation.amountOnPurchase}</Text>
                                    <Text style={styles.resultLine}>Invoice total: ₹{reconciliation.amountOnInvoice}</Text>
                                    <Text style={styles.resultLine}>Matched: ₹{reconciliation.amountMatched}</Text>
                                </View>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setReconcileVisible(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleReconcile} style={styles.saveBtn} disabled={reconcileLoading}>
                                    {reconcileLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveText}>Run 3-Way Match</Text>
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
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
    title: { fontSize: 24, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    content: { flex: 1, paddingHorizontal: 20 },
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginBottom: 20,
    },
    addButtonText: { color: Colors.card, fontFamily: 'Urbanist_600SemiBold', fontSize: 14, marginLeft: 8 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24,
        borderWidth: 1, borderColor: Colors.border,
    },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, fontFamily: 'Urbanist_500Medium', fontSize: 14, color: Colors.text },
    listContent: { paddingBottom: 20 },
    invoiceCard: { padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    invNumber: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.text },
    supplierText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    totalAmt: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.primary },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8,
    },
    dateLabel: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.textSecondary, marginLeft: 6 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontFamily: Typography.fontFamily.bold, fontSize: 10 },
    cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 },
    actionBtn: {
        backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    },
    actionBtnText: { color: '#fff', fontFamily: 'Urbanist_700Bold', fontSize: 12, marginLeft: 6 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff', width: '100%', padding: 24, borderRadius: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25,
        shadowRadius: 10, elevation: 10,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 24, color: Colors.textSecondary },
    receiptMeta: { fontFamily: 'Urbanist_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
    formGroup: { marginBottom: 14, position: 'relative' },
    label: { fontSize: 12, fontFamily: 'Urbanist_700Bold', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    input: {
        borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 16, fontFamily: 'Urbanist_500Medium', fontSize: 16, backgroundColor: '#FAFAFA',
    },
    dropdownTrigger: { justifyContent: 'center', minHeight: 48 },
    dropdownMenu: {
        borderWidth: 1, borderColor: Colors.border, backgroundColor: '#FFFFFF', borderRadius: 12,
        marginTop: 4, padding: 4, maxHeight: 155,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    dropdownOption: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    optionText: { fontFamily: 'Urbanist_500Medium', fontSize: 14, color: Colors.text },
    noOptionText: { fontFamily: 'Urbanist_400Regular', fontSize: 12, color: Colors.error, padding: 10 },
    cartTitleRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
    cartTitle: { fontFamily: 'Urbanist_700Bold', fontSize: 16, color: Colors.text, marginLeft: 8 },
    cartBuilderBox: { backgroundColor: '#F5F8F6', borderRadius: 18, padding: 12, marginBottom: 12 },
    qtyPriceRow: { flexDirection: 'row', alignItems: 'center' },
    innerAddBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    innerAddBtnText: { color: Colors.card, fontFamily: 'Urbanist_700Bold', fontSize: 14 },
    cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    cartProdName: { fontFamily: 'Urbanist_700Bold', fontSize: 14, color: Colors.text },
    cartProdMeta: { fontFamily: 'Urbanist_500Medium', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    cartSubtotal: { fontFamily: 'Urbanist_700Bold', fontSize: 14, color: Colors.text, marginRight: 10 },
    cartDelete: { padding: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: Colors.border },
    totalLabel: { fontFamily: 'Urbanist_700Bold', fontSize: 15, color: Colors.text },
    grandAmt: { fontFamily: 'Urbanist_700Bold', fontSize: 18, color: Colors.primary },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    cancelBtn: { paddingVertical: 16, paddingHorizontal: 24 },
    cancelText: { fontFamily: 'Urbanist_600SemiBold', color: Colors.text, fontSize: 16 },
    saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 36, borderRadius: 30 },
    saveText: { color: '#fff', fontFamily: 'Urbanist_700Bold', fontSize: 16 },
    purchaseList: { maxHeight: 150, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 4 },
    purchaseOption: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    purchaseOptionSelected: { backgroundColor: '#E8F5E9' },
    resultBox: { borderRadius: 12, padding: 14, marginTop: 8 },
    resultTitle: { fontFamily: 'Urbanist_700Bold', fontSize: 15, color: Colors.text, marginBottom: 6 },
    resultLine: { fontFamily: 'Urbanist_500Medium', fontSize: 13, color: Colors.text, marginTop: 2 },
});
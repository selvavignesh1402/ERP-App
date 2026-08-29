import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Search, Filter, Plus, ShoppingCart, User, X } from 'lucide-react-native';
import api from '../../src/services/api';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CREDIT'] as const;
type PaymentMode = typeof PAYMENT_MODES[number];

export default function SalesScreen() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'date' | 'amountDesc' | 'status'>('date');

    // Create-Sale Modal State
    const [invoiceModal, setInvoiceModal] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [discount, setDiscount] = useState('');
    const [lineItems, setLineItems] = useState<any[]>([
        { productId: null as number | null, productName: '', quantity: '', price: '' }
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingModalData, setLoadingModalData] = useState(false);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/sales');
            const data = response.data || [];
            // Map backend data structure to view model
            const mapped = data.map((item: any) => ({
                id: item.billNumber || `BILL-${item.id}`,
                customer: item.customerName || 'Walk-in Guest',
                date: item.saleDate ? new Date(item.saleDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                }) : 'N/A',
                dateRaw: item.saleDate ? new Date(item.saleDate).getTime() : 0,
                summary: `${item.paymentMode} sale`,
                amount: `₹${parseFloat(item.grandTotal).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`,
                amountRaw: parseFloat(item.grandTotal),
                status: item.paymentMode === 'CREDIT' ? 'Pending' : 'Paid',
            }));
            setInvoices(mapped);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSales();
        }, [fetchSales])
    );

    const openInvoiceModal = useCallback(async () => {
        setInvoiceModal(true);
        setSelectedCustomer(null);
        setCustomerQuery('');
        setPaymentMode('CASH');
        setDiscount('');
        setLineItems([{ productId: null as number | null, productName: '', quantity: '', price: '' }]);
        setLoadingModalData(true);
        try {
            const [productsRes, customersRes] = await Promise.all([
                api.get('/products'),
                api.get('/customers')
            ]);
            setProducts((productsRes.data || []).filter((p: any) => p.status === 'ACTIVE'));
            setCustomers(customersRes.data || []);
        } catch (error) {
            console.error('Error loading modal data:', error);
            Alert.alert('Error', 'Failed to load products/customers');
        } finally {
            setLoadingModalData(false);
        }
    }, []);

    const getSortedInvoices = () => {
        let filtered = invoices;
        if (searchQuery) {
            filtered = invoices.filter((item: any) =>
                item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return [...filtered].sort((a, b) => {
            if (sortOption === 'amountDesc') return b.amountRaw - a.amountRaw;
            if (sortOption === 'status') return a.status.localeCompare(b.status);
            // date: newest first
            return (b.dateRaw || 0) - (a.dateRaw || 0);
        });
    };

    const filteredCustomers = selectedCustomer
        ? [selectedCustomer]
        : customers.filter((c: any) =>
            (c.customerName || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
            (c.phone || '').includes(customerQuery)
        ).slice(0, 5);

    const updateLineItem = (index: number, patch: any) => {
        setLineItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const addLineItem = () => {
        setLineItems(prev => [...prev, { productId: null as number | null, productName: '', quantity: '', price: '' }]);
    };

    const removeLineItem = (index: number) => {
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    const chooseProduct = (index: number, product: any) => {
        updateLineItem(index, {
            productId: product.id,
            productName: `${product.brand ? product.brand + ' ' : ''}${product.productName}`,
            price: String(product.sellingPrice ?? ''),
            quantity: '',
        });
    };

    const subtotal = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + qty * price;
    }, 0);
    const discountVal = parseFloat(discount) || 0;
    const netTotal = Math.max(0, subtotal - discountVal);
    const grandTotal = netTotal * 1.05; // CGST 2.5% + SGST 2.5%

    const handleCreateSale = async () => {
        const validItems = lineItems.filter(item => item.productId != null && (parseFloat(item.quantity) || 0) > 0);
        if (validItems.length === 0) {
            Alert.alert('Error', 'Add at least one product with a quantity');
            return;
        }
        if (paymentMode === 'CREDIT' && !selectedCustomer) {
            Alert.alert('Error', 'A customer must be selected for CREDIT sales');
            return;
        }
        if (paymentMode === 'CREDIT' && selectedCustomer && parseFloat(selectedCustomer.creditLimit) > 0
            && (parseFloat(selectedCustomer.creditBalance) + grandTotal) > parseFloat(selectedCustomer.creditLimit)) {
            Alert.alert('Credit Limit Exceeded',
                `Customer's remaining credit: ₹${(parseFloat(selectedCustomer.creditLimit) - parseFloat(selectedCustomer.creditBalance)).toFixed(2)}`);
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/sales', {
                customerId: selectedCustomer?.id ?? null,
                customerName: selectedCustomer?.customerName || customerQuery.trim() || 'Walk-in Customer',
                paymentMode,
                discount: discountVal,
                items: validItems.map(item => ({
                    productId: item.productId,
                    quantity: parseFloat(item.quantity),
                    price: parseFloat(item.price)
                }))
            });
            Alert.alert('Success', 'Sale created successfully');
            setInvoiceModal(false);
            fetchSales();
        } catch (error: any) {
            console.error('Error creating sale:', error);
            const msg = error.response?.data?.message || error.response?.data || 'Failed to create sale';
            Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to create sale');
        } finally {
            setSubmitting(false);
        }
    };

    const renderProductPicker = (index: number) => (
        <View style={styles.productPicker}>
            {products.map((p: any) => {
                const selected = lineItems[index]?.productId === p.id;
                return (
                    <TouchableOpacity
                        key={p.id}
                        style={[styles.productChip, selected && styles.productChipActive]}
                        onPress={() => chooseProduct(index, p)}
                    >
                        <Text style={[styles.productChipText, selected && styles.productChipTextActive]} numberOfLines={1}>
                            {p.brand ? p.brand + ' ' : ''}{p.productName} · {p.unit}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Sales & Billing</Text>
                    <Text style={styles.subtitle}>Track your daily sales and manage invoices.</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.exportBtn} onPress={() => {
                        if (sortOption === 'date') setSortOption('amountDesc');
                        else if (sortOption === 'amountDesc') setSortOption('status');
                        else setSortOption('date');
                    }}>
                        <Filter size={20} color={Colors.textSecondary} />
                        <Text style={styles.exportText}>
                            {sortOption === 'date' ? 'Date' : sortOption === 'amountDesc' ? 'Amount' : 'Status'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.newInvoiceBtn} onPress={openInvoiceModal}>
                        <Plus size={20} color={Colors.card} />
                        <Text style={styles.newInvoiceText}>New Invoice</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search invoices..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, { width: 60 }]}>INV ID</Text>
                    <Text style={[styles.headerText, { flex: 1 }]}>Customer</Text>
                    <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
                    <Text style={[styles.headerText, { width: 70, textAlign: 'center' }]}>Status</Text>
                </View>

                {loading && invoices.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={getSortedInvoices()}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.row}>
                                <View style={{ width: 60 }}>
                                    <Text style={styles.invId}>{item.id}</Text>
                                    <Text style={styles.date}>{item.date}</Text>
                                </View>
                                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                                    <Text style={styles.customer}>{item.customer}</Text>
                                    <Text style={styles.summary} numberOfLines={1}>{item.summary}</Text>
                                </View>
                                <Text style={[styles.amount, { width: 80 }]}>{item.amount}</Text>

                                <View style={[styles.statusBadge, { width: 70, backgroundColor: getStatusColor(item.status).bg }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status).text }]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Create Sale Modal */}
            <Modal
                visible={invoiceModal}
                transparent
                animationType="slide"
                onRequestClose={() => setInvoiceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.invoiceModalContent]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                                <ShoppingCart size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.modalTitle}>New Invoice</Text>
                            <TouchableOpacity onPress={() => setInvoiceModal(false)} style={styles.closeBtn}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {loadingModalData ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                                {/* Customer */}
                                <Text style={styles.label}>CUSTOMER</Text>
                                <View style={styles.searchResultContainer}>
                                    <User size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.inputNoBorder}
                                        placeholder="Search customer or type name (walk-in if empty)"
                                        placeholderTextColor={Colors.textSecondary}
                                        value={selectedCustomer ? selectedCustomer.customerName : customerQuery}
                                        onChangeText={(t) => { setCustomerQuery(t); setSelectedCustomer(null); }}
                                    />
                                    {selectedCustomer && (
                                        <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerQuery(''); }}>
                                            <X size={18} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {!selectedCustomer && filteredCustomers.length > 0 && (
                                    <View style={styles.customerList}>
                                        {filteredCustomers.map((c: any) => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={styles.customerOption}
                                                onPress={() => { setSelectedCustomer(c); setCustomerQuery(''); }}
                                            >
                                                <Text style={styles.customerOptionName} numberOfLines={1}>{c.customerName}</Text>
                                                <Text style={styles.customerOptionPhone}>{c.phone}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {selectedCustomer && (
                                    <Text style={styles.selectedCustomerNote}>
                                        Selected: {selectedCustomer.customerName} · Credit ₹{selectedCustomer.creditBalance}/{selectedCustomer.creditLimit}
                                    </Text>
                                )}

                                {/* Payment Mode */}
                                <Text style={[styles.label, { marginTop: 16 }]}>PAYMENT MODE</Text>
                                <View style={styles.paymentRow}>
                                    {PAYMENT_MODES.map(mode => (
                                        <TouchableOpacity
                                            key={mode}
                                            style={[styles.paymentChip, paymentMode === mode && styles.paymentChipActive]}
                                            onPress={() => setPaymentMode(mode)}
                                        >
                                            <Text style={[styles.paymentChipText, paymentMode === mode && styles.paymentChipTextActive]}>
                                                {mode}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Line Items */}
                                <Text style={[styles.label, { marginTop: 16 }]}>ITEMS</Text>
                                {lineItems.map((item, index) => (
                                    <View key={index} style={styles.lineItemCard}>
                                        <View style={styles.lineItemHeader}>
                                            <Text style={styles.lineItemNumber} numberOfLines={1}>
                                                {item.productName || `Item ${index + 1}`}
                                            </Text>
                                            {lineItems.length > 1 && (
                                                <TouchableOpacity onPress={() => removeLineItem(index)}>
                                                    <Text style={styles.removeItemText}>Remove</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        {renderProductPicker(index)}
                                        <View style={styles.formRow}>
                                            <View style={styles.formGroupHalf}>
                                                <Text style={styles.label}>QTY</Text>
                                                <TextInput
                                                    style={styles.inputNoBorder}
                                                    placeholder="0"
                                                    placeholderTextColor={Colors.textSecondary}
                                                    keyboardType="numeric"
                                                    value={item.quantity}
                                                    onChangeText={(t) => updateLineItem(index, { quantity: t })}
                                                />
                                            </View>
                                            <View style={styles.formGroupHalf}>
                                                <Text style={styles.label}>PRICE (₹)</Text>
                                                <TextInput
                                                    style={styles.inputNoBorder}
                                                    placeholder="0.00"
                                                    placeholderTextColor={Colors.textSecondary}
                                                    keyboardType="numeric"
                                                    value={item.price}
                                                    onChangeText={(t) => updateLineItem(index, { price: t })}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addItemBtn} onPress={addLineItem}>
                                    <Plus size={18} color={Colors.primary} />
                                    <Text style={styles.addItemText}>Add Item</Text>
                                </TouchableOpacity>

                                {/* Discount */}
                                <View style={styles.formRow}>
                                    <View style={styles.formGroupHalf}>
                                        <Text style={styles.label}>DISCOUNT (₹)</Text>
                                        <TextInput
                                            style={styles.inputNoBorder}
                                            placeholder="0"
                                            placeholderTextColor={Colors.textSecondary}
                                            keyboardType="numeric"
                                            value={discount}
                                            onChangeText={setDiscount}
                                        />
                                    </View>
                                </View>

                                {/* Totals */}
                                <View style={styles.totalsBox}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Subtotal</Text>
                                        <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Discount</Text>
                                        <Text style={styles.totalValue}>- ₹{discountVal.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>GST (5%)</Text>
                                        <Text style={styles.totalValue}>₹{(netTotal * 0.05).toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                                        <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
                                    </View>
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity onPress={() => setInvoiceModal(false)} style={styles.cancelBtn}>
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreateSale}
                                        style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
                                        disabled={submitting}
                                    >
                                        <Text style={styles.confirmText}>
                                            {submitting ? 'Creating...' : 'Create Sale'}
                                        </Text>
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

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid': return { bg: '#E8F5E9', text: Colors.success };
        case 'Pending': return { bg: '#FFF8E1', text: '#FFA000' };
        default: return { bg: Colors.background, text: Colors.textSecondary };
    }
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
        fontSize: 28,
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
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.card,
    },
    exportText: {
        marginLeft: 8,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    newInvoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: Colors.primary,
    },
    newInvoiceText: {
        marginLeft: 8,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.card,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
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
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    listContent: {
        paddingBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    invId: {
        fontSize: 13,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
    },
    date: {
        fontSize: 11,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    customer: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
    },
    summary: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        textAlign: 'right',
    },
    statusBadge: {
        paddingVertical: 4,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker
        justifyContent: 'center',
        padding: 20,
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        flex: 1,
    },
    closeBtn: {
        padding: 4,
    },
    closeText: {
        fontSize: 24,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_400Regular',
        marginBottom: 24,
        marginLeft: 52,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    formGroupHalf: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    searchResultContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    inputNoBorder: {
        flex: 1,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        padding: 0,
    },
    dateText: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    emptyItemsBox: {
        borderWidth: 1,
        borderColor: '#EFEFEF',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    emptyItemsText: {
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    addRiceBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    addRiceText: {
        fontFamily: 'Urbanist_600SemiBold',
        color: '#769F83',
        fontSize: 13,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
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
    confirmBtn: {
        backgroundColor: '#769F83',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    confirmText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    },
    invoiceModalContent: {
        maxHeight: '90%',
    },
    customerList: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        marginTop: 4,
        backgroundColor: '#fff',
    },
    customerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    customerOptionName: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        color: Colors.text,
        flex: 1,
    },
    customerOptionPhone: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginLeft: 8,
    },
    selectedCustomerNote: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 12,
        color: Colors.primary,
        marginTop: 6,
    },
    paymentRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    paymentChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#fff',
    },
    paymentChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    paymentChipText: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    paymentChipTextActive: {
        color: '#fff',
    },
    lineItemCard: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    lineItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    lineItemNumber: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 13,
        color: Colors.text,
        flex: 1,
        marginRight: 8,
    },
    removeItemText: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 12,
        color: Colors.error,
    },
    productPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    productChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#FAFAFA',
        maxWidth: '100%',
    },
    productChipActive: {
        backgroundColor: '#E8F5E9',
        borderColor: Colors.primary,
    },
    productChipText: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    productChipTextActive: {
        color: Colors.primary,
        fontFamily: 'Urbanist_600SemiBold',
    },
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    addItemText: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        color: Colors.primary,
        marginLeft: 6,
    },
    totalsBox: {
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    totalValue: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 13,
        color: Colors.text,
    },
    grandTotalRow: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 12,
        marginBottom: 0,
    },
    grandTotalLabel: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 15,
        color: Colors.text,
    },
    grandTotalValue: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 15,
        color: Colors.primary,
    },
});

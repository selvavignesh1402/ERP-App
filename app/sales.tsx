import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Card } from '../src/components/Card';
import { Plus, Search, ShoppingBag, X, ReceiptText, Coins, Percent, ChevronLeft } from 'lucide-react-native';
import api from '../src/services/api';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CREDIT'];

export default function SalesScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form Checkout state
    const [customerName, setCustomerName] = useState('Cash Customer');
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [customerDropdownVisible, setCustomerDropdownVisible] = useState(false);
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [discountStr, setDiscountStr] = useState('0');
    const [cartItems, setCartItems] = useState<any[]>([]);

    // Cart row selectors
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductName, setSelectedProductName] = useState('');
    const [selectedProductStock, setSelectedProductStock] = useState(0);
    const [selectedProductPrice, setSelectedProductPrice] = useState(0);
    const [itemQty, setItemQty] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // UI Visuals Toggle
    const [productDropdownVisible, setProductDropdownVisible] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            setProducts(response.data || []);
        } catch (error) {
            console.error('Error fetching inventory products:', error);
            Alert.alert('Error', 'Failed to load stock list in POS.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            // Filter active customers
            const actives = (response.data || []).filter((c: any) => c.status === 'ACTIVE');
            setCustomers(actives);
        } catch (error) {
            console.error('Error loading customers in POS:', error);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        await Promise.all([fetchProducts(), fetchCustomers()]);
        setLoading(false);
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleAddToCart = () => {
        if (!selectedProductId || !itemQty || !itemPrice) {
            Alert.alert('Missing Info', 'Select a rice brand/type, quantity, and rate.');
            return;
        }

        const qtyVal = parseFloat(itemQty);
        const priceVal = parseFloat(itemPrice);

        if (isNaN(qtyVal) || qtyVal <= 0 || isNaN(priceVal) || priceVal <= 0) {
            Alert.alert('Invalid values', 'Quantity and Selling Price must be greater than zero.');
            return;
        }

        // Real-time frontend stock precaution check
        if (qtyVal > selectedProductStock) {
            Alert.alert('Insufficient Stock', `Only ${selectedProductStock} bags available in shop inventory.`);
            return;
        }

        const existingItemIndex = cartItems.findIndex(i => i.productId === selectedProductId);
        if (existingItemIndex > -1) {
            const updated = [...cartItems];
            const newQty = updated[existingItemIndex].quantity + qtyVal;
            if (newQty > selectedProductStock) {
                Alert.alert('Insufficient Stock', `Adding this quantity exceeds available stock (${selectedProductStock} bags).`);
                return;
            }
            updated[existingItemIndex].quantity = newQty;
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

        // Clear row state
        setSelectedProductId(null);
        setSelectedProductName('');
        setSelectedProductStock(0);
        setSelectedProductPrice(0);
        setItemQty('');
        setItemPrice('');
    };

    const handleRemoveFromCart = (index: number) => {
        const updated = [...cartItems];
        updated.splice(index, 1);
        setCartItems(updated);
    };

    // Calculate billing taxes & totals
    const getSubtotal = () => {
        return cartItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    };

    const getDiscount = () => {
        const disc = parseFloat(discountStr);
        return isNaN(disc) || disc < 0 ? 0 : disc;
    };

    const getNetTotal = () => {
        const sub = getSubtotal();
        const disc = getDiscount();
        const net = sub - disc;
        return net < 0 ? 0 : net;
    };

    const getCGST = () => getNetTotal() * 0.025; // 2.5% CGST
    const getSGST = () => getNetTotal() * 0.025; // 2.5% SGST
    const getGrandTotal = () => getNetTotal() + getCGST() + getSGST();

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) {
            Alert.alert('Empty Cart', 'Please add at least one item to proceed.');
            return;
        }

        // Credit check validation
        if (paymentMode === 'CREDIT') {
            if (!selectedCustomerId) {
                Alert.alert('Customer Required', 'Please select a registered credit customer.');
                return;
            }
            const cust = customers.find(c => c.id === selectedCustomerId);
            if (cust) {
                const total = getGrandTotal();
                if ((cust.creditBalance || 0) + total > cust.creditLimit) {
                    Alert.alert(
                        'Credit Limit Exceeded',
                        `This sale (₹${total.toFixed(2)}) exceeds client remaining credit limit (₹${(cust.creditLimit - cust.creditBalance).toFixed(2)}).`
                    );
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                customerName: customerName || 'Cash Customer',
                customerId: selectedCustomerId,
                paymentMode: paymentMode,
                discount: getDiscount(),
                items: cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            const response = await api.post('/sales', payload);
            Alert.alert('Sale Confirmed', `Invoice ${response.data.billNumber} created successfully! Stock updated.`);

            // Clean cart & refresh products inventory stock counts
            setCartItems([]);
            setCustomerName('Cash Customer');
            setSelectedCustomerId(null);
            setPaymentMode('CASH');
            setDiscountStr('0');
            refreshData();
        } catch (error: any) {
            console.error('Checkout error:', error);
            const msg = error.response?.data?.message || 'Failed to place order';
            Alert.alert('Checkout Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <ReceiptText size={28} color={Colors.primary} style={{ marginLeft: 8 }} />
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.title}>POS Billing Terminal</Text>
                    <Text style={styles.subtitle}>Process dynamic customer sales bills</Text>
                </View>
            </View>

            <View style={styles.content}>
                <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

                    {/* Customer & Payment Mode Configuration */}
                    <Card style={styles.configCard}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>REGISTERED CUSTOMER (OPTIONAL)</Text>
                            <TouchableOpacity
                                style={[styles.input, styles.dropdownTrigger]}
                                onPress={() => setCustomerDropdownVisible(!customerDropdownVisible)}
                            >
                                <Text style={{ color: selectedCustomerId ? Colors.text : Colors.textSecondary }}>
                                    {selectedCustomerId
                                        ? customers.find(c => c.id === selectedCustomerId)?.customerName
                                        : 'Leave empty for walk-in guest'}
                                </Text>
                            </TouchableOpacity>

                            {customerDropdownVisible && (
                                <View style={styles.dropdownMenu}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                        <TouchableOpacity
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setSelectedCustomerId(null);
                                                setCustomerName('Cash Customer');
                                                setCustomerDropdownVisible(false);
                                            }}
                                        >
                                            <Text style={[styles.optionText, { color: Colors.primary, fontFamily: 'Urbanist_700Bold' }]}>
                                                -- WALK-IN GUEST --
                                            </Text>
                                        </TouchableOpacity>
                                        {customers.map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={styles.dropdownOption}
                                                onPress={() => {
                                                    setSelectedCustomerId(c.id);
                                                    setCustomerName(c.customerName);
                                                    setCustomerDropdownVisible(false);
                                                }}
                                            >
                                                <Text style={styles.optionText}>
                                                    {c.customerName} (Credit: ₹{c.creditBalance || 0}/₹{c.creditLimit})
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {!selectedCustomerId && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>WALK-IN GUEST NAME</Text>
                                <TextInput
                                    placeholder="e.g. John Doe"
                                    style={styles.input}
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                />
                            </View>
                        )}

                        <Text style={styles.label}>PAYMENT MODE</Text>
                        <View style={styles.chipRow}>
                            {PAYMENT_MODES.map(mode => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.paymentChip,
                                        paymentMode === mode && styles.paymentChipActive
                                    ]}
                                    onPress={() => {
                                        setPaymentMode(mode);
                                        if (mode === 'CREDIT' && !selectedCustomerId) {
                                            setCustomerDropdownVisible(true);
                                        }
                                    }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        paymentMode === mode && styles.chipTextActive
                                    ]}>
                                        {mode}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Cart Builder Terminal */}
                    <View style={styles.cartTitleRow}>
                        <ShoppingBag size={18} color={Colors.primary} />
                        <Text style={styles.cartTitle}>Sales Cart</Text>
                    </View>

                    <View style={styles.cartBuilderBox}>
                        <Text style={styles.label}>SELECT RICE BAG STOCK</Text>
                        {/* Custom Dropdown Trigger */}
                        <TouchableOpacity
                            style={[styles.input, styles.dropdownTrigger]}
                            onPress={() => setProductDropdownVisible(!productDropdownVisible)}
                        >
                            <Text style={{ color: selectedProductId ? Colors.text : Colors.textSecondary }}>
                                {selectedProductName ? `${selectedProductName} [Stock: ${selectedProductStock} bags]` : 'Choose grain type'}
                            </Text>
                        </TouchableOpacity>

                        {productDropdownVisible && (
                            <View style={styles.dropdownMenu}>
                                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                    {products.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setSelectedProductId(p.id);
                                                setSelectedProductName(`${p.brand ? p.brand + ' ' : ''}${p.productName}`);
                                                setSelectedProductStock(p.stock);
                                                setSelectedProductPrice(p.sellingPrice);
                                                setItemQty('1'); // Default qty
                                                setItemPrice(p.sellingPrice.toString()); // Default rate
                                                setProductDropdownVisible(false);
                                            }}
                                        >
                                            <Text style={styles.optionText}>
                                                {p.brand} {p.productName} (Qty: {p.stock} • ₹{p.sellingPrice}/bag)
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {products.length === 0 && (
                                        <Text style={styles.noOptionText}>No stock found in database</Text>
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.qtyPriceRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.inputLabel}>QTY (BAGS)</Text>
                                <TextInput
                                    placeholder="Qty"
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={itemQty}
                                    onChangeText={setItemQty}
                                />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.inputLabel}>RATE (₹)</Text>
                                <TextInput
                                    placeholder="Rate/Bag"
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={itemPrice}
                                    onChangeText={setItemPrice}
                                />
                            </View>
                            <TouchableOpacity style={styles.innerAddBtn} onPress={handleAddToCart}>
                                <Text style={styles.innerAddBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Cart Items List */}
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

                    {/* Taxes, Discounts & Checklist Summary */}
                    {cartItems.length > 0 && (
                        <Card style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal</Text>
                                <Text style={styles.summaryValue}>₹ {getSubtotal()}</Text>
                            </View>

                            <View style={styles.discountRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Percent size={14} color={Colors.textSecondary} />
                                    <Text style={[styles.summaryLabel, { marginLeft: 4 }]}>Discount (₹)</Text>
                                </View>
                                <TextInput
                                    style={styles.discInput}
                                    keyboardType="numeric"
                                    value={discountStr}
                                    onChangeText={setDiscountStr}
                                />
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>CGST (2.5%)</Text>
                                <Text style={styles.summaryValue}>₹ {getCGST().toFixed(2)}</Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>SGST (2.5%)</Text>
                                <Text style={styles.summaryValue}>₹ {getSGST().toFixed(2)}</Text>
                            </View>

                            <View style={styles.totalDivider} />

                            <View style={styles.summaryRow}>
                                <Text style={styles.grandLabel}>Grand Total</Text>
                                <Text style={styles.grandValue}>₹ {getGrandTotal().toFixed(2)}</Text>
                            </View>

                            {submitting ? (
                                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
                            ) : (
                                <TouchableOpacity style={styles.checkoutBtn} onPress={handlePlaceOrder}>
                                    <Coins size={18} color="white" />
                                    <Text style={styles.checkoutText}>Confirm checkout bill</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    backButton: {
        padding: 4,
        marginRight: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    configCard: {
        padding: 16,
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    inputLabel: {
        fontSize: 9,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 15,
        backgroundColor: '#FAFAFA',
        color: Colors.text,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    paymentChip: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
    },
    paymentChipActive: {
        borderColor: Colors.primary,
        backgroundColor: '#E8F5E9',
    },
    chipText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    chipTextActive: {
        color: Colors.primary,
    },
    cartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 4,
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
        padding: 14,
        marginBottom: 12,
        position: 'relative',
    },
    dropdownTrigger: {
        justifyContent: 'center',
        minHeight: 45,
        marginBottom: 8,
    },
    dropdownMenu: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: -4,
        marginBottom: 8,
        padding: 4,
        maxHeight: 160,
        zIndex: 50,
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
        fontSize: 13,
        color: Colors.text,
    },
    noOptionText: {
        fontFamily: 'Urbanist_400Regular',
        fontSize: 12,
        color: Colors.error,
        padding: 10,
    },
    qtyPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    innerAddBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        height: 44,
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
        paddingHorizontal: 4,
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
    summaryCard: {
        marginVertical: 20,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    discInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#FFF',
        width: 80,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        textAlign: 'right',
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        color: Colors.text,
    },
    summaryLabel: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 13,
        color: Colors.text,
    },
    totalDivider: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginVertical: 8,
    },
    grandLabel: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 15,
        color: Colors.text,
    },
    grandValue: {
        fontFamily: 'Urbanist_800ExtraBold',
        fontSize: 18,
        color: Colors.primary,
    },
    checkoutBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 16,
    },
    checkoutText: {
        color: 'white',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 15,
        marginLeft: 8,
    },
});

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, ScrollView,
    Platform, Share
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Plus, Search, ShoppingBag, CheckCircle2, Clock,
    ArrowUpDown, ChevronRight, ChevronDown, ChevronUp, X, User,
    FileText, Trash2, Share2, Sparkles, Check, Package, Minus
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import api from '../../src/services/api';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CREDIT'] as const;
type PaymentMode = typeof PAYMENT_MODES[number];

export default function SalesScreen() {
    const [salesList, setSalesList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'date' | 'amountDesc' | 'status'>('date');

    // Interactive Invoice Bill Viewer State
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [billItems, setBillItems] = useState<any[]>([]);
    const [loadingBillItems, setLoadingBillItems] = useState(false);
    const [billModalVisible, setBillModalVisible] = useState(false);

    // Create New Invoice / POS Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    
    // Customer Selection State (Closed by default)
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    // Product Picker Sub-Modal State
    const [productPickerVisible, setProductPickerVisible] = useState(false);
    const [activeItemIndexForProductPick, setActiveItemIndexForProductPick] = useState<number | null>(null);
    const [productPickerSearch, setProductPickerSearch] = useState('');
    const [productPickerCategory, setProductPickerCategory] = useState('All');

    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [discount, setDiscount] = useState('0');
    const [lineItems, setLineItems] = useState<any[]>([
        { productId: null as number | null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingModalData, setLoadingModalData] = useState(false);

    // ─────────────────────────────────────────────
    // FETCH SALES DATA
    // ─────────────────────────────────────────────
    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/sales');
            const data = response.data || [];
            setSalesList(data);
        } catch (error) {
            console.error('Error fetching sales list:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    useFocusEffect(
        useCallback(() => {
            fetchSales();
        }, [fetchSales])
    );

    // ─────────────────────────────────────────────
    // COMPUTED KPI METRICS
    // ─────────────────────────────────────────────
    const metrics = useMemo(() => {
        let totalRevenue = 0;
        let paidRevenue = 0;
        let pendingCredit = 0;
        let totalInvoices = salesList.length;

        salesList.forEach((sale: any) => {
            const grand = parseFloat(sale.grandTotal) || 0;
            totalRevenue += grand;
            if (sale.paymentMode === 'CREDIT') {
                pendingCredit += grand;
            } else {
                paidRevenue += grand;
            }
        });

        return {
            totalRevenue,
            paidRevenue,
            pendingCredit,
            totalInvoices,
        };
    }, [salesList]);

    // ─────────────────────────────────────────────
    // FILTERED & SORTED INVOICES LIST
    // ─────────────────────────────────────────────
    const filteredInvoices = useMemo(() => {
        let list = salesList;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((s: any) =>
                (s.billNumber || '').toLowerCase().includes(q) ||
                (s.customerName || '').toLowerCase().includes(q) ||
                (s.customer?.customerName || '').toLowerCase().includes(q) ||
                (s.paymentMode || '').toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            if (sortOption === 'amountDesc') {
                return (parseFloat(b.grandTotal) || 0) - (parseFloat(a.grandTotal) || 0);
            }
            if (sortOption === 'status') {
                return (a.paymentMode || '').localeCompare(b.paymentMode || '');
            }
            const tA = a.saleDate ? new Date(a.saleDate).getTime() : 0;
            const tB = b.saleDate ? new Date(b.saleDate).getTime() : 0;
            return tB - tA;
        });
    }, [salesList, searchQuery, sortOption]);

    // ─────────────────────────────────────────────
    // INVOICE BILL VIEWER
    // ─────────────────────────────────────────────
    const openInvoiceBill = async (sale: any) => {
        setSelectedBill(sale);
        setBillModalVisible(true);
        setLoadingBillItems(true);
        try {
            const res = await api.get(`/sales/${sale.id}/items`);
            setBillItems(res.data || []);
        } catch (error) {
            console.error('Error loading sale line items:', error);
            setBillItems([]);
        } finally {
            setLoadingBillItems(false);
        }
    };

    const handleShareBill = async () => {
        if (!selectedBill) return;
        try {
            const billText = `🌾 *RICE ERP - INVOICE RECEIPT*\n` +
                `Bill No: ${selectedBill.billNumber}\n` +
                `Customer: ${selectedBill.customerName || 'Walk-in Customer'}\n` +
                `Date: ${new Date(selectedBill.saleDate).toLocaleString('en-IN')}\n` +
                `Payment: ${selectedBill.paymentMode}\n` +
                `-----------------------------\n` +
                `Total Amount: ₹${parseFloat(selectedBill.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `Status: ${selectedBill.paymentMode === 'CREDIT' ? '⚠️ PENDING CREDIT' : '✓ PAID'}\n` +
                `Thank you for your business!`;

            await Share.share({
                message: billText,
                title: `Invoice ${selectedBill.billNumber}`,
            });
        } catch (err) {
            console.log('Share dismissed or failed', err);
        }
    };

    // ─────────────────────────────────────────────
    // CREATE SALE / POS MODAL ACTIONS
    // ─────────────────────────────────────────────
    const openCreateModal = async () => {
        setCreateModalVisible(true);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomerDropdownOpen(false); // Closed by default per user request
        setPaymentMode('CASH');
        setDiscount('0');
        setLineItems([
            { productId: null as number | null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
        ]);
        setLoadingModalData(true);
        try {
            const [prodRes, custRes] = await Promise.all([
                api.get('/products'),
                api.get('/customers'),
            ]);
            const activeProds = (prodRes.data || []).filter((p: any) => p.status === 'ACTIVE' || !p.status);
            setProducts(activeProds);
            setCustomers(custRes.data || []);
        } catch (error) {
            console.error('Error fetching create modal initial data:', error);
            Alert.alert('Error', 'Failed to load products or customers');
        } finally {
            setLoadingModalData(false);
        }
    };

    const updateLineItem = (index: number, patch: any) => {
        setLineItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const stepQuantity = (index: number, delta: number) => {
        const current = parseFloat(lineItems[index]?.quantity) || 1;
        const next = Math.max(1, current + delta);
        updateLineItem(index, { quantity: String(next) });
    };

    const addLineItem = () => {
        setLineItems(prev => [
            ...prev,
            { productId: null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
        ]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length === 1) {
            setLineItems([{ productId: null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }]);
            return;
        }
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    const openProductPickerFor = (index: number) => {
        setActiveItemIndexForProductPick(index);
        setProductPickerSearch('');
        setProductPickerCategory('All');
        setProductPickerVisible(true);
    };

    const handleSelectProduct = (prod: any) => {
        if (activeItemIndexForProductPick !== null) {
            updateLineItem(activeItemIndexForProductPick, {
                productId: prod.id,
                productName: prod.productName,
                brand: prod.brand || 'General',
                bagSizeKg: prod.bagSizeKg || (prod.unit?.includes('50') ? 50 : 25),
                price: String(prod.sellingPrice || ''),
                stock: prod.stock || 0,
                quantity: '1',
            });
        }
        setProductPickerVisible(false);
        setActiveItemIndexForProductPick(null);
    };

    // Filtered Customers for Dropdown
    const filteredCustomersList = useMemo(() => {
        if (!customerSearch.trim()) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter((c: any) =>
            (c.customerName || '').toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.address || '').toLowerCase().includes(q)
        );
    }, [customers, customerSearch]);

    // Product Categories & Filtered Products for Catalog Picker
    const productCategories = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => {
            if (p.category) set.add(p.category);
        });
        return ['All', ...Array.from(set)];
    }, [products]);

    const filteredProductsList = useMemo(() => {
        let list = products;
        if (productPickerCategory !== 'All') {
            list = list.filter(p => p.category?.toLowerCase() === productPickerCategory.toLowerCase());
        }
        if (productPickerSearch.trim()) {
            const q = productPickerSearch.toLowerCase().trim();
            list = list.filter(p =>
                (p.productName || '').toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q) ||
                (p.hsnCode || '').includes(q)
            );
        }
        return list;
    }, [products, productPickerCategory, productPickerSearch]);

    // Live POS Calculations
    const calculatedSubtotal = useMemo(() => {
        return lineItems.reduce((acc, it) => {
            const q = parseFloat(it.quantity) || 0;
            const p = parseFloat(it.price) || 0;
            return acc + q * p;
        }, 0);
    }, [lineItems]);

    const discountValue = parseFloat(discount) || 0;
    const taxableAmount = Math.max(0, calculatedSubtotal - discountValue);
    const cgstAmount = taxableAmount * 0.025; // 2.5%
    const sgstAmount = taxableAmount * 0.025; // 2.5%
    const calculatedGrandTotal = taxableAmount + cgstAmount + sgstAmount;

    const handleCreateSaleSubmit = async () => {
        const validItems = lineItems.filter(it => it.productId != null && (parseFloat(it.quantity) || 0) > 0);
        if (validItems.length === 0) {
            Alert.alert('Missing Products', 'Please select at least one product and enter a valid quantity.');
            return;
        }

        if (paymentMode === 'CREDIT' && !selectedCustomer) {
            Alert.alert('Customer Required', 'Please select a registered customer for Credit sales.');
            return;
        }

        if (paymentMode === 'CREDIT' && selectedCustomer) {
            const limit = parseFloat(selectedCustomer.creditLimit) || 0;
            const balance = parseFloat(selectedCustomer.creditBalance) || 0;
            if (limit > 0 && balance + calculatedGrandTotal > limit) {
                Alert.alert(
                    'Credit Limit Exceeded',
                    `This customer's limit is ₹${limit.toLocaleString('en-IN')}.\nCurrent balance: ₹${balance.toLocaleString('en-IN')}.\nAdding this sale of ₹${calculatedGrandTotal.toFixed(2)} exceeds the limit!`
                );
                return;
            }
        }

        setSubmitting(true);
        try {
            await api.post('/sales', {
                customerId: selectedCustomer?.id ?? null,
                customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                paymentMode,
                discount: discountValue,
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: parseFloat(it.quantity),
                    price: parseFloat(it.price)
                }))
            });

            Alert.alert('Sale Recorded', 'New invoice generated successfully!');
            setCreateModalVisible(false);
            fetchSales();
        } catch (error: any) {
            console.error('Error creating sale:', error);
            const msg = error.response?.data?.message || error.response?.data || 'Failed to generate invoice';
            Alert.alert('Creation Failed', typeof msg === 'string' ? msg : 'Error processing sale');
        } finally {
            setSubmitting(false);
        }
    };

    // Trend Mock Bars data (Monday - Sunday)
    const trendDays = [
        { day: 'Mon', amount: 32, peak: false },
        { day: 'Tue', amount: 55, peak: false },
        { day: 'Wed', amount: 48, peak: false },
        { day: 'Thu', amount: 72, peak: false },
        { day: 'Fri', amount: 95, peak: true, label: '₹ 84.3k' },
        { day: 'Sat', amount: 68, peak: false },
        { day: 'Sun', amount: 42, peak: false },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Organic Pastel SVG Background Blobs (Dominant Pink Right-Top Corner per DESIGN.png) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    
                    {/* Prominent Right-Top Corner Pink Shape */}
                    <Path
                        d="M100 -50 C200 -50, 385 -40, 395 60 C410 180, 360 250, 220 230 C120 210, 40 140, 100 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.38}
                    />
                    <Circle cx="340" cy="70" r="80" fill="#F06A8C" opacity={0.16} />

                    {/* Supporting Soft Gold / Cream Accent */}
                    <Path
                        d="M-60 150 C20 170, 110 110, 150 230 C190 350, 70 390, -20 350 C-100 310, -130 130, -60 150 Z"
                        fill="#F7E6B8"
                        opacity={0.32}
                    />

                    {/* Soft Center Sage */}
                    <Circle cx="350" cy="380" r="75" fill="#DCE6DB" opacity={0.28} />

                    {/* Bottom Lavender Blob */}
                    <Circle cx="30" cy="620" r="70" fill="#E2D4F5" opacity={0.28} />
                    <Circle cx="340" cy="740" r="85" fill="#F5C6D8" opacity={0.22} />
                </Svg>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Header: Positioned lower down per request */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>Sales Overview</Text>
                        <Text style={styles.headerSubtitle}>Daily revenue & invoice management</Text>
                    </View>
                </FadeInDown>

                {/* 2. Top Action Bar: Full-Width "Add New Sale / Invoice" button */}
                <FadeInDown delay={50} style={styles.topActionBar}>
                    <TouchableOpacity
                        style={styles.newSaleBtn}
                        onPress={openCreateModal}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.newSaleBtnText}>Add New Sale / Invoice</Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. Sales KPI Overview 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1: Total Sales */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <ShoppingBag size={18} color="#F06A8C" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>▲ 14.2%</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Sales</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            ₹ {metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 2: Total Invoices */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EAF2FF' }]}>
                                <FileText size={18} color="#5B8DEF" />
                            </View>
                            <View style={[styles.trendBadge, { backgroundColor: '#EAF2FF' }]}>
                                <Text style={[styles.trendBadgeText, { color: '#5B8DEF' }]}>Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Invoices</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {metrics.totalInvoices} Bills
                        </Text>
                    </View>

                    {/* KPI 3: Paid Collections */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <CheckCircle2 size={18} color="#4CAF50" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Paid Amount</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            ₹ {metrics.paidRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 4: Pending Credit */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <Clock size={18} color="#F2A93B" />
                            </View>
                            {metrics.pendingCredit > 0 && (
                                <View style={[styles.trendBadge, { backgroundColor: '#FFF3E0' }]}>
                                    <Text style={[styles.trendBadgeText, { color: '#E65100' }]}>Due</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.kpiLabel}>Pending Credit</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>
                            ₹ {metrics.pendingCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                    </View>
                </FadeInDown>

                {/* 4. Sales Trend Bar Chart (DESIGN.md Screen 3) */}
                <FadeInDown delay={110} style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>Sales Trend</Text>
                            <Text style={styles.chartSubtitle}>Weekly revenue distribution</Text>
                        </View>
                        <View style={styles.chartTag}>
                            <Text style={styles.chartTagText}>This Week</Text>
                        </View>
                    </View>

                    {/* Bar Chart Container */}
                    <View style={styles.chartBody}>
                        {trendDays.map((bar, idx) => (
                            <View key={idx} style={styles.chartCol}>
                                {bar.peak && (
                                    <View style={styles.peakTooltip}>
                                        <Text style={styles.peakTooltipText}>{bar.label}</Text>
                                    </View>
                                )}
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            { height: `${bar.amount}%` },
                                            bar.peak && styles.barFillPeak
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.barDayLabel, bar.peak && styles.barDayLabelPeak]}>
                                    {bar.day}
                                </Text>
                            </View>
                        ))}
                    </View>
                </FadeInDown>

                {/* 5. Invoices Section */}
                <FadeInDown delay={140} style={styles.invoicesSection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Invoices</Text>
                            <View style={styles.invoiceCountPill}>
                                <Text style={styles.invoiceCountText}>{filteredInvoices.length}</Text>
                            </View>
                        </View>

                        {/* Sort Trigger */}
                        <TouchableOpacity
                            style={styles.sortBtn}
                            onPress={() => {
                                if (sortOption === 'date') setSortOption('amountDesc');
                                else if (sortOption === 'amountDesc') setSortOption('status');
                                else setSortOption('date');
                            }}
                            activeOpacity={0.7}
                        >
                            <ArrowUpDown size={14} color="#555" />
                            <Text style={styles.sortBtnText}>
                                {sortOption === 'date' ? 'Date ↓' : sortOption === 'amountDesc' ? 'Amount ↓' : 'Status'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar for Invoices */}
                    <View style={styles.searchBar}>
                        <Search size={17} color="#8A8A8A" />
                        <TextInput
                            placeholder="Search by Bill No, Customer, Payment..."
                            placeholderTextColor="#A0A0A0"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={16} color="#8A8A8A" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Invoices List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading invoices...</Text>
                        </View>
                    ) : filteredInvoices.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FileText size={40} color="#D0D0D0" />
                            <Text style={styles.emptyTitle}>No Invoices Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery ? 'Try matching another customer name or bill number.' : 'Generate your first sale using the button above!'}
                            </Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={160}>
                            <View style={styles.invoicesListWrapper}>
                                {filteredInvoices.map((sale) => {
                                    const isPaid = sale.paymentMode !== 'CREDIT';
                                    const grandVal = parseFloat(sale.grandTotal) || 0;
                                    const dateObj = sale.saleDate ? new Date(sale.saleDate) : new Date();
                                    const formattedDate = dateObj.toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });

                                    return (
                                        <AnimatedPressable
                                            key={sale.id}
                                            style={styles.invoiceCard}
                                            onPress={() => openInvoiceBill(sale)}
                                        >
                                            {/* Leading Icon Avatar */}
                                            <View style={[
                                                styles.invoiceAvatar,
                                                { backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0' }
                                            ]}>
                                                <FileText size={20} color={isPaid ? '#2E7D32' : '#E65100'} />
                                            </View>

                                            {/* Center Information */}
                                            <View style={styles.invoiceCenterInfo}>
                                                <View style={styles.invoiceTitleRow}>
                                                    <Text style={styles.billNumberText}>{sale.billNumber}</Text>
                                                    <View style={[
                                                        styles.paymentBadge,
                                                        { backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0' }
                                                    ]}>
                                                        <Text style={[
                                                            styles.paymentBadgeText,
                                                            { color: isPaid ? '#2E7D32' : '#E65100' }
                                                        ]}>
                                                            {sale.paymentMode}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={styles.customerNameText} numberOfLines={1}>
                                                    {sale.customerName || sale.customer?.customerName || 'Walk-in Customer'}
                                                </Text>

                                                <Text style={styles.invoiceTimeText}>
                                                    {formattedDate} · {formattedTime}
                                                </Text>
                                            </View>

                                            {/* Trailing Total & Chevron */}
                                            <View style={styles.invoiceTrailing}>
                                                <Text style={styles.invoiceAmountText}>
                                                    ₹{grandVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </Text>
                                                <ChevronRight size={18} color="#C0C0C0" />
                                            </View>
                                        </AnimatedPressable>
                                    );
                                })}
                            </View>
                        </StaggerContainer>
                    )}
                </FadeInDown>
            </ScrollView>

            {/* ───────────────────────────────────────────── */}
            {/* 6. INTERACTIVE INVOICE BILL VIEWER MODAL     */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={billModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setBillModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.billModalCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Top Header */}
                        <View style={styles.billModalHeader}>
                            <View style={styles.billModalHeaderLeft}>
                                <Text style={styles.billModalTitle}>Invoice Receipt</Text>
                                <Text style={styles.billModalSubtitle}>Official Tax Invoice</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.billCloseBtn}
                                onPress={() => setBillModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Bill Content */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.billScrollContainer}
                        >
                            {selectedBill && (
                                <View style={styles.billPaper}>
                                    {/* Store Banner */}
                                    <View style={styles.billStoreBanner}>
                                        <Text style={styles.billStoreName}>🌾 RICE ERP STORE</Text>
                                        <Text style={styles.billStoreMeta}>GSTIN: 33AAAAA0000A1Z5 | HSN: 1006</Text>
                                        <Text style={styles.billStoreMeta}>Main Bazaar, Rice Mandi, Tamil Nadu</Text>
                                        <View style={styles.dashedDivider} />
                                    </View>

                                    {/* Bill Meta Row */}
                                    <View style={styles.billMetaGrid}>
                                        <View style={styles.billMetaCol}>
                                            <Text style={styles.billMetaLabel}>BILL NO</Text>
                                            <Text style={styles.billMetaValue}>{selectedBill.billNumber}</Text>
                                        </View>
                                        <View style={[styles.billMetaCol, { alignItems: 'flex-end' }]}>
                                            <Text style={styles.billMetaLabel}>DATE & TIME</Text>
                                            <Text style={styles.billMetaValue}>
                                                {selectedBill.saleDate ? new Date(selectedBill.saleDate).toLocaleString('en-IN') : 'N/A'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Customer Row */}
                                    <View style={styles.billCustomerBox}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.billMetaLabel}>BILLED TO</Text>
                                            <Text style={styles.billCustomerName} numberOfLines={1}>
                                                {selectedBill.customerName || selectedBill.customer?.customerName || 'Walk-in Customer'}
                                            </Text>
                                            {selectedBill.customer?.phone && (
                                                <Text style={styles.billCustomerPhone}>📞 {selectedBill.customer.phone}</Text>
                                            )}
                                        </View>
                                        <View style={[
                                            styles.billStatusStamp,
                                            selectedBill.paymentMode === 'CREDIT' ? styles.billStampPending : styles.billStampPaid
                                        ]}>
                                            <Text style={[
                                                styles.billStampText,
                                                selectedBill.paymentMode === 'CREDIT' ? styles.billStampTextPending : styles.billStampTextPaid
                                            ]}>
                                                {selectedBill.paymentMode === 'CREDIT' ? 'CREDIT DUE' : 'PAID'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.dashedDivider} />

                                    {/* Itemized Table Header */}
                                    <View style={styles.billTableHeader}>
                                        <Text style={[styles.billColHeader, { flex: 2 }]}>ITEM / BRAND</Text>
                                        <Text style={[styles.billColHeader, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                                        <Text style={[styles.billColHeader, { flex: 1.2, textAlign: 'right' }]}>RATE</Text>
                                        <Text style={[styles.billColHeader, { flex: 1.3, textAlign: 'right' }]}>TOTAL</Text>
                                    </View>

                                    {/* Itemized Table Rows */}
                                    {loadingBillItems ? (
                                        <ActivityIndicator size="small" color="#F06A8C" style={{ marginVertical: 20 }} />
                                    ) : billItems.length === 0 ? (
                                        <Text style={styles.noItemsText}>Line item details not available</Text>
                                    ) : (
                                        billItems.map((it, idx) => {
                                            const itemSub = (it.quantity || 0) * (it.price || 0);
                                            return (
                                                <View key={it.id || idx} style={styles.billTableRow}>
                                                    <View style={{ flex: 2 }}>
                                                        <Text style={styles.billItemName} numberOfLines={1}>
                                                            {it.product?.brand ? `${it.product.brand} ` : ''}{it.product?.productName || 'Rice Product'}
                                                        </Text>
                                                        <Text style={styles.billItemUnit}>
                                                            {it.product?.unit || 'Bag'} ({it.product?.bagSizeKg || 25}kg)
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.billItemQty, { flex: 1, textAlign: 'center' }]}>
                                                        {it.quantity}
                                                    </Text>
                                                    <Text style={[styles.billItemRate, { flex: 1.2, textAlign: 'right' }]}>
                                                        ₹{it.price}
                                                    </Text>
                                                    <Text style={[styles.billItemTotal, { flex: 1.3, textAlign: 'right' }]}>
                                                        ₹{itemSub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                </View>
                                            );
                                        })
                                    )}

                                    <View style={styles.dashedDivider} />

                                    {/* Financial Breakdown */}
                                    <View style={styles.billSummaryBox}>
                                        <View style={styles.billSummaryRow}>
                                            <Text style={styles.billSummaryLabel}>Subtotal</Text>
                                            <Text style={styles.billSummaryValue}>
                                                ₹{(parseFloat(selectedBill.total) || parseFloat(selectedBill.grandTotal)).toFixed(2)}
                                            </Text>
                                        </View>

                                        {parseFloat(selectedBill.discount) > 0 && (
                                            <View style={styles.billSummaryRow}>
                                                <Text style={styles.billSummaryLabel}>Discount</Text>
                                                <Text style={[styles.billSummaryValue, { color: '#E53935' }]}>
                                                    - ₹{parseFloat(selectedBill.discount).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}

                                        {parseFloat(selectedBill.cgst) > 0 && (
                                            <View style={styles.billSummaryRow}>
                                                <Text style={styles.billSummaryLabel}>CGST (2.5%)</Text>
                                                <Text style={styles.billSummaryValue}>
                                                    + ₹{parseFloat(selectedBill.cgst).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}

                                        {parseFloat(selectedBill.sgst) > 0 && (
                                            <View style={styles.billSummaryRow}>
                                                <Text style={styles.billSummaryLabel}>SGST (2.5%)</Text>
                                                <Text style={styles.billSummaryValue}>
                                                    + ₹{parseFloat(selectedBill.sgst).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={[styles.dashedDivider, { marginVertical: 8 }]} />

                                        <View style={styles.billGrandTotalRow}>
                                            <Text style={styles.billGrandTotalLabel}>GRAND TOTAL</Text>
                                            <Text style={styles.billGrandTotalValue}>
                                                ₹{parseFloat(selectedBill.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Payment Mode Footer */}
                                    <View style={styles.billFooterNote}>
                                        <Text style={styles.billFooterNoteText}>
                                            Payment Method: <Text style={{ fontWeight: '700' }}>{selectedBill.paymentMode}</Text>
                                        </Text>
                                        <Text style={styles.billFooterThanks}>Thank you for choosing us! 🙏</Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Action Buttons: Share / Done */}
                        <View style={styles.billActionRow}>
                            <TouchableOpacity
                                style={styles.billShareBtn}
                                onPress={handleShareBill}
                                activeOpacity={0.8}
                            >
                                <Share2 size={18} color="#1A1A1A" />
                                <Text style={styles.billShareBtnText}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.billDoneBtn}
                                onPress={() => setBillModalVisible(false)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.billDoneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* 7. REDESIGNED "+ ADD NEW INVOICE" / POS MODAL */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={createModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.createModalCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Modal Header */}
                        <View style={styles.billModalHeader}>
                            <View style={styles.billModalHeaderLeft}>
                                <Text style={styles.billModalTitle}>New Sale / Invoice</Text>
                                <Text style={styles.billModalSubtitle}>Create customer bill & deduct inventory</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.billCloseBtn}
                                onPress={() => setCreateModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Form Body */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.createFormScroll}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled={true}
                        >
                            {loadingModalData ? (
                                <ActivityIndicator size="large" color="#F06A8C" style={{ marginVertical: 30 }} />
                            ) : (
                                <>
                                    {/* 1. Customer Selection (Neat Scrollable Dropdown - Closed by Default) */}
                                    <View style={styles.formSectionBox}>
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.formSectionHeading}>1. CUSTOMER DETAILS</Text>
                                            {selectedCustomer && (
                                                <TouchableOpacity
                                                    style={styles.changeCustTextBtn}
                                                    onPress={() => {
                                                        setSelectedCustomer(null);
                                                        setCustomerDropdownOpen(true);
                                                    }}
                                                >
                                                    <Text style={styles.changeCustText}>Change Customer</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {selectedCustomer ? (
                                            /* Selected Customer Summary Card */
                                            <View style={styles.selectedCustomerCard}>
                                                <View style={styles.selectedCustAvatar}>
                                                    <User size={18} color="#2E7D32" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.selectedCustName}>{selectedCustomer.customerName}</Text>
                                                    <Text style={styles.selectedCustPhone}>
                                                        📞 {selectedCustomer.phone || 'No phone'} · Credit Balance: ₹{selectedCustomer.creditBalance || 0}
                                                    </Text>
                                                </View>
                                                <View style={styles.selectedCustCheck}>
                                                    <Check size={16} color="#2E7D32" strokeWidth={3} />
                                                </View>
                                            </View>
                                        ) : (
                                            /* Search & Collapsible Customer Dropdown List */
                                            <View>
                                                <TouchableOpacity
                                                    style={styles.customerInputRow}
                                                    activeOpacity={0.9}
                                                    onPress={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                                >
                                                    <Search size={16} color="#8A8A8A" />
                                                    <TextInput
                                                        placeholder="Search customer by name, phone or address..."
                                                        placeholderTextColor="#A0A0A0"
                                                        style={styles.custTextInput}
                                                        value={customerSearch}
                                                        onChangeText={(t) => {
                                                            setCustomerSearch(t);
                                                            if (!customerDropdownOpen) setCustomerDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setCustomerDropdownOpen(true)}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                                        style={{ padding: 4 }}
                                                    >
                                                        {customerDropdownOpen ? (
                                                            <ChevronUp size={18} color="#666" />
                                                        ) : (
                                                            <ChevronDown size={18} color="#666" />
                                                        )}
                                                    </TouchableOpacity>
                                                </TouchableOpacity>

                                                {/* Customer Dropdown List (Only open when clicked) */}
                                                {customerDropdownOpen && (
                                                    <View style={styles.custDropdownContainer}>
                                                        <ScrollView
                                                            style={styles.custDropdownScroll}
                                                            nestedScrollEnabled={true}
                                                            showsVerticalScrollIndicator={true}
                                                            keyboardShouldPersistTaps="handled"
                                                        >
                                                            {/* Option 0: Walk-in Guest */}
                                                            <TouchableOpacity
                                                                style={styles.custDropdownItem}
                                                                onPress={() => {
                                                                    setSelectedCustomer(null);
                                                                    setCustomerSearch('Walk-in Guest');
                                                                    setCustomerDropdownOpen(false);
                                                                }}
                                                            >
                                                                <View style={[styles.custItemAvatar, { backgroundColor: '#F0F0F0' }]}>
                                                                    <User size={15} color="#555" />
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.custItemName}>👤 Walk-in Guest / Cash Counter</Text>
                                                                    <Text style={styles.custItemSub}>Immediate counter sale without registered ledger</Text>
                                                                </View>
                                                            </TouchableOpacity>

                                                            {/* Registered Customers */}
                                                            {filteredCustomersList.map((c) => (
                                                                <TouchableOpacity
                                                                    key={c.id}
                                                                    style={styles.custDropdownItem}
                                                                    onPress={() => {
                                                                        setSelectedCustomer(c);
                                                                        setCustomerSearch(c.customerName);
                                                                        setCustomerDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <View style={styles.custItemAvatar}>
                                                                        <User size={15} color="#2E7D32" />
                                                                    </View>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={styles.custItemName}>{c.customerName}</Text>
                                                                        <Text style={styles.custItemSub}>
                                                                            📞 {c.phone || 'No phone'} {c.address ? `· ${c.address}` : ''}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.custCreditTag}>
                                                                        <Text style={styles.custCreditTagText}>
                                                                            Limit ₹{(c.creditLimit || 0).toLocaleString('en-IN')}
                                                                        </Text>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}

                                                            {filteredCustomersList.length === 0 && (
                                                                <View style={{ padding: 12, alignItems: 'center' }}>
                                                                    <Text style={{ fontSize: 12, color: '#888' }}>
                                                                        No customer matching "{customerSearch}". Will record as guest name.
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* 2. Line Items (Products, Quantity Stepper, Price) */}
                                    <View style={styles.formSectionBox}>
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.formSectionHeading}>2. LINE ITEMS (PRODUCTS)</Text>
                                            <TouchableOpacity
                                                style={styles.addItemBtn}
                                                onPress={addLineItem}
                                                activeOpacity={0.7}
                                            >
                                                <Plus size={14} color="#F06A8C" strokeWidth={2.5} />
                                                <Text style={styles.addItemBtnText}>Add Item</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {lineItems.map((item, index) => {
                                            const itemSub = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);

                                            return (
                                                <View key={index} style={styles.itemRowCard}>
                                                    {/* Header: Item number & delete button */}
                                                    <View style={styles.itemRowHeader}>
                                                        <Text style={styles.itemRowIndex}>Item #{index + 1}</Text>
                                                        {lineItems.length > 1 && (
                                                            <TouchableOpacity
                                                                onPress={() => removeLineItem(index)}
                                                                style={styles.itemDeleteBtn}
                                                            >
                                                                <Trash2 size={15} color="#E53935" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>

                                                    {/* Product Selector Trigger */}
                                                    {item.productId ? (
                                                        /* Selected Product Banner */
                                                        <TouchableOpacity
                                                            style={styles.selectedProductCard}
                                                            onPress={() => openProductPickerFor(index)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={styles.productIconBox}>
                                                                <Package size={22} color="#F06A8C" />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.selectedProdName} numberOfLines={1}>
                                                                    {item.brand ? `${item.brand} ` : ''}{item.productName}
                                                                </Text>
                                                                <View style={styles.selectedProdMetaRow}>
                                                                    <View style={styles.bagWeightPill}>
                                                                        <Text style={styles.bagWeightPillText}>{item.bagSizeKg}kg Bag</Text>
                                                                    </View>
                                                                    <Text style={styles.selectedProdStockText}>
                                                                        In Stock: {item.stock} bags
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.changeProductText}>Change ▼</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        /* Clean Product Pick Trigger Button */
                                                        <TouchableOpacity
                                                            style={styles.productPickerTriggerBtn}
                                                            onPress={() => openProductPickerFor(index)}
                                                            activeOpacity={0.75}
                                                        >
                                                            <Package size={20} color="#F06A8C" />
                                                            <Text style={styles.productPickerTriggerText}>
                                                                🌾 Tap to Select Rice Product...
                                                            </Text>
                                                            <ChevronRight size={16} color="#888" />
                                                        </TouchableOpacity>
                                                    )}

                                                    {/* Quantity and Price Inputs with Quantity Stepper */}
                                                    <View style={styles.itemInputsRow}>
                                                        {/* Quantity Stepper Column */}
                                                        <View style={styles.inputColLeft}>
                                                            <Text style={styles.inputMiniLabel}>QUANTITY (BAGS)</Text>
                                                            <View style={styles.stepperContainer}>
                                                                <TouchableOpacity
                                                                    style={styles.stepperBtn}
                                                                    onPress={() => stepQuantity(index, -1)}
                                                                >
                                                                    <Minus size={14} color="#333" strokeWidth={2.5} />
                                                                </TouchableOpacity>
                                                                <TextInput
                                                                    style={styles.stepperInput}
                                                                    keyboardType="numeric"
                                                                    placeholder="1"
                                                                    placeholderTextColor="#A0A0A0"
                                                                    value={String(item.quantity)}
                                                                    onChangeText={(val) => updateLineItem(index, { quantity: val })}
                                                                />
                                                                <TouchableOpacity
                                                                    style={styles.stepperBtn}
                                                                    onPress={() => stepQuantity(index, 1)}
                                                                >
                                                                    <Plus size={14} color="#333" strokeWidth={2.5} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>

                                                        {/* Price Per Bag Column */}
                                                        <View style={styles.inputColRight}>
                                                            <Text style={styles.inputMiniLabel}>PRICE PER BAG (₹)</Text>
                                                            <TextInput
                                                                style={styles.priceTextInput}
                                                                keyboardType="numeric"
                                                                placeholder="2800"
                                                                placeholderTextColor="#A0A0A0"
                                                                value={String(item.price)}
                                                                onChangeText={(val) => updateLineItem(index, { price: val })}
                                                            />
                                                        </View>
                                                    </View>

                                                    {/* Row Subtotal */}
                                                    <View style={styles.itemSubtotalRow}>
                                                        <Text style={styles.itemSubtotalLabel}>Item Total:</Text>
                                                        <Text style={styles.itemSubtotalValue}>
                                                            ₹{itemSub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        {/* Bottom Add Item Shortcut */}
                                        <TouchableOpacity
                                            style={styles.dashedAddProductBtn}
                                            onPress={addLineItem}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={16} color="#F06A8C" strokeWidth={2.5} />
                                            <Text style={styles.dashedAddProductText}>Add Another Product</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* 3. Payment Mode Selector */}
                                    <View style={styles.formSectionBox}>
                                        <Text style={styles.formSectionHeading}>3. PAYMENT METHOD</Text>
                                        <View style={styles.paymentModePillsRow}>
                                            {PAYMENT_MODES.map((mode) => {
                                                const active = paymentMode === mode;
                                                return (
                                                    <TouchableOpacity
                                                        key={mode}
                                                        style={[
                                                            styles.payModePill,
                                                            active && styles.payModePillActive
                                                        ]}
                                                        onPress={() => setPaymentMode(mode)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text style={[
                                                            styles.payModePillText,
                                                            active && styles.payModePillTextActive
                                                        ]}>
                                                            {mode}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* 4. Discount & Tax Calculation Card (Clean Integrated Layout - No odd gray box) */}
                                    <View style={styles.calcSummaryCard}>
                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>Subtotal</Text>
                                            <Text style={styles.calcValue}>₹{calculatedSubtotal.toFixed(2)}</Text>
                                        </View>

                                        {/* Clean Seamless Special Discount Row */}
                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>Special Discount</Text>
                                            <View style={styles.inlineDiscountRow}>
                                                <Text style={[
                                                    styles.discountPrefix,
                                                    discountValue > 0 ? { color: '#E53935' } : { color: '#888' }
                                                ]}>
                                                    {discountValue > 0 ? '- ₹' : '₹'}
                                                </Text>
                                                <TextInput
                                                    style={[
                                                        styles.cleanDiscountInput,
                                                        discountValue > 0 && { color: '#E53935' }
                                                    ]}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor="#A0A0A0"
                                                    value={discount}
                                                    onChangeText={setDiscount}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>CGST (2.5%)</Text>
                                            <Text style={styles.calcValue}>+ ₹{cgstAmount.toFixed(2)}</Text>
                                        </View>

                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>SGST (2.5%)</Text>
                                            <Text style={styles.calcValue}>+ ₹{sgstAmount.toFixed(2)}</Text>
                                        </View>

                                        <View style={styles.dashedDivider} />

                                        <View style={styles.calcGrandTotalRow}>
                                            <Text style={styles.calcGrandTotalLabel}>GRAND TOTAL</Text>
                                            <Text style={styles.calcGrandTotalValue}>
                                                ₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        {/* Pinned Submit Button */}
                        <View style={styles.createModalFooter}>
                            <TouchableOpacity
                                style={styles.createSubmitBtn}
                                onPress={handleCreateSaleSubmit}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#FFFFFF" />
                                        <Text style={styles.createSubmitBtnText}>
                                            Generate Invoice · ₹{calculatedGrandTotal.toFixed(0)}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* 8. PRODUCT CATALOG PICKER MODAL (ERP Standard)*/}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={productPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setProductPickerVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.productPickerCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Header */}
                        <View style={styles.billModalHeader}>
                            <View style={styles.billModalHeaderLeft}>
                                <Text style={styles.billModalTitle}>Select Rice Product</Text>
                                <Text style={styles.billModalSubtitle}>Choose from inventory catalog</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.billCloseBtn}
                                onPress={() => setProductPickerVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar in Picker */}
                        <View style={styles.pickerSearchRow}>
                            <Search size={16} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search brand or rice variety..."
                                placeholderTextColor="#A0A0A0"
                                style={styles.pickerSearchInput}
                                value={productPickerSearch}
                                onChangeText={setProductPickerSearch}
                            />
                            {productPickerSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setProductPickerSearch('')}>
                                    <X size={15} color="#888" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Category Filter Chips - Fixed height with NO large gap */}
                        <View style={styles.pickerCategoryWrapper}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pickerCategoryScroll}
                                style={{ flexGrow: 0 }}
                            >
                                {productCategories.map((cat) => {
                                    const active = productPickerCategory === cat;
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.pickerCategoryChip, active && styles.pickerCategoryChipActive]}
                                            onPress={() => setProductPickerCategory(cat)}
                                        >
                                            <Text style={[styles.pickerCategoryText, active && styles.pickerCategoryTextActive]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Products List (Spacious & Prominent Cards) */}
                        <ScrollView
                            style={styles.pickerProductsScroll}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            {filteredProductsList.map((p) => {
                                const inStock = (p.stock || 0) > 0;
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={styles.productCatalogItem}
                                        onPress={() => handleSelectProduct(p)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Large Prominent Product Illustration Box */}
                                        <View style={styles.catalogItemIcon}>
                                            <Package size={26} color="#F06A8C" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.catalogItemName}>
                                                {p.brand ? `${p.brand} ` : ''}{p.productName}
                                            </Text>
                                            <View style={styles.catalogItemMetaRow}>
                                                <View style={styles.bagWeightPill}>
                                                    <Text style={styles.bagWeightPillText}>{p.bagSizeKg || 25}kg Bag</Text>
                                                </View>
                                                <View style={[
                                                    styles.catalogStockBadge,
                                                    { backgroundColor: inStock ? '#E8F5E9' : '#FFEBEE' }
                                                ]}>
                                                    <Text style={[
                                                        styles.catalogStockText,
                                                        { color: inStock ? '#2E7D32' : '#C62828' }
                                                    ]}>
                                                        {inStock ? `In Stock: ${p.stock} bags` : 'Out of Stock'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.catalogItemPriceCol}>
                                            <Text style={styles.catalogItemPrice}>₹{p.sellingPrice || 0}</Text>
                                            <Text style={styles.catalogItemPerBag}>/ bag</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {filteredProductsList.length === 0 && (
                                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                    <Package size={40} color="#D0D0D0" />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#555', marginTop: 10 }}>
                                        No Products Found
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                                        Try adjusting your search or category filter.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// STYLESHEET (Clean Native Typography & Layout)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 48, // Moved down to the position of new invoice button
        paddingBottom: 95, // Adequate clearance for bottom dock
    },
    header: {
        marginBottom: 14,
        paddingTop: 0,
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    headerSubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    topActionBar: {
        marginBottom: 16,
    },
    newSaleBtn: {
        width: '100%',
        height: 44,
        backgroundColor: '#F06A8C', // Pink accent per DESIGN.md Screen 3
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 999,
        elevation: 2,
        shadowColor: '#F06A8C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        gap: 6,
    },
    newSaleBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ─────────────────────────────────────────────
    // KPI GRID STYLES
    // ─────────────────────────────────────────────
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginBottom: 16,
    },
    kpiCard: {
        width: '48.2%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    kpiHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    kpiIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    trendBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#2E7D32',
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginBottom: 3,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // ─────────────────────────────────────────────
    // SALES TREND CHART STYLES
    // ─────────────────────────────────────────────
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    chartSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    chartTag: {
        backgroundColor: '#FBE8F0',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
    },
    chartTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F06A8C',
    },
    chartBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingTop: 24,
    },
    chartCol: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
    },
    peakTooltip: {
        position: 'absolute',
        top: 0,
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        zIndex: 5,
    },
    peakTooltipText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    barTrack: {
        width: 14,
        height: 75,
        backgroundColor: '#F5F5F7',
        borderRadius: 7,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        backgroundColor: '#F5C6D8',
        borderRadius: 7,
    },
    barFillPeak: {
        backgroundColor: '#F06A8C',
    },
    barDayLabel: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#8A8A8A',
        marginTop: 6,
    },
    barDayLabelPeak: {
        color: '#1A1A1A',
        fontWeight: '700',
    },

    // ─────────────────────────────────────────────
    // INVOICES LIST SECTION
    // ─────────────────────────────────────────────
    invoicesSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    invoiceCountPill: {
        backgroundColor: '#EAEAEA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    invoiceCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#555',
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E8E8EC',
        gap: 4,
    },
    sortBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#444',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        marginBottom: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#1A1A1A',
    },
    invoicesListWrapper: {
        gap: 10,
    },
    invoiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    invoiceAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    invoiceCenterInfo: {
        flex: 1,
    },
    invoiceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    billNumberText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    paymentBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    paymentBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
    },
    customerNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444444',
        marginBottom: 2,
    },
    invoiceTimeText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    invoiceTrailing: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 6,
    },
    invoiceAmountText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    loadingContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 10,
    },
    emptySubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        textAlign: 'center',
        marginTop: 4,
    },

    // ─────────────────────────────────────────────
    // MODAL COMMON BACKDROP
    // ─────────────────────────────────────────────
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalGrabHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#DCDCDC',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 10,
    },

    // ─────────────────────────────────────────────
    // INVOICE BILL VIEWER MODAL
    // ─────────────────────────────────────────────
    billModalCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    billModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    billModalHeaderLeft: {
        flex: 1,
    },
    billModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billModalSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    billCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFEFEF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    billScrollContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    billPaper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    billStoreBanner: {
        alignItems: 'center',
        marginBottom: 10,
    },
    billStoreName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    billStoreMeta: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    dashedDivider: {
        width: '100%',
        height: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        marginVertical: 10,
    },
    billMetaGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    billMetaCol: {
        flex: 1,
    },
    billMetaLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    billMetaValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billCustomerBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9F9FB',
        borderRadius: 14,
        padding: 10,
        marginVertical: 4,
    },
    billCustomerName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billCustomerPhone: {
        fontSize: 11,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    billStatusStamp: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1.5,
    },
    billStampPaid: {
        borderColor: '#2E7D32',
        backgroundColor: '#E8F5E9',
    },
    billStampPending: {
        borderColor: '#E65100',
        backgroundColor: '#FFF3E0',
    },
    billStampText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    billStampTextPaid: {
        color: '#2E7D32',
    },
    billStampTextPending: {
        color: '#E65100',
    },
    billTableHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    billColHeader: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.4,
    },
    billTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
    },
    billItemName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billItemUnit: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    billItemQty: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billItemRate: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#555555',
    },
    billItemTotal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    noItemsText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#8A8A8A',
        paddingVertical: 12,
    },
    billSummaryBox: {
        paddingTop: 4,
    },
    billSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    billSummaryLabel: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#666666',
    },
    billSummaryValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billGrandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    billGrandTotalLabel: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billGrandTotalValue: {
        fontSize: 19,
        fontWeight: '700',
        color: '#F06A8C',
    },
    billFooterNote: {
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
    },
    billFooterNoteText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#666',
    },
    billFooterThanks: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#8A8A8A',
        marginTop: 2,
    },
    billActionRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        paddingTop: 8,
    },
    billShareBtn: {
        flex: 1,
        height: 44,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E8EC',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    billShareBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    billDoneBtn: {
        flex: 1.5,
        height: 44,
        borderRadius: 999,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    billDoneBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ─────────────────────────────────────────────
    // CREATE SALE / POS MODAL STYLES
    // ─────────────────────────────────────────────
    createModalCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    },
    createFormScroll: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    formSectionBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    formSectionHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    changeCustTextBtn: {
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    changeCustText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#F06A8C',
    },

    // Customer Dropdown Styles
    customerInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F7F9',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 42,
        gap: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    custTextInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#1A1A1A',
    },
    custDropdownContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8E8EC',
        overflow: 'hidden',
        marginTop: 6,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    custDropdownScroll: {
        maxHeight: 170,
    },
    custDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
        gap: 10,
    },
    custItemAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    custItemName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    custItemSub: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    custCreditTag: {
        backgroundColor: '#F0F0F2',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    custCreditTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#555',
    },
    selectedCustomerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    selectedCustAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#C8E6C9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    selectedCustName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1B5E20',
    },
    selectedCustPhone: {
        fontSize: 11,
        fontWeight: '500',
        color: '#2E7D32',
        marginTop: 1,
    },
    selectedCustCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Line Item Card Styles
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FBE8F0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    addItemBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#F06A8C',
    },
    itemRowCard: {
        backgroundColor: '#FAF7F2',
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    itemRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemRowIndex: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
    },
    itemDeleteBtn: {
        padding: 4,
    },
    productPickerTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderWidth: 1.5,
        borderColor: '#F5C6D8',
        borderStyle: 'dashed',
        marginBottom: 10,
        gap: 10,
    },
    productPickerTriggerText: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    selectedProductCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginBottom: 10,
        gap: 10,
    },
    productIconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#FBE8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedProdName: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    selectedProdMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    bagWeightPill: {
        backgroundColor: '#F0F0F2',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    bagWeightPillText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#555',
    },
    selectedProdStockText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#2E7D32',
    },
    changeProductText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F06A8C',
    },
    itemInputsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    inputColLeft: {
        flex: 1.1,
        minWidth: 0,
    },
    inputColRight: {
        flex: 1,
        minWidth: 0,
    },
    inputMiniLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#8A8A8A',
        marginBottom: 3,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        overflow: 'hidden',
    },
    stepperBtn: {
        width: 32,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
    },
    stepperInput: {
        flex: 1,
        height: '100%',
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    priceTextInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 40,
        paddingHorizontal: 10,
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    itemSubtotalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 6,
        paddingTop: 2,
    },
    itemSubtotalLabel: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#666',
    },
    itemSubtotalValue: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    dashedAddProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#F5C6D8',
        borderStyle: 'dashed',
        backgroundColor: '#FFF8FA',
        gap: 6,
        marginTop: 4,
    },
    dashedAddProductText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#F06A8C',
    },

    // Payment Selector
    paymentModePillsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    payModePill: {
        flex: 1,
        height: 40,
        borderRadius: 999,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    payModePillActive: {
        backgroundColor: '#F06A8C',
        borderColor: '#F06A8C',
    },
    payModePillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
    },
    payModePillTextActive: {
        color: '#FFFFFF',
    },

    // Calculation Card (Clean Seamless Special Discount)
    calcSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    calcLabel: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#666666',
    },
    calcValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    inlineDiscountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    discountPrefix: {
        fontSize: 13,
        fontWeight: '700',
    },
    cleanDiscountInput: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'right',
        minWidth: 45,
        paddingVertical: 0,
        paddingHorizontal: 2,
    },
    calcGrandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    calcGrandTotalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    calcGrandTotalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F06A8C',
    },
    createModalFooter: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
    },
    createSubmitBtn: {
        height: 48,
        backgroundColor: '#F06A8C',
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 2,
        shadowColor: '#F06A8C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    createSubmitBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ─────────────────────────────────────────────
    // PRODUCT CATALOG PICKER SUB-MODAL
    // ─────────────────────────────────────────────
    productPickerCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '82%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    },
    pickerSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        gap: 8,
        marginBottom: 8,
    },
    pickerSearchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#1A1A1A',
    },
    pickerCategoryWrapper: {
        height: 38,
        marginBottom: 8,
    },
    pickerCategoryScroll: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center',
    },
    pickerCategoryChip: {
        height: 32,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerCategoryChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    pickerCategoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
    pickerCategoryTextActive: {
        color: '#FFFFFF',
    },
    pickerProductsScroll: {
        flex: 1,
        paddingHorizontal: 16,
    },
    productCatalogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        gap: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    catalogItemIcon: {
        width: 52,
        height: 52,
        borderRadius: 15,
        backgroundColor: '#FBE8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    catalogItemName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    catalogItemMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    catalogItemWeight: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#666',
    },
    catalogStockBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    catalogStockText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    catalogItemPriceCol: {
        alignItems: 'flex-end',
    },
    catalogItemPrice: {
        fontSize: 16.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    catalogItemPerBag: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8A8A8A',
    },
});

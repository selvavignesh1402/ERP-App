import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, ScrollView,
    Platform, Share
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Plus, Search, ShoppingBag, CheckCircle2, Clock,
    ArrowUpDown, ChevronRight, ChevronDown, ChevronUp, X, User,
    FileText, Trash2, Share2, Sparkles, Check, Package, Minus,
    Printer, Settings2, RotateCcw, Eye, Copy, Sliders, Cloud, CloudOff, RefreshCw, Wifi, WifiOff,
    Truck, Calendar, Store, AlertTriangle, Phone, MapPin
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import ThermalReceipt from '../../src/components/ThermalReceipt';
import PrintSettingsModal, { PrintSettings } from '../../src/components/PrintSettingsModal';
import api from '../../src/services/api';
import { syncService } from '../../src/services/syncService';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CREDIT', 'PARTIAL'] as const;
type PaymentMode = typeof PAYMENT_MODES[number];

export default function SalesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        action?: string;
        customerId?: string;
        customerName?: string;
        customerPhone?: string;
        searchCustomer?: string;
    }>();

    const [salesList, setSalesList] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [salesMainTab, setSalesMainTab] = useState<'INVOICES' | 'SALES_ORDERS'>('INVOICES');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'date' | 'amountDesc' | 'status'>('date');

    // Sales Orders Search, Sort and Detail Modal State
    const [soSearchQuery, setSoSearchQuery] = useState('');
    const [soSortOption, setSoSortOption] = useState<'date' | 'amountDesc' | 'status'>('date');
    const [selectedSalesOrder, setSelectedSalesOrder] = useState<any | null>(null);
    const [salesOrderDetailModalVisible, setSalesOrderDetailModalVisible] = useState(false);

    // Interactive Thermal Invoice Bill Viewer State
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [billItems, setBillItems] = useState<any[]>([]);
    const [loadingBillItems, setLoadingBillItems] = useState(false);
    const [billModalVisible, setBillModalVisible] = useState(false);
    const [isReprintMode, setIsReprintMode] = useState(false);
    const [printingReceipt, setPrintingReceipt] = useState(false);
    const [printSuccessToast, setPrintSuccessToast] = useState<string | null>(null);

    // Thermal Printer Settings State
    const [printSettingsModalVisible, setPrintSettingsModalVisible] = useState(false);
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        printerType: 'BLUETOOTH',
        selectedDevice: 'PT-210_BT Thermal (Remembered)',
        paperSize: '58mm',
        fontSize: 'normal',
        copies: 1,
        options: {
            showLogo: true,
            showGst: true,
            showCustomer: true,
            showPayment: true,
            showQr: true,
            showThanks: true,
        },
    });

    // Create New Invoice / POS Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [orderBookingMode, setOrderBookingMode] = useState<'SALES_ORDER' | 'INSTANT_INVOICE'>('SALES_ORDER');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
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
    const [paidAmountInput, setPaidAmountInput] = useState('');
    const [discount, setDiscount] = useState('0');
    const [lineItems, setLineItems] = useState<any[]>([
        { productId: null as number | null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingModalData, setLoadingModalData] = useState(false);

    // ─────────────────────────────────────────────
    // OFFLINE SYNC HOOK
    // ─────────────────────────────────────────────
    const { isOnline, pendingCount, isSyncing, syncNow, refreshPendingCount } = useOfflineSync();

    // ─────────────────────────────────────────────
    // FETCH SALES DATA & SALES ORDERS
    // ─────────────────────────────────────────────
    const fetchSalesOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/sales-orders');
            setSalesOrders(res.data || []);
        } catch (e) {
            console.warn('Failed to fetch sales orders:', e);
        }
    }, []);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            if (isOnline) {
                const response = await api.get('/sales');
                const data = response.data || [];
                setSalesList(data);
                await syncService.cacheSalesHistory(1, data);
            } else {
                const cached = await syncService.getCachedSalesHistory(1);
                setSalesList(cached);
            }
        } catch (error) {
            console.warn('Network issue fetching sales, falling back to local storage cache:', error);
            const cached = await syncService.getCachedSalesHistory(1);
            setSalesList(cached);
        } finally {
            setLoading(false);
            refreshPendingCount();
        }
    }, [isOnline, refreshPendingCount]);

    useEffect(() => {
        fetchSales();
        fetchSalesOrders();
    }, [fetchSales, fetchSalesOrders]);

    useFocusEffect(
        useCallback(() => {
            fetchSales();
            fetchSalesOrders();
        }, [fetchSales, fetchSalesOrders])
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
    // FILTERED & SEARCHED SALES ORDERS
    // ─────────────────────────────────────────────
    const filteredSalesOrders = useMemo(() => {
        let list = salesOrders;

        if (soSearchQuery.trim()) {
            const q = soSearchQuery.toLowerCase().trim();
            list = list.filter((order: any) =>
                (order.orderNumber || '').toLowerCase().includes(q) ||
                (order.customer?.customerName || '').toLowerCase().includes(q) ||
                (order.salesperson?.name || '').toLowerCase().includes(q) ||
                (order.status || '').toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            if (soSortOption === 'amountDesc') {
                return (parseFloat(b.grandTotal) || 0) - (parseFloat(a.grandTotal) || 0);
            }
            if (soSortOption === 'status') {
                return (a.status || '').localeCompare(b.status || '');
            }
            const tA = a.orderDate ? new Date(a.orderDate).getTime() : (a.id || 0);
            const tB = b.orderDate ? new Date(b.orderDate).getTime() : (b.id || 0);
            return tB - tA;
        });
    }, [salesOrders, soSearchQuery, soSortOption]);

    // ─────────────────────────────────────────────
    // INVOICE BILL VIEWER & THERMAL PRINTING
    // ─────────────────────────────────────────────
    const openInvoiceBill = async (sale: any, asReprint: boolean = false) => {
        setSelectedBill(sale);
        setIsReprintMode(asReprint);
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

    const handleTriggerPrint = async (customSettings?: PrintSettings) => {
        const activeSettings = customSettings || printSettings;
        setPrintingReceipt(true);
        try {
            // Simulate sending ESC/POS raw bytes to thermal printer over Bluetooth/USB
            await new Promise(r => setTimeout(r, 1000));
            const target = activeSettings.printerType === 'BLUETOOTH' ? activeSettings.selectedDevice : `${activeSettings.printerType} Thermal`;
            const copiesText = activeSettings.copies > 1 ? `${activeSettings.copies} copies` : '1 copy';
            const duplicateText = isReprintMode ? ' (Duplicate)' : '';
            
            setPrintSuccessToast(`Printed ${copiesText} on ${target}${duplicateText}`);
            setTimeout(() => setPrintSuccessToast(null), 3500);

            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).print === 'function') {
                // Allows browser print if requested
            }
        } catch (err) {
            Alert.alert('Printing Error', 'Could not send raw receipt commands to thermal printer.');
        } finally {
            setPrintingReceipt(false);
        }
    };

    const handleShareBill = async () => {
        if (!selectedBill) return;
        try {
            const is58 = printSettings.paperSize === '58mm';
            const itemsText = billItems.map((it: any) => {
                const name = it.product?.productName || it.productName || 'Rice';
                const qty = it.quantity || 1;
                const price = it.price || 0;
                return `• ${name} x ${qty} = ₹${(qty * price).toFixed(0)}`;
            }).join('\n');

            const billText = `🌾 *SRI LAKSHMI RICE TRADERS*\n` +
                `Tax Invoice: ${selectedBill.billNumber || `INV-${selectedBill.id}`}${isReprintMode ? ' (DUPLICATE)' : ''}\n` +
                `Customer: ${selectedBill.customerName || 'Walk-in Customer'}\n` +
                `Date: ${new Date(selectedBill.saleDate).toLocaleString('en-IN')}\n` +
                `-----------------------------\n` +
                `${itemsText}\n` +
                `-----------------------------\n` +
                `Total Amount: ₹${parseFloat(selectedBill.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `Payment: ${selectedBill.paymentMode} (${selectedBill.paymentMode === 'CREDIT' ? '⚠️ BALANCE DUE' : '✓ PAID'})\n` +
                `Thank you for your business! 🙏`;

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
    const openCreateModal = async (preselectedCustomer?: any) => {
        setCreateModalVisible(true);
        if (preselectedCustomer) {
            setSelectedCustomer(preselectedCustomer);
            setCustomerSearch(preselectedCustomer.customerName || '');
        } else {
            setSelectedCustomer(null);
            setCustomerSearch('');
        }
        setCustomerDropdownOpen(false); // Closed by default per user request
        setPaymentMode('CASH');
        setPaidAmountInput('');
        setDiscount('0');
        setLineItems([
            { productId: null as number | null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
        ]);
        setLoadingModalData(true);
        try {
            if (isOnline) {
                const [prodRes, custRes] = await Promise.all([
                    api.get('/products'),
                    api.get('/customers'),
                ]);
                const activeProds = (prodRes.data || []).filter((p: any) => p.status === 'ACTIVE' || !p.status);
                const custs = custRes.data || [];
                setProducts(activeProds);
                setCustomers(custs);
                await syncService.cacheCatalog(1, activeProds, custs);

                // If customer was passed by id, ensure full customer object from list is linked
                if (preselectedCustomer?.id) {
                    const matched = custs.find((c: any) => String(c.id) === String(preselectedCustomer.id));
                    if (matched) {
                        setSelectedCustomer(matched);
                        setCustomerSearch(matched.customerName);
                    }
                }
            } else {
                const cached = await syncService.getCachedCatalog(1);
                setProducts(cached.products);
                setCustomers(cached.customers);
                if (preselectedCustomer?.id) {
                    const matched = cached.customers.find((c: any) => String(c.id) === String(preselectedCustomer.id));
                    if (matched) {
                        setSelectedCustomer(matched);
                        setCustomerSearch(matched.customerName);
                    }
                }
            }
        } catch (error) {
            console.warn('Network issue loading catalog, loading from offline storage:', error);
            const cached = await syncService.getCachedCatalog(1);
            setProducts(cached.products);
            setCustomers(cached.customers);
        } finally {
            setLoadingModalData(false);
        }
    };

    // Auto-open POS / filter sales when routed with parameters (e.g. from Field Sales)
    useEffect(() => {
        if (params.searchCustomer) {
            setSearchQuery(params.searchCustomer);
        }
        if (params.action === 'new' || params.customerId) {
            const cust = params.customerId ? {
                id: Number(params.customerId),
                customerName: params.customerName || 'Store Customer',
                phoneNumber: params.customerPhone || '',
            } : undefined;
            openCreateModal(cust);
        }
    }, [params.action, params.customerId, params.customerName, params.customerPhone, params.searchCustomer]);

    const addLineItem = () => {
        setLineItems(prev => [
            ...prev,
            { productId: null, productName: '', brand: '', bagSizeKg: 25, quantity: '1', price: '', stock: 0 }
        ]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length <= 1) return;
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateLineItem = (index: number, updates: any) => {
        setLineItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updates };
            return updated;
        });
    };

    const stepQuantity = (index: number, delta: number) => {
        const current = parseFloat(lineItems[index].quantity) || 1;
        const next = Math.max(1, current + delta);
        updateLineItem(index, { quantity: String(next) });
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

    // Partial / Credit Payment breakdown
    const effectivePaidAmount = useMemo(() => {
        if (paymentMode === 'CASH' || paymentMode === 'UPI' || paymentMode === 'CARD') {
            return calculatedGrandTotal;
        }
        if (paymentMode === 'CREDIT') {
            return 0;
        }
        // PARTIAL
        const entered = parseFloat(paidAmountInput);
        return isNaN(entered) ? 0 : Math.min(calculatedGrandTotal, entered);
    }, [paymentMode, calculatedGrandTotal, paidAmountInput]);

    const effectiveBalanceDue = useMemo(() => {
        return Math.max(0, calculatedGrandTotal - effectivePaidAmount);
    }, [calculatedGrandTotal, effectivePaidAmount]);

    const handleCreateSaleSubmit = async () => {
        const validItems = lineItems.filter(it => it.productId != null && (parseFloat(it.quantity) || 0) > 0);
        if (validItems.length === 0) {
            Alert.alert('Missing Products', 'Please select at least one product and enter a valid quantity.');
            return;
        }

        if (orderBookingMode === 'SALES_ORDER') {
            if (!selectedCustomer) {
                Alert.alert('Customer Required', 'Please select a customer to book a Sales Order.');
                return;
            }
            setSubmitting(true);
            try {
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                const payload = {
                    customerId: selectedCustomer.id,
                    expectedDeliveryDate: expectedDeliveryDate || tomorrow,
                    discount: discountValue,
                    notes: orderNotes.trim(),
                    items: validItems.map(it => ({
                        productId: it.productId,
                        quantity: parseInt(it.quantity) || 1,
                        unitPrice: parseFloat(it.price) || 0
                    }))
                };
                const res = await api.post('/api/sales-orders', payload);
                Alert.alert(
                    'Sales Order Placed! 📦',
                    `Order ${res.data.orderNumber} successfully booked for ${selectedCustomer.customerName}.\nIt has been queued in Warehouse Fulfillment for packing & delivery dispatch.`,
                    [{ text: 'OK', onPress: () => { setCreateModalVisible(false); fetchSalesOrders(); } }]
                );
            } catch (err: any) {
                Alert.alert('Order Booking Failed', err.response?.data?.message || 'Could not place sales order');
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if ((paymentMode === 'CREDIT' || paymentMode === 'PARTIAL') && !selectedCustomer) {
            Alert.alert('Customer Required', 'Please select a registered customer for Credit / Partial payment tracking.');
            return;
        }

        if ((paymentMode === 'CREDIT' || paymentMode === 'PARTIAL') && selectedCustomer) {
            const limit = parseFloat(selectedCustomer.creditLimit) || 0;
            const balance = parseFloat(selectedCustomer.creditBalance) || 0;
            if (limit > 0 && balance + effectiveBalanceDue > limit) {
                Alert.alert(
                    'Credit Limit Exceeded',
                    `This customer's limit is ₹${limit.toLocaleString('en-IN')}.\nCurrent balance: ₹${balance.toLocaleString('en-IN')}.\nAdding remaining balance of ₹${effectiveBalanceDue.toFixed(2)} exceeds the credit limit!`
                );
                return;
            }
        }

        setSubmitting(true);
        const enrichedItems = validItems.map(it => ({
            id: it.productId,
            productId: it.productId,
            productName: it.productName,
            brand: it.brand,
            bagSizeKg: it.bagSizeKg || 25,
            unit: 'Bag',
            quantity: parseFloat(it.quantity),
            price: parseFloat(it.price)
        }));

        try {
            if (isOnline) {
                const response = await api.post('/sales', {
                    customerId: selectedCustomer?.id ?? null,
                    customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode: paymentMode === 'PARTIAL' ? 'CREDIT' : paymentMode,
                    discount: discountValue,
                    items: validItems.map(it => ({
                        productId: it.productId,
                        quantity: parseFloat(it.quantity),
                        price: parseFloat(it.price)
                    }))
                });

                const createdSale = response.data;
                const enrichedBill = {
                    ...createdSale,
                    paidAmount: effectivePaidAmount,
                    balanceDue: effectiveBalanceDue,
                    customer: selectedCustomer || createdSale.customer,
                    customerName: selectedCustomer?.customerName || createdSale.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode,
                    syncStatus: 'SYNCED',
                    isOffline: false,
                };

                setSelectedBill(enrichedBill);
                setBillItems(enrichedItems);
                setIsReprintMode(false);
                setCreateModalVisible(false);
                setBillModalVisible(true);
                fetchSales();
            } else {
                // Device is Offline -> Create local offline sale
                const offlineSale = await syncService.createOfflineSale(1, {
                    customerId: selectedCustomer?.id ?? null,
                    customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode: paymentMode === 'PARTIAL' ? 'CREDIT' : paymentMode,
                    discount: discountValue,
                    total: calculatedSubtotal,
                    cgst: cgstAmount,
                    sgst: sgstAmount,
                    grandTotal: calculatedGrandTotal,
                    items: enrichedItems,
                });

                const enrichedBill = {
                    ...offlineSale,
                    paidAmount: effectivePaidAmount,
                    balanceDue: effectiveBalanceDue,
                    customer: selectedCustomer,
                    customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode,
                };

                setSelectedBill(enrichedBill);
                setBillItems(enrichedItems);
                setIsReprintMode(false);
                setCreateModalVisible(false);
                setBillModalVisible(true);
                setSalesList(prev => [offlineSale, ...prev]);
                await refreshPendingCount();
            }
        } catch (error: any) {
            console.warn('Online sale creation failed, saving offline locally:', error);
            // Network fallback to offline sale
            try {
                const offlineSale = await syncService.createOfflineSale(1, {
                    customerId: selectedCustomer?.id ?? null,
                    customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode: paymentMode === 'PARTIAL' ? 'CREDIT' : paymentMode,
                    discount: discountValue,
                    total: calculatedSubtotal,
                    cgst: cgstAmount,
                    sgst: sgstAmount,
                    grandTotal: calculatedGrandTotal,
                    items: enrichedItems,
                });

                const enrichedBill = {
                    ...offlineSale,
                    paidAmount: effectivePaidAmount,
                    balanceDue: effectiveBalanceDue,
                    customer: selectedCustomer,
                    customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                    paymentMode,
                };

                setSelectedBill(enrichedBill);
                setBillItems(enrichedItems);
                setIsReprintMode(false);
                setCreateModalVisible(false);
                setBillModalVisible(true);
                setSalesList(prev => [offlineSale, ...prev]);
                await refreshPendingCount();
            } catch (offlineErr) {
                Alert.alert('Sale Error', 'Could not save invoice offline.');
            }
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

                    {/* Right-side Cloud Sync Status Icon */}
                    <View style={styles.syncIconBtn}>
                        {isOnline ? (
                            <Cloud size={20} color="#2E7D32" strokeWidth={2.3} />
                        ) : (
                            <CloudOff size={20} color="#D32F2F" strokeWidth={2.3} />
                        )}
                    </View>
                </FadeInDown>

                {/* 1.5 Pending Offline Sync Banner (appears if items waiting to sync) */}
                {pendingCount > 0 && (
                    <FadeInDown delay={35} style={styles.syncBanner}>
                        <View style={styles.syncBannerLeft}>
                            <Cloud size={18} color="#E65100" />
                            <View>
                                <Text style={styles.syncBannerTitle}>{pendingCount} Offline {pendingCount === 1 ? 'Invoice' : 'Invoices'} Queued</Text>
                                <Text style={styles.syncBannerSub}>Ready to synchronize with server</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.syncNowBtn, isSyncing && { opacity: 0.7 }]}
                            onPress={async () => {
                                const res = await syncNow();
                                if (res.success) {
                                    Alert.alert('Sync Complete', `Successfully synced ${res.syncedCount} offline ${res.syncedCount === 1 ? 'invoice' : 'invoices'} to the cloud.`);
                                    fetchSales();
                                } else {
                                    Alert.alert('Sync Failed', 'Could not reach server. Will retry automatically when network is stable.');
                                }
                            }}
                            disabled={isSyncing}
                            activeOpacity={0.8}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <RefreshCw size={13} color="#FFFFFF" />
                                    <Text style={styles.syncNowBtnText}>Sync Now</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </FadeInDown>
                )}

                {/* 2. Redesigned Top Action Cards */}
                <FadeInDown delay={50} style={styles.topActionContainer}>
                    <View style={styles.topActionCardWrapper}>
                        {/* 1. New Sale / Order Card (Pink) */}
                        <TouchableOpacity
                            style={[styles.topActionCard, { backgroundColor: '#FFF0F5' }]}
                            onPress={() => openCreateModal()}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.topActionIconCircle, { backgroundColor: '#F04C74' }]}>
                                <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
                            </View>
                            <Text style={[styles.topActionTitle, { color: '#F04C74' }]}>New Sale / Order</Text>
                            <Text style={styles.topActionSubtitle}>Create invoice or order</Text>
                        </TouchableOpacity>

                        {/* 2. Fulfillment / Dispatch Hub Card (Blue) */}
                        <TouchableOpacity
                            style={[styles.topActionCard, { backgroundColor: '#F0F6FF' }]}
                            onPress={() => router.push('/delivery' as any)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.topActionIconCircle, { backgroundColor: '#0066FF' }]}>
                                <Package size={16} color="#FFFFFF" strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.topActionTitle, { color: '#0066FF' }]}>Fulfillment</Text>
                            <Text style={styles.topActionSubtitle}>Packing & dispatch hub</Text>
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* 3. Sales KPI Overview 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1: Total Sales */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <ShoppingBag size={18} color="#F06A8C" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Revenue</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            ₹{metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 2: Paid Cash/UPI */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <CheckCircle2 size={18} color="#2E7D32" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Paid / Collected</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            ₹{metrics.paidRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 3: Credit Balance Pending */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <Clock size={18} color="#E65100" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Pending Credit</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>
                            ₹{metrics.pendingCredit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 4: Total Invoices */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EDE7F6' }]}>
                                <FileText size={18} color="#7C3AED" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Invoices</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {metrics.totalInvoices} Bills
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

                {/* Main View Segment Switcher (Invoices vs Sales Orders) */}
                <FadeInDown delay={130} style={{ flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 20 }}>
                    <TouchableOpacity
                        style={[{ flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E0D8', alignItems: 'center' }, salesMainTab === 'INVOICES' && { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' }]}
                        onPress={() => setSalesMainTab('INVOICES')}
                        activeOpacity={0.8}
                    >
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#666' }, salesMainTab === 'INVOICES' && { color: '#FFFFFF' }]}>
                            🧾 Invoices
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[{ flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E0D8', alignItems: 'center' }, salesMainTab === 'SALES_ORDERS' && { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' }]}
                        onPress={() => setSalesMainTab('SALES_ORDERS')}
                        activeOpacity={0.8}
                    >
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#666' }, salesMainTab === 'SALES_ORDERS' && { color: '#FFFFFF' }]}>
                            📦 Sales Orders
                        </Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 5. Invoices OR Sales Orders Section */}
                {salesMainTab === 'SALES_ORDERS' ? (
                    <FadeInDown delay={140} style={styles.invoicesSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Text style={styles.sectionTitle}>Sales Orders</Text>
                                <View style={styles.invoiceCountPill}>
                                    <Text style={styles.invoiceCountText}>{filteredSalesOrders.length}</Text>
                                </View>
                            </View>

                            {/* Sort Trigger for Sales Orders */}
                            <TouchableOpacity
                                style={styles.sortBtn}
                                onPress={() => {
                                    if (soSortOption === 'date') setSoSortOption('amountDesc');
                                    else if (soSortOption === 'amountDesc') setSoSortOption('status');
                                    else setSoSortOption('date');
                                }}
                                activeOpacity={0.7}
                            >
                                <ArrowUpDown size={13} color="#444" />
                                <Text style={styles.sortBtnText}>
                                    {soSortOption === 'date' ? 'Latest' : soSortOption === 'amountDesc' ? 'Highest' : 'Status'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar for Sales Orders */}
                        <View style={styles.searchBar}>
                            <Search size={16} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search by order number, customer, sales rep..."
                                placeholderTextColor="#8A8A8A"
                                style={styles.searchInput}
                                value={soSearchQuery}
                                onChangeText={setSoSearchQuery}
                            />
                            {soSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSoSearchQuery('')}>
                                    <X size={16} color="#8A8A8A" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {filteredSalesOrders.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Package size={42} color="#D0D0D0" />
                                <Text style={styles.emptyTitle}>No Sales Orders Found</Text>
                                <Text style={styles.emptySubtitle}>Tap 'New Sale / Order' to book a sales order.</Text>
                            </View>
                        ) : (
                            <StaggerContainer stagger={25} delay={160}>
                                <View style={styles.invoicesListWrapper}>
                                    {filteredSalesOrders.map((order: any) => {
                                        const isCompleted = order.status === 'DELIVERED';
                                        const isTransit = order.status === 'OUT_FOR_DELIVERY';
                                        const isReady = order.status === 'READY_FOR_DELIVERY';
                                        const badgeBg = isCompleted ? '#ECFDF5' : isTransit ? '#F0F9FF' : isReady ? '#EDE9FE' : '#FFFBEB';
                                        const badgeColor = isCompleted ? '#059669' : isTransit ? '#0284C7' : isReady ? '#7C3AED' : '#D97706';

                                        const dateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

                                        return (
                                            <AnimatedPressable
                                                key={order.id}
                                                style={styles.invoiceCard}
                                                onPress={() => {
                                                    setSelectedSalesOrder(order);
                                                    setSalesOrderDetailModalVisible(true);
                                                }}
                                            >
                                                <View style={styles.invoiceCardTopRow}>
                                                    <View style={[styles.invoiceAvatar, { backgroundColor: badgeBg }]}>
                                                        <Package size={18} color={badgeColor} />
                                                    </View>

                                                    <View style={styles.invoiceCenterCol}>
                                                        <View style={styles.invoiceTitleRow}>
                                                            <Text style={styles.billNumberText} numberOfLines={1}>
                                                                {order.orderNumber}
                                                            </Text>
                                                            <View style={[styles.paymentBadge, { backgroundColor: badgeBg }]}>
                                                                <Text style={[styles.paymentBadgeText, { color: badgeColor }]}>
                                                                    {order.status.replace(/_/g, ' ')}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text style={styles.customerNameText} numberOfLines={1}>
                                                            {order.customer?.customerName || 'Store Customer'}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.invoiceTrailing}>
                                                        <Text style={[styles.invoiceAmountText, { color: '#1A1A1A' }]}>
                                                            ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
                                                        </Text>
                                                        <Text style={styles.invoiceTimeText}>
                                                            {dateStr}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Minimal Card Action */}
                                                <View style={styles.invoiceCardActionsRow}>
                                                    <TouchableOpacity
                                                        style={[styles.cardActionPill, { flex: 1, justifyContent: 'center' }]}
                                                        onPress={() => {
                                                            setSelectedSalesOrder(order);
                                                            setSalesOrderDetailModalVisible(true);
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Eye size={13} color="#1A1A1A" />
                                                        <Text style={styles.cardActionPillText}>View Details</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </AnimatedPressable>
                                        );
                                    })}
                                </View>
                            </StaggerContainer>
                        )}
                    </FadeInDown>
                ) : (
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
                                <ArrowUpDown size={13} color="#444" />
                                <Text style={styles.sortBtnText}>
                                    {sortOption === 'date' ? 'Latest' : sortOption === 'amountDesc' ? 'Highest' : 'Mode'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar for Invoices */}
                        <View style={styles.searchBar}>
                            <Search size={16} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search by bill number, customer name, mode..."
                                placeholderTextColor="#8A8A8A"
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
                                <ActivityIndicator size="small" color="#F06A8C" />
                                <Text style={styles.loadingText}>Loading Sales History...</Text>
                            </View>
                        ) : filteredInvoices.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <ShoppingBag size={42} color="#D0D0D0" />
                                <Text style={styles.emptyTitle}>No Invoices Found</Text>
                                <Text style={styles.emptySubtitle}>Tap 'New Sale / Order' above to create your first bill.</Text>
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

                                        return (
                                            <AnimatedPressable
                                                key={sale.id || sale.clientReferenceId}
                                                style={styles.invoiceCard}
                                                onPress={() => openInvoiceBill(sale, false)}
                                            >
                                                {/* Top Row: Avatar, Bill No & Total */}
                                                <View style={styles.invoiceCardTopRow}>
                                                    <View style={[
                                                        styles.invoiceAvatar,
                                                        { backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0' }
                                                    ]}>
                                                        <FileText size={18} color={isPaid ? '#2E7D32' : '#E65100'} />
                                                    </View>

                                                    <View style={styles.invoiceCenterCol}>
                                                        <View style={styles.invoiceTitleRow}>
                                                            <Text style={styles.billNumberText} numberOfLines={1} ellipsizeMode="tail">
                                                                {sale.billNumber}
                                                            </Text>
                                                            {sale.syncStatus === 'PENDING_SYNC' || sale.isOffline ? (
                                                                <View style={styles.offlineBadge}>
                                                                    <Text style={styles.offlineBadgeText}>⏳ OFFLINE</Text>
                                                                </View>
                                                            ) : (
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
                                                            )}
                                                        </View>
                                                        <Text style={styles.customerNameText} numberOfLines={1} ellipsizeMode="tail">
                                                            {sale.customerName || sale.customer?.customerName || 'Walk-in Customer'}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.invoiceTrailing}>
                                                        <Text style={styles.invoiceAmountText}>
                                                            ₹{grandVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                        </Text>
                                                        <Text style={styles.invoiceTimeText}>
                                                            {formattedDate}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Card Action Pills: View, Reprint, Share */}
                                                <View style={styles.invoiceCardActionsRow}>
                                                    <TouchableOpacity
                                                        style={styles.cardActionPill}
                                                        onPress={() => openInvoiceBill(sale, false)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Eye size={13} color="#1A1A1A" />
                                                        <Text style={styles.cardActionPillText}>View</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.cardActionPill, { borderColor: '#F5C6D8', backgroundColor: '#FFF5F8' }]}
                                                        onPress={() => openInvoiceBill(sale, true)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <RotateCcw size={13} color="#F06A8C" />
                                                        <Text style={[styles.cardActionPillText, { color: '#F06A8C' }]}>Reprint</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.cardActionPill}
                                                        onPress={() => {
                                                            setSelectedBill(sale);
                                                            handleShareBill();
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Share2 size={13} color="#666" />
                                                        <Text style={[styles.cardActionPillText, { color: '#666' }]}>Share</Text>
                                                    </TouchableOpacity>
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
            {/* 6. REALISTIC THERMAL RECEIPT PREVIEW MODAL    */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={billModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setBillModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.thermalModalCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Top Header & Paper Format Switcher */}
                        <View style={styles.thermalModalHeader}>
                            <View style={styles.thermalHeaderLeft}>
                                <Text style={styles.thermalModalTitle}>
                                    {isReprintMode ? '🖨 Reprint Receipt' : '🧾 Thermal Receipt'}
                                </Text>
                                <Text style={styles.thermalModalSubtitle}>
                                    {isReprintMode ? 'Reprinting duplicate receipt' : 'Realistic thermal paper preview'}
                                </Text>
                            </View>

                            <View style={styles.thermalHeaderActions}>
                                {/* 58mm / 80mm Switcher */}
                                <View style={styles.paperSwitchGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.paperSwitchBtn,
                                            printSettings.paperSize === '58mm' && styles.paperSwitchBtnActive
                                        ]}
                                        onPress={() => setPrintSettings(p => ({ ...p, paperSize: '58mm' }))}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.paperSwitchText,
                                            printSettings.paperSize === '58mm' && styles.paperSwitchTextActive
                                        ]}>
                                            58mm
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.paperSwitchBtn,
                                            printSettings.paperSize === '80mm' && styles.paperSwitchBtnActive
                                        ]}
                                        onPress={() => setPrintSettings(p => ({ ...p, paperSize: '80mm' }))}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.paperSwitchText,
                                            printSettings.paperSize === '80mm' && styles.paperSwitchTextActive
                                        ]}>
                                            80mm
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Print Settings Trigger */}
                                <TouchableOpacity
                                    style={styles.settingsTriggerBtn}
                                    onPress={() => setPrintSettingsModalVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <Settings2 size={17} color="#1A1A1A" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.billCloseBtn}
                                    onPress={() => setBillModalVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <X size={18} color="#1A1A1A" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Print Feedback Toast */}
                        {printSuccessToast && (
                            <View style={styles.printToastBanner}>
                                <CheckCircle2 size={16} color="#2E7D32" />
                                <Text style={styles.printToastText}>{printSuccessToast}</Text>
                            </View>
                        )}

                        {/* Scrollable Realistic Thermal Receipt */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.thermalReceiptScroll}
                        >
                            {loadingBillItems ? (
                                <ActivityIndicator size="large" color="#F06A8C" style={{ marginVertical: 40 }} />
                            ) : selectedBill ? (
                                <ThermalReceipt
                                    bill={selectedBill}
                                    items={billItems}
                                    paperSize={printSettings.paperSize}
                                    fontSize={printSettings.fontSize}
                                    options={printSettings.options}
                                    isDuplicate={isReprintMode}
                                />
                            ) : null}
                        </ScrollView>

                        {/* Bottom Action Bar */}
                        <View style={styles.thermalModalFooter}>
                            {/* Primary Print Button */}
                            <TouchableOpacity
                                style={styles.thermalPrintBtn}
                                onPress={() => handleTriggerPrint()}
                                disabled={printingReceipt}
                                activeOpacity={0.85}
                            >
                                {printingReceipt ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Printer size={18} color="#FFFFFF" strokeWidth={2.2} />
                                        <Text style={styles.thermalPrintBtnText}>
                                            {isReprintMode ? 'Print Duplicate' : 'Print Receipt'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Secondary Actions */}
                            <View style={styles.thermalSecondaryActionsRow}>
                                <TouchableOpacity
                                    style={[styles.secondaryActionBtn, isReprintMode && styles.secondaryActionBtnActive]}
                                    onPress={() => {
                                        setIsReprintMode(!isReprintMode);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Copy size={15} color={isReprintMode ? '#F06A8C' : '#1A1A1A'} />
                                    <Text style={[styles.secondaryActionText, isReprintMode && { color: '#F06A8C', fontWeight: '700' }]}>
                                        {isReprintMode ? 'Original' : 'Duplicate'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={handleShareBill}
                                    activeOpacity={0.75}
                                >
                                    <Share2 size={15} color="#1A1A1A" />
                                    <Text style={styles.secondaryActionText}>Share</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={() => setPrintSettingsModalVisible(true)}
                                    activeOpacity={0.75}
                                >
                                    <Sliders size={15} color="#1A1A1A" />
                                    <Text style={styles.secondaryActionText}>Settings</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* 7. THERMAL PRINTER SETTINGS MODAL             */}
            {/* ───────────────────────────────────────────── */}
            <PrintSettingsModal
                visible={printSettingsModalVisible}
                onClose={() => setPrintSettingsModalVisible(false)}
                settings={printSettings}
                onSaveSettings={setPrintSettings}
                onTriggerPrint={async (s) => {
                    setPrintSettings(s);
                    await handleTriggerPrint(s);
                }}
            />

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
                                <Text style={styles.billModalTitle}>{orderBookingMode === 'SALES_ORDER' ? 'Book Sales Order' : 'New Instant Invoice'}</Text>
                                <Text style={styles.billModalSubtitle}>{orderBookingMode === 'SALES_ORDER' ? 'Queue order for warehouse packing & delivery' : 'Create direct POS counter bill'}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.billCloseBtn}
                                onPress={() => setCreateModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Order Type Toggle Switcher */}
                        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FAF7F2', borderBottomWidth: 1, borderBottomColor: '#E2E0D8' }}>
                            <TouchableOpacity
                                style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E0D8' }, orderBookingMode === 'SALES_ORDER' && { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' }]}
                                onPress={() => setOrderBookingMode('SALES_ORDER')}
                                activeOpacity={0.8}
                            >
                                <Text style={[{ fontSize: 11.5, fontWeight: '700', color: '#666' }, orderBookingMode === 'SALES_ORDER' && { color: '#FFF' }]}>
                                    📦 Book Sales Order (SO)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E0D8' }, orderBookingMode === 'INSTANT_INVOICE' && { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' }]}
                                onPress={() => setOrderBookingMode('INSTANT_INVOICE')}
                                activeOpacity={0.8}
                            >
                                <Text style={[{ fontSize: 11.5, fontWeight: '700', color: '#666' }, orderBookingMode === 'INSTANT_INVOICE' && { color: '#FFF' }]}>
                                    ⚡ Instant Counter Invoice
                                </Text>
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

                                    {/* 3. Conditional: Sales Order Delivery Details OR Instant Counter Payment Method */}
                                    {orderBookingMode === 'SALES_ORDER' ? (
                                        <View style={styles.formSectionBox}>
                                            <Text style={styles.formSectionHeading}>3. DELIVERY DISPATCH DETAILS</Text>
                                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#666', marginBottom: 4, letterSpacing: 0.3 }}>
                                                EXPECTED DELIVERY DATE
                                            </Text>
                                            <TextInput
                                                style={{ borderWidth: 1, borderColor: '#E2E0D8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#FAF7F2', marginBottom: 12, color: '#1A1A1A' }}
                                                placeholder={`e.g. ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`}
                                                placeholderTextColor="#999"
                                                value={expectedDeliveryDate}
                                                onChangeText={setExpectedDeliveryDate}
                                            />
                                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#666', marginBottom: 4, letterSpacing: 0.3 }}>
                                                DELIVERY INSTRUCTIONS / NOTES
                                            </Text>
                                            <TextInput
                                                style={{ borderWidth: 1, borderColor: '#E2E0D8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#FAF7F2', color: '#1A1A1A' }}
                                                placeholder="e.g. Deliver before 11 AM, handle carefully"
                                                placeholderTextColor="#999"
                                                value={orderNotes}
                                                onChangeText={setOrderNotes}
                                            />
                                        </View>
                                    ) : (
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

                                            {/* Partial / Split Payment Box */}
                                            {paymentMode === 'PARTIAL' && (
                                                <View style={styles.partialPayBox}>
                                                    <View style={styles.partialInputRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.partialLabel}>PAID AMOUNT (₹)</Text>
                                                            <TextInput
                                                                style={styles.partialTextInput}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor="#A0A0A0"
                                                                value={paidAmountInput}
                                                                onChangeText={setPaidAmountInput}
                                                            />
                                                        </View>
                                                        <View style={styles.partialBalanceCol}>
                                                            <Text style={styles.partialBalanceLabel}>BALANCE DUE</Text>
                                                            <Text style={styles.partialBalanceValue}>
                                                                ₹{effectiveBalanceDue.toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.partialHint}>
                                                        * Remaining ₹{effectiveBalanceDue.toFixed(2)} will be debited to {selectedCustomer?.customerName || 'Customer'}'s Outstanding Ledger.
                                                    </Text>
                                                </View>
                                            )}

                                            {paymentMode === 'CREDIT' && (
                                                <View style={styles.creditNoticeBox}>
                                                    <Text style={styles.creditNoticeText}>
                                                        💳 Full invoice total ₹{calculatedGrandTotal.toFixed(2)} will be debited to {selectedCustomer?.customerName || 'Customer'}'s Credit Ledger.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

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
                                style={[styles.createSubmitBtn, orderBookingMode === 'SALES_ORDER' && { backgroundColor: '#E65100' }]}
                                onPress={handleCreateSaleSubmit}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        {orderBookingMode === 'SALES_ORDER' ? (
                                            <Package size={18} color="#FFFFFF" />
                                        ) : (
                                            <Sparkles size={18} color="#FFFFFF" />
                                        )}
                                        <Text style={styles.createSubmitBtnText}>
                                            {orderBookingMode === 'SALES_ORDER'
                                                ? `Book Sales Order · ₹${calculatedGrandTotal.toFixed(0)}`
                                                : `Generate Invoice · ₹${calculatedGrandTotal.toFixed(0)}`}
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

            {/* ───────────────────────────────────────────── */}
            {/* 8. SALES ORDER DETAIL MODAL (Clean Essential Details) */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={salesOrderDetailModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSalesOrderDetailModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.productPickerCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Modal Header */}
                        <View style={styles.billModalHeader}>
                            <View style={styles.billModalHeaderLeft}>
                                <Text style={styles.billModalTitle}>{selectedSalesOrder?.orderNumber || 'Sales Order'}</Text>
                                <Text style={styles.billModalSubtitle}>
                                    Booked on {selectedSalesOrder?.orderDate ? new Date(selectedSalesOrder.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.billCloseBtn}
                                onPress={() => setSalesOrderDetailModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {selectedSalesOrder && (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                            >
                                {/* Status Banner */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 14 }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Fulfillment Status</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginTop: 2 }}>{selectedSalesOrder.status?.replace(/_/g, ' ')}</Text>
                                    </View>
                                    <View style={{ backgroundColor: selectedSalesOrder.status === 'DELIVERED' ? '#ECFDF5' : selectedSalesOrder.status === 'OUT_FOR_DELIVERY' ? '#F0F9FF' : '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: selectedSalesOrder.status === 'DELIVERED' ? '#A7F3D0' : selectedSalesOrder.status === 'OUT_FOR_DELIVERY' ? '#BAE6FD' : '#FDE68A' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: selectedSalesOrder.status === 'DELIVERED' ? '#059669' : selectedSalesOrder.status === 'OUT_FOR_DELIVERY' ? '#0284C7' : '#D97706' }}>
                                            {selectedSalesOrder.status?.replace(/_/g, ' ')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Customer & Rep Card */}
                                <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <Store size={16} color="#1A1A1A" />
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{selectedSalesOrder.customer?.customerName || 'Store Customer'}</Text>
                                    </View>
                                    {selectedSalesOrder.customer?.phoneNumber ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <Phone size={12} color="#059669" />
                                            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>{selectedSalesOrder.customer.phoneNumber}</Text>
                                        </View>
                                    ) : null}
                                    {selectedSalesOrder.customer?.address ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                            <MapPin size={12} color="#6B7280" style={{ marginTop: 2 }} />
                                            <Text style={{ fontSize: 11.5, color: '#6B7280', flex: 1 }}>{selectedSalesOrder.customer.address}</Text>
                                        </View>
                                    ) : null}

                                    {selectedSalesOrder.salesperson?.name ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                            <User size={12} color="#4B5563" />
                                            <Text style={{ fontSize: 11.5, color: '#4B5563', fontWeight: '600' }}>Booked by: {selectedSalesOrder.salesperson.name}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Ordered Items List */}
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 }}>Ordered Items</Text>
                                <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, borderWidth: 1, borderColor: '#EFEFEA', paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 }}>
                                    {(selectedSalesOrder.items || []).map((it: any, idx: number) => (
                                        <View key={it.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < (selectedSalesOrder.items?.length || 0) - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                                            <View style={{ flex: 1, paddingRight: 10 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{it.product?.productName || 'Rice Product'}</Text>
                                                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{it.orderedQuantity} Bags × ₹{it.unitPrice?.toLocaleString('en-IN') || 0}</Text>
                                            </View>
                                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1A1A1A' }}>
                                                ₹{(it.totalPrice || (it.orderedQuantity * (it.unitPrice || 0))).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Grand Total */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ECEBE4', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>Grand Total</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>
                                        ₹{(selectedSalesOrder.grandTotal || 0).toLocaleString('en-IN')}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={{ height: 44, borderRadius: 999, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}
                                    onPress={() => setSalesOrderDetailModalVisible(false)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Close</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingTop: 0,
    },
    headerLeft: {
        flex: 1,
    },
    syncIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
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
    topActionContainer: {
        marginBottom: 16,
    },
    topActionCardWrapper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        flexDirection: 'row',
        gap: 8,
        borderWidth: 1,
        borderColor: '#EFEFEA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    topActionCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topActionIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1.5,
    },
    topActionTitle: {
        fontSize: 12.5,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    topActionSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: '#777777',
        textAlign: 'center',
        lineHeight: 13.5,
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
        flexDirection: 'column',
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
    invoiceCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    invoiceAvatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        flexShrink: 0,
    },
    invoiceCenterCol: {
        flex: 1,
        marginRight: 8,
        justifyContent: 'center',
    },
    invoiceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    billNumberText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
        flexShrink: 1,
    },
    paymentBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        flexShrink: 0,
    },
    paymentBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
    },
    offlineBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFE0B2',
        flexShrink: 0,
    },
    offlineBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#E65100',
    },
    customerNameText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555555',
        marginTop: 2,
    },
    invoiceTrailing: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: 70,
    },
    invoiceAmountText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    invoiceTimeText: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
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

    // ─────────────────────────────────────────────
    // INVOICE CARD EXTRA ACTIONS
    // ─────────────────────────────────────────────
    invoiceCardActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F4',
    },
    cardActionPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#F9F9FB',
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    cardActionPillText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#1A1A1A',
    },

    // ─────────────────────────────────────────────
    // THERMAL RECEIPT MODAL
    // ─────────────────────────────────────────────
    thermalModalCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '94%',
        minHeight: '80%',
    },
    thermalModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    thermalHeaderLeft: {
        flex: 1,
    },
    thermalModalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    thermalModalSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    thermalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    paperSwitchGroup: {
        flexDirection: 'row',
        backgroundColor: '#ECEAE4',
        borderRadius: 10,
        padding: 2,
    },
    paperSwitchBtn: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    paperSwitchBtnActive: {
        backgroundColor: '#1A1A1A',
    },
    paperSwitchText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666666',
    },
    paperSwitchTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    settingsTriggerBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    printToastBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        paddingVertical: 7,
        paddingHorizontal: 14,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    printToastText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    thermalReceiptScroll: {
        paddingHorizontal: 12,
        paddingBottom: 24,
    },
    thermalModalFooter: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: '#FAF7F2',
        gap: 8,
    },
    thermalPrintBtn: {
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F06A8C',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 2,
    },
    thermalPrintBtnText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    thermalSecondaryActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    secondaryActionBtn: {
        flex: 1,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    secondaryActionBtnActive: {
        borderColor: '#F06A8C',
        backgroundColor: '#FFF5F8',
    },
    secondaryActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
    },

    // ─────────────────────────────────────────────
    // PARTIAL PAYMENT STYLES
    // ─────────────────────────────────────────────
    partialPayBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    partialInputRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    partialLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8A8A8A',
        marginBottom: 4,
    },
    partialTextInput: {
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    partialBalanceCol: {
        alignItems: 'flex-end',
        minWidth: 100,
    },
    partialBalanceLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#E65100',
    },
    partialBalanceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#E65100',
        marginTop: 4,
    },
    partialHint: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#666666',
        marginTop: 8,
    },
    creditNoticeBox: {
        backgroundColor: '#FFF8E1',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    creditNoticeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F57F17',
    },
    // Sync Status Bar & Banner
    syncStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6,
    },
    syncPillOnline: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    syncPillOffline: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    syncPillTextOnline: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2E7D32',
    },
    syncPillTextOffline: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C62828',
    },
    greenPulseDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#2E7D32',
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF3E0',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    syncBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    syncBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E65100',
    },
    syncBannerSub: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8D6E63',
        marginTop: 1,
    },
    syncNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E65100',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    syncNowBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

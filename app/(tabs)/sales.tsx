import { calculateGst, TaxType } from '../../src/features/sales/gst';
import { salePaymentAmounts } from '../../src/utils/paymentAmounts';
import { styles } from '../../src/features/sales/styles';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Platform,
    Share,
    RefreshControl,
    KeyboardAvoidingView,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Plus,
    Search,
    ShoppingBag,
    CheckCircle2,
    Clock,
    ArrowUpDown,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    X,
    User,
    FileText,
    Trash2,
    Share2,
    Sparkles,
    Check,
    Package,
    Minus,
    Printer,
    Settings2,
    RotateCcw,
    Eye,
    Copy,
    Sliders,
    Cloud,
    CloudOff,
    RefreshCw,
    Wifi,
    WifiOff,
    Truck,
    Calendar,
    Store,
    AlertTriangle,
    Phone,
    MapPin,
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../../src/components/Anime';
import ThermalReceipt from '../../src/components/ThermalReceipt';
import PrintSettingsModal, { PrintSettings } from '../../src/components/PrintSettingsModal';
import {
    forOrganization,
    organizationRequestConfig,
    OrganizationSessionChangedError,
} from '../../src/services/api';
import { RoleGate } from '../../src/components/RoleGate';
import { OrgScopedScreen } from '../../src/components/OrgScopedScreen';
import { receiptShopName, receiptForSharing, receiptShareText } from '../../src/services/receiptSharing';
import { printReceipt, receiptPrintHtml } from '../../src/services/receiptPrinting';
import { SalesSummary, reportMoney, salesTrendBars } from '../../src/services/reporting';
import { Colors } from '../../src/theme/colors';
import { submitSale, SaleLineInput } from '../../src/features/sales/submitSale';
import type { Customer, Product, SalesOrder } from '../../src/types/business';
import { syncService } from '../../src/services/syncService';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';
import { useRoleContext } from '../../src/contexts/RoleContext';
import {
    collectCustomerPayment,
    getPendingCustomerPayment,
    PendingCollection,
} from '../../src/services/paymentCollection';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CREDIT', 'PARTIAL'] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number];

export default function SalesScreen() {
    return (
        <RoleGate permission="sale:view">
            <OrgScopedScreen>{(_api, orgId) => <ShopSalesScreen activeOrgId={orgId} />}</OrgScopedScreen>
        </RoleGate>
    );
}

function ShopSalesScreen({ activeOrgId }: { activeOrgId: number }) {
    const router = useRouter();
    const { userId } = useRoleContext();
    const api = useMemo(() => forOrganization(activeOrgId), [activeOrgId]);
    const params = useLocalSearchParams<{
        action?: string;
        customerId?: string;
        customerName?: string;
        customerPhone?: string;
        searchCustomer?: string;
    }>();

    const [salesList, setSalesList] = useState<any[]>([]);
    const [report, setReport] = useState<SalesSummary | null>(null);
    const [reportUnavailable, setReportUnavailable] = useState('Loading live totals…');
    const [salesFromCache, setSalesFromCache] = useState(false);
    const salesFetchId = useRef(0);
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [salesMainTab, setSalesMainTab] = useState<'INVOICES' | 'SALES_ORDERS'>('INVOICES');
    const [loading, setLoading] = useState(false);

    // Spot Payment Collection Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [collectingCustomer, setCollectingCustomer] = useState<{ id: number; name: string } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [collectionPaymentMode, setCollectionPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [pendingPayment, setPendingPayment] = useState<PendingCollection | null>(null);
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
    const [shopName, setShopName] = useState<string | null>(null);
    const billRequest = useRef(0);
    const sharingReceipt = useRef(false);
    useEffect(() => {
        let active = true;
        setShopName(null);
        api.get('/api/organizations/current')
            .then((response) => {
                if (active) setShopName(receiptShopName(response.data, activeOrgId));
            })
            .catch(() => {
                if (active) setShopName(null);
            });
        return () => {
            active = false;
            billRequest.current++;
        };
    }, [api, activeOrgId]);

    // Thermal Printer Settings State
    const [printSettingsModalVisible, setPrintSettingsModalVisible] = useState(false);
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        paperSize: '80mm',
        fontSize: 'normal',
        options: {
            showLogo: true,
            showGst: true,
            showCustomer: true,
            showPayment: true,
            showThanks: true,
        },
    });

    // Create New Invoice / POS Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [orderBookingMode, setOrderBookingMode] = useState<'SALES_ORDER' | 'INSTANT_INVOICE'>(
        'SALES_ORDER',
    );
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Customer Selection State (Closed by default)
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    // Product Picker Sub-Modal State
    const [productPickerVisible, setProductPickerVisible] = useState(false);
    const [activeItemIndexForProductPick, setActiveItemIndexForProductPick] = useState<number | null>(null);
    const [productPickerSearch, setProductPickerSearch] = useState('');
    const [productPickerCategory, setProductPickerCategory] = useState('All');

    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [paidAmountInput, setPaidAmountInput] = useState('');
    const [initialPaymentMode, setInitialPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
    const [discount, setDiscount] = useState('0');
    const [taxType, setTaxType] = useState<TaxType>('INTRA_STATE');
    const [lineItems, setLineItems] = useState<SaleLineInput[]>([
        {
            productId: null as number | null,
            productName: '',
            brand: '',
            bagSizeKg: 25,
            quantity: '1',
            price: '',
            stock: 0,
        },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingModalData, setLoadingModalData] = useState(false);

    const { isOnline, pendingCount, isSyncing, syncError, syncNow, refreshPendingCount } = useOfflineSync();
    const isOnlineRef = useRef(isOnline);
    useEffect(() => {
        isOnlineRef.current = isOnline;
    }, [isOnline]);

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
    }, [api]);

    const fetchSales = useCallback(async () => {
        const currentOnline = isOnlineRef.current;
        const requestId = ++salesFetchId.current;
        setLoading(true);
        setReportUnavailable(currentOnline ? '' : 'Offline: live totals and chart are unavailable.');
        try {
            if (currentOnline) {
                const [response, summary] = await Promise.all([api.get('/sales'), api.get('/sales/summary')]);
                if (requestId !== salesFetchId.current) return;
                organizationRequestConfig(activeOrgId);
                const data = response.data || [];
                setSalesList(data);
                setSalesFromCache(false);
                setReport(summary.data);
                setReportUnavailable('');
                await syncService
                    .cacheSalesHistory(activeOrgId, data)
                    .catch((error) => console.warn('Could not cache invoice history:', error));
            } else {
                const cached = await syncService.getCachedSalesHistory(activeOrgId);
                if (requestId !== salesFetchId.current) return;
                setSalesList(cached);
                setSalesFromCache(true);
            }
        } catch (error) {
            if (requestId !== salesFetchId.current) return;
            setReportUnavailable('Live totals could not be loaded. Refresh while connected to retry.');
            setSalesFromCache(true);
            try {
                const cached = await syncService.getCachedSalesHistory(activeOrgId);
                if (requestId === salesFetchId.current) setSalesList(cached);
            } catch (cacheError: any) {
                if (requestId === salesFetchId.current) setSalesList([]);
                Alert.alert(
                    'Offline Records Unavailable',
                    cacheError?.message || 'Could not read saved invoices.',
                );
            }
        } finally {
            if (requestId === salesFetchId.current) setLoading(false);
            refreshPendingCount();
        }
    }, [api, refreshPendingCount, activeOrgId]);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchSales(), fetchSalesOrders()]);
        setRefreshing(false);
    }, [fetchSales, fetchSalesOrders]);

    useFocusEffect(
        useCallback(() => {
            fetchSales();
            fetchSalesOrders();
        }, [fetchSales, fetchSalesOrders]),
    );

    // ─────────────────────────────────────────────
    // COMPUTED KPI METRICS
    // ─────────────────────────────────────────────
    // ─────────────────────────────────────────────
    // FILTERED & SORTED INVOICES LIST
    // ─────────────────────────────────────────────
    const filteredInvoices = useMemo(() => {
        let list = salesList;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (s: any) =>
                    (s.billNumber || '').toLowerCase().includes(q) ||
                    (s.customerName || '').toLowerCase().includes(q) ||
                    (s.customer?.customerName || '').toLowerCase().includes(q) ||
                    (s.paymentMode || '').toLowerCase().includes(q),
            );
        }

        return [...list].sort((a, b) => {
            if (sortOption === 'amountDesc') {
                return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
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
            list = list.filter(
                (order: any) =>
                    (order.orderNumber || '').toLowerCase().includes(q) ||
                    (order.customer?.customerName || '').toLowerCase().includes(q) ||
                    (order.salesperson?.name || '').toLowerCase().includes(q) ||
                    (order.status || '').toLowerCase().includes(q),
            );
        }

        return [...list].sort((a, b) => {
            if (soSortOption === 'amountDesc') {
                return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
            }
            if (soSortOption === 'status') {
                return (a.status || '').localeCompare(b.status || '');
            }
            const tA = a.orderDate ? new Date(a.orderDate).getTime() : a.id || 0;
            const tB = b.orderDate ? new Date(b.orderDate).getTime() : b.id || 0;
            return tB - tA;
        });
    }, [salesOrders, soSearchQuery, soSortOption]);

    // ─────────────────────────────────────────────
    // INVOICE BILL VIEWER & THERMAL PRINTING
    // ─────────────────────────────────────────────
    const openInvoiceBill = async (sale: any, asReprint: boolean = false) => {
        const requestId = ++billRequest.current;
        setSelectedBill(sale);
        setBillItems([]);
        setIsReprintMode(asReprint);
        setBillModalVisible(true);
        setLoadingBillItems(true);
        try {
            const result = await receiptForSharing(api, sale);
            organizationRequestConfig(activeOrgId);
            if (requestId !== billRequest.current) return;
            setSelectedBill(result.bill);
            setBillItems(result.items);
        } catch (error) {
            if (requestId !== billRequest.current) return;
            setSelectedBill(null);
            setBillItems([]);
            Alert.alert('Receipt unavailable', 'Could not load this invoice. Please try again.');
        } finally {
            if (requestId === billRequest.current) setLoadingBillItems(false);
        }
    };

    const [printing, setPrinting] = useState(false);
    const printingBusy = useRef(false);
    const handlePrintBill = async () => {
        if (!selectedBill || printingBusy.current) return;
        printingBusy.current = true;
        setPrinting(true);
        try {
            const result = await receiptForSharing(api, selectedBill);
            organizationRequestConfig(activeOrgId);
            await printReceipt(
                receiptPrintHtml(
                    shopName,
                    result.bill,
                    result.items,
                    isReprintMode,
                    printSettings.paperSize,
                    printSettings.options,
                ),
            );
        } catch (error: any) {
            Alert.alert('Unable to print', error?.message || 'Could not open the print dialog.');
        } finally {
            printingBusy.current = false;
            setPrinting(false);
        }
    };

    const handleShareBill = async (sale: any, duplicate = false) => {
        if (!sale || sharingReceipt.current) return;
        sharingReceipt.current = true;
        try {
            if (!shopName)
                throw new Error('Shop details are unavailable. Reopen sales while connected before sharing.');
            const result = await receiptForSharing(api, sale);
            organizationRequestConfig(activeOrgId);
            await Share.share({
                message: receiptShareText(shopName, result.bill, result.items, duplicate),
                title: 'Invoice ' + (result.bill.billNumber || result.bill.id),
            });
        } catch (error: any) {
            Alert.alert(
                'Unable to share receipt',
                error?.message || 'Could not load and share this invoice.',
            );
        } finally {
            sharingReceipt.current = false;
        }
    };

    const handleDiscardOfflineSale = (clientRefId: string) => {
        Alert.alert(
            'Discard Failed Invoice',
            'Are you sure you want to remove this rejected offline invoice from the sync queue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await syncService.discardOfflineSale(activeOrgId, clientRefId);
                            await refreshPendingCount();
                            fetchSales();
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Could not discard invoice.');
                        }
                    },
                },
            ],
        );
    };

    // ─────────────────────────────────────────────
    // CREATE SALE / POS MODAL ACTIONS
    // ─────────────────────────────────────────────
    const openCreateModal = async (preselectedCustomer?: Pick<Customer, 'id' | 'customerName'>) => {
        setCreateModalVisible(true);
        if (preselectedCustomer) {
            setSelectedCustomer(null);
            setCustomerSearch(preselectedCustomer.customerName || '');
        } else {
            setSelectedCustomer(null);
            setCustomerSearch('');
        }
        setCustomerDropdownOpen(false); // Closed by default per user request
        setPaymentMode('CASH');
        setPaidAmountInput('');
        setDiscount('0');
        setTaxType('INTRA_STATE');
        setLineItems([
            {
                productId: null as number | null,
                productName: '',
                brand: '',
                bagSizeKg: 25,
                quantity: '1',
                price: '',
                stock: 0,
            },
        ]);
        setLoadingModalData(true);
        try {
            if (isOnline) {
                const catalogRevision = await syncService.getCatalogRevision(activeOrgId);
                const [prodRes, custRes] = await Promise.all([
                    api.get<Product[]>('/products'),
                    api.get<Customer[]>('/customers'),
                ]);
                const activeProds = (prodRes.data || []).filter(
                    (p: any) => p.status === 'ACTIVE' || !p.status,
                );
                const custs = custRes.data || [];
                const cached = await syncService.cacheCatalog(
                    activeOrgId,
                    activeProds,
                    custs,
                    catalogRevision,
                );
                setProducts(cached.products);
                setCustomers(cached.customers);

                // If customer was passed by id, ensure full customer object from list is linked
                if (preselectedCustomer?.id) {
                    const matched = cached.customers.find(
                        (c) => String(c.id) === String(preselectedCustomer.id),
                    );
                    if (matched) {
                        setSelectedCustomer(matched);
                        setCustomerSearch(matched.customerName || '');
                    }
                }
            } else {
                const cached = await syncService.getCachedCatalog(activeOrgId);
                setProducts(cached.products);
                setCustomers(cached.customers);
                if (preselectedCustomer?.id) {
                    const matched = cached.customers.find(
                        (c: any) => String(c.id) === String(preselectedCustomer.id),
                    );
                    if (matched) {
                        setSelectedCustomer(matched);
                        setCustomerSearch(matched.customerName || '');
                    }
                }
            }
        } catch (error) {
            console.warn('Network issue loading catalog, loading from offline storage:', error);
            try {
                const cached = await syncService.getCachedCatalog(activeOrgId);
                setProducts(cached.products);
                setCustomers(cached.customers);
            } catch (storageError: any) {
                setProducts([]);
                setCustomers([]);
                Alert.alert(
                    'Offline Records Unavailable',
                    storageError?.message || 'Could not read saved products and customers.',
                );
            }
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
            const cust = params.customerId
                ? {
                      id: Number(params.customerId),
                      customerName: params.customerName || 'Store Customer',
                      phoneNumber: params.customerPhone || '',
                  }
                : undefined;
            openCreateModal(cust);
        }
    }, [params.action, params.customerId, params.customerName, params.customerPhone, params.searchCustomer]);

    const addLineItem = () => {
        setLineItems((prev) => [
            ...prev,
            {
                productId: null,
                productName: '',
                brand: '',
                bagSizeKg: 25,
                quantity: '1',
                price: '',
                stock: 0,
            },
        ]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length <= 1) return;
        setLineItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateLineItem = (index: number, updates: Partial<SaleLineInput>) => {
        setLineItems((prev) => {
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

    const handleSelectProduct = (prod: Product) => {
        if (prod.availableStock == null) {
            Alert.alert(
                'Stock Unavailable',
                'Refresh the product list to load available stock before selecting this item.',
            );
            return;
        }
        if (activeItemIndexForProductPick !== null) {
            const existingIndex = lineItems.findIndex(
                (item, idx) => idx !== activeItemIndexForProductPick && item.productId === prod.id,
            );
            if (existingIndex > -1) {
                const existing = lineItems[existingIndex];
                const existingQty = parseFloat(existing.quantity) || 0;
                const pickRowQty = parseFloat(lineItems[activeItemIndexForProductPick]?.quantity) || 1;
                const newTotalQty = String(existingQty + pickRowQty);

                setLineItems((prev) => {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: newTotalQty,
                        price: updated[existingIndex].price || String(prod.sellingPrice || ''),
                        stock: prod.availableStock ?? 0,
                        gstRate: prod.gstRate ?? updated[existingIndex].gstRate ?? null,
                    };
                    if (updated.length > 1) {
                        updated.splice(activeItemIndexForProductPick, 1);
                    }
                    return updated;
                });
                setProductPickerVisible(false);
                setActiveItemIndexForProductPick(null);
                Alert.alert(
                    'Item Merged',
                    `${prod.productName || 'Product'} is already in the order. Quantity increased to ${newTotalQty}.`,
                );
                return;
            }

            updateLineItem(activeItemIndexForProductPick, {
                productId: prod.id,
                productName: prod.productName || '',
                brand: prod.brand || 'General',
                bagSizeKg: prod.unit?.includes('50') ? 50 : 25,
                price: String(prod.sellingPrice || ''),
                stock: prod.availableStock,
                gstRate: prod.gstRate ?? null,
                quantity: lineItems[activeItemIndexForProductPick]?.quantity || '1',
            });
        }
        setProductPickerVisible(false);
        setActiveItemIndexForProductPick(null);
    };

    // Filtered Customers for Dropdown
    const filteredCustomersList = useMemo(() => {
        if (!customerSearch.trim()) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter(
            (c: any) =>
                (c.customerName || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q) ||
                (c.address || '').toLowerCase().includes(q),
        );
    }, [customers, customerSearch]);

    // Product Categories & Filtered Products for Catalog Picker
    const productCategories = useMemo(() => {
        const set = new Set<string>();
        products.forEach((p) => {
            if (p.category) set.add(p.category);
        });
        return ['All', ...Array.from(set)];
    }, [products]);

    const filteredProductsList = useMemo(() => {
        let list = products;
        if (productPickerCategory !== 'All') {
            list = list.filter((p) => p.category?.toLowerCase() === productPickerCategory.toLowerCase());
        }
        if (productPickerSearch.trim()) {
            const q = productPickerSearch.toLowerCase().trim();
            list = list.filter(
                (p) =>
                    (p.productName || '').toLowerCase().includes(q) ||
                    (p.brand || '').toLowerCase().includes(q) ||
                    (p.hsnCode || '').includes(q),
            );
        }
        return list;
    }, [products, productPickerCategory, productPickerSearch]);

    // Live POS Calculations
    const discountValue = parseFloat(discount) || 0;
    const {
        subtotal: calculatedSubtotal,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        grandTotal: calculatedGrandTotal,
        discountExceedsSubtotal,
    } = calculateGst(lineItems, discount, taxType);

    // Partial / Credit Payment breakdown
    const { paidAmount: effectivePaidAmount, balanceDue: effectiveBalanceDue } = salePaymentAmounts(
        calculatedGrandTotal,
        paymentMode,
        paidAmountInput,
    );

    const handleCreateSaleSubmit = () =>
        submitSale({
            lineItems,
            orderBookingMode,
            selectedCustomer,
            paymentMode,
            expectedDeliveryDate,
            discountValue,
            discountInput: discount,
            orderNotes,
            paidAmountInput,
            calculatedGrandTotal,
            effectiveBalanceDue,
            effectivePaidAmount,
            initialPaymentMode,
            customerSearch,
            activeOrgId,
            calculatedSubtotal,
            cgstAmount,
            sgstAmount,
            igstAmount,
            taxType,
            isOnline,
            Alert,
            api,
            syncService,
            setSubmitting,
            setSelectedBill,
            setBillItems,
            setIsReprintMode,
            setCreateModalVisible,
            setBillModalVisible,
            setSalesList,
            fetchSales,
            fetchSalesOrders,
            refreshPendingCount,
        });

    const trendDays = salesTrendBars(report);

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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#1A1A1A']}
                        tintColor="#1A1A1A"
                    />
                }
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
                {(pendingCount > 0 || syncError) && (
                    <FadeInDown delay={35} style={styles.syncBanner}>
                        <View style={styles.syncBannerLeft}>
                            <Cloud size={18} color="#E65100" />
                            <View>
                                <Text style={styles.syncBannerTitle}>
                                    {pendingCount} Offline {pendingCount === 1 ? 'Invoice' : 'Invoices'}{' '}
                                    Queued
                                </Text>
                                <Text style={styles.syncBannerSub}>
                                    {syncError || 'Ready to synchronize with server'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.syncNowBtn, isSyncing && { opacity: 0.7 }]}
                            onPress={async () => {
                                const res = await syncNow();
                                if (res.success) {
                                    Alert.alert(
                                        'Sync Complete',
                                        `Successfully synced ${res.syncedCount} offline ${res.syncedCount === 1 ? 'invoice' : 'invoices'} to the cloud.`,
                                    );
                                    fetchSales();
                                } else {
                                    Alert.alert(
                                        'Sync Incomplete',
                                        res.errorMessage ||
                                            'Some invoices are still pending. Please retry sync.',
                                    );
                                    fetchSales();
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
                            <Text style={[styles.topActionTitle, { color: '#F04C74' }]}>
                                New Sale / Order
                            </Text>
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

                <Text style={{ color: Colors.textSecondary, marginVertical: 10 }}>
                    {report
                        ? 'All saved invoices, including tax and discounts. Payments applied exclude opening-balance collections. As of ' +
                          report.asOf.replace('T', ' ').slice(0, 19) +
                          ' (server time).'
                        : reportUnavailable}
                </Text>
                {salesFromCache && (
                    <Text style={{ color: Colors.textSecondary, marginBottom: 10 }}>
                        Invoice list uses cached records; balances may be outdated. Pending offline invoices
                        are not included in live totals.
                    </Text>
                )}
                {/* 3. Sales KPI Overview 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1: Total Sales */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <ShoppingBag size={18} color="#F06A8C" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Invoiced value</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {reportMoney(report?.invoicedTotal)}
                        </Text>
                    </View>

                    {/* KPI 2: Paid Cash/UPI */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <CheckCircle2 size={18} color="#2E7D32" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Payments applied</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            {reportMoney(report?.paymentsApplied)}
                        </Text>
                    </View>

                    {/* KPI 3: Credit Balance Pending */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <Clock size={18} color="#E65100" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Unpaid invoices</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>
                            {reportMoney(report?.outstanding)}
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
                            {report?.invoiceCount ?? '—'} Bills
                        </Text>
                    </View>
                </FadeInDown>

                {/* 4. Sales Trend Bar Chart (DESIGN.md Screen 3) */}
                <FadeInDown delay={110} style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>Sales Trend</Text>
                            <Text style={styles.chartSubtitle}>Daily invoiced value • server dates</Text>
                        </View>
                        <View style={styles.chartTag}>
                            <Text style={styles.chartTagText}>Last 7 days</Text>
                        </View>
                    </View>

                    {report && (
                        <Text style={styles.chartSubtitle}>
                            {report.periodStart} – {report.periodEnd}
                        </Text>
                    )}
                    {!report && (
                        <Text style={styles.chartSubtitle}>Chart unavailable until live totals load.</Text>
                    )}
                    {report && trendDays.every((day) => day.value === 0) && (
                        <Text style={styles.chartSubtitle}>No invoiced value recorded in this period.</Text>
                    )}
                    {/* Bar Chart Container */}
                    <View style={styles.chartBody}>
                        {trendDays.map((bar, idx) => (
                            <View
                                key={bar.date}
                                style={styles.chartCol}
                                accessible
                                accessibilityLabel={`${bar.date}: ${bar.label}`}
                            >
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
                                            bar.peak && styles.barFillPeak,
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
                <FadeInDown
                    delay={130}
                    style={{ flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 20 }}
                >
                    <TouchableOpacity
                        style={[
                            {
                                flex: 1,
                                paddingVertical: 11,
                                borderRadius: 14,
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1,
                                borderColor: '#E2E0D8',
                                alignItems: 'center',
                            },
                            salesMainTab === 'INVOICES' && {
                                backgroundColor: '#1A1A1A',
                                borderColor: '#1A1A1A',
                            },
                        ]}
                        onPress={() => setSalesMainTab('INVOICES')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                { fontSize: 13, fontWeight: '700', color: '#666' },
                                salesMainTab === 'INVOICES' && { color: '#FFFFFF' },
                            ]}
                        >
                            🧾 Invoices
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            {
                                flex: 1,
                                paddingVertical: 11,
                                borderRadius: 14,
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1,
                                borderColor: '#E2E0D8',
                                alignItems: 'center',
                            },
                            salesMainTab === 'SALES_ORDERS' && {
                                backgroundColor: '#1A1A1A',
                                borderColor: '#1A1A1A',
                            },
                        ]}
                        onPress={() => setSalesMainTab('SALES_ORDERS')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                { fontSize: 13, fontWeight: '700', color: '#666' },
                                salesMainTab === 'SALES_ORDERS' && { color: '#FFFFFF' },
                            ]}
                        >
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
                                    {soSortOption === 'date'
                                        ? 'Latest'
                                        : soSortOption === 'amountDesc'
                                          ? 'Highest'
                                          : 'Status'}
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
                                <Text style={styles.emptySubtitle}>
                                    Tap 'New Sale / Order' to book a sales order.
                                </Text>
                            </View>
                        ) : (
                            <StaggerContainer stagger={25} delay={160}>
                                <View style={styles.invoicesListWrapper}>
                                    {filteredSalesOrders.map((order: any) => {
                                        const items = order.items || [];
                                        const totalOrdered = items.reduce(
                                            (sum: number, it: any) => sum + (it.orderedQuantity || 0),
                                            0,
                                        );
                                        const totalDelivered = items.reduce(
                                            (sum: number, it: any) => sum + (it.deliveredQuantity || 0),
                                            0,
                                        );
                                        const totalRemaining = items.reduce(
                                            (sum: number, it: any) =>
                                                sum +
                                                (it.remainingQuantity != null
                                                    ? it.remainingQuantity
                                                    : Math.max(
                                                          0,
                                                          (it.orderedQuantity || 0) -
                                                              (it.deliveredQuantity || 0),
                                                      )),
                                            0,
                                        );
                                        const fulfillmentPct =
                                            totalOrdered > 0
                                                ? Math.min(
                                                      100,
                                                      Math.round((totalDelivered / totalOrdered) * 100),
                                                  )
                                                : 0;

                                        const isCompleted = order.status === 'DELIVERED';
                                        const isPartial = order.status === 'PARTIALLY_DELIVERED';
                                        const isTransit = order.status === 'OUT_FOR_DELIVERY';
                                        const isReady = order.status === 'READY_FOR_DELIVERY';

                                        const badgeBg = isCompleted
                                            ? '#ECFDF5'
                                            : isPartial
                                              ? '#FEF3C7'
                                              : isTransit
                                                ? '#F0F9FF'
                                                : isReady
                                                  ? '#EDE9FE'
                                                  : '#FFFBEB';
                                        const badgeColor = isCompleted
                                            ? '#059669'
                                            : isPartial
                                              ? '#D97706'
                                              : isTransit
                                                ? '#0284C7'
                                                : isReady
                                                  ? '#7C3AED'
                                                  : '#B45309';

                                        const dateStr = order.orderDate
                                            ? new Date(order.orderDate).toLocaleDateString('en-IN', {
                                                  day: '2-digit',
                                                  month: 'short',
                                              })
                                            : '';

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
                                                    <View
                                                        style={[
                                                            styles.invoiceAvatar,
                                                            { backgroundColor: badgeBg },
                                                        ]}
                                                    >
                                                        <Package size={18} color={badgeColor} />
                                                    </View>

                                                    <View style={styles.invoiceCenterCol}>
                                                        <View style={styles.invoiceTitleRow}>
                                                            <Text
                                                                style={styles.billNumberText}
                                                                numberOfLines={1}
                                                            >
                                                                {order.orderNumber}
                                                            </Text>
                                                            <View
                                                                style={[
                                                                    styles.paymentBadge,
                                                                    { backgroundColor: badgeBg },
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.paymentBadgeText,
                                                                        { color: badgeColor },
                                                                    ]}
                                                                >
                                                                    {isPartial
                                                                        ? 'PARTIALLY DELIVERED'
                                                                        : (
                                                                              order.status || 'CONFIRMED'
                                                                          ).replace(/_/g, ' ')}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text
                                                            style={styles.customerNameText}
                                                            numberOfLines={1}
                                                        >
                                                            {order.customer?.customerName || 'Store Customer'}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.invoiceTrailing}>
                                                        <Text
                                                            style={[
                                                                styles.invoiceAmountText,
                                                                { color: '#1A1A1A' },
                                                            ]}
                                                        >
                                                            ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
                                                        </Text>
                                                        <Text style={styles.invoiceTimeText}>{dateStr}</Text>
                                                    </View>
                                                </View>

                                                {/* Fulfillment Progress Indicator */}
                                                {totalOrdered > 0 && (
                                                    <View
                                                        style={{
                                                            marginTop: 10,
                                                            paddingTop: 10,
                                                            borderTopWidth: 1,
                                                            borderTopColor: '#F3F4F6',
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                marginBottom: 5,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 11.5,
                                                                    fontWeight: '700',
                                                                    color: '#4B5563',
                                                                }}
                                                            >
                                                                {isCompleted
                                                                    ? '📦 Fully Delivered'
                                                                    : isPartial
                                                                      ? '⚠️ Partial Dispatch Fulfilled'
                                                                      : isTransit
                                                                        ? '🚚 Out for Delivery'
                                                                        : isReady
                                                                          ? '📋 Ready for Van Assignment'
                                                                          : '📝 Order Booked'}
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontSize: 11.5,
                                                                    fontWeight: '800',
                                                                    color: isCompleted
                                                                        ? '#059669'
                                                                        : isPartial
                                                                          ? '#D97706'
                                                                          : '#1A1A1A',
                                                                }}
                                                            >
                                                                {totalDelivered}/{totalOrdered} Bags (
                                                                {fulfillmentPct}%)
                                                            </Text>
                                                        </View>

                                                        {/* Sleek Visual Progress Bar */}
                                                        <View
                                                            style={{
                                                                height: 6,
                                                                backgroundColor: '#F3F4F6',
                                                                borderRadius: 999,
                                                                overflow: 'hidden',
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    height: '100%',
                                                                    width: `${fulfillmentPct}%`,
                                                                    backgroundColor: isCompleted
                                                                        ? '#10B981'
                                                                        : isPartial
                                                                          ? '#F59E0B'
                                                                          : '#3B82F6',
                                                                    borderRadius: 999,
                                                                }}
                                                            />
                                                        </View>

                                                        {totalDelivered > 0 && totalRemaining > 0 ? (
                                                            <View
                                                                style={{
                                                                    flexDirection: 'row',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontSize: 10.5,
                                                                        color: '#059669',
                                                                        fontWeight: '700',
                                                                    }}
                                                                >
                                                                    ✓ {totalDelivered} Bags Invoiced
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        fontSize: 10.5,
                                                                        color: '#D97706',
                                                                        fontWeight: '700',
                                                                    }}
                                                                >
                                                                    • {totalRemaining} Bags Pending Stock
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                )}

                                                {/* Card Action */}
                                                <View
                                                    style={[styles.invoiceCardActionsRow, { marginTop: 10 }]}
                                                >
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.cardActionPill,
                                                            { flex: 1, justifyContent: 'center' },
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedSalesOrder(order);
                                                            setSalesOrderDetailModalVisible(true);
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Eye size={13} color="#1A1A1A" />
                                                        <Text style={styles.cardActionPillText}>
                                                            View Details & Status
                                                        </Text>
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
                                    {sortOption === 'date'
                                        ? 'Latest'
                                        : sortOption === 'amountDesc'
                                          ? 'Highest'
                                          : 'Mode'}
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
                                <Text style={styles.emptySubtitle}>
                                    Tap 'New Sale / Order' above to create your first bill.
                                </Text>
                            </View>
                        ) : (
                            <StaggerContainer stagger={25} delay={160}>
                                <View style={styles.invoicesListWrapper}>
                                    {filteredInvoices.map((sale) => {
                                        const isPaid =
                                            sale.balanceDue != null && Number(sale.balanceDue) === 0;
                                        const grandVal = parseFloat(sale.grandTotal) || 0;
                                        const dateObj = sale.saleDate ? new Date(sale.saleDate) : new Date();
                                        const formattedDate = dateObj.toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        });

                                        return (
                                            <AnimatedPressable
                                                key={sale.id || sale.clientReferenceId}
                                                style={styles.invoiceCard}
                                                onPress={() => openInvoiceBill(sale, false)}
                                            >
                                                {/* Top Row: Avatar, Bill No & Total */}
                                                <View style={styles.invoiceCardTopRow}>
                                                    <View
                                                        style={[
                                                            styles.invoiceAvatar,
                                                            {
                                                                backgroundColor: isPaid
                                                                    ? '#E8F5E9'
                                                                    : '#FFF3E0',
                                                            },
                                                        ]}
                                                    >
                                                        <FileText
                                                            size={18}
                                                            color={isPaid ? '#2E7D32' : '#E65100'}
                                                        />
                                                    </View>

                                                    <View style={styles.invoiceCenterCol}>
                                                        <View style={styles.invoiceTitleRow}>
                                                            <Text
                                                                style={styles.billNumberText}
                                                                numberOfLines={1}
                                                                ellipsizeMode="tail"
                                                            >
                                                                {sale.billNumber}
                                                            </Text>
                                                            {sale.syncStatus === 'FAILED' ? (
                                                                <View style={[styles.offlineBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                                                                    <Text style={[styles.offlineBadgeText, { color: '#DC2626' }]}>
                                                                        ⚠️ SYNC FAILED
                                                                    </Text>
                                                                </View>
                                                            ) : sale.syncStatus === 'PENDING_SYNC' ||
                                                            sale.isOffline ? (
                                                                <View style={styles.offlineBadge}>
                                                                    <Text style={styles.offlineBadgeText}>
                                                                        ⏳ OFFLINE
                                                                    </Text>
                                                                </View>
                                                            ) : (
                                                                <View
                                                                    style={[
                                                                        styles.paymentBadge,
                                                                        {
                                                                            backgroundColor: isPaid
                                                                                ? '#E8F5E9'
                                                                                : '#FFF3E0',
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.paymentBadgeText,
                                                                            {
                                                                                color: isPaid
                                                                                    ? '#2E7D32'
                                                                                    : '#E65100',
                                                                            },
                                                                        ]}
                                                                    >
                                                                        {isPaid
                                                                            ? 'Paid'
                                                                            : sale.balanceDue != null
                                                                              ? `Due ${reportMoney(Number(sale.balanceDue))}`
                                                                              : 'Balance unavailable'}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text
                                                            style={styles.customerNameText}
                                                            numberOfLines={1}
                                                            ellipsizeMode="tail"
                                                        >
                                                            {sale.customerName ||
                                                                sale.customer?.customerName ||
                                                                'Walk-in Customer'}
                                                        </Text>
                                                        {sale.syncStatus === 'FAILED' && (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                                                <Text style={{ fontSize: 10.5, color: '#DC2626', flex: 1 }} numberOfLines={1}>
                                                                    {sale.errorMessage || 'Rejected by server'}
                                                                </Text>
                                                                <TouchableOpacity
                                                                    style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                                                                    onPress={() => handleDiscardOfflineSale(sale.clientReferenceId)}
                                                                >
                                                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#DC2626' }}>Discard</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View style={styles.invoiceTrailing}>
                                                        <Text style={styles.invoiceAmountText}>
                                                            ₹
                                                            {grandVal.toLocaleString('en-IN', {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 2,
                                                            })}
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
                                                        style={[
                                                            styles.cardActionPill,
                                                            {
                                                                borderColor: '#F5C6D8',
                                                                backgroundColor: '#FFF5F8',
                                                            },
                                                        ]}
                                                        onPress={() => openInvoiceBill(sale, true)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <RotateCcw size={13} color="#F06A8C" />
                                                        <Text
                                                            style={[
                                                                styles.cardActionPillText,
                                                                { color: '#F06A8C' },
                                                            ]}
                                                        >
                                                            Duplicate preview
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.cardActionPill}
                                                        onPress={() => handleShareBill(sale)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Share2 size={13} color="#666" />
                                                        <Text
                                                            style={[
                                                                styles.cardActionPillText,
                                                                { color: '#666' },
                                                            ]}
                                                        >
                                                            Share
                                                        </Text>
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
                                    {isReprintMode ? 'Duplicate receipt preview' : 'Receipt preview'}
                                </Text>
                                <Text style={styles.thermalModalSubtitle}>
                                    Choose your installed 80mm printer in the print dialog. Payment QR is not
                                    configured.
                                </Text>
                            </View>

                            <View style={styles.thermalHeaderActions}>
                                {/* 58mm / 80mm Switcher */}
                                <View style={styles.paperSwitchGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.paperSwitchBtn,
                                            printSettings.paperSize === '58mm' && styles.paperSwitchBtnActive,
                                        ]}
                                        onPress={() => setPrintSettings((p) => ({ ...p, paperSize: '58mm' }))}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.paperSwitchText,
                                                printSettings.paperSize === '58mm' &&
                                                    styles.paperSwitchTextActive,
                                            ]}
                                        >
                                            58mm
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.paperSwitchBtn,
                                            printSettings.paperSize === '80mm' && styles.paperSwitchBtnActive,
                                        ]}
                                        onPress={() => setPrintSettings((p) => ({ ...p, paperSize: '80mm' }))}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.paperSwitchText,
                                                printSettings.paperSize === '80mm' &&
                                                    styles.paperSwitchTextActive,
                                            ]}
                                        >
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

                        {/* Scrollable Realistic Thermal Receipt */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.thermalReceiptScroll}
                        >
                            {loadingBillItems ? (
                                <ActivityIndicator
                                    size="large"
                                    color="#F06A8C"
                                    style={{ marginVertical: 40 }}
                                />
                            ) : selectedBill ? (
                                <ThermalReceipt
                                    bill={selectedBill}
                                    items={billItems}
                                    paperSize={printSettings.paperSize}
                                    fontSize={printSettings.fontSize}
                                    options={printSettings.options}
                                    isDuplicate={isReprintMode}
                                    shopDetails={{ name: shopName || 'Shop details unavailable' }}
                                />
                            ) : null}
                        </ScrollView>

                        {/* Bottom Action Bar */}
                        <View style={styles.thermalModalFooter}>
                            <TouchableOpacity
                                style={styles.thermalPrintBtn}
                                onPress={handlePrintBill}
                                disabled={printing || loadingBillItems || !selectedBill || !shopName}
                                accessibilityRole="button"
                                accessibilityLabel="Print invoice"
                            >
                                <Printer size={18} color="#FFFFFF" />
                                <Text style={styles.thermalPrintBtnText}>
                                    {printing ? 'Opening print dialog…' : 'Print receipt'}
                                </Text>
                            </TouchableOpacity>

                            {/* Secondary Actions */}
                            <View style={styles.thermalSecondaryActionsRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.secondaryActionBtn,
                                        isReprintMode && styles.secondaryActionBtnActive,
                                    ]}
                                    onPress={() => {
                                        setIsReprintMode(!isReprintMode);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Copy size={15} color={isReprintMode ? '#F06A8C' : '#1A1A1A'} />
                                    <Text
                                        style={[
                                            styles.secondaryActionText,
                                            isReprintMode && { color: '#F06A8C', fontWeight: '700' },
                                        ]}
                                    >
                                        {isReprintMode ? 'Original' : 'Duplicate'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={() => handleShareBill(selectedBill, isReprintMode)}
                                    disabled={loadingBillItems || !selectedBill || !shopName}
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
                                <Text style={styles.billModalTitle}>
                                    {orderBookingMode === 'SALES_ORDER'
                                        ? 'Book Sales Order'
                                        : 'New Instant Invoice'}
                                </Text>
                                <Text style={styles.billModalSubtitle}>
                                    {orderBookingMode === 'SALES_ORDER'
                                        ? 'Queue order for warehouse packing & delivery'
                                        : 'Create direct POS counter bill'}
                                </Text>
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
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                backgroundColor: '#FAF7F2',
                                borderBottomWidth: 1,
                                borderBottomColor: '#E2E0D8',
                            }}
                        >
                            <TouchableOpacity
                                style={[
                                    {
                                        flex: 1,
                                        paddingVertical: 8,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        backgroundColor: '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: '#E2E0D8',
                                    },
                                    orderBookingMode === 'SALES_ORDER' && {
                                        backgroundColor: '#1A1A1A',
                                        borderColor: '#1A1A1A',
                                    },
                                ]}
                                onPress={() => setOrderBookingMode('SALES_ORDER')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        { fontSize: 11.5, fontWeight: '700', color: '#666' },
                                        orderBookingMode === 'SALES_ORDER' && { color: '#FFF' },
                                    ]}
                                >
                                    📦 Book Sales Order (SO)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    {
                                        flex: 1,
                                        paddingVertical: 8,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        backgroundColor: '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: '#E2E0D8',
                                    },
                                    orderBookingMode === 'INSTANT_INVOICE' && {
                                        backgroundColor: '#1A1A1A',
                                        borderColor: '#1A1A1A',
                                    },
                                ]}
                                onPress={() => setOrderBookingMode('INSTANT_INVOICE')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        { fontSize: 11.5, fontWeight: '700', color: '#666' },
                                        orderBookingMode === 'INSTANT_INVOICE' && { color: '#FFF' },
                                    ]}
                                >
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
                                <ActivityIndicator
                                    size="large"
                                    color="#F06A8C"
                                    style={{ marginVertical: 30 }}
                                />
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
                                                    <Text style={styles.selectedCustName}>
                                                        {selectedCustomer.customerName}
                                                    </Text>
                                                    <Text style={styles.selectedCustPhone}>
                                                        📞 {selectedCustomer.phone || 'No phone'} · Credit
                                                        Balance: ₹{selectedCustomer.creditBalance || 0}
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
                                                    onPress={() =>
                                                        setCustomerDropdownOpen(!customerDropdownOpen)
                                                    }
                                                >
                                                    <Search size={16} color="#8A8A8A" />
                                                    <TextInput
                                                        placeholder="Search customer by name, phone or address..."
                                                        placeholderTextColor="#A0A0A0"
                                                        style={styles.custTextInput}
                                                        value={customerSearch}
                                                        onChangeText={(t) => {
                                                            setCustomerSearch(t);
                                                            if (!customerDropdownOpen)
                                                                setCustomerDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setCustomerDropdownOpen(true)}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            setCustomerDropdownOpen(!customerDropdownOpen)
                                                        }
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
                                                                <View
                                                                    style={[
                                                                        styles.custItemAvatar,
                                                                        { backgroundColor: '#F0F0F0' },
                                                                    ]}
                                                                >
                                                                    <User size={15} color="#555" />
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.custItemName}>
                                                                        👤 Walk-in Guest / Cash Counter
                                                                    </Text>
                                                                    <Text style={styles.custItemSub}>
                                                                        Immediate counter sale without
                                                                        registered ledger
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>

                                                            {/* Registered Customers */}
                                                            {filteredCustomersList.map((c) => (
                                                                <TouchableOpacity
                                                                    key={c.id}
                                                                    style={styles.custDropdownItem}
                                                                    onPress={() => {
                                                                        setSelectedCustomer(c);
                                                                        setCustomerSearch(
                                                                            c.customerName || '',
                                                                        );
                                                                        setCustomerDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <View style={styles.custItemAvatar}>
                                                                        <User size={15} color="#2E7D32" />
                                                                    </View>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={styles.custItemName}>
                                                                            {c.customerName}
                                                                        </Text>
                                                                        <Text style={styles.custItemSub}>
                                                                            📞 {c.phone || 'No phone'}{' '}
                                                                            {c.address
                                                                                ? `· ${c.address}`
                                                                                : ''}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.custCreditTag}>
                                                                        <Text
                                                                            style={styles.custCreditTagText}
                                                                        >
                                                                            Limit ₹
                                                                            {(
                                                                                c.creditLimit || 0
                                                                            ).toLocaleString('en-IN')}
                                                                        </Text>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}

                                                            {filteredCustomersList.length === 0 && (
                                                                <View
                                                                    style={{
                                                                        padding: 12,
                                                                        alignItems: 'center',
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            fontSize: 12,
                                                                            color: '#888',
                                                                        }}
                                                                    >
                                                                        No customer matching "{customerSearch}
                                                                        ". Will record as guest name.
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
                                            <Text style={styles.formSectionHeading}>
                                                2. LINE ITEMS (PRODUCTS)
                                            </Text>
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
                                            const itemSub =
                                                (parseFloat(item.quantity) || 0) *
                                                (parseFloat(item.price) || 0);

                                            return (
                                                <View key={index} style={styles.itemRowCard}>
                                                    {/* Header: Item number & delete button */}
                                                    <View style={styles.itemRowHeader}>
                                                        <Text style={styles.itemRowIndex}>
                                                            Item #{index + 1}
                                                        </Text>
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
                                                                <Text
                                                                    style={styles.selectedProdName}
                                                                    numberOfLines={1}
                                                                >
                                                                    {item.brand ? `${item.brand} ` : ''}
                                                                    {item.productName}
                                                                </Text>
                                                                <View style={styles.selectedProdMetaRow}>
                                                                    <View style={styles.bagWeightPill}>
                                                                        <Text
                                                                            style={styles.bagWeightPillText}
                                                                        >
                                                                            {item.bagSizeKg}kg Bag
                                                                        </Text>
                                                                    </View>
                                                                    <Text
                                                                        style={styles.selectedProdStockText}
                                                                    >
                                                                        In Stock: {item.stock} bags
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.changeProductText}>
                                                                Change ▼
                                                            </Text>
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
                                                            <Text style={styles.inputMiniLabel}>
                                                                QUANTITY (BAGS)
                                                            </Text>
                                                            <View style={styles.stepperContainer}>
                                                                <TouchableOpacity
                                                                    style={styles.stepperBtn}
                                                                    onPress={() => stepQuantity(index, -1)}
                                                                >
                                                                    <Minus
                                                                        size={14}
                                                                        color="#333"
                                                                        strokeWidth={2.5}
                                                                    />
                                                                </TouchableOpacity>
                                                                <TextInput
                                                                    style={styles.stepperInput}
                                                                    keyboardType="numeric"
                                                                    placeholder="1"
                                                                    placeholderTextColor="#A0A0A0"
                                                                    value={String(item.quantity)}
                                                                    onChangeText={(val) =>
                                                                        updateLineItem(index, {
                                                                            quantity: val,
                                                                        })
                                                                    }
                                                                />
                                                                <TouchableOpacity
                                                                    style={styles.stepperBtn}
                                                                    onPress={() => stepQuantity(index, 1)}
                                                                >
                                                                    <Plus
                                                                        size={14}
                                                                        color="#333"
                                                                        strokeWidth={2.5}
                                                                    />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>

                                                        {/* Price Per Bag Column */}
                                                        <View style={styles.inputColRight}>
                                                            <Text style={styles.inputMiniLabel}>
                                                                PRICE PER BAG (₹)
                                                            </Text>
                                                            <TextInput
                                                                style={styles.priceTextInput}
                                                                keyboardType="numeric"
                                                                placeholder="2800"
                                                                placeholderTextColor="#A0A0A0"
                                                                value={String(item.price)}
                                                                onChangeText={(val) =>
                                                                    updateLineItem(index, { price: val })
                                                                }
                                                            />
                                                        </View>
                                                    </View>

                                                    {/* Row Subtotal */}
                                                    <View style={styles.itemSubtotalRow}>
                                                        <Text style={styles.itemSubtotalLabel}>
                                                            Item Total:
                                                        </Text>
                                                        <Text style={styles.itemSubtotalValue}>
                                                            ₹
                                                            {itemSub.toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                            })}
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
                                            <Text style={styles.dashedAddProductText}>
                                                Add Another Product
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* 3. Conditional: Sales Order Delivery Details OR Instant Counter Payment Method */}
                                    {orderBookingMode === 'SALES_ORDER' ? (
                                        <View style={styles.formSectionBox}>
                                            <Text style={styles.formSectionHeading}>
                                                3. DELIVERY DISPATCH DETAILS
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: '800',
                                                    color: '#666',
                                                    marginBottom: 4,
                                                    letterSpacing: 0.3,
                                                }}
                                            >
                                                EXPECTED DELIVERY DATE
                                            </Text>
                                            <TextInput
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: '#E2E0D8',
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    fontSize: 13,
                                                    backgroundColor: '#FAF7F2',
                                                    marginBottom: 12,
                                                    color: '#1A1A1A',
                                                }}
                                                placeholder={`e.g. ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`}
                                                placeholderTextColor="#999"
                                                value={expectedDeliveryDate}
                                                onChangeText={setExpectedDeliveryDate}
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: '800',
                                                    color: '#666',
                                                    marginBottom: 4,
                                                    letterSpacing: 0.3,
                                                }}
                                            >
                                                DELIVERY INSTRUCTIONS / NOTES
                                            </Text>
                                            <TextInput
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: '#E2E0D8',
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    fontSize: 13,
                                                    backgroundColor: '#FAF7F2',
                                                    color: '#1A1A1A',
                                                }}
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
                                                                active && styles.payModePillActive,
                                                            ]}
                                                            onPress={() => setPaymentMode(mode)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.payModePillText,
                                                                    active && styles.payModePillTextActive,
                                                                ]}
                                                            >
                                                                {mode}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>

                                            {/* Partial / Split Payment Box */}
                                            {paymentMode === 'PARTIAL' && (
                                                <View style={styles.partialPayBox}>
                                                    <Text style={styles.partialLabel}>
                                                        PAYMENT RECEIVED VIA
                                                    </Text>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            gap: 16,
                                                            marginVertical: 10,
                                                        }}
                                                    >
                                                        {(['CASH', 'UPI', 'CARD'] as const).map((mode) => (
                                                            <TouchableOpacity
                                                                key={mode}
                                                                onPress={() => setInitialPaymentMode(mode)}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontWeight:
                                                                            initialPaymentMode === mode
                                                                                ? '800'
                                                                                : '400',
                                                                    }}
                                                                >
                                                                    {initialPaymentMode === mode ? '✓ ' : ''}
                                                                    {mode}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                    <View style={styles.partialInputRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.partialLabel}>
                                                                PAID AMOUNT (₹)
                                                            </Text>
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
                                                            <Text style={styles.partialBalanceLabel}>
                                                                BALANCE DUE
                                                            </Text>
                                                            <Text style={styles.partialBalanceValue}>
                                                                ₹{effectiveBalanceDue.toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.partialHint}>
                                                        * Remaining ₹{effectiveBalanceDue.toFixed(2)} will be
                                                        debited to{' '}
                                                        {selectedCustomer?.customerName || 'Customer'}'s
                                                        Outstanding Ledger.
                                                    </Text>
                                                </View>
                                            )}

                                            {paymentMode === 'CREDIT' && (
                                                <View style={styles.creditNoticeBox}>
                                                    <Text style={styles.creditNoticeText}>
                                                        💳 Full invoice total ₹
                                                        {calculatedGrandTotal.toFixed(2)} will be debited to{' '}
                                                        {selectedCustomer?.customerName || 'Customer'}'s
                                                        Credit Ledger.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* 4. Discount & Tax Calculation Card (Clean Integrated Layout - No odd gray box) */}
                                    <View style={styles.calcSummaryCard}>
                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>Subtotal</Text>
                                            <Text style={styles.calcValue}>
                                                ₹{calculatedSubtotal.toFixed(2)}
                                            </Text>
                                        </View>

                                        {/* Clean Seamless Special Discount Row */}
                                        <View style={styles.calcRow}>
                                            <Text style={styles.calcLabel}>Special Discount</Text>
                                            <View style={styles.inlineDiscountRow}>
                                                <Text
                                                    style={[
                                                        styles.discountPrefix,
                                                        discountValue > 0
                                                            ? { color: '#E53935' }
                                                            : { color: '#888' },
                                                    ]}
                                                >
                                                    {discountValue > 0 ? '- ₹' : '₹'}
                                                </Text>
                                                <TextInput
                                                    style={[
                                                        styles.cleanDiscountInput,
                                                        discountValue > 0 && { color: '#E53935' },
                                                    ]}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor="#A0A0A0"
                                                    value={discount}
                                                    onChangeText={setDiscount}
                                                />
                                            </View>
                                        </View>
                                        {discountExceedsSubtotal && (
                                            <View style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8, marginVertical: 6 }}>
                                                <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>
                                                    ⚠️ Discount exceeds subtotal (₹{discountValue.toFixed(2)} &gt; ₹{calculatedSubtotal.toFixed(2)}). Grand total cannot be computed.
                                                </Text>
                                            </View>
                                        )}

                                        <Text style={styles.calcLabel}>Supply type</Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                marginVertical: 10,
                                            }}
                                        >
                                            {(['INTRA_STATE', 'INTER_STATE'] as const).map((type) => (
                                                <TouchableOpacity
                                                    key={type}
                                                    onPress={() => setTaxType(type)}
                                                    accessibilityRole="radio"
                                                    accessibilityState={{ selected: taxType === type }}
                                                    style={{
                                                        padding: 12,
                                                        borderWidth: 1,
                                                        borderRadius: 10,
                                                        backgroundColor:
                                                            taxType === type ? '#E8F2EB' : '#FFFFFF',
                                                    }}
                                                >
                                                    <Text>
                                                        {type === 'INTRA_STATE'
                                                            ? 'Within state: CGST + SGST'
                                                            : 'Interstate: IGST'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        {taxType === 'INTRA_STATE' ? (
                                            <>
                                                <View style={styles.calcRow}>
                                                    <Text style={styles.calcLabel}>CGST</Text>
                                                    <Text style={styles.calcValue}>
                                                        + ₹{cgstAmount.toFixed(2)}
                                                    </Text>
                                                </View>

                                                <View style={styles.calcRow}>
                                                    <Text style={styles.calcLabel}>SGST</Text>
                                                    <Text style={styles.calcValue}>
                                                        + ₹{sgstAmount.toFixed(2)}
                                                    </Text>
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.calcRow}>
                                                <Text style={styles.calcLabel}>IGST</Text>
                                                <Text style={styles.calcValue}>
                                                    + ₹{igstAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.dashedDivider} />

                                        <View style={styles.calcGrandTotalRow}>
                                            <Text style={styles.calcGrandTotalLabel}>GRAND TOTAL</Text>
                                            <Text style={styles.calcGrandTotalValue}>
                                                ₹
                                                {calculatedGrandTotal.toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        {/* Pinned Submit Button */}
                        <View style={styles.createModalFooter}>
                            <TouchableOpacity
                                style={[
                                    styles.createSubmitBtn,
                                    orderBookingMode === 'SALES_ORDER' && { backgroundColor: '#E65100' },
                                ]}
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
                                            style={[
                                                styles.pickerCategoryChip,
                                                active && styles.pickerCategoryChipActive,
                                            ]}
                                            onPress={() => setProductPickerCategory(cat)}
                                        >
                                            <Text
                                                style={[
                                                    styles.pickerCategoryText,
                                                    active && styles.pickerCategoryTextActive,
                                                ]}
                                            >
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
                                const inStock = p.availableStock != null && p.availableStock > 0;
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
                                                {p.brand ? `${p.brand} ` : ''}
                                                {p.productName}
                                            </Text>
                                            <View style={styles.catalogItemMetaRow}>
                                                <View style={styles.bagWeightPill}>
                                                    <Text style={styles.bagWeightPillText}>
                                                        {p.unit?.includes('50') ? 50 : 25}kg Bag
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.catalogStockBadge,
                                                        { backgroundColor: inStock ? '#E8F5E9' : '#FFEBEE' },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.catalogStockText,
                                                            { color: inStock ? '#2E7D32' : '#C62828' },
                                                        ]}
                                                    >
                                                        {p.availableStock == null
                                                            ? 'Refresh stock availability'
                                                            : inStock
                                                              ? `Available: ${p.availableStock} bags`
                                                              : 'Out of Stock'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.catalogItemPriceCol}>
                                            <Text style={styles.catalogItemPrice}>
                                                ₹{p.sellingPrice || 0}
                                            </Text>
                                            <Text style={styles.catalogItemPerBag}>/ bag</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {filteredProductsList.length === 0 && (
                                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                    <Package size={40} color="#D0D0D0" />
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '700',
                                            color: '#555',
                                            marginTop: 10,
                                        }}
                                    >
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
                    <View style={styles.salesOrderDetailModalCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Modal Header */}
                        <View style={styles.billModalHeader}>
                            <View style={styles.billModalHeaderLeft}>
                                <Text style={styles.billModalTitle}>
                                    {selectedSalesOrder?.orderNumber || 'Sales Order'}
                                </Text>
                                <Text style={styles.billModalSubtitle}>
                                    Booked on{' '}
                                    {selectedSalesOrder?.orderDate
                                        ? new Date(selectedSalesOrder.orderDate).toLocaleDateString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                          })
                                        : 'Today'}
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

                        {selectedSalesOrder &&
                            (() => {
                                const selectedItems = selectedSalesOrder.items || [];
                                const modalTotalOrdered = selectedItems.reduce(
                                    (sum: number, it: any) => sum + (it.orderedQuantity || 0),
                                    0,
                                );
                                const modalTotalDelivered = selectedItems.reduce(
                                    (sum: number, it: any) => sum + (it.deliveredQuantity || 0),
                                    0,
                                );
                                const modalTotalRemaining = selectedItems.reduce(
                                    (sum: number, it: any) =>
                                        sum +
                                        (it.remainingQuantity != null
                                            ? it.remainingQuantity
                                            : Math.max(
                                                  0,
                                                  (it.orderedQuantity || 0) - (it.deliveredQuantity || 0),
                                              )),
                                    0,
                                );
                                const modalPct =
                                    modalTotalOrdered > 0
                                        ? Math.min(
                                              100,
                                              Math.round((modalTotalDelivered / modalTotalOrdered) * 100),
                                          )
                                        : 0;

                                const modalIsCompleted = selectedSalesOrder.status === 'DELIVERED';
                                const modalIsPartial = selectedSalesOrder.status === 'PARTIALLY_DELIVERED';
                                const modalIsTransit = selectedSalesOrder.status === 'OUT_FOR_DELIVERY';
                                const modalIsReady = selectedSalesOrder.status === 'READY_FOR_DELIVERY';

                                const modalBadgeBg = modalIsCompleted
                                    ? '#ECFDF5'
                                    : modalIsPartial
                                      ? '#FEF3C7'
                                      : modalIsTransit
                                        ? '#F0F9FF'
                                        : modalIsReady
                                          ? '#EDE9FE'
                                          : '#FFFBEB';
                                const modalBadgeBorder = modalIsCompleted
                                    ? '#A7F3D0'
                                    : modalIsPartial
                                      ? '#FDE68A'
                                      : modalIsTransit
                                        ? '#BAE6FD'
                                        : modalIsReady
                                          ? '#DDD6FE'
                                          : '#FDE68A';
                                const modalBadgeColor = modalIsCompleted
                                    ? '#059669'
                                    : modalIsPartial
                                      ? '#D97706'
                                      : modalIsTransit
                                        ? '#0284C7'
                                        : modalIsReady
                                          ? '#7C3AED'
                                          : '#B45309';

                                const totalInvoicedValue = selectedItems.reduce(
                                    (acc: number, it: any) =>
                                        acc + (it.deliveredQuantity || 0) * (it.unitPrice || 0),
                                    0,
                                );
                                const totalPendingValue = selectedItems.reduce(
                                    (acc: number, it: any) =>
                                        acc +
                                        (it.remainingQuantity != null
                                            ? it.remainingQuantity
                                            : Math.max(
                                                  0,
                                                  (it.orderedQuantity || 0) - (it.deliveredQuantity || 0),
                                              )) *
                                            (it.unitPrice || 0),
                                    0,
                                );

                                return (
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                                    >
                                        {/* Status Banner */}
                                        <View
                                            style={{
                                                backgroundColor: '#FFFFFF',
                                                padding: 14,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: '#ECEBE4',
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
                                                            fontWeight: '700',
                                                            color: '#6B7280',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 0.5,
                                                        }}
                                                    >
                                                        Fulfillment Status
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 15,
                                                            fontWeight: '800',
                                                            color: '#1A1A1A',
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {modalIsPartial
                                                            ? 'Partially Delivered'
                                                            : (
                                                                  selectedSalesOrder.status || 'CONFIRMED'
                                                              ).replace(/_/g, ' ')}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        backgroundColor: modalBadgeBg,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 999,
                                                        borderWidth: 1,
                                                        borderColor: modalBadgeBorder,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: '800',
                                                            color: modalBadgeColor,
                                                        }}
                                                    >
                                                        {modalIsPartial
                                                            ? 'PARTIALLY DELIVERED'
                                                            : (
                                                                  selectedSalesOrder.status || 'CONFIRMED'
                                                              ).replace(/_/g, ' ')}
                                                    </Text>
                                                </View>
                                            </View>

                                            {modalTotalOrdered > 0 && (
                                                <View
                                                    style={{
                                                        marginTop: 12,
                                                        paddingTop: 12,
                                                        borderTopWidth: 1,
                                                        borderTopColor: '#F3F4F6',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 11.5,
                                                                fontWeight: '700',
                                                                color: '#4B5563',
                                                            }}
                                                        >
                                                            Fulfillment Progress
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: '800',
                                                                color: modalIsCompleted
                                                                    ? '#059669'
                                                                    : modalIsPartial
                                                                      ? '#D97706'
                                                                      : '#1A1A1A',
                                                            }}
                                                        >
                                                            {modalTotalDelivered} / {modalTotalOrdered} Bags (
                                                            {modalPct}%)
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={{
                                                            height: 8,
                                                            backgroundColor: '#F3F4F6',
                                                            borderRadius: 999,
                                                            overflow: 'hidden',
                                                            marginBottom: 10,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                height: '100%',
                                                                width: `${modalPct}%`,
                                                                backgroundColor: modalIsCompleted
                                                                    ? '#10B981'
                                                                    : modalIsPartial
                                                                      ? '#F59E0B'
                                                                      : '#3B82F6',
                                                                borderRadius: 999,
                                                            }}
                                                        />
                                                    </View>

                                                    {/* 3 Metrics Chips */}
                                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                                        <View
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: '#F9FAFB',
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 8,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: '#F3F4F6',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color: '#6B7280',
                                                                    fontWeight: '700',
                                                                }}
                                                            >
                                                                ORDERED
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: '800',
                                                                    color: '#1A1A1A',
                                                                    marginTop: 1,
                                                                }}
                                                            >
                                                                {modalTotalOrdered} Bags
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: '#ECFDF5',
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 8,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: '#D1FAE5',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color: '#059669',
                                                                    fontWeight: '700',
                                                                }}
                                                            >
                                                                DELIVERED
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: '800',
                                                                    color: '#059669',
                                                                    marginTop: 1,
                                                                }}
                                                            >
                                                                {modalTotalDelivered} Bags
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor:
                                                                    modalTotalRemaining > 0
                                                                        ? '#FEF3C7'
                                                                        : '#F9FAFB',
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 8,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor:
                                                                    modalTotalRemaining > 0
                                                                        ? '#FDE68A'
                                                                        : '#F3F4F6',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color:
                                                                        modalTotalRemaining > 0
                                                                            ? '#D97706'
                                                                            : '#6B7280',
                                                                    fontWeight: '700',
                                                                }}
                                                            >
                                                                REMAINING
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: '800',
                                                                    color:
                                                                        modalTotalRemaining > 0
                                                                            ? '#D97706'
                                                                            : '#1A1A1A',
                                                                    marginTop: 1,
                                                                }}
                                                            >
                                                                {modalTotalRemaining} Bags
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        {/* Customer & Rep Card */}
                                        <View
                                            style={{
                                                backgroundColor: '#FFFFFF',
                                                padding: 14,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: '#ECEBE4',
                                                marginBottom: 14,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <Store size={16} color="#1A1A1A" />
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '700',
                                                        color: '#1A1A1A',
                                                    }}
                                                >
                                                    {selectedSalesOrder.customer?.customerName ||
                                                        'Store Customer'}
                                                </Text>
                                            </View>
                                            {selectedSalesOrder.customer?.phoneNumber ? (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <Phone size={12} color="#059669" />
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: '#059669',
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {selectedSalesOrder.customer.phoneNumber}
                                                    </Text>
                                                </View>
                                            ) : null}
                                            {selectedSalesOrder.customer?.address ? (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-start',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <MapPin
                                                        size={12}
                                                        color="#6B7280"
                                                        style={{ marginTop: 2 }}
                                                    />
                                                    <Text
                                                        style={{ fontSize: 11.5, color: '#6B7280', flex: 1 }}
                                                    >
                                                        {selectedSalesOrder.customer.address}
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {selectedSalesOrder.salesperson?.name ? (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        marginTop: 8,
                                                        paddingTop: 8,
                                                        borderTopWidth: 1,
                                                        borderTopColor: '#F3F4F6',
                                                    }}
                                                >
                                                    <User size={12} color="#4B5563" />
                                                    <Text
                                                        style={{
                                                            fontSize: 11.5,
                                                            color: '#4B5563',
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        Booked by: {selectedSalesOrder.salesperson.name}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Ordered Items List */}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: '800',
                                                color: '#1A1A1A',
                                                marginBottom: 8,
                                            }}
                                        >
                                            Item Fulfillment Breakdown
                                        </Text>
                                        <View
                                            style={{
                                                backgroundColor: '#FAFAF8',
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: '#EFEFEA',
                                                padding: 12,
                                                marginBottom: 14,
                                                gap: 12,
                                            }}
                                        >
                                            {(selectedSalesOrder.items || []).map((it: any, idx: number) => {
                                                const itDelivered = it.deliveredQuantity || 0;
                                                const itRemaining =
                                                    it.remainingQuantity != null
                                                        ? it.remainingQuantity
                                                        : Math.max(
                                                              0,
                                                              (it.orderedQuantity || 0) - itDelivered,
                                                          );
                                                const itPct =
                                                    it.orderedQuantity > 0
                                                        ? Math.min(
                                                              100,
                                                              Math.round(
                                                                  (itDelivered / it.orderedQuantity) * 100,
                                                              ),
                                                          )
                                                        : 0;
                                                const itLineTotal =
                                                    it.totalPrice || it.orderedQuantity * (it.unitPrice || 0);

                                                return (
                                                    <View
                                                        key={it.id || idx}
                                                        style={{
                                                            backgroundColor: '#FFFFFF',
                                                            padding: 12,
                                                            borderRadius: 10,
                                                            borderWidth: 1,
                                                            borderColor: '#ECEBE4',
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'flex-start',
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                                <Text
                                                                    style={{
                                                                        fontSize: 13.5,
                                                                        fontWeight: '700',
                                                                        color: '#1A1A1A',
                                                                    }}
                                                                >
                                                                    {it.product?.productName ||
                                                                        'Rice Product'}
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        fontSize: 11.5,
                                                                        color: '#6B7280',
                                                                        marginTop: 1,
                                                                    }}
                                                                >
                                                                    Rate: ₹
                                                                    {(it.unitPrice || 0).toLocaleString(
                                                                        'en-IN',
                                                                    )}{' '}
                                                                    / Bag
                                                                </Text>
                                                            </View>
                                                            <Text
                                                                style={{
                                                                    fontSize: 14,
                                                                    fontWeight: '800',
                                                                    color: '#1A1A1A',
                                                                }}
                                                            >
                                                                ₹{itLineTotal.toLocaleString('en-IN')}
                                                            </Text>
                                                        </View>

                                                        {/* Progress bar per line */}
                                                        <View
                                                            style={{
                                                                height: 5,
                                                                backgroundColor: '#F3F4F6',
                                                                borderRadius: 999,
                                                                overflow: 'hidden',
                                                                marginVertical: 6,
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    height: '100%',
                                                                    width: `${itPct}%`,
                                                                    backgroundColor:
                                                                        itPct === 100
                                                                            ? '#10B981'
                                                                            : itPct > 0
                                                                              ? '#F59E0B'
                                                                              : '#9CA3AF',
                                                                    borderRadius: 999,
                                                                }}
                                                            />
                                                        </View>

                                                        {/* Item status row */}
                                                        <View
                                                            style={{
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                                <View
                                                                    style={{
                                                                        backgroundColor: '#F3F4F6',
                                                                        paddingHorizontal: 7,
                                                                        paddingVertical: 3,
                                                                        borderRadius: 6,
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            fontSize: 10.5,
                                                                            fontWeight: '700',
                                                                            color: '#4B5563',
                                                                        }}
                                                                    >
                                                                        Ordered: {it.orderedQuantity}
                                                                    </Text>
                                                                </View>
                                                                <View
                                                                    style={{
                                                                        backgroundColor:
                                                                            itDelivered > 0
                                                                                ? '#ECFDF5'
                                                                                : '#F3F4F6',
                                                                        paddingHorizontal: 7,
                                                                        paddingVertical: 3,
                                                                        borderRadius: 6,
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            fontSize: 10.5,
                                                                            fontWeight: '700',
                                                                            color:
                                                                                itDelivered > 0
                                                                                    ? '#059669'
                                                                                    : '#6B7280',
                                                                        }}
                                                                    >
                                                                        Delivered: {itDelivered}
                                                                    </Text>
                                                                </View>
                                                                {itRemaining > 0 && (
                                                                    <View
                                                                        style={{
                                                                            backgroundColor: '#FEF3C7',
                                                                            paddingHorizontal: 7,
                                                                            paddingVertical: 3,
                                                                            borderRadius: 6,
                                                                        }}
                                                                    >
                                                                        <Text
                                                                            style={{
                                                                                fontSize: 10.5,
                                                                                fontWeight: '700',
                                                                                color: '#D97706',
                                                                            }}
                                                                        >
                                                                            Remaining: {itRemaining}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>

                                                            {itDelivered > 0 && (
                                                                <Text
                                                                    style={{
                                                                        fontSize: 11,
                                                                        fontWeight: '700',
                                                                        color: '#059669',
                                                                    }}
                                                                >
                                                                    Billed: ₹
                                                                    {(
                                                                        itDelivered * (it.unitPrice || 0)
                                                                    ).toLocaleString('en-IN')}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {/* Order Value & Accounting Breakdown */}
                                        <View
                                            style={{
                                                backgroundColor: '#FFFFFF',
                                                padding: 14,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: '#ECEBE4',
                                                marginBottom: 16,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: modalTotalDelivered > 0 ? 8 : 0,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '700',
                                                        color: '#1A1A1A',
                                                    }}
                                                >
                                                    Total Booked Amount
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 18,
                                                        fontWeight: '800',
                                                        color: '#1A1A1A',
                                                    }}
                                                >
                                                    ₹
                                                    {(selectedSalesOrder.grandTotal || 0).toLocaleString(
                                                        'en-IN',
                                                    )}
                                                </Text>
                                            </View>

                                            {modalTotalDelivered > 0 && (
                                                <View
                                                    style={{
                                                        paddingTop: 8,
                                                        borderTopWidth: 1,
                                                        borderTopColor: '#F3F4F6',
                                                        gap: 4,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 12.5,
                                                                color: '#059669',
                                                                fontWeight: '600',
                                                            }}
                                                        >
                                                            Delivered & Invoiced Value
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: '800',
                                                                color: '#059669',
                                                            }}
                                                        >
                                                            ₹{totalInvoicedValue.toLocaleString('en-IN')}
                                                        </Text>
                                                    </View>
                                                    {totalPendingValue > 0 && (
                                                        <View
                                                            style={{
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 12.5,
                                                                    color: '#D97706',
                                                                    fontWeight: '600',
                                                                }}
                                                            >
                                                                Pending Stock Value
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: '800',
                                                                    color: '#D97706',
                                                                }}
                                                            >
                                                                ₹{totalPendingValue.toLocaleString('en-IN')}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>

                                        {modalTotalRemaining > 0 &&
                                            selectedSalesOrder.status !== 'CANCELLED' && (
                                                <TouchableOpacity
                                                    style={{
                                                        height: 48,
                                                        borderRadius: 999,
                                                        backgroundColor: '#059669',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        flexDirection: 'row',
                                                        gap: 8,
                                                        marginBottom: 10,
                                                    }}
                                                    onPress={() => {
                                                        setSalesOrderDetailModalVisible(false);
                                                        router.push('/delivery' as any);
                                                    }}
                                                    activeOpacity={0.85}
                                                >
                                                    <Truck size={16} color="#FFFFFF" strokeWidth={2.2} />
                                                    <Text
                                                        style={{
                                                            fontSize: 13.5,
                                                            fontWeight: '700',
                                                            color: '#FFFFFF',
                                                        }}
                                                    >
                                                        Dispatch Remaining ({modalTotalRemaining} Bags) in
                                                        Delivery Hub
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                        <TouchableOpacity
                                            style={{
                                                height: 46,
                                                borderRadius: 999,
                                                backgroundColor: '#1A1A1A',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            onPress={() => setSalesOrderDetailModalVisible(false)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 13.5,
                                                    fontWeight: '700',
                                                    color: '#FFFFFF',
                                                }}
                                            >
                                                Close
                                            </Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                );
                            })()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// STYLESHEET (Clean Native Typography & Layout)
// ─────────────────────────────────────────────

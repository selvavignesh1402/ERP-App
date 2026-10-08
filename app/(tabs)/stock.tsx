import { GstSelector } from '../../src/components/GstSelector';
import type { Product, PriceHistory, StockAdjustment } from '../../src/types/business';
import {
    buildProductPayload,
    adjustmentPayload,
    toInventoryItem,
    inventoryError,
    InventoryItem,
} from '../../src/features/inventory/productForm';
import { styles } from '../../src/features/inventory/styles';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { InventoryCard } from '../../src/components/InventoryCard';
import {
    Plus,
    Search,
    Box,
    ScanLine,
    X,
    SlidersHorizontal,
    ArrowUpDown,
    RefreshCw,
    Layers,
    History,
    Package,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
} from 'lucide-react-native';
import { IndianRupee } from '../../src/components/IndianRupee';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FadeInDown } from '../../src/components/Anime';
import { RoleGate } from '../../src/components/RoleGate';
import { Can } from '../../src/components/Can';
import { OrgScopedScreen } from '../../src/components/OrgScopedScreen';
import { usePermission } from '../../src/hooks/usePermission';
import { OrganizationApi } from '../../src/services/api';

const CATEGORIES = ['All', 'Basmati', 'Raw Rice', 'Speciality', 'Organic', 'Pulses', 'Oil', 'Other'];
const ITEMS_PER_PAGE = 6;

type AdjustMode = 'ADD' | 'DEDUCT';
type AdjustReason = 'recount' | 'damage' | 'spillage' | 'return' | 'new_stock' | 'other';

const ADJUST_REASONS: { key: AdjustReason; label: string; icon: string }[] = [
    { key: 'recount', label: 'Recount / Audit', icon: '📋' },
    { key: 'damage', label: 'Damage', icon: '⚠️' },
    { key: 'spillage', label: 'Spillage / Loss', icon: '💧' },
    { key: 'return', label: 'Return', icon: '↩️' },
    { key: 'new_stock', label: 'New Stock', icon: '📦' },
    { key: 'other', label: 'Other', icon: '📝' },
];

const PRESET_QTYS = [5, 10, 25, 50, 100];

export default function StockScreen() {
    return (
        <RoleGate permission="product:view">
            <OrgScopedScreen emptyMessage="Select a shop to manage stock.">
                {(api) => <ShopStockScreen api={api} />}
            </OrgScopedScreen>
        </RoleGate>
    );
}

function ShopStockScreen({ api }: { api: OrganizationApi }) {
    const { can } = usePermission();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [sortOption, setSortOption] = useState<'name' | 'stockAsc' | 'stockDesc' | 'priceDesc'>('name');
    const [currentPage, setCurrentPage] = useState(1);

    // Add Item Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [savingItem, setSavingItem] = useState(false);

    // Form State for Add Item
    const [newItemName, setNewItemName] = useState('');
    const [newItemBrand, setNewItemBrand] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Basmati');
    const [newItemWeight, setNewItemWeight] = useState('25');
    const [newItemStock, setNewItemStock] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemPurchasePrice, setNewItemPurchasePrice] = useState('');
    const [newItemMinStock, setNewItemMinStock] = useState('10');
    const [newItemHsn, setNewItemHsn] = useState('');
    const [gstRate, setGstRate] = useState<number | null>(null);

    // Item Details Modal
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [detailsTab, setDetailsTab] = useState<'price' | 'adjust'>('price');
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Dedicated Redesigned Adjust Modal
    const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [adjustMode, setAdjustMode] = useState<AdjustMode>('ADD');
    const [adjustQtyStr, setAdjustQtyStr] = useState('');
    const [adjustReason, setAdjustReason] = useState<AdjustReason>('recount');
    const [adjustNotes, setAdjustNotes] = useState('');
    const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    const fetchProducts = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setFetchError(null);

            try {
                const response = await api.get<Product[]>('/products');
                const data = response.data || [];
                const mapped = data.map(toInventoryItem);
                setItems(mapped);
            } catch (error) {
                console.error('Error fetching products:', error);
                setFetchError(inventoryError(error, 'Unable to connect to inventory service.'));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [api],
    );

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Open Redesigned Adjust Popup
    const openAdjustModal = (product: InventoryItem) => {
        if (!can('stock:adjust')) {
            Alert.alert('Not permitted', 'You do not have permission to adjust stock.');
            return;
        }
        setAdjustTarget(product);
        setAdjustMode('ADD');
        setAdjustQtyStr('');
        setAdjustReason('recount');
        setAdjustNotes('');
        setAdjustModalVisible(true);
    };

    // Card Press -> Open Details Modal (Price History & Adjustment Log)
    const handleCardPress = async (product: InventoryItem) => {
        setSelectedItem(product);
        setDetailsModalVisible(true);
        setDetailsTab('price');
        setPriceHistory([]);
        setAdjustments([]);
        setDetailsError(null);
        setLoadingDetails(true);

        try {
            const [historyRes, adjustmentsRes] = await Promise.all([
                api.get<PriceHistory[]>(`/products/${product.id}/price-history`),
                api.get<StockAdjustment[]>(`/inventory/adjustments?productId=${product.id}`),
            ]);
            setPriceHistory(historyRes.data || []);
            setAdjustments(adjustmentsRes.data || []);
        } catch (error) {
            console.error('Error fetching product details:', error);
            setDetailsError(
                'Could not load price history or adjustment logs. Please check your connection and retry.',
            );
        } finally {
            setLoadingDetails(false);
        }
    };

    // Handle Adjust Submit in Redesigned Popup
    const handleAdjustSubmit = async () => {
        if (!adjustTarget || !adjustQtyStr) {
            Alert.alert('Missing Quantity', 'Please enter the number of bags to adjust');
            return;
        }

        let payload;
        try {
            payload = adjustmentPayload(
                adjustTarget.id,
                adjustQtyStr,
                adjustMode === 'DEDUCT',
                adjustReason,
                adjustNotes,
            );
        } catch (error) {
            Alert.alert(
                'Invalid Adjustment',
                error instanceof Error ? error.message : 'Check the adjustment details.',
            );
            return;
        }
        const delta = payload.quantityChange;
        const qtyNum = Math.abs(delta);
        if (adjustMode === 'DEDUCT' && adjustTarget.stock + delta < 0) {
            Alert.alert(
                'Insufficient Stock',
                `Current stock is ${adjustTarget.stock} bags. Cannot deduct ${qtyNum} bags.`,
            );
            return;
        }

        setSubmittingAdjustment(true);
        try {
            await api.post('/inventory/adjustments', payload);

            Alert.alert(
                'Stock Updated',
                `Successfully ${adjustMode === 'ADD' ? 'added' : 'deducted'} ${qtyNum} bags for ${adjustTarget.name}.`,
            );
            setAdjustModalVisible(false);
            setAdjustQtyStr('');
            setAdjustNotes('');
            fetchProducts();
        } catch (error) {
            console.error('Adjustment failed:', error);
            const msg = inventoryError(error, 'Failed to apply adjustment');
            Alert.alert('Error', msg);
        } finally {
            setSubmittingAdjustment(false);
        }
    };

    // Add Product Handler
    const handleAddItem = async () => {
        let payload;
        try {
            payload = buildProductPayload({
                name: newItemName,
                brand: newItemBrand,
                category: newItemCategory,
                weight: newItemWeight,
                purchasePrice: newItemPurchasePrice,
                sellingPrice: newItemPrice,
                stock: newItemStock,
                minimumStock: newItemMinStock,
                gstRate,
                hsnCode: newItemHsn,
            });
        } catch (error) {
            Alert.alert('Validation', error instanceof Error ? error.message : 'Check the product details.');
            return;
        }

        setSavingItem(true);
        try {
            await api.post('/products', payload);
            Alert.alert('Success', `Product "${newItemName}" added successfully`);
            setModalVisible(false);
            // Reset form
            setNewItemName('');
            setGstRate(null);
            setNewItemHsn('');
            setNewItemBrand('');
            setNewItemWeight('25');
            setNewItemStock('');
            setNewItemPrice('');
            setNewItemPurchasePrice('');
            setNewItemMinStock('10');
            fetchProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            const msg = inventoryError(error, 'Failed to add product');
            Alert.alert('Error', msg);
        } finally {
            setSavingItem(false);
        }
    };

    // Barcode Scanner Handlers
    const saveProductGst = async () => {
        if (!selectedItem || !can('product:edit')) return;
        setSavingItem(true);
        try {
            await api.put('/products/' + selectedItem.id, {
                productName: selectedItem.productName,
                category: selectedItem.category,
                brand: selectedItem.brand,
                unit: selectedItem.unit,
                purchasePrice: selectedItem.purchasePrice,
                sellingPrice: selectedItem.price,
                minimumStock: selectedItem.minimumStock,
                gstRate: selectedItem.gstRate,
                hsnCode: selectedItem.hsnCode,
            });
            await fetchProducts();
            Alert.alert(
                'GST saved',
                'Future sales will use this setting. Existing invoices and booked orders keep their saved GST.',
            );
        } catch (error) {
            Alert.alert('Could not save GST', inventoryError(error, 'Please retry.'));
        } finally {
            setSavingItem(false);
        }
    };

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const response = await api.get<Product[]>('/products', { params: { search: data } });
            const results = response.data || [];

            if (results.length > 0) {
                const p = results[0];
                setNewItemName(p.productName || '');
                setNewItemBrand(p.brand || '');
                setNewItemWeight((p.unit || '').replace('kg', ''));
                setNewItemPrice(String(p.sellingPrice ?? ''));
                setNewItemCategory(p.category || 'Basmati');
                setScannerVisible(false);
                Alert.alert('Product Found', `Loaded details for "${p.productName}".`);
            } else {
                setNewItemHsn(data);
                setScannerVisible(false);
                Alert.alert('Barcode Scanned', `Code: ${data}. Enter product details.`);
            }
        } catch (error) {
            console.error('Barcode lookup error:', error);
            setScannerVisible(false);
        } finally {
            setTimeout(() => setScanned(false), 1000);
        }
    };

    const openScanner = () => {
        if (!permission?.granted) {
            requestPermission().then((res) => {
                if (res.granted) {
                    setScanned(false);
                    setScannerVisible(true);
                } else {
                    Alert.alert('Camera Permission', 'Camera access is required to scan barcodes.');
                }
            });
            return;
        }
        setScanned(false);
        setScannerVisible(true);
    };

    // Filter & Sort Logic
    const sortedAndFilteredItems = useMemo(() => {
        let list = [...items];

        if (selectedCategory !== 'All') {
            list = list.filter((item) => item.category?.toLowerCase() === selectedCategory.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (item) =>
                    item.name.toLowerCase().includes(q) ||
                    (item.brand && item.brand.toLowerCase().includes(q)) ||
                    (item.hsnCode && item.hsnCode.includes(q)),
            );
        }

        list.sort((a, b) => {
            if (sortOption === 'name') return a.name.localeCompare(b.name);
            if (sortOption === 'stockAsc') return a.stock - b.stock;
            if (sortOption === 'stockDesc') return b.stock - a.stock;
            if (sortOption === 'priceDesc') return b.price - a.price;
            return 0;
        });

        return list;
    }, [items, selectedCategory, searchQuery, sortOption]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, searchQuery, sortOption]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(sortedAndFilteredItems.length / ITEMS_PER_PAGE));
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredItems, currentPage]);

    // KPI stats calculation
    const totalBags = useMemo(() => items.reduce((sum, it) => sum + (it.stock || 0), 0), [items]);

    // Calculated stock in modal
    const inputAdjustQty = Number(adjustQtyStr);
    const parsedAdjustQty = Number.isFinite(inputAdjustQty) && inputAdjustQty > 0 ? inputAdjustQty : 0;
    const projectedStock = adjustTarget
        ? adjustMode === 'ADD'
            ? adjustTarget.stock + parsedAdjustQty
            : adjustTarget.stock - parsedAdjustQty
        : 0;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Organic Pastel Vector Illustration Background per DESIGN.md */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    {/* Top Pastel Blobs */}
                    <Path
                        d="M150 -50 C240 -20, 390 -30, 400 120 C410 270, 310 240, 240 220 C170 200, 70 300, 0 200 C-70 100, 70 -80, 150 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.3}
                    />
                    <Path
                        d="M-50 120 C30 140, 140 80, 180 200 C220 320, 100 380, 0 340 C-100 300, -130 100, -50 120 Z"
                        fill="#F7E6B8"
                        opacity={0.35}
                    />
                    {/* Lower Pastel Blobs */}
                    <Path
                        d="M200 420 C280 450, 380 520, 350 640 C320 760, 220 720, 140 670 C60 620, 120 390, 200 420 Z"
                        fill="#DCE6DB"
                        opacity={0.35}
                    />
                    <Circle cx="330" cy="280" r="60" fill="#E2D4F5" opacity={0.35} />
                </Svg>
            </View>

            <View style={styles.mainLayout}>
                {/* 1. Header Row (Funnel icon removed as requested) */}
                <FadeInDown delay={30} style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Inventory</Text>
                        <Text style={styles.subtitle}>
                            {items.length > 0
                                ? `${items.length} Products · ${totalBags.toLocaleString('en-IN')} Bags`
                                : 'All Items'}
                        </Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.headerIconBtn, showSearch && styles.headerIconBtnActive]}
                            onPress={() => setShowSearch(!showSearch)}
                            activeOpacity={0.7}
                        >
                            <Search size={19} color={showSearch ? '#FFFFFF' : '#1A1A1A'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.headerIconBtn}
                            onPress={() => fetchProducts(true)}
                            activeOpacity={0.7}
                        >
                            <RefreshCw size={18} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>
                </FadeInDown>

                {/* 2. Top Action Row: "+ Add New Item" with single plus icon */}
                <FadeInDown delay={70} style={styles.topActionBar}>
                    <Can permission="product:create">
                        <TouchableOpacity
                            style={styles.addNewItemBtn}
                            onPress={() => setModalVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Plus size={17} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.addNewItemText}>Add New Item</Text>
                        </TouchableOpacity>
                    </Can>

                    <TouchableOpacity style={styles.scanCodeBtn} onPress={openScanner} activeOpacity={0.7}>
                        <ScanLine size={16} color="#1A1A1A" />
                        <Text style={styles.scanCodeText}>Scan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.sortToggleBtn}
                        onPress={() => {
                            if (sortOption === 'name') setSortOption('stockDesc');
                            else if (sortOption === 'stockDesc') setSortOption('stockAsc');
                            else if (sortOption === 'stockAsc') setSortOption('priceDesc');
                            else setSortOption('name');
                        }}
                        activeOpacity={0.7}
                    >
                        <ArrowUpDown size={14} color="#555" />
                        <Text style={styles.sortToggleText}>
                            {sortOption === 'name'
                                ? 'Name'
                                : sortOption === 'stockDesc'
                                  ? 'Stock ↓'
                                  : sortOption === 'stockAsc'
                                    ? 'Stock ↑'
                                    : 'Price ↓'}
                        </Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. Category Filter Chips (DESIGN.png) */}
                <FadeInDown delay={110} style={styles.categoryRow}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {CATEGORIES.map((cat) => {
                            const isActive = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[styles.categoryText, isActive && styles.categoryTextActive]}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </FadeInDown>

                {/* 4. Search Bar (Expandable / Inline) */}
                {showSearch && (
                    <FadeInDown delay={130} style={styles.searchBoxWrapper}>
                        <View style={styles.searchBar}>
                            <Search size={16} color="#8A8A8A" />
                            <TextInput
                                placeholder="Search rice varieties, brands, HSN..."
                                placeholderTextColor="#9E9E9E"
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.searchClearBtn}
                                >
                                    <X size={14} color="#8A8A8A" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </FadeInDown>
                )}

                {/* 5. Product Item Listing with Pagination */}
                {loading && items.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F06A8C" />
                        <Text style={styles.loadingText}>Loading inventory...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={paginatedItems}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <InventoryCard
                                id={item.id}
                                name={item.name}
                                brand={item.brand}
                                category={item.category}
                                supplier={item.supplier}
                                stock={item.stock}
                                minimumStock={item.minimumStock}
                                price={item.price}
                                unit={item.unit}
                                hsnCode={item.hsnCode}
                                onPress={() => handleCardPress(item)}
                                onAdjustPress={() => openAdjustModal(item)}
                            />
                        )}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={() => fetchProducts(true)}
                        ListEmptyComponent={
                            fetchError && items.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: '#FBE8E8' }]}>
                                        <AlertCircle size={36} color="#D32F2F" />
                                    </View>
                                    <Text style={styles.emptyTitle}>Could Not Load Stock</Text>
                                    <Text style={styles.emptySub}>{fetchError}</Text>
                                    <TouchableOpacity
                                        style={[styles.emptyActionBtn, { backgroundColor: '#1A1A1A' }]}
                                        onPress={() => fetchProducts()}
                                        accessibilityRole="button"
                                        accessibilityLabel="Retry loading stock"
                                    >
                                        <Text style={[styles.emptyActionText, { color: '#FFFFFF' }]}>
                                            Retry Connection
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconCircle}>
                                        <Package size={36} color="#A9AD6E" />
                                    </View>
                                    <Text style={styles.emptyTitle}>No Items Found</Text>
                                    <Text style={styles.emptySub}>
                                        {searchQuery
                                            ? `No product matching "${searchQuery}"`
                                            : 'Try selecting another category or add new rice stock.'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyActionBtn}
                                        onPress={() => {
                                            setSelectedCategory('All');
                                            setSearchQuery('');
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Reset product filters"
                                    >
                                        <Text style={styles.emptyActionText}>Reset Filters</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        }
                        ListFooterComponent={
                            sortedAndFilteredItems.length > ITEMS_PER_PAGE ? (
                                <View style={styles.paginationContainer}>
                                    <Text style={styles.paginationInfoText}>
                                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                                        {Math.min(
                                            currentPage * ITEMS_PER_PAGE,
                                            sortedAndFilteredItems.length,
                                        )}{' '}
                                        of {sortedAndFilteredItems.length} items
                                    </Text>
                                    <View style={styles.paginationControls}>
                                        <TouchableOpacity
                                            style={[
                                                styles.pageNavBtn,
                                                currentPage === 1 && styles.pageNavBtnDisabled,
                                            ]}
                                            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            activeOpacity={0.7}
                                        >
                                            <ChevronLeft
                                                size={16}
                                                color={currentPage === 1 ? '#B0B0B0' : '#1A1A1A'}
                                            />
                                        </TouchableOpacity>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                            (pageNum) => {
                                                const isCurrent = pageNum === currentPage;
                                                return (
                                                    <TouchableOpacity
                                                        key={pageNum}
                                                        style={[
                                                            styles.pageNumberBtn,
                                                            isCurrent && styles.pageNumberBtnActive,
                                                        ]}
                                                        onPress={() => setCurrentPage(pageNum)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.pageNumberText,
                                                                isCurrent && styles.pageNumberTextActive,
                                                            ]}
                                                        >
                                                            {pageNum}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            },
                                        )}

                                        <TouchableOpacity
                                            style={[
                                                styles.pageNavBtn,
                                                currentPage === totalPages && styles.pageNavBtnDisabled,
                                            ]}
                                            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            activeOpacity={0.7}
                                        >
                                            <ChevronRight
                                                size={16}
                                                color={currentPage === totalPages ? '#B0B0B0' : '#1A1A1A'}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* ========================================================================= */}
            {/* 6. REDESIGNED ADJUST POPUP (Scrollable with Keyboard Support)             */}
            {/* ========================================================================= */}
            {adjustModalVisible && adjustTarget && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={adjustModalVisible}
                    onRequestClose={() => setAdjustModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ width: '100%', alignItems: 'center' }}
                        >
                            <View style={[styles.adjustModalCard, { maxHeight: '90%' }]}>
                                {/* Grab Handle */}
                                <View style={styles.modalGrabHandle} />

                                {/* Fixed Header */}
                                <View style={styles.adjustModalHeader}>
                                    <View style={styles.adjustHeaderIconCircle}>
                                        <SlidersHorizontal size={20} color="#F06A8C" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.adjustHeaderTitle} numberOfLines={1}>
                                            {adjustTarget.name}
                                        </Text>
                                        <Text style={styles.adjustHeaderSub}>
                                            {adjustTarget.brand ? `${adjustTarget.brand} · ` : ''}
                                            {adjustTarget.unit || '25kg'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setAdjustModalVisible(false)}
                                        style={styles.modalCloseCircle}
                                    >
                                        <X size={18} color="#777" />
                                    </TouchableOpacity>
                                </View>

                                {/* Scrollable Form Content */}
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 16 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Current Stock Banner & Projected Calculation */}
                                    <View style={styles.adjustCalculationCard}>
                                        <View style={styles.calcCol}>
                                            <Text style={styles.calcLabel}>Current Stock</Text>
                                            <Text style={styles.calcCurrentVal}>
                                                {adjustTarget.stock} Bags
                                            </Text>
                                        </View>

                                        <View style={styles.calcArrowBox}>
                                            <Text style={styles.calcArrowText}>→</Text>
                                        </View>

                                        <View style={styles.calcCol}>
                                            <Text style={styles.calcLabel}>New Level</Text>
                                            <Text
                                                style={[
                                                    styles.calcNewVal,
                                                    projectedStock < adjustTarget.minimumStock &&
                                                        styles.calcNewValWarning,
                                                ]}
                                            >
                                                {projectedStock} Bags
                                            </Text>
                                        </View>

                                        {parsedAdjustQty > 0 && (
                                            <View
                                                style={[
                                                    styles.calcDeltaBadge,
                                                    adjustMode === 'ADD'
                                                        ? styles.deltaAdd
                                                        : styles.deltaDeduct,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.calcDeltaText,
                                                        adjustMode === 'ADD'
                                                            ? styles.deltaTextAdd
                                                            : styles.deltaTextDeduct,
                                                    ]}
                                                >
                                                    {adjustMode === 'ADD'
                                                        ? `+${parsedAdjustQty}`
                                                        : `-${parsedAdjustQty}`}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Mode Segmented Switcher (+ Add vs - Deduct) */}
                                    <View style={styles.modeSwitcherContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.modeSwitchBtn,
                                                adjustMode === 'ADD' && styles.modeSwitchBtnActiveAdd,
                                            ]}
                                            onPress={() => setAdjustMode('ADD')}
                                            activeOpacity={0.8}
                                        >
                                            <Plus
                                                size={16}
                                                color={adjustMode === 'ADD' ? '#2FAE55' : '#888'}
                                            />
                                            <Text
                                                style={[
                                                    styles.modeSwitchText,
                                                    adjustMode === 'ADD' && styles.modeSwitchTextActiveAdd,
                                                ]}
                                            >
                                                Add Stock (+)
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.modeSwitchBtn,
                                                adjustMode === 'DEDUCT' && styles.modeSwitchBtnActiveDeduct,
                                            ]}
                                            onPress={() => setAdjustMode('DEDUCT')}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.minusIconText,
                                                    adjustMode === 'DEDUCT' && { color: '#E5493F' },
                                                ]}
                                            >
                                                −
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.modeSwitchText,
                                                    adjustMode === 'DEDUCT' &&
                                                        styles.modeSwitchTextActiveDeduct,
                                                ]}
                                            >
                                                Deduct Stock (−)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Quantity Input */}
                                    <View style={styles.qtyInputRow}>
                                        <Text style={styles.fieldSectionLabel}>BAG QUANTITY</Text>
                                        <View style={styles.qtyInputContainer}>
                                            <TextInput
                                                placeholder="0"
                                                placeholderTextColor="#B0B0B0"
                                                style={styles.qtyNumberInput}
                                                keyboardType="numeric"
                                                value={adjustQtyStr}
                                                onChangeText={setAdjustQtyStr}
                                                autoFocus
                                            />
                                            <Text style={styles.qtyUnitLabel}>
                                                Bags ({adjustTarget.unit || '25kg'})
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Preset Increment Chips */}
                                    <View style={styles.presetsRow}>
                                        {PRESET_QTYS.map((val) => (
                                            <TouchableOpacity
                                                key={val}
                                                style={styles.presetChip}
                                                onPress={() => {
                                                    setAdjustQtyStr(String(parsedAdjustQty + val));
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.presetChipText}>+{val}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={[styles.presetChip, { backgroundColor: '#F0F0F2' }]}
                                            onPress={() => setAdjustQtyStr('')}
                                        >
                                            <Text style={[styles.presetChipText, { color: '#777' }]}>
                                                Clear
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Reason Selector Chips */}
                                    <Text style={styles.fieldSectionLabel}>ADJUSTMENT REASON</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.reasonsScroll}
                                    >
                                        {ADJUST_REASONS.map((r) => {
                                            const isSelected = adjustReason === r.key;
                                            return (
                                                <TouchableOpacity
                                                    key={r.key}
                                                    style={[
                                                        styles.reasonPill,
                                                        isSelected && styles.reasonPillActive,
                                                    ]}
                                                    onPress={() => setAdjustReason(r.key)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.reasonIcon}>{r.icon}</Text>
                                                    <Text
                                                        style={[
                                                            styles.reasonLabel,
                                                            isSelected && styles.reasonLabelActive,
                                                        ]}
                                                    >
                                                        {r.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    {/* Optional Remarks Input */}
                                    <View style={styles.notesInputContainer}>
                                        <TextInput
                                            placeholder="Add notes or discrepancy remarks (optional)..."
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.notesInput}
                                            value={adjustNotes}
                                            onChangeText={setAdjustNotes}
                                        />
                                    </View>
                                </ScrollView>

                                {/* Modal Action Buttons */}
                                <View style={styles.modalActionRow}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setAdjustModalVisible(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalSubmitBtn,
                                            (!adjustQtyStr || submittingAdjustment) && { opacity: 0.6 },
                                        ]}
                                        onPress={handleAdjustSubmit}
                                        disabled={!adjustQtyStr || submittingAdjustment}
                                        activeOpacity={0.85}
                                    >
                                        {submittingAdjustment ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.modalSubmitText}>
                                                Apply {adjustMode === 'ADD' ? '+ Add' : '− Deduct'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            )}

            {/* ========================================================================= */}
            {/* 7. REDESIGNED & FIXED ADD NEW PRODUCT MODAL                              */}
            {/* ========================================================================= */}
            {modalVisible && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ width: '100%', alignItems: 'center' }}
                        >
                            <View style={[styles.modalContent, { maxHeight: '88%' }]}>
                                <View style={styles.modalGrabHandle} />

                                <View style={styles.modalTopHeader}>
                                    <View style={[styles.modalIconBox, { backgroundColor: '#FBE8F0' }]}>
                                        <Box size={22} color="#F06A8C" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.modalHeaderTitle}>Add New Product</Text>
                                        <Text style={styles.modalHeaderSubtitle}>
                                            Enter rice stock & pricing parameters
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setModalVisible(false)}
                                        style={styles.modalCloseCircle}
                                    >
                                        <X size={18} color="#777" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 16 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Barcode scan shortcut inside modal */}
                                    <TouchableOpacity style={styles.modalScanShortcut} onPress={openScanner}>
                                        <ScanLine size={18} color="#F06A8C" />
                                        <Text style={styles.modalScanShortcutText}>
                                            Scan Barcode to Auto-fill
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Form Fields */}
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>PRODUCT NAME *</Text>
                                        <TextInput
                                            placeholder="e.g. 1121 Steam Basmati Rice"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.formInput}
                                            value={newItemName}
                                            onChangeText={setNewItemName}
                                        />
                                    </View>

                                    <View style={styles.formRowTwo}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.formLabel}>BRAND</Text>
                                            <TextInput
                                                placeholder="e.g. Royal Grain"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                value={newItemBrand}
                                                onChangeText={setNewItemBrand}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.formLabel}>BAG WEIGHT (KG)</Text>
                                            <TextInput
                                                placeholder="25"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                keyboardType="numeric"
                                                value={newItemWeight}
                                                onChangeText={setNewItemWeight}
                                            />
                                        </View>
                                    </View>

                                    <Text style={styles.formLabel}>CATEGORY</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={{ marginBottom: 14 }}
                                    >
                                        {[
                                            'Basmati',
                                            'Raw Rice',
                                            'Ponni',
                                            'Speciality',
                                            'Organic',
                                            'Pulses',
                                            'Oil',
                                            'Other',
                                        ].map((c) => (
                                            <TouchableOpacity
                                                key={c}
                                                style={[
                                                    styles.formCatChip,
                                                    newItemCategory === c && styles.formCatChipActive,
                                                ]}
                                                onPress={() => setNewItemCategory(c)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.formCatText,
                                                        newItemCategory === c && styles.formCatTextActive,
                                                    ]}
                                                >
                                                    {c}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={styles.formRowTwo}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.formLabel}>SELLING PRICE (₹) *</Text>
                                            <TextInput
                                                placeholder="2400"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                keyboardType="numeric"
                                                value={newItemPrice}
                                                onChangeText={setNewItemPrice}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.formLabel}>PURCHASE PRICE (₹) *</Text>
                                            <TextInput
                                                placeholder="1800"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                keyboardType="numeric"
                                                value={newItemPurchasePrice}
                                                onChangeText={setNewItemPurchasePrice}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRowTwo}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.formLabel}>INITIAL STOCK (BAGS)</Text>
                                            <TextInput
                                                placeholder="50"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                keyboardType="numeric"
                                                value={newItemStock}
                                                onChangeText={setNewItemStock}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.formLabel}>MINIMUM ALERT STOCK</Text>
                                            <TextInput
                                                placeholder="10"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.formInput}
                                                keyboardType="numeric"
                                                value={newItemMinStock}
                                                onChangeText={setNewItemMinStock}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <GstSelector value={gstRate} onChange={setGstRate} />
                                        <Text style={styles.formLabel}>HSN CODE</Text>
                                        <TextInput
                                            placeholder="10063010"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.formInput}
                                            value={newItemHsn}
                                            onChangeText={setNewItemHsn}
                                        />
                                    </View>
                                </ScrollView>

                                <View style={styles.modalActionRow}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalSubmitBtn}
                                        onPress={handleAddItem}
                                        disabled={savingItem}
                                    >
                                        {savingItem ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.modalSubmitText}>Save Product</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            )}

            {/* ========================================================================= */}
            {/* 8. REDESIGNED PRODUCT DETAILS MODAL (Price History & Adjustments Log)    */}
            {/* ========================================================================= */}
            {detailsModalVisible && selectedItem && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={detailsModalVisible}
                    onRequestClose={() => setDetailsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxHeight: '82%' }]}>
                            <View style={styles.modalGrabHandle} />

                            <View style={styles.modalTopHeader}>
                                <View style={[styles.modalIconBox, { backgroundColor: '#EAF2FF' }]}>
                                    <Layers size={22} color="#5B8DEF" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                                        {selectedItem.name}
                                    </Text>
                                    <Text style={styles.modalHeaderSubtitle}>
                                        Stock: {selectedItem.stock} Bags · Rate: ₹
                                        {Number(selectedItem.price).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setDetailsModalVisible(false)}
                                    style={styles.modalCloseCircle}
                                >
                                    <X size={18} color="#777" />
                                </TouchableOpacity>
                            </View>

                            {/* Tab Switcher */}
                            <View style={styles.detailsTabRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.detailsTabBtn,
                                        detailsTab === 'price' && styles.detailsTabBtnActive,
                                    ]}
                                    onPress={() => setDetailsTab('price')}
                                >
                                    <IndianRupee
                                        size={15}
                                        color={detailsTab === 'price' ? '#1A1A1A' : '#8A8A8A'}
                                    />
                                    <Text
                                        style={[
                                            styles.detailsTabText,
                                            detailsTab === 'price' && styles.detailsTabTextActive,
                                        ]}
                                    >
                                        Price History
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.detailsTabBtn,
                                        detailsTab === 'adjust' && styles.detailsTabBtnActive,
                                    ]}
                                    onPress={() => setDetailsTab('adjust')}
                                >
                                    <History
                                        size={15}
                                        color={detailsTab === 'adjust' ? '#1A1A1A' : '#8A8A8A'}
                                    />
                                    <Text
                                        style={[
                                            styles.detailsTabText,
                                            detailsTab === 'adjust' && styles.detailsTabTextActive,
                                        ]}
                                    >
                                        Adjustment Log
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {loadingDetails ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#F06A8C"
                                    style={{ marginVertical: 30 }}
                                />
                            ) : detailsError ? (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Text style={{ color: '#D32F2F', textAlign: 'center', marginBottom: 12 }}>
                                        {detailsError}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyActionBtn}
                                        onPress={() => handleCardPress(selectedItem)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Retry loading product logs"
                                    >
                                        <Text style={styles.emptyActionText}>Retry Loading Logs</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <ScrollView
                                    style={{ flex: 1, marginVertical: 6 }}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {can('product:edit') && (
                                        <View style={{ padding: 12 }}>
                                            <GstSelector
                                                value={selectedItem.gstRate ?? null}
                                                onChange={(value) =>
                                                    setSelectedItem({ ...selectedItem, gstRate: value })
                                                }
                                            />
                                            <TouchableOpacity
                                                onPress={saveProductGst}
                                                disabled={savingItem}
                                                style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}
                                            >
                                                <Text>{savingItem ? 'Saving…' : 'Save product GST'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {detailsTab === 'price' ? (
                                        <View style={{ gap: 8 }}>
                                            {priceHistory.map((ph, idx) => (
                                                <View key={idx} style={styles.logCard}>
                                                    <View>
                                                        <Text style={styles.logTypeLabel}>
                                                            {ph.priceType === 'PURCHASE'
                                                                ? 'Supplier Purchase Price'
                                                                : 'Customer Selling Price'}
                                                        </Text>
                                                        <Text style={styles.logTimestamp}>
                                                            {ph.effectiveFrom
                                                                ? new Date(
                                                                      ph.effectiveFrom,
                                                                  ).toLocaleDateString('en-IN', {
                                                                      day: '2-digit',
                                                                      month: 'short',
                                                                      year: 'numeric',
                                                                  })
                                                                : 'N/A'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.logRateValue}>
                                                        ₹ {Number(ph.price || 0).toLocaleString('en-IN')}
                                                    </Text>
                                                </View>
                                            ))}
                                            {priceHistory.length === 0 && (
                                                <Text style={styles.emptyLogText}>
                                                    No price change history logged yet.
                                                </Text>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={{ gap: 8 }}>
                                            {adjustments.map((adj, idx) => (
                                                <View key={idx} style={styles.logCard}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.logTypeLabel}>
                                                            Adjustment ({adj.reason})
                                                        </Text>
                                                        <Text style={styles.logTimestamp}>
                                                            {adj.adjustedAt
                                                                ? new Date(adj.adjustedAt).toLocaleString(
                                                                      'en-IN',
                                                                      {
                                                                          day: '2-digit',
                                                                          month: 'short',
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      },
                                                                  )
                                                                : 'N/A'}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.logDeltaValue,
                                                            {
                                                                color:
                                                                    adj.quantityChange < 0
                                                                        ? '#E5493F'
                                                                        : '#166534',
                                                            },
                                                        ]}
                                                    >
                                                        {adj.quantityChange > 0
                                                            ? `+${adj.quantityChange}`
                                                            : adj.quantityChange}{' '}
                                                        Bags
                                                    </Text>
                                                </View>
                                            ))}
                                            {adjustments.length === 0 && (
                                                <Text style={styles.emptyLogText}>
                                                    No manual adjustments recorded yet.
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </ScrollView>
                            )}

                            <TouchableOpacity
                                onPress={() => setDetailsModalVisible(false)}
                                style={styles.detailsCloseBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Close details modal"
                            >
                                <Text style={styles.detailsCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Barcode Scanner Modal */}
            <Modal
                visible={scannerVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setScannerVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
                    <View style={styles.scannerTopBar}>
                        <TouchableOpacity
                            onPress={() => setScannerVisible(false)}
                            style={styles.scannerCloseBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Close scanner"
                        >
                            <Text style={styles.scannerCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.scannerTitle}>Scan Product Code</Text>
                        <View style={{ width: 50 }} />
                    </View>
                    <View style={styles.scannerContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            facing="back"
                        />
                        <View style={styles.scanTargetFrame}>
                            <View style={styles.scanReticle} />
                            <Text style={styles.scanHintText}>Align barcode inside box</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

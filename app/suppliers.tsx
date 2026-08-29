import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TextInput,
    TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView,
    Platform, Linking
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Search, Plus, ArrowLeft, Factory, Phone, Mail, MapPin,
    Building2, Pencil, Trash2, CheckCircle2, ArrowUpDown,
    PackagePlus, ShieldCheck, Sparkles, X, ChevronRight, PhoneCall,
    IndianRupee, Star, Truck, Package, Clock
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../src/components/Anime';
import api from '../src/services/api';

const SUPPLIER_CATEGORIES = ['All', 'Paddy Miller', 'Raw Rice Vendor', 'Packaging Material', 'Logistics & Transport', 'General'];

export default function SuppliersScreen() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortOption, setSortOption] = useState<'name' | 'rating' | 'category'>('name');

    // Supplier Add/Edit Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
    const [savingSupplier, setSavingSupplier] = useState(false);

    // Form inputs state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [gst, setGst] = useState('');
    const [category, setCategory] = useState('Paddy Miller');

    // Procurement Linking Modal
    const [procurementVisible, setProcurementVisible] = useState(false);
    const [procurementSupplier, setProcurementSupplier] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [productPickerVisible, setProductPickerVisible] = useState(false);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [leadTimeDays, setLeadTimeDays] = useState('2');
    const [minOrderQty, setMinOrderQty] = useState('50');
    const [savingProcurement, setSavingProcurement] = useState(false);

    // ─────────────────────────────────────────────
    // FETCH SUPPLIERS
    // ─────────────────────────────────────────────
    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/suppliers');
            setSuppliers(response.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            Alert.alert('Error', 'Failed to fetch suppliers list');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProductsList = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data || []);
        } catch (e) {
            console.error('Error loading products for procurement:', e);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchProductsList();
    }, [fetchSuppliers]);

    // ─────────────────────────────────────────────
    // COMPUTED KPI METRICS
    // ─────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalSuppliers = suppliers.length;
        const millersCount = suppliers.filter(s => s.category?.toLowerCase().includes('miller') || s.category?.toLowerCase().includes('paddy')).length;
        const packagingCount = suppliers.filter(s => s.category?.toLowerCase().includes('packaging') || s.category?.toLowerCase().includes('transport')).length;
        const avgRating = totalSuppliers > 0
            ? (suppliers.reduce((acc, s) => acc + (parseFloat(s.rating) || 5.0), 0) / totalSuppliers).toFixed(1)
            : '5.0';

        return {
            totalSuppliers,
            millersCount,
            packagingCount,
            avgRating,
        };
    }, [suppliers]);

    // ─────────────────────────────────────────────
    // FILTER & SORT
    // ─────────────────────────────────────────────
    const filteredSuppliers = useMemo(() => {
        let list = suppliers;

        if (selectedCategory !== 'All') {
            list = list.filter(s => (s.category || '').toLowerCase() === selectedCategory.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((s: any) =>
                (s.supplierName || '').toLowerCase().includes(q) ||
                (s.phone || '').includes(q) ||
                (s.address || '').toLowerCase().includes(q) ||
                (s.gstNumber || '').toLowerCase().includes(q) ||
                (s.category || '').toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            if (sortOption === 'rating') {
                return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
            }
            if (sortOption === 'category') {
                return (a.category || '').localeCompare(b.category || '');
            }
            return (a.supplierName || '').localeCompare(b.supplierName || '');
        });
    }, [suppliers, selectedCategory, searchQuery, sortOption]);

    // ─────────────────────────────────────────────
    // MODAL ACTIONS
    // ─────────────────────────────────────────────
    const openAddModal = () => {
        setEditingSupplier(null);
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setGst('');
        setCategory('Paddy Miller');
        setModalVisible(true);
    };

    const openEditModal = (s: any) => {
        setEditingSupplier(s);
        setName(s.supplierName || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setAddress(s.address || '');
        setGst(s.gstNumber || '');
        setCategory(s.category || 'Paddy Miller');
        setModalVisible(true);
    };

    const handleSaveSupplier = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Supplier Name is required');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Validation Error', 'Contact Phone Number is required');
            return;
        }

        setSavingSupplier(true);
        try {
            const payload = {
                supplierName: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                gstNumber: gst.trim(),
                rating: editingSupplier?.rating || 5.0,
                category: category || 'General'
            };

            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, payload);
                Alert.alert('Success', 'Supplier profile updated successfully');
            } else {
                await api.post('/suppliers', payload);
                Alert.alert('Success', 'New supplier registered successfully');
            }
            setModalVisible(false);
            fetchSuppliers();
        } catch (error: any) {
            console.error('Error saving supplier:', error);
            const msg = error.response?.data?.message || 'Failed to save supplier';
            Alert.alert('Save Failed', msg);
        } finally {
            setSavingSupplier(false);
        }
    };

    // Procurement Linking
    const openProcurementModal = (s: any) => {
        setProcurementSupplier(s);
        setSelectedProduct(null);
        setPurchasePrice('');
        setLeadTimeDays('2');
        setMinOrderQty('50');
        setProcurementVisible(true);
    };

    const handleSaveProcurement = async () => {
        if (!selectedProduct) {
            Alert.alert('Selection Required', 'Please select a catalog product to link');
            return;
        }
        if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid agreed purchase price');
            return;
        }

        setSavingProcurement(true);
        try {
            await api.post('/supplier-products', {
                supplierId: procurementSupplier.id,
                productId: selectedProduct.id,
                purchasePrice: parseFloat(purchasePrice),
                leadTimeDays: parseInt(leadTimeDays, 10) || 2,
                minOrderQty: parseInt(minOrderQty, 10) || 50,
                isPreferred: true
            });
            Alert.alert('SKU Linked', `Successfully linked ${selectedProduct.productName} to ${procurementSupplier.supplierName}`);
            setProcurementVisible(false);
        } catch (error: any) {
            console.error('Error linking supplier SKU:', error);
            const msg = error.response?.data?.message || 'Failed to link SKU';
            Alert.alert('Linking Failed', msg);
        } finally {
            setSavingProcurement(false);
        }
    };

    const handleCallPhone = (phoneNum: string) => {
        if (!phoneNum) return;
        Linking.openURL(`tel:${phoneNum}`).catch(() => {
            Alert.alert('Call Failed', `Cannot dial ${phoneNum} on this device`);
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Standard Signature Pastel Background */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    
                    {/* Top Right Signature Soft Pink Blob */}
                    <Path
                        d="M100 -50 C200 -50, 385 -40, 395 60 C410 180, 360 250, 220 230 C120 210, 40 140, 100 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.38}
                    />
                    <Circle cx="340" cy="70" r="80" fill="#F06A8C" opacity={0.14} />

                    {/* Left Warm Gold Accent */}
                    <Path
                        d="M-60 150 C20 170, 110 110, 150 230 C190 350, 70 390, -20 350 C-100 310, -130 130, -60 150 Z"
                        fill="#F7E6B8"
                        opacity={0.32}
                    />

                    {/* Soft Center Sage & Bottom Lavender */}
                    <Circle cx="350" cy="420" r="75" fill="#DCE6DB" opacity={0.28} />
                    <Circle cx="30" cy="650" r="70" fill="#E2D4F5" opacity={0.28} />
                </Svg>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Header with Back Button & Title */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/menu')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Suppliers & Vendors</Text>
                            <Text style={styles.headerSubtitle}>
                                {suppliers.length} Registered Partners · Procurement Network
                            </Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. Top Action Bar: Add Supplier Button */}
                <FadeInDown delay={50} style={styles.topActionBar}>
                    <TouchableOpacity
                        style={styles.addSupplierBtn}
                        onPress={openAddModal}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.addSupplierBtnText}>Add New Supplier</Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. KPI Metrics 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1: Total Vendors */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <Factory size={18} color="#F06A8C" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Suppliers</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {metrics.totalSuppliers} Vendors
                        </Text>
                    </View>

                    {/* KPI 2: Rice Millers */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <Package size={18} color="#2E7D32" />
                            </View>
                            <View style={[styles.trendBadge, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={[styles.trendBadgeText, { color: '#2E7D32' }]}>Primary</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Paddy & Millers</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            {metrics.millersCount} Millers
                        </Text>
                    </View>

                    {/* KPI 3: Packaging & Logistics */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EAF2FF' }]}>
                                <Truck size={18} color="#5B8DEF" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Packaging & Allied</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {metrics.packagingCount} Partners
                        </Text>
                    </View>

                    {/* KPI 4: Quality Rating */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <Star size={18} color="#F2A93B" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Avg. Quality Rating</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>
                            ★ {metrics.avgRating} / 5.0
                        </Text>
                    </View>
                </FadeInDown>

                {/* 4. Category Filter Chips */}
                <View style={styles.categoryScrollWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {SUPPLIER_CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 5. Supplier Directory Section */}
                <FadeInDown delay={110} style={styles.directorySection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Vendor Directory</Text>
                            <View style={styles.supplierCountPill}>
                                <Text style={styles.supplierCountText}>{filteredSuppliers.length}</Text>
                            </View>
                        </View>

                        {/* Sort Trigger */}
                        <TouchableOpacity
                            style={styles.sortBtn}
                            onPress={() => {
                                if (sortOption === 'name') setSortOption('rating');
                                else if (sortOption === 'rating') setSortOption('category');
                                else setSortOption('name');
                            }}
                            activeOpacity={0.7}
                        >
                            <ArrowUpDown size={14} color="#555" />
                            <Text style={styles.sortBtnText}>
                                {sortOption === 'name' ? 'Name' : sortOption === 'rating' ? 'Rating' : 'Category'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Input Bar */}
                    <View style={styles.searchBar}>
                        <Search size={17} color="#8A8A8A" />
                        <TextInput
                            placeholder="Search supplier, phone, GSTIN or city..."
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

                    {/* Suppliers List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading supplier records...</Text>
                        </View>
                    ) : filteredSuppliers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Factory size={40} color="#D0D0D0" />
                            <Text style={styles.emptyTitle}>No Suppliers Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery ? 'No vendor matches your search criteria.' : 'Add your first supplier partner using the button above!'}
                            </Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={140}>
                            <View style={styles.supplierListWrapper}>
                                {filteredSuppliers.map((s) => {
                                    const ratingVal = parseFloat(s.rating) || 5.0;

                                    return (
                                        <View key={s.id} style={styles.supplierCard}>
                                            {/* Top Header Row */}
                                            <View style={styles.suppCardHeader}>
                                                <View style={styles.suppAvatar}>
                                                    <Factory size={22} color="#F06A8C" />
                                                </View>

                                                <View style={styles.suppMainInfo}>
                                                    <View style={styles.suppNameRow}>
                                                        <Text style={styles.suppName} numberOfLines={1}>{s.supplierName}</Text>
                                                        <View style={styles.ratingBadge}>
                                                            <Star size={11} color="#E65100" fill="#E65100" />
                                                            <Text style={styles.ratingBadgeText}>{ratingVal.toFixed(1)}</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.suppMetaRow}>
                                                        <View style={styles.categoryPill}>
                                                            <Text style={styles.categoryPillText}>{s.category || 'General'}</Text>
                                                        </View>

                                                        {s.phone && (
                                                            <TouchableOpacity
                                                                style={styles.phoneChip}
                                                                onPress={() => handleCallPhone(s.phone)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <PhoneCall size={12} color="#5B8DEF" />
                                                                <Text style={styles.phoneChipText}>{s.phone}</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Location & GST Row */}
                                            {(s.address || s.gstNumber) && (
                                                <View style={styles.suppAddressBox}>
                                                    {s.address ? (
                                                        <View style={styles.addressLine}>
                                                            <MapPin size={12} color="#888" />
                                                            <Text style={styles.addressLineText} numberOfLines={1}>{s.address}</Text>
                                                        </View>
                                                    ) : null}
                                                    {s.gstNumber ? (
                                                        <Text style={styles.gstSmallText}>GSTIN: {s.gstNumber}</Text>
                                                    ) : null}
                                                </View>
                                            )}

                                            {/* Action Buttons Row */}
                                            <View style={styles.cardActionsRow}>
                                                <TouchableOpacity
                                                    style={styles.linkSkuBtn}
                                                    onPress={() => openProcurementModal(s)}
                                                    activeOpacity={0.75}
                                                >
                                                    <PackagePlus size={14} color="#F06A8C" />
                                                    <Text style={styles.linkSkuBtnText}>Link SKUs & Price</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.editCardBtn}
                                                    onPress={() => openEditModal(s)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Pencil size={13} color="#1A1A1A" />
                                                    <Text style={styles.editCardBtnText}>Edit</Text>
                                                </TouchableOpacity>

                                                {s.phone && (
                                                    <TouchableOpacity
                                                        style={styles.callCardBtn}
                                                        onPress={() => handleCallPhone(s.phone)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Phone size={13} color="#2E7D32" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </StaggerContainer>
                    )}
                </FadeInDown>
            </ScrollView>

            {/* ───────────────────────────────────────────── */}
            {/* 6. ADD / EDIT SUPPLIER MODAL                 */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalGrabHandle} />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {editingSupplier ? 'Update vendor credentials & contact' : 'Register paddy miller or trade vendor partner'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Form Scroll */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.formScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Section 1: Basic Info */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>1. VENDOR IDENTIFICATION</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Supplier / Mill Name *</Text>
                                    <View style={styles.inputField}>
                                        <Factory size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. Sri Lakshmi Rice Mills"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            value={name}
                                            onChangeText={setName}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Primary Category</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                                    >
                                        {['Paddy Miller', 'Raw Rice Vendor', 'Packaging Material', 'Logistics & Transport', 'General'].map((c) => (
                                            <TouchableOpacity
                                                key={c}
                                                style={[styles.modalCatChip, category === c && styles.modalCatChipActive]}
                                                onPress={() => setCategory(c)}
                                            >
                                                <Text style={[styles.modalCatText, category === c && styles.modalCatTextActive]}>
                                                    {c}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Section 2: Contact & Tax */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>2. CONTACT & TAX REGISTRATION</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Phone Number *</Text>
                                    <View style={styles.inputField}>
                                        <Phone size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. 9876501234"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>GSTIN / Business Tax ID</Text>
                                    <View style={styles.inputField}>
                                        <Building2 size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. 33BBBBB0000B1Z8"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            autoCapitalize="characters"
                                            value={gst}
                                            onChangeText={setGst}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Mill / Warehouse Location</Text>
                                    <View style={styles.inputField}>
                                        <MapPin size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. NH-44 Mandi Road, Tiruchirappalli"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            value={address}
                                            onChangeText={setAddress}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Submit Button */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSaveSupplier}
                                disabled={savingSupplier}
                                activeOpacity={0.85}
                            >
                                {savingSupplier ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#FFFFFF" />
                                        <Text style={styles.submitBtnText}>
                                            {editingSupplier ? 'Update Supplier Profile' : 'Save Supplier Partner'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* 7. LINK PROCUREMENT SKU MODAL               */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={procurementVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setProcurementVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Link Product SKU</Text>
                                <Text style={styles.modalSubtitle} numberOfLines={1}>
                                    Procurement terms for {procurementSupplier?.supplierName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setProcurementVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.formScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Product Selection */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>1. SELECT CATALOG PRODUCT</Text>
                                {selectedProduct ? (
                                    <View style={styles.selectedProductBox}>
                                        <Package size={20} color="#F06A8C" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.selectedProdTitle}>
                                                {selectedProduct.brand ? `${selectedProduct.brand} ` : ''}{selectedProduct.productName}
                                            </Text>
                                            <Text style={styles.selectedProdSub}>
                                                HSN: {selectedProduct.hsnCode || '1006'} · Selling Price: ₹{selectedProduct.sellingPrice}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setSelectedProduct(null)}
                                            style={styles.changeLinkBtn}
                                        >
                                            <Text style={styles.changeLinkText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ maxHeight: 180 }}>
                                        <Text style={styles.inputLabel}>Choose product supplied by this vendor:</Text>
                                        <ScrollView nestedScrollEnabled style={{ borderWidth: 1, borderColor: '#ECECEC', borderRadius: 12 }}>
                                            {products.map((p) => (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={styles.prodPickItem}
                                                    onPress={() => {
                                                        setSelectedProduct(p);
                                                        setPurchasePrice(String(p.purchasePrice || Math.round(p.sellingPrice * 0.8)));
                                                    }}
                                                >
                                                    <Text style={styles.prodPickName}>
                                                        {p.brand ? `${p.brand} ` : ''}{p.productName}
                                                    </Text>
                                                    <Text style={styles.prodPickPrice}>₹{p.sellingPrice}/bag</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Terms */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>2. PROCUREMENT CONTRACT</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Agreed Purchase Rate per Bag (₹) *</Text>
                                    <View style={styles.inputField}>
                                        <IndianRupee size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="2200"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            keyboardType="numeric"
                                            value={purchasePrice}
                                            onChangeText={setPurchasePrice}
                                        />
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Lead Time (Days)</Text>
                                        <View style={styles.inputField}>
                                            <Clock size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="2"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                keyboardType="numeric"
                                                value={leadTimeDays}
                                                onChangeText={setLeadTimeDays}
                                            />
                                        </View>
                                    </View>

                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Min Order (Bags)</Text>
                                        <View style={styles.inputField}>
                                            <Package size={16} color="#8A8A8A" />
                                            <TextInput
                                                placeholder="50"
                                                placeholderTextColor="#A0A0A0"
                                                style={styles.textInput}
                                                keyboardType="numeric"
                                                value={minOrderQty}
                                                onChangeText={setMinOrderQty}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSaveProcurement}
                                disabled={savingProcurement}
                                activeOpacity={0.85}
                            >
                                {savingProcurement ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#FFFFFF" />
                                        <Text style={styles.submitBtnText}>Save Procurement Link</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 14,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
    },
    headerTitleCol: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
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
    addSupplierBtn: {
        width: '100%',
        height: 44,
        backgroundColor: '#F06A8C',
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
    addSupplierBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginBottom: 14,
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
        backgroundColor: '#FBE8F0',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    trendBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#F06A8C',
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

    // Category Chips
    categoryScrollWrapper: {
        marginBottom: 14,
    },
    categoryScroll: {
        gap: 8,
    },
    categoryChip: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
    },

    // Directory Section
    directorySection: {
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
    supplierCountPill: {
        backgroundColor: '#EAEAEA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    supplierCountText: {
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
    supplierListWrapper: {
        gap: 12,
    },
    supplierCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    suppCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    suppAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FBE8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    suppMainInfo: {
        flex: 1,
    },
    suppNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    suppName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginRight: 6,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#E65100',
    },
    suppMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryPill: {
        backgroundColor: '#F0F4FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3B6DD8',
    },
    phoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    phoneChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#555',
    },
    suppAddressBox: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
    },
    addressLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addressLineText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#666',
        flex: 1,
    },
    gstSmallText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#8A8A8A',
        marginTop: 2,
    },
    cardActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    linkSkuBtn: {
        flex: 1.6,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFF0F5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: '#F5C6D8',
    },
    linkSkuBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F06A8C',
    },
    editCardBtn: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    editCardBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    callCardBtn: {
        width: 38,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
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

    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    modalSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFEFEF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    formScroll: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    formSection: {
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
        marginBottom: 10,
    },
    inputGroup: {
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#555555',
        marginBottom: 4,
    },
    inputField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF7F2',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1,
        borderColor: '#ECECEC',
        gap: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    modalCatChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    modalCatChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    modalCatText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#555',
    },
    modalCatTextActive: {
        color: '#FFFFFF',
    },
    modalFooter: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
    },
    submitBtn: {
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
    submitBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Procurement Box
    selectedProductBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F5',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F5C6D8',
        gap: 10,
    },
    selectedProdTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    selectedProdSub: {
        fontSize: 11,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    changeLinkBtn: {
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    changeLinkText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#F06A8C',
    },
    prodPickItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
    },
    prodPickName: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    prodPickPrice: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F06A8C',
    },
});

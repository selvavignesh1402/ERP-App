import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TextInput,
    TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView,
    Platform, Linking
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Search, Plus, ArrowLeft, User, Phone, Mail, MapPin,
    Building2, Pencil, Trash2, CheckCircle2, XCircle, ArrowUpDown,
    CreditCard, ShieldAlert, Sparkles, X, ChevronRight, PhoneCall,
    IndianRupee
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../src/components/Anime';
import api from '../src/services/api';

export default function CustomersScreen() {
    const router = useRouter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'name' | 'creditDesc' | 'status'>('name');
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
    const [savingCustomer, setSavingCustomer] = useState(false);

    // Form inputs state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [gst, setGst] = useState('');
    const [creditLimit, setCreditLimit] = useState('50000');

    // ─────────────────────────────────────────────
    // FETCH CUSTOMERS
    // ─────────────────────────────────────────────
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/customers');
            setCustomers(response.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            Alert.alert('Error', 'Failed to fetch customers list');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // ─────────────────────────────────────────────
    // COMPUTED METRICS
    // ─────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalCustomers = customers.length;
        const activeCustomers = customers.filter(c => c.status === 'Active' || !c.status).length;
        const totalOutstanding = customers.reduce((acc, c) => acc + (parseFloat(c.creditBalance) || 0), 0);
        const overLimitCount = customers.filter(c => {
            const lim = parseFloat(c.creditLimit) || 0;
            const bal = parseFloat(c.creditBalance) || 0;
            return lim > 0 && bal >= lim * 0.8;
        }).length;

        return {
            totalCustomers,
            activeCustomers,
            totalOutstanding,
            overLimitCount,
        };
    }, [customers]);

    // ─────────────────────────────────────────────
    // FILTER & SORT
    // ─────────────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        let list = customers;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((c: any) =>
                (c.customerName || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q) ||
                (c.address || '').toLowerCase().includes(q) ||
                (c.gstNumber || '').toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            if (sortOption === 'creditDesc') {
                return (parseFloat(b.creditBalance) || 0) - (parseFloat(a.creditBalance) || 0);
            }
            if (sortOption === 'status') {
                return (a.status || 'Active').localeCompare(b.status || 'Active');
            }
            return (a.customerName || '').localeCompare(b.customerName || '');
        });
    }, [customers, searchQuery, sortOption]);

    // ─────────────────────────────────────────────
    // MODAL ACTIONS
    // ─────────────────────────────────────────────
    const openAddModal = () => {
        setEditingCustomer(null);
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setGst('');
        setCreditLimit('50000');
        setModalVisible(true);
    };

    const openEditModal = (customer: any) => {
        setEditingCustomer(customer);
        setName(customer.customerName || '');
        setPhone(customer.phone || '');
        setEmail(customer.email || '');
        setAddress(customer.address || '');
        setGst(customer.gstNumber || '');
        setCreditLimit(customer.creditLimit ? String(customer.creditLimit) : '0');
        setModalVisible(true);
    };

    const handleSaveCustomer = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Customer Name is required');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Validation Error', 'Contact Phone Number is required');
            return;
        }

        setSavingCustomer(true);
        try {
            const payload = {
                customerName: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                gstNumber: gst.trim(),
                creditLimit: parseFloat(creditLimit) || 0.0
            };

            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, payload);
                Alert.alert('Success', 'Customer details updated successfully');
            } else {
                await api.post('/customers', payload);
                Alert.alert('Success', 'New customer registered successfully');
            }
            setModalVisible(false);
            fetchCustomers();
        } catch (error: any) {
            console.error('Error saving customer:', error);
            const msg = error.response?.data?.message || 'Failed to save customer';
            Alert.alert('Save Failed', msg);
        } finally {
            setSavingCustomer(false);
        }
    };

    const handleToggleStatus = async (id: number) => {
        try {
            await api.put(`/customers/${id}/status`);
            fetchCustomers();
        } catch (error: any) {
            console.error('Error toggling customer status:', error);
            Alert.alert('Error', 'Failed to toggle status');
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
                            <Text style={styles.headerTitle}>Customers</Text>
                            <Text style={styles.headerSubtitle}>
                                {customers.length} Registered Buyers · Credit Control
                            </Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. Top Action Bar: Add Customer Button */}
                <FadeInDown delay={50} style={styles.topActionBar}>
                    <TouchableOpacity
                        style={styles.addCustomerBtn}
                        onPress={openAddModal}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.addCustomerBtnText}>Add New Customer</Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. KPI Metrics 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1: Total Buyers */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <User size={18} color="#F06A8C" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>{metrics.activeCustomers} Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Accounts</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>
                            {metrics.totalCustomers} Clients
                        </Text>
                    </View>

                    {/* KPI 2: Total Outstanding Credit */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <CreditCard size={18} color="#F2A93B" />
                            </View>
                            {metrics.totalOutstanding > 0 && (
                                <View style={[styles.trendBadge, { backgroundColor: '#FFF3E0' }]}>
                                    <Text style={[styles.trendBadgeText, { color: '#E65100' }]}>Due</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.kpiLabel}>Credit Balance</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>
                            ₹ {metrics.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                    </View>

                    {/* KPI 3: Near Limit / High Risk */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFEBEE' }]}>
                                <ShieldAlert size={18} color="#E53935" />
                            </View>
                            {metrics.overLimitCount > 0 && (
                                <View style={[styles.trendBadge, { backgroundColor: '#FFEBEE' }]}>
                                    <Text style={[styles.trendBadgeText, { color: '#C62828' }]}>High</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.kpiLabel}>Near Limit (80%+)</Text>
                        <Text style={[styles.kpiValue, { color: metrics.overLimitCount > 0 ? '#C62828' : '#1A1A1A' }]} numberOfLines={1}>
                            {metrics.overLimitCount} Accounts
                        </Text>
                    </View>

                    {/* KPI 4: Active Ratio */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <CheckCircle2 size={18} color="#2E7D32" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Healthy Ratio</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            {metrics.totalCustomers > 0 ? `${Math.round((metrics.activeCustomers / metrics.totalCustomers) * 100)}%` : '100%'}
                        </Text>
                    </View>
                </FadeInDown>

                {/* 4. Customer Directory Section Header */}
                <FadeInDown delay={110} style={styles.directorySection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Customer Directory</Text>
                            <View style={styles.customerCountPill}>
                                <Text style={styles.customerCountText}>{filteredCustomers.length}</Text>
                            </View>
                        </View>

                        {/* Sort Trigger */}
                        <TouchableOpacity
                            style={styles.sortBtn}
                            onPress={() => {
                                if (sortOption === 'name') setSortOption('creditDesc');
                                else if (sortOption === 'creditDesc') setSortOption('status');
                                else setSortOption('name');
                            }}
                            activeOpacity={0.7}
                        >
                            <ArrowUpDown size={14} color="#555" />
                            <Text style={styles.sortBtnText}>
                                {sortOption === 'name' ? 'Name' : sortOption === 'creditDesc' ? 'Credit ↓' : 'Status'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Input Bar */}
                    <View style={styles.searchBar}>
                        <Search size={17} color="#8A8A8A" />
                        <TextInput
                            placeholder="Search customer, phone, GSTIN or city..."
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

                    {/* Customers List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading customer records...</Text>
                        </View>
                    ) : filteredCustomers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <User size={40} color="#D0D0D0" />
                            <Text style={styles.emptyTitle}>No Customers Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery ? 'No client matches your search filter.' : 'Register your first customer using the button above!'}
                            </Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={140}>
                            <View style={styles.customerListWrapper}>
                                {filteredCustomers.map((c) => {
                                    const limit = parseFloat(c.creditLimit) || 0;
                                    const balance = parseFloat(c.creditBalance) || 0;
                                    const available = Math.max(0, limit - balance);
                                    const usagePercent = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
                                    const isActive = c.status === 'Active' || !c.status;

                                    return (
                                        <View key={c.id} style={styles.customerCard}>
                                            {/* Top Row: Avatar, Name, Status Pill */}
                                            <View style={styles.custCardHeader}>
                                                <View style={styles.custAvatar}>
                                                    <User size={20} color="#F06A8C" />
                                                </View>

                                                <View style={styles.custMainInfo}>
                                                    <View style={styles.custNameRow}>
                                                        <Text style={styles.custName} numberOfLines={1}>{c.customerName}</Text>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.statusBadge,
                                                                { backgroundColor: isActive ? '#E8F5E9' : '#ECEFF1' }
                                                            ]}
                                                            onPress={() => handleToggleStatus(c.id)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={[
                                                                styles.statusBadgeText,
                                                                { color: isActive ? '#2E7D32' : '#78909C' }
                                                            ]}>
                                                                {isActive ? 'Active' : 'Inactive'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View style={styles.custMetaRow}>
                                                        {c.phone && (
                                                            <TouchableOpacity
                                                                style={styles.phoneChip}
                                                                onPress={() => handleCallPhone(c.phone)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <PhoneCall size={12} color="#5B8DEF" />
                                                                <Text style={styles.phoneChipText}>{c.phone}</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {c.gstNumber ? (
                                                            <View style={styles.gstBadge}>
                                                                <Text style={styles.gstBadgeText}>GSTIN: {c.gstNumber}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Address / Location Line */}
                                            {c.address ? (
                                                <View style={styles.addressRow}>
                                                    <MapPin size={13} color="#8A8A8A" />
                                                    <Text style={styles.addressText} numberOfLines={1}>{c.address}</Text>
                                                </View>
                                            ) : null}

                                            {/* Credit Progress & Financials Box */}
                                            <View style={styles.creditBox}>
                                                <View style={styles.creditBoxHeader}>
                                                    <Text style={styles.creditBoxLabel}>CREDIT USAGE</Text>
                                                    <Text style={styles.creditBoxValue}>
                                                        ₹{balance.toLocaleString('en-IN')} <Text style={{ color: '#888', fontWeight: '500' }}>/ ₹{limit.toLocaleString('en-IN')}</Text>
                                                    </Text>
                                                </View>

                                                {/* Usage Bar */}
                                                <View style={styles.usageBarBg}>
                                                    <View
                                                        style={[
                                                            styles.usageBarFill,
                                                            {
                                                                width: `${usagePercent}%`,
                                                                backgroundColor: usagePercent > 80 ? '#E53935' : usagePercent > 50 ? '#F2A93B' : '#4CAF50'
                                                            }
                                                        ]}
                                                    />
                                                </View>

                                                <View style={styles.creditFooterRow}>
                                                    <Text style={styles.availCreditText}>
                                                        Available Limit: <Text style={{ fontWeight: '700', color: available < 5000 ? '#E53935' : '#1A1A1A' }}>₹{available.toLocaleString('en-IN')}</Text>
                                                    </Text>
                                                    <Text style={[styles.usagePercentText, { color: usagePercent > 80 ? '#E53935' : '#666' }]}>
                                                        {usagePercent}% Used
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Action Buttons Row */}
                                            <View style={styles.cardActionsRow}>
                                                <TouchableOpacity
                                                    style={styles.editCardBtn}
                                                    onPress={() => openEditModal(c)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Pencil size={14} color="#1A1A1A" />
                                                    <Text style={styles.editCardBtnText}>Edit Details</Text>
                                                </TouchableOpacity>

                                                {c.phone && (
                                                    <TouchableOpacity
                                                        style={styles.callCardBtn}
                                                        onPress={() => handleCallPhone(c.phone)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Phone size={14} color="#F06A8C" />
                                                        <Text style={styles.callCardBtnText}>Call</Text>
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
            {/* 5. ADD / EDIT CUSTOMER MODAL                 */}
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
                                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {editingCustomer ? 'Update contact & financial terms' : 'Register buyer ledger & credit parameters'}
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

                        {/* Modal Form Scroll */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.formScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Section 1: Basic Info */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>1. BASIC INFORMATION</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Customer / Firm Name *</Text>
                                    <View style={styles.inputField}>
                                        <User size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. Sri Murugan Rice Mart"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            value={name}
                                            onChangeText={setName}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Contact Phone Number *</Text>
                                    <View style={styles.inputField}>
                                        <Phone size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. 9876543210"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                                    <View style={styles.inputField}>
                                        <Mail size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. murugan@gmail.com"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Section 2: Business & Tax Details */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>2. LOCATION & TAX</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
                                    <View style={styles.inputField}>
                                        <Building2 size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. 33AAAAA0000A1Z5"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            autoCapitalize="characters"
                                            value={gst}
                                            onChangeText={setGst}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Shop / Delivery Address</Text>
                                    <View style={styles.inputField}>
                                        <MapPin size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="e.g. 45 Bazaar Street, Salem"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            value={address}
                                            onChangeText={setAddress}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Section 3: Financial & Credit Limits */}
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionHeading}>3. CREDIT CONTROL</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Approved Credit Limit (₹)</Text>
                                    <View style={styles.inputField}>
                                        <IndianRupee size={16} color="#8A8A8A" />
                                        <TextInput
                                            placeholder="50000"
                                            placeholderTextColor="#A0A0A0"
                                            style={styles.textInput}
                                            keyboardType="numeric"
                                            value={creditLimit}
                                            onChangeText={setCreditLimit}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Pinned Submit Button */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSaveCustomer}
                                disabled={savingCustomer}
                                activeOpacity={0.85}
                            >
                                {savingCustomer ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#FFFFFF" />
                                        <Text style={styles.submitBtnText}>
                                            {editingCustomer ? 'Update Customer' : 'Save Customer Account'}
                                        </Text>
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
        paddingTop: 48, // Aligned with updated sales & inventory layouts
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
    addCustomerBtn: {
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
    addCustomerBtnText: {
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

    // Directory & Filter Section
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
    customerCountPill: {
        backgroundColor: '#EAEAEA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    customerCountText: {
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
    customerListWrapper: {
        gap: 12,
    },
    customerCard: {
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
    custCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    custAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FBE8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    custMainInfo: {
        flex: 1,
    },
    custNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    custName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginRight: 6,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    custMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    phoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4FF',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    phoneChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#3B6DD8',
    },
    gstBadge: {
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    gstBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
    },
    addressText: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777',
    },

    // Credit Usage Box
    creditBox: {
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    creditBoxHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    creditBoxLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
    },
    creditBoxValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    usageBarBg: {
        height: 6,
        width: '100%',
        backgroundColor: '#E8E8E8',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    creditFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    availCreditText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#666',
    },
    usagePercentText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    editCardBtn: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    editCardBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    callCardBtn: {
        width: 70,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FBE8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    callCardBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F06A8C',
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

    // Modal
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
});

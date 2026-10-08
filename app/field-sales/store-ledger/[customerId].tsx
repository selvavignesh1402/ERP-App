import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    IndianRupee,
    Layers,
    MapPin,
    Navigation,
    Phone,
    Receipt,
    Search,
    ShoppingCart,
    Store,
    TrendingUp,
    X,
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer } from '../../../src/components/Anime';
import { useRoleContext } from '../../../src/contexts/RoleContext';
import { forOrganization } from '../../../src/services/api';
import { RoleGate } from '../../../src/components/RoleGate';
import { OrgScopedScreen } from '../../../src/components/OrgScopedScreen';
import {
    getInvoiceStatus,
    storeLedgerRecords,
    StoreLedgerInvoice,
    StoreLedgerReceipt,
    StoreLedgerResult,
    StoreLedgerTransaction,
} from '../../../src/services/storeLedger';

const formatMoney = (value: number | string | undefined | null) => {
    const num = Number(value || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value: string | undefined | null) => {
    if (!value) return 'Date unavailable';
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return 'Date unavailable';
    return new Date(timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateShort = (value: string | undefined | null) => {
    if (!value) return '—';
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return '—';
    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

type TabType = 'all' | 'invoices' | 'payments';

export default function StoreLedger() {
    return (
        <RoleGate permissions={['payment:view', 'sale:view', 'customer:view']}>
            <OrgScopedScreen>{(_api, orgId) => <StoreLedgerSession orgId={orgId} />}</OrgScopedScreen>
        </RoleGate>
    );
}

function StoreLedgerSession({ orgId }: { orgId: number }) {
    const params = useLocalSearchParams<{
        customerId: string;
        customerName?: string;
        customerPhone?: string;
        customerAddress?: string;
        creditLimit?: string;
        outstandingBalance?: string;
        visitId?: string;
    }>();

    return (
        <Ledger
            key={params.customerId}
            orgId={orgId}
            customerId={Number(params.customerId)}
            initialName={params.customerName}
            initialPhone={params.customerPhone}
            initialAddress={params.customerAddress}
            initialCreditLimit={params.creditLimit}
            initialOutstanding={params.outstandingBalance}
            visitId={params.visitId}
        />
    );
}

interface LedgerProps {
    orgId: number;
    customerId: number;
    initialName?: string;
    initialPhone?: string;
    initialAddress?: string;
    initialCreditLimit?: string;
    initialOutstanding?: string;
    visitId?: string;
}

function Ledger({
    orgId,
    customerId,
    initialName,
    initialPhone,
    initialAddress,
    initialCreditLimit,
    initialOutstanding,
    visitId,
}: LedgerProps) {
    const router = useRouter();
    const api = useMemo(() => forOrganization(orgId), [orgId]);

    const [customer, setCustomer] = useState<any>(() => ({
        customerName: initialName || '',
        phone: initialPhone || '',
        address: initialAddress || '',
        creditLimit: initialCreditLimit ? Number(initialCreditLimit) : 0,
        creditBalance: initialOutstanding ? Number(initialOutstanding) : 0,
    }));
    const [records, setRecords] = useState<StoreLedgerResult | null>(null);
    const [tab, setTab] = useState<TabType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            setLoading(true);
            setError('');

            async function load() {
                try {
                    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
                        throw new Error('Invalid store ID');
                    }
                    const [storeRes, salesRes, paymentsRes] = await Promise.all([
                        api.get(`/customers/${customerId}`),
                        api.get('/sales'),
                        api.get('/payments'),
                    ]);

                    if (active) {
                        setCustomer(storeRes.data || {});
                        setRecords(
                            storeLedgerRecords(customerId, salesRes.data || [], paymentsRes.data || []),
                        );
                    }
                } catch {
                    if (active) {
                        setRecords(null);
                        setError(
                            'Could not load this store’s ledger. Check your connection and access, then retry.',
                        );
                    }
                } finally {
                    if (active) setLoading(false);
                }
            }

            void load();
            return () => {
                active = false;
            };
        }, [api, customerId, refresh]),
    );

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else if (visitId) {
            router.push({
                pathname: '/field-sales/visit/[id]',
                params: { id: visitId, customerName: customer?.customerName || initialName || '' },
            });
        } else {
            router.push('/field-sales/today-route');
        }
    };

    const handleCallStore = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    };

    const handleOpenMap = (name?: string, addr?: string) => {
        const query = [name, addr].filter(Boolean).join(', ');
        if (!query) {
            Alert.alert('Location Unavailable', 'No address listed for this store.');
            return;
        }
        const encoded = encodeURIComponent(query);
        const mapUrl = Platform.select({
            ios: `maps:0,0?q=${encoded}`,
            android: `geo:0,0?q=${encoded}`,
            default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        });
        Linking.openURL(mapUrl).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
        });
    };

    const handleCreateOrder = () => {
        router.push({
            pathname: '/(tabs)/sales',
            params: {
                action: 'new',
                customerId: String(customerId),
                customerName: customer?.customerName || initialName || '',
                customerPhone: customer?.phone || initialPhone || '',
            },
        });
    };

    const handleCollectPayment = () => {
        if (visitId) {
            router.push({
                pathname: '/field-sales/visit/[id]',
                params: { id: visitId, customerName: customer?.customerName || initialName || '' },
            });
        } else {
            router.push({
                pathname: '/(tabs)/sales',
                params: {
                    action: 'payment',
                    customerId: String(customerId),
                    customerName: customer?.customerName || initialName || '',
                },
            });
        }
    };

    // Filtered data by search query
    const filteredInvoices = useMemo(() => {
        if (!records?.invoices) return [];
        if (!searchQuery.trim()) return records.invoices;
        const q = searchQuery.toLowerCase().trim();
        return records.invoices.filter(
            (inv: StoreLedgerInvoice) =>
                (inv.billNumber || '').toLowerCase().includes(q) ||
                String(inv.id).includes(q) ||
                (inv.paymentMode || '').toLowerCase().includes(q) ||
                String(inv.grandTotal).includes(q) ||
                (inv.saleDate || '').toLowerCase().includes(q),
        );
    }, [records?.invoices, searchQuery]);

    const filteredReceipts = useMemo(() => {
        if (!records?.receipts) return [];
        if (!searchQuery.trim()) return records.receipts;
        const q = searchQuery.toLowerCase().trim();
        return records.receipts.filter(
            (pmt: StoreLedgerReceipt) =>
                String(pmt.id).includes(q) ||
                (pmt.paymentMode || '').toLowerCase().includes(q) ||
                String(pmt.amount).includes(q) ||
                (pmt.paymentDate || '').toLowerCase().includes(q) ||
                (pmt.referenceType || '').toLowerCase().includes(q),
        );
    }, [records?.receipts, searchQuery]);

    const filteredTransactions = useMemo(() => {
        if (!records?.transactions) return [];
        if (!searchQuery.trim()) return records.transactions;
        const q = searchQuery.toLowerCase().trim();
        return records.transactions.filter(
            (t: StoreLedgerTransaction) =>
                t.title.toLowerCase().includes(q) ||
                t.subtitle.toLowerCase().includes(q) ||
                t.badgeText.toLowerCase().includes(q) ||
                String(t.amount).includes(q) ||
                t.date.toLowerCase().includes(q),
        );
    }, [records?.transactions, searchQuery]);

    const outstandingBal = Number(customer?.creditBalance || 0);
    const creditLim = Number(customer?.creditLimit || 0);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 1. Signature Pastel SVG Illustration Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Mint-Emerald Flow Blob */}
                    <Path
                        d="M100 -40 C210 -50, 390 -30, 400 80 C410 200, 340 260, 200 240 C110 220, 20 150, 100 -40 Z"
                        fill="#C8E6C9"
                        opacity={0.34}
                    />
                    <Circle cx="330" cy="80" r="75" fill="#81C784" opacity={0.16} />

                    {/* Warm Peach Glow */}
                    <Path
                        d="M-50 150 C30 170, 120 110, 160 220 C200 330, 80 370, -10 340 C-90 300, -120 130, -50 150 Z"
                        fill="#FFE0B2"
                        opacity={0.3}
                    />

                    {/* Ambient Lavender & Sage circles */}
                    <Circle cx="340" cy="480" r="85" fill="#E1BEE7" opacity={0.22} />
                    <Circle cx="40" cy="700" r="80" fill="#BBDEFB" opacity={0.25} />
                </Svg>
            </View>

            {/* 2. Top Navigation Header */}
            <FadeInDown delay={20} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={handleBack}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                    >
                        <ArrowLeft size={20} color="#1A1A1A" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleCol}>
                        <Text style={styles.headerTitle}>Store Ledger</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {customer?.customerName || initialName || `Store #${customerId}`}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusPill,
                            outstandingBal > 0
                                ? outstandingBal > creditLim && creditLim > 0
                                    ? styles.statusPillDanger
                                    : styles.statusPillWarning
                                : styles.statusPillSuccess,
                        ]}
                    >
                        {outstandingBal > 0 ? (
                            <>
                                <AlertTriangle
                                    size={12}
                                    color={
                                        outstandingBal > creditLim && creditLim > 0 ? '#C62828' : '#E65100'
                                    }
                                />
                                <Text
                                    style={[
                                        styles.statusPillText,
                                        {
                                            color:
                                                outstandingBal > creditLim && creditLim > 0
                                                    ? '#C62828'
                                                    : '#E65100',
                                        },
                                    ]}
                                >
                                    {outstandingBal > creditLim && creditLim > 0
                                        ? 'Over Limit'
                                        : 'Balance Due'}
                                </Text>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={12} color="#2E7D32" />
                                <Text style={[styles.statusPillText, { color: '#2E7D32' }]}>All Clear</Text>
                            </>
                        )}
                    </View>
                </View>
            </FadeInDown>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !!records}
                        onRefresh={() => setRefresh((n) => n + 1)}
                        colors={['#2E7D32', '#F06A8C']}
                    />
                }
            >
                {/* 3. Loading State */}
                {loading && !records ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator
                            size="large"
                            color="#2E7D32"
                            accessibilityLabel="Loading store ledger"
                        />
                        <Text style={styles.loadingText}>Fetching store financial records...</Text>
                    </View>
                ) : error ? (
                    /* Error State */
                    <FadeInDown delay={40}>
                        <View style={styles.errorCard}>
                            <AlertTriangle size={32} color="#C62828" />
                            <Text style={styles.errorTitle} accessibilityRole="alert">
                                Unable to Load Ledger
                            </Text>
                            <Text style={styles.errorSubtitle}>{error}</Text>
                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => setRefresh((n) => n + 1)}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                            >
                                <Text style={styles.retryBtnText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInDown>
                ) : records ? (
                    <>
                        {/* 4. Store Info Hero Card */}
                        <FadeInDown delay={40}>
                            <View style={styles.storeCard}>
                                <View style={styles.storeHeaderRow}>
                                    <View style={styles.storeAvatarBox}>
                                        <Store size={26} color="#8E24AA" />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.storeNameText}>
                                            {customer?.customerName ||
                                                initialName ||
                                                `Customer #${customerId}`}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.storeMetaRow}
                                            onPress={() =>
                                                handleOpenMap(
                                                    customer?.customerName || initialName,
                                                    customer?.address || initialAddress,
                                                )
                                            }
                                            activeOpacity={0.7}
                                            accessibilityRole="button"
                                            accessibilityLabel="Open store in Google Maps"
                                        >
                                            <MapPin size={13} color="#1565C0" />
                                            <Text
                                                style={[styles.storeMetaText, styles.storeMetaLink]}
                                                numberOfLines={1}
                                            >
                                                {customer?.address || initialAddress || 'Address not listed'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.quickHeaderActions}>
                                        <TouchableOpacity
                                            style={styles.quickMapBtn}
                                            onPress={() =>
                                                handleOpenMap(
                                                    customer?.customerName || initialName,
                                                    customer?.address || initialAddress,
                                                )
                                            }
                                            activeOpacity={0.75}
                                            accessibilityRole="button"
                                            accessibilityLabel="Open Google Maps directions"
                                        >
                                            <Navigation size={16} color="#1565C0" />
                                        </TouchableOpacity>

                                        {customer?.phone || initialPhone ? (
                                            <TouchableOpacity
                                                style={styles.quickCallBtn}
                                                onPress={() =>
                                                    handleCallStore(customer?.phone || initialPhone || '')
                                                }
                                                activeOpacity={0.75}
                                                accessibilityRole="button"
                                                accessibilityLabel="Call Store"
                                            >
                                                <Phone size={16} color="#2E7D32" />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>

                                {/* Financial Matrix Grid */}
                                <View style={styles.financialMatrix}>
                                    <View style={styles.finCol}>
                                        <Text style={styles.finLabel}>OUTSTANDING</Text>
                                        <Text
                                            style={[
                                                styles.finValue,
                                                outstandingBal > 0 && { color: '#E53935' },
                                            ]}
                                        >
                                            {formatMoney(outstandingBal)}
                                        </Text>
                                    </View>

                                    <View style={styles.finDivider} />

                                    <View style={styles.finCol}>
                                        <Text style={styles.finLabel}>CREDIT LIMIT</Text>
                                        <Text style={styles.finValue}>{formatMoney(creditLim)}</Text>
                                    </View>

                                    <View style={styles.finDivider} />

                                    <View style={styles.finCol}>
                                        <Text style={styles.finLabel}>TOTAL INVOICED</Text>
                                        <Text style={styles.finValue}>{formatMoney(records.invoiced)}</Text>
                                    </View>

                                    <View style={styles.finDivider} />

                                    <View style={styles.finCol}>
                                        <Text style={styles.finLabel}>TOTAL RECEIVED</Text>
                                        <Text style={[styles.finValue, { color: '#2E7D32' }]}>
                                            {formatMoney(records.received)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Outstanding Warning Alert */}
                                {outstandingBal > 0 && (
                                    <View style={styles.outstandingWarning}>
                                        <AlertTriangle size={14} color="#E65100" />
                                        <Text style={styles.outstandingWarningText}>
                                            Current outstanding balance is {formatMoney(outstandingBal)}. This
                                            includes opening dues and recorded sales.
                                        </Text>
                                    </View>
                                )}

                                {/* Quick Action Buttons */}
                                <View style={styles.quickActionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionBtnPrimary}
                                        onPress={handleCollectPayment}
                                        activeOpacity={0.8}
                                    >
                                        <IndianRupee size={15} color="#FFFFFF" />
                                        <Text style={styles.actionBtnPrimaryText}>Collect Payment</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionBtnSecondary}
                                        onPress={handleCreateOrder}
                                        activeOpacity={0.8}
                                    >
                                        <ShoppingCart size={15} color="#2E7D32" />
                                        <Text style={styles.actionBtnSecondaryText}>New Order</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </FadeInDown>

                        {/* 5. Search Bar */}
                        <FadeInDown delay={70}>
                            <View style={styles.searchBox}>
                                <Search size={16} color="#777777" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search bill number, payment mode, amount..."
                                    placeholderTextColor="#999999"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    clearButtonMode="while-editing"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setSearchQuery('')}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <X size={16} color="#777777" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </FadeInDown>

                        {/* 6. Tabs Filter Bar */}
                        <FadeInDown delay={90}>
                            <View style={styles.tabBar}>
                                <TouchableOpacity
                                    style={[styles.tabItem, tab === 'all' && styles.tabItemActive]}
                                    onPress={() => setTab('all')}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: tab === 'all' }}
                                >
                                    <Layers size={14} color={tab === 'all' ? '#2E7D32' : '#666666'} />
                                    <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
                                        All ({records.transactions.length})
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.tabItem, tab === 'invoices' && styles.tabItemActive]}
                                    onPress={() => setTab('invoices')}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: tab === 'invoices' }}
                                >
                                    <FileText size={14} color={tab === 'invoices' ? '#2E7D32' : '#666666'} />
                                    <Text
                                        style={[styles.tabText, tab === 'invoices' && styles.tabTextActive]}
                                    >
                                        Invoices ({records.invoices.length})
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.tabItem, tab === 'payments' && styles.tabItemActive]}
                                    onPress={() => setTab('payments')}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: tab === 'payments' }}
                                >
                                    <CreditCard
                                        size={14}
                                        color={tab === 'payments' ? '#2E7D32' : '#666666'}
                                    />
                                    <Text
                                        style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}
                                    >
                                        Payments ({records.receipts.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </FadeInDown>

                        {/* 7. Records List */}
                        <StaggerContainer stagger={30} delay={110}>
                            {tab === 'all' ? (
                                filteredTransactions.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Receipt size={32} color="#888888" />
                                        <Text style={styles.emptyTitle}>
                                            {searchQuery
                                                ? 'No matching activity'
                                                : 'No transactions recorded'}
                                        </Text>
                                        <Text style={styles.emptySubtitle}>
                                            {searchQuery
                                                ? 'Try searching for a different bill number or payment method.'
                                                : 'Sales invoices and payment receipts for this store will appear here.'}
                                        </Text>
                                        {searchQuery ? (
                                            <TouchableOpacity
                                                style={styles.clearSearchBtn}
                                                onPress={() => setSearchQuery('')}
                                            >
                                                <Text style={styles.clearSearchText}>Clear Search</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                ) : (
                                    <View style={styles.recordsList}>
                                        {filteredTransactions.map((item) => (
                                            <View key={item.id} style={styles.recordCard}>
                                                <View style={styles.recordHeaderRow}>
                                                    <View style={styles.recordLeftCol}>
                                                        <View
                                                            style={[
                                                                styles.recordTypeIcon,
                                                                {
                                                                    backgroundColor:
                                                                        item.type === 'PAYMENT'
                                                                            ? '#E8F5E9'
                                                                            : '#EDE7F6',
                                                                },
                                                            ]}
                                                        >
                                                            {item.type === 'PAYMENT' ? (
                                                                <IndianRupee size={16} color="#2E7D32" />
                                                            ) : (
                                                                <FileText size={16} color="#7C3AED" />
                                                            )}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text
                                                                style={styles.recordTitle}
                                                                numberOfLines={1}
                                                            >
                                                                {item.title}
                                                            </Text>
                                                            <Text style={styles.recordDateText}>
                                                                {formatDate(item.date)}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View
                                                        style={[
                                                            styles.badgePill,
                                                            { backgroundColor: item.badgeBg },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.badgeText,
                                                                { color: item.badgeColor },
                                                            ]}
                                                        >
                                                            {item.badgeText}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.recordAmountRow}>
                                                    <Text style={styles.recordSubtitleText}>
                                                        {item.subtitle}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.recordAmountBig,
                                                            item.type === 'PAYMENT'
                                                                ? { color: '#2E7D32' }
                                                                : { color: '#1A1A1A' },
                                                        ]}
                                                    >
                                                        {item.type === 'PAYMENT'
                                                            ? `+ ${formatMoney(item.amount)}`
                                                            : formatMoney(item.amount)}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )
                            ) : tab === 'invoices' ? (
                                filteredInvoices.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <FileText size={32} color="#888888" />
                                        <Text style={styles.emptyTitle}>
                                            {searchQuery ? 'No matching invoices' : 'No invoices yet'}
                                        </Text>
                                        <Text style={styles.emptySubtitle}>
                                            {searchQuery
                                                ? 'No invoices match your current search query.'
                                                : 'No sales invoices have been billed for this store yet.'}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.recordsList}>
                                        {filteredInvoices.map((inv) => {
                                            const status = getInvoiceStatus(inv);
                                            const total = Number(inv.grandTotal || 0);
                                            const paid = Number(
                                                inv.paidAmount ?? (status.status === 'PAID' ? total : 0),
                                            );
                                            const balance = Number(
                                                inv.balanceDue ?? Math.max(0, total - paid),
                                            );
                                            const progressPct =
                                                total > 0
                                                    ? Math.min(100, Math.round((paid / total) * 100))
                                                    : 100;

                                            return (
                                                <View key={inv.id} style={styles.recordCard}>
                                                    <View style={styles.recordHeaderRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.recordTitle}>
                                                                {inv.billNumber || `Invoice #${inv.id}`}
                                                            </Text>
                                                            <View style={styles.recordMetaRow}>
                                                                <Calendar size={12} color="#777777" />
                                                                <Text style={styles.recordDateText}>
                                                                    {formatDate(inv.saleDate)}
                                                                </Text>
                                                                {inv.paymentMode ? (
                                                                    <Text style={styles.recordTag}>
                                                                        • {inv.paymentMode}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                        </View>

                                                        <View
                                                            style={[
                                                                styles.badgePill,
                                                                { backgroundColor: status.bg },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.badgeText,
                                                                    { color: status.color },
                                                                ]}
                                                            >
                                                                {status.label}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Progress bar */}
                                                    <View style={styles.progressBarBg}>
                                                        <View
                                                            style={[
                                                                styles.progressBarFill,
                                                                {
                                                                    width: `${progressPct}%`,
                                                                    backgroundColor:
                                                                        status.status === 'PAID'
                                                                            ? '#2E7D32'
                                                                            : '#E65100',
                                                                },
                                                            ]}
                                                        />
                                                    </View>

                                                    {/* Financial Breakdown */}
                                                    <View style={styles.invoiceFinancialRow}>
                                                        <View style={styles.invFinCol}>
                                                            <Text style={styles.invFinLabel}>TOTAL</Text>
                                                            <Text style={styles.invFinValue}>
                                                                {formatMoney(total)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.invFinCol}>
                                                            <Text style={styles.invFinLabel}>PAID</Text>
                                                            <Text
                                                                style={[
                                                                    styles.invFinValue,
                                                                    { color: '#2E7D32' },
                                                                ]}
                                                            >
                                                                {formatMoney(paid)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.invFinCol}>
                                                            <Text style={styles.invFinLabel}>
                                                                BALANCE DUE
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.invFinValue,
                                                                    balance > 0 && { color: '#E53935' },
                                                                ]}
                                                            >
                                                                {formatMoney(balance)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )
                            ) : filteredReceipts.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <CreditCard size={32} color="#888888" />
                                    <Text style={styles.emptyTitle}>
                                        {searchQuery ? 'No matching payments' : 'No payments yet'}
                                    </Text>
                                    <Text style={styles.emptySubtitle}>
                                        {searchQuery
                                            ? 'No payment receipts match your current search query.'
                                            : 'No recorded payments or collections for this store yet.'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.recordsList}>
                                    {filteredReceipts.map((pmt) => {
                                        const isCustomerCol = pmt.referenceType === 'CUSTOMER';
                                        const linkedInvoice = !isCustomerCol
                                            ? records.invoices.find(
                                                  (s) => Number(s.id) === Number(pmt.referenceId),
                                              )
                                            : null;

                                        return (
                                            <View key={pmt.id} style={styles.recordCard}>
                                                <View style={styles.recordHeaderRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.recordTitle}>
                                                            Payment Receipt #{pmt.id}
                                                        </Text>
                                                        <View style={styles.recordMetaRow}>
                                                            <Clock size={12} color="#777777" />
                                                            <Text style={styles.recordDateText}>
                                                                {formatDate(pmt.paymentDate)}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View
                                                        style={[
                                                            styles.badgePill,
                                                            { backgroundColor: '#E3F2FD' },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[styles.badgeText, { color: '#1565C0' }]}
                                                        >
                                                            {pmt.paymentMode || 'RECEIPT'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.paymentAmountBox}>
                                                    <Text style={styles.paymentReceivedLabel}>
                                                        Amount Received
                                                    </Text>
                                                    <Text style={styles.paymentReceivedAmount}>
                                                        {formatMoney(pmt.amount)}
                                                    </Text>
                                                </View>

                                                <View style={styles.paymentNoteRow}>
                                                    <Text style={styles.paymentNoteText}>
                                                        {isCustomerCol
                                                            ? '• Direct store settlement (reduces outstanding ledger balance)'
                                                            : linkedInvoice?.billNumber
                                                              ? `• Allocated to Bill #${linkedInvoice.billNumber}`
                                                              : `• Allocated to Invoice #${pmt.referenceId}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </StaggerContainer>
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
    },
    errorCenterBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 8,
    },
    errorCenterTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        marginTop: 8,
    },
    errorCenterSub: {
        fontSize: 13,
        color: '#777777',
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 48,
        gap: 14,
    },

    // Header
    header: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 4,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    headerTitleCol: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusPillSuccess: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    statusPillWarning: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FFE0B2',
    },
    statusPillDanger: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FFCDD2',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Store Card
    storeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    storeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    storeAvatarBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F3E5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeNameText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    storeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    storeMetaLink: {
        color: '#1565C0',
    },
    storeMetaText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        flex: 1,
    },
    quickHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickMapBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C5DCFA',
    },
    quickCallBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    financialMatrix: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#F0EFEA',
    },
    finCol: {
        flex: 1,
        alignItems: 'center',
    },
    finDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E2E0D8',
        alignSelf: 'center',
    },
    finLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 3,
        textAlign: 'center',
    },
    finValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    outstandingWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF8E1',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    outstandingWarningText: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: '600',
        color: '#E65100',
        lineHeight: 16,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    actionBtnPrimary: {
        flex: 1,
        height: 42,
        backgroundColor: '#1565C0',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    actionBtnSecondary: {
        flex: 1,
        height: 42,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    actionBtnSecondaryText: {
        color: '#2E7D32',
        fontSize: 13,
        fontWeight: '700',
    },

    // Search Box
    searchBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        paddingHorizontal: 12,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#1A1A1A',
        paddingVertical: 0,
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F0EFEA',
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    tabItem: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    tabItemActive: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666666',
    },
    tabTextActive: {
        color: '#2E7D32',
        fontWeight: '700',
    },

    // Records List & Cards
    recordsList: {
        gap: 12,
    },
    recordCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        gap: 10,
    },
    recordHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    recordLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 8,
    },
    recordTypeIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    recordDateText: {
        fontSize: 11.5,
        color: '#777777',
        marginTop: 1,
    },
    recordMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
        flexWrap: 'wrap',
    },
    recordTag: {
        fontSize: 11.5,
        color: '#555555',
        fontWeight: '500',
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    recordAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F0',
    },
    recordSubtitleText: {
        fontSize: 12,
        color: '#666666',
        flex: 1,
    },
    recordAmountBig: {
        fontSize: 16,
        fontWeight: '800',
        marginLeft: 8,
    },

    // Invoice specifics
    progressBarBg: {
        height: 4,
        backgroundColor: '#F0EFEA',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    invoiceFinancialRow: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    invFinCol: {
        flex: 1,
        alignItems: 'center',
    },
    invFinLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 2,
    },
    invFinValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // Payment specifics
    paymentAmountBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F1F8E9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    paymentReceivedLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#33691E',
    },
    paymentReceivedAmount: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2E7D32',
    },
    paymentNoteRow: {
        paddingTop: 2,
    },
    paymentNoteText: {
        fontSize: 11.5,
        color: '#666666',
        lineHeight: 16,
    },

    // Empty state
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EDEBE6',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#777777',
        textAlign: 'center',
        lineHeight: 18,
    },
    clearSearchBtn: {
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: '#F0EFEA',
        borderRadius: 8,
    },
    clearSearchText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
    },

    // Error card
    errorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFCDD2',
        gap: 8,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#C62828',
        marginTop: 4,
    },
    errorSubtitle: {
        fontSize: 12.5,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 18,
    },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#C62828',
        borderRadius: 10,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});

import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Plus, ArrowLeft, ChevronRight, Trash2, CalendarDays,
    MapPin, User, CheckCircle2, Clock, Sparkles, X,
    Store, Navigation, ShieldCheck
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer } from '../../src/components/Anime';
import api from '../../src/services/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BeatPlanScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(0);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [generatingWeek, setGeneratingWeek] = useState(false);

    // Create Beat Plan Form State
    const [customers, setCustomers] = useState<any[]>([]);
    const [salesStaff, setSalesStaff] = useState<any[]>([]);
    const [planName, setPlanName] = useState('');
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<number | null>(null);
    const [modalDayIndex, setModalDayIndex] = useState(0);
    const [dayShopMap, setDayShopMap] = useState<Record<string, number[]>>({
        MONDAY: [],
        TUESDAY: [],
        WEDNESDAY: [],
        THURSDAY: [],
        FRIDAY: [],
        SATURDAY: [],
    });
    const [customerSearch, setCustomerSearch] = useState('');
    const [savingPlan, setSavingPlan] = useState(false);

    // ─────────────────────────────────────────────
    // FETCH BEAT PLANS & PREREQUISITES
    // ─────────────────────────────────────────────
    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/beat-plans');
            setPlans(res.data || []);
        } catch (err) {
            console.error('Failed to load beat plans:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPrerequisites = useCallback(async () => {
        try {
            const [cRes, uRes] = await Promise.all([
                api.get('/customers').catch(() => ({ data: [] })),
                api.get('/users').catch(() => ({ data: [] })),
            ]);
            setCustomers(cRes.data || []);
            const users = uRes.data || [];
            const activeUsers = users.filter((u: any) => u.active !== false);
            const staffList = activeUsers.length > 0 ? activeUsers : users;
            setSalesStaff(staffList);
            if (staffList.length > 0 && !selectedSalespersonId) {
                setSelectedSalespersonId(staffList[0].id);
            }
        } catch (e) {
            console.error('Failed to load prerequisites for beat plan', e);
        }
    }, [selectedSalespersonId]);

    useFocusEffect(useCallback(() => {
        fetchPlans();
        loadPrerequisites();
    }, [fetchPlans, loadPrerequisites]));

    const openCreateModal = () => {
        loadPrerequisites();
        setShowPlanModal(true);
    };

    const handleToggleCustomerStop = (customerId: number) => {
        const activeDay = DAYS[modalDayIndex];
        const currentList = dayShopMap[activeDay] || [];
        if (currentList.includes(customerId)) {
            setDayShopMap(prev => ({
                ...prev,
                [activeDay]: currentList.filter(id => id !== customerId)
            }));
        } else {
            setDayShopMap(prev => ({
                ...prev,
                [activeDay]: [...currentList, customerId]
            }));
        }
    };

    const handleCreatePlan = async () => {
        if (!planName.trim()) {
            Alert.alert('Route Name Required', 'Please enter a name for the beat plan route.');
            return;
        }
        if (!selectedSalespersonId) {
            Alert.alert('Salesperson Required', 'Please select a sales executive for this route.');
            return;
        }

        const entries: any[] = [];
        DAYS.forEach(day => {
            const ids = dayShopMap[day] || [];
            ids.forEach((cid, idx) => {
                entries.push({
                    dayOfWeek: day,
                    customerId: cid,
                    visitOrder: idx + 1
                });
            });
        });

        if (entries.length === 0) {
            Alert.alert('Store Stops Required', 'Please assign at least one retail store to any day of the week.');
            return;
        }

        setSavingPlan(true);
        try {
            await api.post('/beat-plans', {
                name: planName.trim(),
                salespersonId: selectedSalespersonId,
                isActive: true,
                entries
            });
            Alert.alert('Beat Plan Created!', `Route "${planName.trim()}" successfully created with ${entries.length} weekly stops.`);
            setShowPlanModal(false);
            setPlanName('');
            setDayShopMap({
                MONDAY: [],
                TUESDAY: [],
                WEDNESDAY: [],
                THURSDAY: [],
                FRIDAY: [],
                SATURDAY: [],
            });
            fetchPlans();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to create beat plan';
            Alert.alert('Error', msg);
        } finally {
            setSavingPlan(false);
        }
    };

    // ─────────────────────────────────────────────
    // COMPUTED METRICS
    // ─────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalPlans = plans.length;
        const activePlans = plans.filter(p => p.isActive !== false).length;
        let totalAssignedShops = 0;
        let todayShops = 0;

        plans.forEach(p => {
            (p.entries || []).forEach((e: any) => {
                totalAssignedShops++;
                if (e.dayOfWeek === DAYS[selectedDay]) {
                    todayShops++;
                }
            });
        });

        return {
            totalPlans,
            activePlans,
            totalAssignedShops,
            todayShops,
        };
    }, [plans, selectedDay]);

    const handleGenerateWeek = async () => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const weekStart = monday.toISOString().split('T')[0];

        Alert.alert('Generate Week Schedules', `Generate visit schedules for the week of ${weekStart}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Generate', onPress: async () => {
                    setGeneratingWeek(true);
                    try {
                        const res = await api.post(`/beat-plans/generate-week?weekStart=${weekStart}`);
                        Alert.alert('Success', `${res.data.schedulesCreated || 0} visit schedules created for this week!`);
                        fetchPlans();
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.message || 'Failed to generate schedules');
                    } finally {
                        setGeneratingWeek(false);
                    }
                }
            }
        ]);
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
                {/* 1. Header with Back Button */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/field-sales')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Beat Plans</Text>
                            <Text style={styles.headerSubtitle}>
                                Weekly Salesperson Route Schedules
                            </Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. Top Action Bar: Create Beat Plan & Generate Week Schedules CTA */}
                <FadeInDown delay={50} style={styles.topActionBar}>
                    <TouchableOpacity
                        style={styles.createPlanBtn}
                        onPress={openCreateModal}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.createPlanBtnText}>Create Beat Plan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.generateWeekBtn}
                        onPress={handleGenerateWeek}
                        disabled={generatingWeek}
                        activeOpacity={0.85}
                    >
                        {generatingWeek ? (
                            <ActivityIndicator size="small" color="#1A1A1A" />
                        ) : (
                            <>
                                <CalendarDays size={16} color="#1A1A1A" strokeWidth={2.2} />
                                <Text style={styles.generateWeekBtnText}>Generate Week</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. KPI Metrics 2x2 Grid */}
                <FadeInDown delay={80} style={styles.kpiGrid}>
                    {/* KPI 1 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#EAF2FF' }]}>
                                <CalendarDays size={18} color="#3B6DD8" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>{metrics.activePlans} Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Beat Plans</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>{metrics.totalPlans} Routes</Text>
                    </View>

                    {/* KPI 2 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <Store size={18} color="#2E7D32" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Weekly Stores</Text>
                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]} numberOfLines={1}>
                            {metrics.totalAssignedShops} Shops
                        </Text>
                    </View>

                    {/* KPI 3 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <MapPin size={18} color="#F06A8C" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>{SHORT_DAYS[selectedDay]} Stops</Text>
                        <Text style={[styles.kpiValue, { color: '#F06A8C' }]} numberOfLines={1}>
                            {metrics.todayShops} Stops
                        </Text>
                    </View>

                    {/* KPI 4 */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <ShieldCheck size={18} color="#F2A93B" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Coverage Days</Text>
                        <Text style={[styles.kpiValue, { color: '#E65100' }]} numberOfLines={1}>6 Days/Wk</Text>
                    </View>
                </FadeInDown>

                {/* 4. Horizontal Day Selector Tabs */}
                <View style={styles.daysScrollWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.daysScroll}
                    >
                        {SHORT_DAYS.map((d, i) => {
                            const active = selectedDay === i;
                            return (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.dayChip, active && styles.dayChipActive]}
                                    onPress={() => setSelectedDay(i)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                                        {d}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 5. Beat Plans Route Schedule Section */}
                <FadeInDown delay={110} style={styles.planSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {DAYS[selectedDay]} Routes
                        </Text>
                        <TouchableOpacity
                            style={styles.createPlanLink}
                            onPress={() => setShowPlanModal(true)}
                            activeOpacity={0.7}
                        >
                            <Plus size={14} color="#F06A8C" strokeWidth={2.5} />
                            <Text style={styles.createPlanLinkText}>New Plan</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading route schedules...</Text>
                        </View>
                    ) : (() => {
                        const currentDayPlans = plans.filter((p: any) => {
                            const entries = (p.entries || []).filter((e: any) => e.dayOfWeek === DAYS[selectedDay]);
                            return entries.length > 0;
                        });

                        if (currentDayPlans.length === 0) {
                            return (
                                <View style={styles.emptyContainer}>
                                    <CalendarDays size={40} color="#D0D0D0" />
                                    <Text style={styles.emptyTitle}>No Routes on {DAYS[selectedDay]}</Text>
                                    <Text style={styles.emptySubtitle}>
                                        No store visit routes scheduled for {SHORT_DAYS[selectedDay]}. Tap '+ Create Beat Plan' to schedule stops.
                                    </Text>
                                </View>
                            );
                        }

                        return (
                            <StaggerContainer stagger={30} delay={130}>
                                <View style={styles.planListWrapper}>
                                    {currentDayPlans.map((plan: any) => {
                                        const dayEntries = (plan.entries || []).filter((e: any) => e.dayOfWeek === DAYS[selectedDay]);
                                        const sortedEntries = [...dayEntries].sort((a: any, b: any) => (a.visitOrder || 0) - (b.visitOrder || 0));

                                        return (
                                            <View key={plan.id} style={styles.planCard}>
                                                {/* Plan Header */}
                                                <View style={styles.planCardHeader}>
                                                    <View style={styles.planAvatar}>
                                                        <Navigation size={20} color="#1A1A1A" />
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <View style={styles.planNameRow}>
                                                            <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                                                            <View style={[
                                                                styles.planStatusBadge,
                                                                { backgroundColor: plan.isActive !== false ? '#E8F5E9' : '#ECEFF1' }
                                                            ]}>
                                                                <Text style={[
                                                                    styles.planStatusText,
                                                                    { color: plan.isActive !== false ? '#2E7D32' : '#78909C' }
                                                                ]}>
                                                                    {plan.isActive !== false ? 'Active' : 'Inactive'}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.salespersonRow}>
                                                            <User size={12} color="#8A8A8A" />
                                                            <Text style={styles.salespersonText}>
                                                                {plan.salespersonName || 'Assigned Sales Executive'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Stops Timeline for Selected Day */}
                                                <View style={styles.stopsTimelineBox}>
                                                    <Text style={styles.stopsHeading}>
                                                        {SHORT_DAYS[selectedDay]} STOPS ({sortedEntries.length})
                                                    </Text>

                                                    {sortedEntries.map((entry: any, idx: number) => (
                                                        <View key={entry.id || idx} style={styles.stopItemRow}>
                                                            <View style={styles.stopNumberCircle}>
                                                                <Text style={styles.stopNumberText}>{idx + 1}</Text>
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.stopCustomerName} numberOfLines={1}>
                                                                    {entry.customerName || 'Retail Store'}
                                                                </Text>
                                                                {entry.address ? (
                                                                    <Text style={styles.stopAddress} numberOfLines={1}>
                                                                        {entry.address}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                            <View style={styles.stopIndicator}>
                                                                <CheckCircle2 size={15} color="#4CAF50" />
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </StaggerContainer>
                        );
                    })()}
                </FadeInDown>
            </ScrollView>

            {/* 6. CREATE BEAT PLAN MODAL */}
            <Modal visible={showPlanModal} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Create Beat Plan</Text>
                                <Text style={styles.modalSubtitle}>Route configuration & weekly store stops</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowPlanModal(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalBodyScroll}
                        >
                            {/* Route Name Input */}
                            <Text style={styles.modalInputLabel}>Route / Beat Name *</Text>
                            <View style={styles.modalInputWrap}>
                                <Navigation size={16} color="#8A8A8A" />
                                <TextInput
                                    style={styles.modalTextInput}
                                    placeholder="e.g. Salem City Central Beat"
                                    placeholderTextColor="#A0A0A0"
                                    value={planName}
                                    onChangeText={setPlanName}
                                />
                            </View>

                            {/* Salesperson Selector */}
                            <Text style={styles.modalInputLabel}>Assigned Sales Executive *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
                                {salesStaff.map((staff) => {
                                    const isSelected = selectedSalespersonId === staff.id;
                                    return (
                                        <TouchableOpacity
                                            key={staff.id}
                                            style={[styles.staffChip, isSelected && styles.staffChipSelected]}
                                            onPress={() => setSelectedSalespersonId(staff.id)}
                                            activeOpacity={0.75}
                                        >
                                            <User size={13} color={isSelected ? '#FFFFFF' : '#1A1A1A'} />
                                            <Text style={[styles.staffChipText, isSelected && styles.staffChipTextSelected]}>
                                                {staff.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Day Selection Tabs for assigning shops */}
                            <Text style={styles.modalInputLabel}>
                                Configure Day: {DAYS[modalDayIndex]}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalDayScroll}>
                                {SHORT_DAYS.map((sd, idx) => {
                                    const isDayActive = modalDayIndex === idx;
                                    const count = (dayShopMap[DAYS[idx]] || []).length;
                                    return (
                                        <TouchableOpacity
                                            key={sd}
                                            style={[styles.modalDayChip, isDayActive && styles.modalDayChipActive]}
                                            onPress={() => setModalDayIndex(idx)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.modalDayText, isDayActive && styles.modalDayTextActive]}>
                                                {sd}
                                            </Text>
                                            {count > 0 && (
                                                <View style={[styles.modalDayCount, isDayActive && styles.modalDayCountActive]}>
                                                    <Text style={[styles.modalDayCountText, isDayActive && styles.modalDayCountTextActive]}>
                                                        {count}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Customer Shops Picker */}
                            <Text style={styles.modalInputLabel}>
                                Assign Shops for {SHORT_DAYS[modalDayIndex]} ({(dayShopMap[DAYS[modalDayIndex]] || []).length} Selected)
                            </Text>
                            <View style={styles.shopSearchWrap}>
                                <TextInput
                                    style={styles.shopSearchInput}
                                    placeholder="Search customer shop..."
                                    placeholderTextColor="#A0A0A0"
                                    value={customerSearch}
                                    onChangeText={setCustomerSearch}
                                />
                            </View>

                            <View style={styles.customerListWrap}>
                                {customers
                                    .filter(c => {
                                        const cName = c.customerName || c.name || '';
                                        return !customerSearch.trim() || cName.toLowerCase().includes(customerSearch.toLowerCase().trim());
                                    })
                                    .map(c => {
                                        const currentDayStops = dayShopMap[DAYS[modalDayIndex]] || [];
                                        const stopIndex = currentDayStops.indexOf(c.id);
                                        const isSelected = stopIndex !== -1;
                                        const cName = c.customerName || c.name || 'Store';
                                        const cPhone = c.phone || c.phoneNumber || 'Direct';
                                        const cAddr = c.address || c.city || 'Salem';

                                        return (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[styles.customerPickCard, isSelected && styles.customerPickCardSelected]}
                                                onPress={() => handleToggleCustomerStop(c.id)}
                                                activeOpacity={0.75}
                                            >
                                                <View style={styles.customerPickLeft}>
                                                    <Store size={16} color={isSelected ? '#F06A8C' : '#8A8A8A'} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.customerPickName} numberOfLines={1}>{cName}</Text>
                                                        <Text style={styles.customerPickMeta} numberOfLines={1}>{cAddr} · {cPhone}</Text>
                                                    </View>
                                                </View>
                                                {isSelected ? (
                                                    <View style={styles.stopBadge}>
                                                        <Text style={styles.stopBadgeText}>Stop #{stopIndex + 1}</Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.unselectedCheckbox} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                            </View>
                        </ScrollView>

                        {/* Pinned Action Button Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.savePlanBtn}
                                onPress={handleCreatePlan}
                                disabled={savingPlan}
                                activeOpacity={0.85}
                            >
                                {savingPlan ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                                        <Text style={styles.savePlanBtnText}>Create & Activate Beat Plan</Text>
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
        backgroundColor: '#EAF2FF',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },
    trendBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#3B6DD8',
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

    // Days Tabs
    daysScrollWrapper: {
        marginBottom: 16,
    },
    daysScroll: {
        gap: 8,
    },
    dayChip: {
        height: 34,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    dayChipText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#555',
    },
    dayChipTextActive: {
        color: '#FFFFFF',
    },

    // Plan Section
    planSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    createPlanLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FBE8F0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    createPlanLinkText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#F06A8C',
    },
    planListWrapper: {
        gap: 14,
    },
    planCard: {
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
    planCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    planAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    planName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1,
        marginRight: 6,
    },
    planStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    planStatusText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    salespersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    salespersonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
    },

    // Stops Timeline
    stopsTimelineBox: {
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    stopsHeading: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    noStopsBox: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    noStopsText: {
        fontSize: 11.5,
        color: '#8A8A8A',
        fontStyle: 'italic',
    },
    stopItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F2',
        gap: 10,
    },
    stopNumberCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    stopNumberText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#3B6DD8',
    },
    stopCustomerName: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    stopAddress: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#888',
        marginTop: 1,
    },
    stopIndicator: {
        padding: 2,
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

    // Top Action Bar
    topActionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    createPlanBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F06A8C',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
        elevation: 2,
    },
    createPlanBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    generateWeekBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    generateWeekBtnText: {
        color: '#1A1A1A',
        fontSize: 12.5,
        fontWeight: '700',
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
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
    modalBodyScroll: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    modalInputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
        marginTop: 12,
    },
    modalInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        gap: 8,
    },
    modalTextInput: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    staffScroll: {
        marginBottom: 4,
    },
    staffChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        gap: 6,
    },
    staffChipSelected: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    staffChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    staffChipTextSelected: {
        color: '#FFFFFF',
    },
    modalDayScroll: {
        marginBottom: 4,
    },
    modalDayChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        marginRight: 6,
        gap: 5,
    },
    modalDayChipActive: {
        backgroundColor: '#F06A8C',
        borderColor: '#F06A8C',
    },
    modalDayText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555555',
    },
    modalDayTextActive: {
        color: '#FFFFFF',
    },
    modalDayCount: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 8,
    },
    modalDayCountActive: {
        backgroundColor: '#FFFFFF',
    },
    modalDayCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#555555',
    },
    modalDayCountTextActive: {
        color: '#F06A8C',
    },
    shopSearchWrap: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginBottom: 8,
    },
    shopSearchInput: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#1A1A1A',
    },
    customerListWrap: {
        maxHeight: 180,
        marginBottom: 16,
    },
    customerPickCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginBottom: 6,
    },
    customerPickCardSelected: {
        borderColor: '#F06A8C',
        backgroundColor: '#FFF8FA',
    },
    customerPickLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    customerPickName: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    customerPickMeta: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    stopBadge: {
        backgroundColor: '#FBE8F0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stopBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F06A8C',
    },
    unselectedCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#D0D0D0',
    },
    savePlanBtn: {
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F06A8C',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 2,
    },
    savePlanBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalFooter: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: '#FAF7F2',
    },
});

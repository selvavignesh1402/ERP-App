import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert,
    ActivityIndicator, TextInput, Switch, ScrollView, Modal, Platform, Linking
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    Shield, ChevronDown, Search, ArrowLeft, User, Phone,
    UserCheck, UserX, Sparkles, X, CheckCircle2, Lock,
    KeyRound, Users, ShieldAlert, PhoneCall
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer } from '../src/components/Anime';
import { listUsers, updateUser, me } from '../src/services/api';

const ROLES = [
    { id: 'ADMIN', label: 'Administrator', desc: 'Full System, Financial & Admin Access', color: '#1A1A1A', bg: '#F5F5F7' },
    { id: 'MANAGER', label: 'Operations Manager', desc: 'Manage Inventory, Sales & Beat Routes', color: '#1A1A1A', bg: '#F5F5F7' },
    { id: 'SALES', label: 'Sales Executive', desc: 'Field Store Check-ins, POS & Billing', color: '#1A1A1A', bg: '#F5F5F7' },
    { id: 'WAREHOUSE', label: 'Warehouse Staff', desc: 'Bag Stock Counts & Inward Adjustments', color: '#1A1A1A', bg: '#F5F5F7' },
    { id: 'ACCOUNTANT', label: 'Accountant', desc: 'Ledger Audit, Tax & Invoicing', color: '#1A1A1A', bg: '#F5F5F7' },
];

const ROLE_FILTERS = ['All', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTANT'];

interface UserRow {
    id: number;
    name: string;
    phoneNumber: string;
    role: string;
    active: boolean;
    profileCompleted: boolean;
}

export default function UsersScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Role Picker Modal
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [targetUser, setTargetUser] = useState<UserRow | null>(null);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await listUsers();
            setUsers(res.data || []);
        } catch (error: any) {
            console.error('Users: failed to load users', error);
            const msg = error.response?.data?.message || 'Failed to load users';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const res = await me();
                    setCurrentUserId(res?.data?.id ?? null);
                } catch (e) {
                    console.error('Users: failed to load current user', e);
                }
            })();
            fetchUsers();
        }, [fetchUsers])
    );

    // ─────────────────────────────────────────────
    // COMPUTED METRICS
    // ─────────────────────────────────────────────
    const metrics = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.active !== false).length;
        const managers = users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER').length;
        const sales = users.filter(u => u.role === 'SALES' || u.role === 'WAREHOUSE').length;

        return {
            total,
            active,
            managers,
            sales,
        };
    }, [users]);

    // ─────────────────────────────────────────────
    // FILTERED USERS
    // ─────────────────────────────────────────────
    const filteredUsers = useMemo(() => {
        let list = users;

        if (selectedRoleFilter !== 'All') {
            list = list.filter(u => (u.role || '').toUpperCase() === selectedRoleFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.phoneNumber || '').includes(q) ||
                (u.role || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [users, selectedRoleFilter, searchQuery]);

    // ─────────────────────────────────────────────
    // ROLE & STATUS ACTIONS
    // ─────────────────────────────────────────────
    const openRoleModal = (u: UserRow) => {
        setTargetUser(u);
        setRoleModalVisible(true);
    };

    const handleApplyRole = async (newRole: string) => {
        if (!targetUser) return;
        setRoleModalVisible(false);
        setUpdatingUserId(targetUser.id);
        try {
            await updateUser(targetUser.id, { role: newRole });
            Alert.alert('Role Updated', `${targetUser.name}'s role changed to ${newRole}`);
            fetchUsers();
        } catch (error: any) {
            console.error('Users: role change failed', error);
            const msg = error.response?.data?.message || 'Failed to update role';
            Alert.alert('Error', msg);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleToggleActive = async (u: UserRow) => {
        const nextActive = !u.active;
        setUpdatingUserId(u.id);
        try {
            await updateUser(u.id, { active: nextActive });
            fetchUsers();
        } catch (error: any) {
            console.error('Users: active toggle failed', error);
            const msg = error.response?.data?.message || 'Failed to update status';
            Alert.alert('Error', msg);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleCallUser = (phoneNum: string) => {
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
                {/* 1. Header with Back Button */}
                <FadeInDown delay={20} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/profile')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={20} color="#1A1A1A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleCol}>
                            <Text style={styles.headerTitle}>Staff & User Access</Text>
                            <Text style={styles.headerSubtitle}>
                                {users.length} Team Members · Role Permissions & Security
                            </Text>
                        </View>
                    </View>
                </FadeInDown>

                {/* 2. KPI Metrics Grid */}
                <FadeInDown delay={50} style={styles.kpiGrid}>
                    {/* Total Users */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#FBE8F0' }]}>
                                <Users size={18} color="#F06A8C" />
                            </View>
                            <View style={styles.trendBadge}>
                                <Text style={styles.trendBadgeText}>{metrics.active} Active</Text>
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Total Accounts</Text>
                        <Text style={styles.kpiValue} numberOfLines={1}>{metrics.total} Members</Text>
                    </View>

                    {/* Administrators & Managers */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F5F7' }]}>
                                <Shield size={18} color="#1A1A1A" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Leadership / Admin</Text>
                        <Text style={[styles.kpiValue, { color: '#1A1A1A' }]} numberOfLines={1}>
                            {metrics.managers} Admins
                        </Text>
                    </View>

                    {/* Field Sales & Warehouse */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F5F7' }]}>
                                <UserCheck size={18} color="#1A1A1A" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Field & Operations</Text>
                        <Text style={[styles.kpiValue, { color: '#1A1A1A' }]} numberOfLines={1}>
                            {metrics.sales} Staff
                        </Text>
                    </View>

                    {/* Security Status */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiHeaderRow}>
                            <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F5F7' }]}>
                                <Lock size={18} color="#1A1A1A" />
                            </View>
                        </View>
                        <Text style={styles.kpiLabel}>Access Security</Text>
                        <Text style={[styles.kpiValue, { color: '#1A1A1A' }]} numberOfLines={1}>Protected</Text>
                    </View>
                </FadeInDown>

                {/* 3. Role Filter Chips */}
                <View style={styles.filterScrollWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        {ROLE_FILTERS.map((r) => {
                            const active = selectedRoleFilter === r;
                            return (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.filterChip, active && styles.filterChipActive]}
                                    onPress={() => setSelectedRoleFilter(r)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                        {r}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 4. Search Bar */}
                <View style={styles.searchBar}>
                    <Search size={17} color="#8A8A8A" />
                    <TextInput
                        placeholder="Search team member by name, phone or role..."
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

                {/* 5. Users List */}
                <FadeInDown delay={80} style={styles.usersListSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Team Accounts</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{filteredUsers.length}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading staff directory...</Text>
                        </View>
                    ) : filteredUsers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Users size={40} color="#D0D0D0" />
                            <Text style={styles.emptyTitle}>No Members Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery ? 'No user matches your search query.' : 'No users currently assigned to this role filter.'}
                            </Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={25} delay={100}>
                            <View style={styles.userListWrapper}>
                                {filteredUsers.map((u) => {
                                    const roleMeta = ROLES.find(r => r.id === u.role) || {
                                        id: u.role,
                                        label: u.role || 'ERP User',
                                        color: '#1A1A1A',
                                        bg: '#F5F5F7'
                                    };
                                    const isSelf = u.id === currentUserId;
                                    const isActive = u.active !== false;

                                    return (
                                        <View key={u.id} style={styles.userCard}>
                                            <View style={styles.userCardTop}>
                                                <View style={styles.avatarBox}>
                                                    <Text style={styles.avatarText}>
                                                        {(u.name || 'U').trim().charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>

                                                <View style={styles.userMainInfo}>
                                                    <View style={styles.userNameRow}>
                                                        <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
                                                        {isSelf && (
                                                            <View style={styles.youBadge}>
                                                                <Text style={styles.youBadgeText}>YOU</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {u.phoneNumber ? (
                                                        <TouchableOpacity
                                                            style={styles.phoneChip}
                                                            onPress={() => handleCallUser(u.phoneNumber)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <PhoneCall size={11} color="#555555" />
                                                            <Text style={styles.phoneChipText}>{u.phoneNumber}</Text>
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>

                                                {/* Active Status Switch */}
                                                <View style={styles.switchWrapper}>
                                                    <Switch
                                                        value={isActive}
                                                        onValueChange={() => handleToggleActive(u)}
                                                        disabled={isSelf || updatingUserId === u.id}
                                                        trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                                        thumbColor={isActive ? '#F06A8C' : '#FFFFFF'}
                                                    />
                                                </View>
                                            </View>

                                            {/* Unified Role Dropdown Bar (Consistent across all cards) */}
                                            <TouchableOpacity
                                                style={styles.roleBar}
                                                onPress={() => openRoleModal(u)}
                                                activeOpacity={0.75}
                                            >
                                                <View style={styles.roleBarLeft}>
                                                    <Shield size={13} color="#1A1A1A" />
                                                    <Text style={styles.roleBarLabel}>Role:</Text>
                                                    <Text style={styles.roleBarValue} numberOfLines={1}>{roleMeta.label}</Text>
                                                </View>
                                                <ChevronDown size={14} color="#8A8A8A" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        </StaggerContainer>
                    )}
                </FadeInDown>
            </ScrollView>

            {/* 6. ROLE PICKER MODAL */}
            <Modal
                visible={roleModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setRoleModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Change Role Permission</Text>
                                <Text style={styles.modalSubtitle}>
                                    Assign access permissions for {targetUser?.name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setRoleModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalRolesScroll}
                        >
                            {ROLES.map((r) => {
                                const isCurrent = targetUser?.role === r.id;
                                return (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[
                                            styles.roleOptionCard,
                                            isCurrent && styles.roleOptionCardSelected
                                        ]}
                                        onPress={() => handleApplyRole(r.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.roleOptionIcon, { backgroundColor: r.bg }]}>
                                            <Shield size={20} color={r.color} />
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.roleOptionTitle}>{r.label}</Text>
                                                {isCurrent && (
                                                    <View style={styles.currentBadge}>
                                                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                                        </View>

                                        {isCurrent && (
                                            <CheckCircle2 size={20} color="#1A1A1A" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
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
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // Filter Chips
    filterScrollWrapper: {
        marginBottom: 12,
    },
    filterScroll: {
        gap: 8,
    },
    filterChip: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        marginBottom: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#1A1A1A',
    },

    // List
    usersListSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    countBadge: {
        backgroundColor: '#EAEAEA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#555',
    },
    userListWrapper: {
        gap: 10,
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    userCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    userMainInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    userName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    youBadge: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    youBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    phoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
        alignSelf: 'flex-start',
    },
    phoneChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#555555',
    },
    switchWrapper: {
        marginLeft: 8,
    },
    roleBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAF7F2',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    roleBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    roleBarLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
    },
    roleBarValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1,
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
        maxHeight: '85%',
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
    modalRolesScroll: {
        paddingHorizontal: 16,
        gap: 10,
        paddingBottom: 16,
    },
    roleOptionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    roleOptionCardSelected: {
        borderColor: '#1A1A1A',
        backgroundColor: '#F5F5F7',
    },
    roleOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleOptionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    roleOptionDesc: {
        fontSize: 11,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    currentBadge: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    currentBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
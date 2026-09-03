import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
    ShieldAlert, Store, Users, Server, RefreshCw, LogOut,
    ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck,
    Building2, Activity, ChevronRight, Layers, Cpu, Sparkles,
    Check, Plus, Search, X, Globe, Radio, ExternalLink
} from 'lucide-react-native';
import { FadeInDown, AnimatedPressable } from '../src/components/Anime';
import api, { clearToken } from '../src/services/api';

interface SummaryData {
    totalOrganizations: number;
    totalUsers: number;
    activeOrganizations: number;
    platformHealth: string;
    systemVersion: string;
}

interface OrganizationItem {
    id: number;
    name: string;
    createdAt: string;
    status: string;
    userCount: number;
}

interface UserItem {
    id: number;
    name: string;
    phoneNumber: string;
    platformRole: string;
    profileCompleted: boolean;
    isActive: boolean;
}

type TabKey = 'summary' | 'shops' | 'users';

export default function MasterAdminScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('summary');

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);

    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');

    // Add Shop Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newShopName, setNewShopName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminPassword, setAdminPassword] = useState('admin123');
    const [selectedCategory, setSelectedCategory] = useState('Wholesale Mart');
    const [creatingShop, setCreatingShop] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [sumRes, orgsRes, usersRes] = await Promise.all([
                api.get('/api/master-admin/summary'),
                api.get('/api/master-admin/organizations'),
                api.get('/api/master-admin/users'),
            ]);

            setSummary(sumRes.data);
            setOrgs(orgsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error: any) {
            console.error('Error fetching master admin data:', error);
            const msg = error.response?.data?.message || 'Failed to load platform analytics. Please check credentials.';
            Alert.alert('Access Denied', msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to exit the Master Admin Console?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await clearToken();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    const handleCreateShop = async () => {
        if (!newShopName.trim()) {
            Alert.alert('Shop Name Required', 'Please enter the business / shop name.');
            return;
        }
        if (!adminPhone.trim()) {
            Alert.alert('Admin Phone Required', 'Please enter the phone number for the shop admin.');
            return;
        }

        try {
            setCreatingShop(true);
            const fullName = newShopName.trim();

            const res = await api.post('/api/master-admin/organizations', {
                name: fullName,
                adminName: adminName.trim() || `${fullName} Admin`,
                adminPhone: adminPhone.trim(),
                adminPassword: adminPassword.trim() || 'admin123',
            });

            Alert.alert(
                'Shop & Admin Created!',
                `"${fullName}" has been onboarded with Admin "${res.data.adminName || adminName}" (Phone: ${adminPhone}).\nDefault Password: ${adminPassword || 'admin123'}`
            );
            setNewShopName('');
            setAdminName('');
            setAdminPhone('');
            setAdminPassword('admin123');
            setShowAddModal(false);
            fetchData();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to create shop. Please check phone number uniqueness.';
            Alert.alert('Creation Failed', msg);
        } finally {
            setCreatingShop(false);
        }
    };

    const filteredOrgs = useMemo(() => {
        if (!searchQuery.trim()) return orgs;
        const q = searchQuery.toLowerCase();
        return orgs.filter(o => o.name.toLowerCase().includes(q) || String(o.id).includes(q));
    }, [orgs, searchQuery]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.phoneNumber && u.phoneNumber.includes(q)) ||
            (u.platformRole && u.platformRole.toLowerCase().includes(q))
        );
    }, [users, searchQuery]);

    const roleConfig: Record<string, { bg: string; color: string; border: string }> = {
        MASTER_ADMIN: { bg: '#F3E5F5', color: '#6A1B9A', border: '#E1BEE7' },
        ADMIN: { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' },
        MANAGER: { bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
        SALES: { bg: '#FFF3E0', color: '#E65100', border: '#FFE0B2' },
        DEFAULT: { bg: '#FAF7F2', color: '#666666', border: '#ECEAE4' },
    };

    const SHOP_CATEGORIES = ['Wholesale Mart', 'Rice Mill', 'Grocery Retail', 'Grain Trader', 'Distribution Hub'];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 1. Distinctive Futuristic Cloud & Security SVG Illustration Backdrop */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />

                    {/* Top Cosmic Indigo & Royal Violet Flow */}
                    <Path
                        d="M80 -60 C200 -70, 390 -30, 400 100 C410 230, 310 290, 170 260 C80 240, 0 140, 80 -60 Z"
                        fill="#E0E7FF"
                        opacity={0.45}
                    />
                    <Circle cx="330" cy="80" r="85" fill="#C7D2FE" opacity={0.22} />

                    {/* Warm Amber Cloud Orbit */}
                    <Path
                        d="M-60 140 C30 160, 130 90, 170 210 C210 330, 70 390, -20 350 C-100 310, -130 120, -60 140 Z"
                        fill="#FEF3C7"
                        opacity={0.38}
                    />

                    {/* Modern Orbital Geometry and Nodes */}
                    <Path
                        d="M 30 110 Q 150 180, 270 120 T 360 220"
                        stroke="#4F46E5"
                        strokeWidth="1.2"
                        strokeDasharray="4,5"
                        fill="none"
                        opacity={0.22}
                    />
                    <Circle cx="30" cy="110" r="3.5" fill="#4F46E5" opacity={0.4} />
                    <Circle cx="270" cy="120" r="4.5" fill="#7C3AED" opacity={0.4} />
                    <Circle cx="360" cy="220" r="5.5" fill="#059669" opacity={0.4} />

                    {/* Soft Ambience Rings */}
                    <Circle cx="340" cy="500" r="90" fill="#F3E8FF" opacity={0.30} />
                    <Circle cx="40" cy="720" r="80" fill="#D1FAE5" opacity={0.32} />
                </Svg>
            </View>

            {/* 2. Executive Navigation Header */}
            <FadeInDown delay={20} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleCol}>
                        <Text style={styles.headerTitle}>Platform Console</Text>
                        <Text style={styles.headerSubtitle}>
                            Multi-Tenant Cloud Governance & Stores
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.75}
                    >
                        <LogOut size={16} color="#C62828" />
                    </TouchableOpacity>
                </View>
            </FadeInDown>

            {/* 3. Modern Segmented Tab Switcher */}
            <FadeInDown delay={40} style={styles.tabBarContainer}>
                <View style={styles.tabBar}>
                    {(['summary', 'shops', 'users'] as TabKey[]).map((tab) => {
                        const active = activeTab === tab;
                        const label = tab === 'summary' ? 'Overview' : tab === 'shops' ? 'Shops' : 'Users';
                        const count = tab === 'shops' ? orgs.length : tab === 'users' ? users.length : null;

                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabBtn, active && styles.tabBtnActive]}
                                onPress={() => {
                                    setActiveTab(tab);
                                    setSearchQuery('');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                                    {label}
                                </Text>
                                {count !== null && (
                                    <View style={[styles.tabCountBadge, active && styles.tabCountBadgeActive]}>
                                        <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </FadeInDown>

            {/* Search Bar for Shops & Users */}
            {activeTab !== 'summary' && (
                <FadeInDown delay={60} style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Search size={16} color="#888888" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === 'shops' ? 'Search registered shops by name or ID...' : 'Search platform users by name, phone, or role...'}
                            placeholderTextColor="#888888"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                                <X size={14} color="#666666" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </FadeInDown>
            )}

            {loading && !summary ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading Platform Console...</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#4F46E5', '#2E7D32']}
                        />
                    }
                >
                    {/* TAB 1: OVERVIEW & SYSTEM HEALTH */}
                    {activeTab === 'summary' && (
                        <View style={styles.tabContent}>
                            {/* Platform Health Hero Banner with Quick Add CTA */}
                            <FadeInDown delay={70}>
                                <View style={styles.heroHealthCard}>
                                    <View style={styles.heroHealthTop}>
                                        <View style={styles.heroHealthIconBox}>
                                            <ShieldCheck size={26} color="#2E7D32" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.heroHealthTitle}>SaaS Cluster Operational</Text>
                                            <Text style={styles.heroHealthSub}>
                                                Cluster Engine • {summary?.systemVersion || 'v2.0-SaaS'}
                                            </Text>
                                        </View>
                                        <View style={styles.liveHealthPill}>
                                            <View style={styles.liveHealthDot} />
                                            <Text style={styles.liveHealthText}>Healthy</Text>
                                        </View>
                                    </View>

                                    <View style={styles.heroHealthDivider} />

                                    <View style={styles.heroHealthBottomRow}>
                                        <View style={styles.heroHealthStat}>
                                            <Text style={styles.heroStatLabel}>ORGANIZATIONS</Text>
                                            <Text style={styles.heroStatValue}>{summary?.totalOrganizations || orgs.length}</Text>
                                        </View>
                                        <View style={styles.heroStatDivider} />
                                        <View style={styles.heroHealthStat}>
                                            <Text style={styles.heroStatLabel}>ACTIVE TENANTS</Text>
                                            <Text style={[styles.heroStatValue, { color: '#2E7D32' }]}>{summary?.activeOrganizations || orgs.filter(o => o.status === 'ACTIVE').length}</Text>
                                        </View>
                                        <View style={styles.heroStatDivider} />
                                        <View style={styles.heroHealthStat}>
                                            <Text style={styles.heroStatLabel}>USERS</Text>
                                            <Text style={[styles.heroStatValue, { color: '#4F46E5' }]}>{summary?.totalUsers || users.length}</Text>
                                        </View>
                                    </View>

                                    {/* Quick Onboard CTA */}
                                    <TouchableOpacity
                                        style={styles.heroCtaBtn}
                                        onPress={() => setShowAddModal(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Plus size={16} color="#FFFFFF" />
                                        <Text style={styles.heroCtaBtnText}>Onboard New Shop / Tenant</Text>
                                    </TouchableOpacity>
                                </View>
                            </FadeInDown>

                            {/* 4-Grid Platform Metrics */}
                            <FadeInDown delay={100}>
                                <View style={styles.kpiGrid}>
                                    {/* Total Registered Shops */}
                                    <View style={styles.kpiCard}>
                                        <View style={styles.kpiCardHeader}>
                                            <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
                                                <Store size={18} color="#2E7D32" />
                                            </View>
                                            <View style={styles.kpiTagPill}>
                                                <Text style={styles.kpiTagText}>Tenants</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.kpiValueText}>{summary?.totalOrganizations || orgs.length}</Text>
                                        <Text style={styles.kpiLabelText}>Registered Rice Shops</Text>
                                    </View>

                                    {/* Total Platform Users */}
                                    <View style={styles.kpiCard}>
                                        <View style={styles.kpiCardHeader}>
                                            <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
                                                <Users size={18} color="#4F46E5" />
                                            </View>
                                            <View style={[styles.kpiTagPill, { backgroundColor: '#EEF2FF' }]}>
                                                <Text style={[styles.kpiTagText, { color: '#4F46E5' }]}>Roster</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.kpiValueText}>{summary?.totalUsers || users.length}</Text>
                                        <Text style={styles.kpiLabelText}>Staff & Field Reps</Text>
                                    </View>

                                    {/* Active Organizations */}
                                    <View style={styles.kpiCard}>
                                        <View style={styles.kpiCardHeader}>
                                            <View style={[styles.kpiIconBox, { backgroundColor: '#F3E5F5' }]}>
                                                <Building2 size={18} color="#7C3AED" />
                                            </View>
                                            <View style={[styles.kpiTagPill, { backgroundColor: '#F3E5F5' }]}>
                                                <Text style={[styles.kpiTagText, { color: '#7C3AED' }]}>Live</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.kpiValueText}>{summary?.activeOrganizations || orgs.length}</Text>
                                        <Text style={styles.kpiLabelText}>Active Workspaces</Text>
                                    </View>

                                    {/* System Engine Health */}
                                    <View style={styles.kpiCard}>
                                        <View style={styles.kpiCardHeader}>
                                            <View style={[styles.kpiIconBox, { backgroundColor: '#FFF3E0' }]}>
                                                <Cpu size={18} color="#E65100" />
                                            </View>
                                            <View style={[styles.kpiTagPill, { backgroundColor: '#FFF3E0' }]}>
                                                <Text style={[styles.kpiTagText, { color: '#E65100' }]}>Engine</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.kpiValueText, { fontSize: 17 }]}>{summary?.platformHealth || 'OK'}</Text>
                                        <Text style={styles.kpiLabelText}>Cluster Latency & API</Text>
                                    </View>
                                </View>
                            </FadeInDown>

                            {/* Registered Businesses Quick List */}
                            <FadeInDown delay={130}>
                                <View style={styles.sectionHeaderRow}>
                                    <View>
                                        <Text style={styles.sectionTitle}>Registered Businesses</Text>
                                        <Text style={styles.sectionSubtitle}>Active rice mills & enterprise shops</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => setActiveTab('shops')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.viewAllText}>View All ({orgs.length})</Text>
                                        <ChevronRight size={14} color="#4F46E5" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.listContainer}>
                                    {orgs.slice(0, 4).map((item) => (
                                        <AnimatedPressable
                                            key={item.id}
                                            style={styles.orgCard}
                                            onPress={() => setActiveTab('shops')}
                                        >
                                            <View style={styles.orgAvatarBox}>
                                                <Store size={22} color="#2E7D32" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.orgNameText}>{item.name}</Text>
                                                <Text style={styles.orgMetaText}>
                                                    Org #{item.id} • {item.userCount} Members
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                                                <Text style={[styles.statusBadgeText, item.status === 'ACTIVE' ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                                                    {item.status}
                                                </Text>
                                            </View>
                                        </AnimatedPressable>
                                    ))}
                                </View>
                            </FadeInDown>
                        </View>
                    )}

                    {/* TAB 2: SHOPS DIRECTORY */}
                    {activeTab === 'shops' && (
                        <View style={styles.tabContent}>
                            <View style={styles.tabHeadingRow}>
                                <View>
                                    <Text style={styles.tabHeadingTitle}>Registered Shops ({filteredOrgs.length})</Text>
                                    <Text style={styles.tabHeadingSub}>All rice wholesalers & tenant accounts</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addShopTabBtn}
                                    onPress={() => setShowAddModal(true)}
                                    activeOpacity={0.8}
                                >
                                    <Plus size={15} color="#FFFFFF" />
                                    <Text style={styles.addShopTabBtnText}>New Shop</Text>
                                </TouchableOpacity>
                            </View>

                            {filteredOrgs.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Store size={32} color="#888888" />
                                    <Text style={styles.emptyTitle}>No Shops Found</Text>
                                    <Text style={styles.emptySubtitle}>No shops match your search query "{searchQuery}".</Text>
                                </View>
                            ) : (
                                <View style={styles.listContainer}>
                                    {filteredOrgs.map((item) => (
                                        <View
                                            key={item.id}
                                            style={styles.detailCard}
                                        >
                                            <View style={styles.detailCardHeader}>
                                                <View style={styles.detailCardAvatar}>
                                                    <Store size={22} color="#2E7D32" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.detailCardTitle}>{item.name}</Text>
                                                    <Text style={styles.detailCardSub}>Organization ID #{item.id}</Text>
                                                </View>
                                                <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                                                    <Text style={[styles.statusBadgeText, item.status === 'ACTIVE' ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                                                        {item.status}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.detailMetricsStrip}>
                                                <View style={styles.detailMetricCol}>
                                                    <Text style={styles.detailMetricLabel}>TEAM MEMBERS</Text>
                                                    <Text style={styles.detailMetricVal}>{item.userCount} Users</Text>
                                                </View>
                                                <View style={styles.detailMetricDivider} />
                                                <View style={styles.detailMetricCol}>
                                                    <Text style={styles.detailMetricLabel}>ONBOARDED ON</Text>
                                                    <Text style={styles.detailMetricVal}>
                                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* TAB 3: PLATFORM USER DIRECTORY */}
                    {activeTab === 'users' && (
                        <View style={styles.tabContent}>
                            <View style={styles.tabHeadingRow}>
                                <View>
                                    <Text style={styles.tabHeadingTitle}>Platform User Directory ({filteredUsers.length})</Text>
                                    <Text style={styles.tabHeadingSub}>System accounts, admins & field executives</Text>
                                </View>
                            </View>

                            {filteredUsers.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Users size={32} color="#888888" />
                                    <Text style={styles.emptyTitle}>No Users Found</Text>
                                    <Text style={styles.emptySubtitle}>No platform users match "{searchQuery}".</Text>
                                </View>
                            ) : (
                                <View style={styles.listContainer}>
                                    {filteredUsers.map((u) => {
                                        const role = roleConfig[u.platformRole] || roleConfig.DEFAULT;
                                        const initials = (u.name || 'User').slice(0, 2).toUpperCase();

                                        return (
                                            <View
                                                key={u.id}
                                                style={styles.detailCard}
                                            >
                                                <View style={styles.detailCardHeader}>
                                                    <View style={[styles.userAvatarBox, { backgroundColor: role.bg }]}>
                                                        <Text style={[styles.userAvatarText, { color: role.color }]}>
                                                            {initials}
                                                        </Text>
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <View style={styles.userNameRow}>
                                                            <Text style={styles.detailCardTitle}>{u.name || 'Unnamed User'}</Text>
                                                            {u.profileCompleted && (
                                                                <CheckCircle2 size={14} color="#2E7D32" />
                                                            )}
                                                        </View>
                                                        <Text style={styles.detailCardSub}>Phone: {u.phoneNumber}</Text>
                                                    </View>

                                                    <View style={[styles.roleBadge, { backgroundColor: role.bg, borderColor: role.border }]}>
                                                        <Text style={[styles.roleBadgeText, { color: role.color }]}>
                                                            {u.platformRole || 'USER'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.userStatusStrip}>
                                                    <View style={styles.userStatusCol}>
                                                        <Text style={styles.userStatusLabel}>PROFILE</Text>
                                                        <Text style={[styles.userStatusVal, u.profileCompleted ? { color: '#2E7D32' } : { color: '#E65100' }]}>
                                                            {u.profileCompleted ? 'Completed ✅' : 'Incomplete ⏳'}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.detailMetricDivider} />
                                                    <View style={styles.userStatusCol}>
                                                        <Text style={styles.userStatusLabel}>ACCOUNT</Text>
                                                        <Text style={[styles.userStatusVal, u.isActive ? { color: '#2E7D32' } : { color: '#C62828' }]}>
                                                            {u.isActive ? 'Active' : 'Deactivated'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* 4. ADD SHOP MODAL DRAWER */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeaderRow}>
                            <View>
                                <Text style={styles.modalTitle}>Onboard New Shop</Text>
                                <Text style={styles.modalSub}>Register a new tenant store to the platform</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowAddModal(false)}
                            >
                                <X size={16} color="#666666" />
                            </TouchableOpacity>
                        </View>

                        {/* Shop Name Input */}
                        <Text style={styles.modalInputLabel}>SHOP / BUSINESS NAME *</Text>
                        <View style={styles.inputBox}>
                            <Store size={18} color="#4F46E5" />
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Sri Krishna Rice Mart"
                                placeholderTextColor="#888888"
                                value={newShopName}
                                onChangeText={setNewShopName}
                                autoFocus
                            />
                        </View>

                        {/* Admin Name Input */}
                        <Text style={styles.modalInputLabel}>ASSIGNED SHOP ADMIN NAME</Text>
                        <View style={styles.inputBox}>
                            <Users size={18} color="#2E7D32" />
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Ramesh Kumar"
                                placeholderTextColor="#888888"
                                value={adminName}
                                onChangeText={setAdminName}
                            />
                        </View>

                        {/* Admin Phone Input */}
                        <Text style={styles.modalInputLabel}>ADMIN PHONE NUMBER * (FOR LOGIN)</Text>
                        <View style={styles.inputBox}>
                            <Users size={18} color="#E65100" />
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 9876543210"
                                placeholderTextColor="#888888"
                                value={adminPhone}
                                onChangeText={setAdminPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Admin Default Password */}
                        <Text style={styles.modalInputLabel}>DEFAULT PASSWORD</Text>
                        <View style={styles.inputBox}>
                            <ShieldAlert size={18} color="#7C3AED" />
                            <TextInput
                                style={styles.textInput}
                                placeholder="admin123"
                                placeholderTextColor="#888888"
                                value={adminPassword}
                                onChangeText={setAdminPassword}
                            />
                        </View>

                        {/* Create CTA Button */}
                        <TouchableOpacity
                            style={[styles.createShopBtn, (!newShopName.trim() || !adminPhone.trim()) && styles.createShopBtnDisabled]}
                            onPress={handleCreateShop}
                            disabled={creatingShop || !newShopName.trim() || !adminPhone.trim()}
                            activeOpacity={0.85}
                        >
                            {creatingShop ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Plus size={18} color="#FFFFFF" />
                                    <Text style={styles.createShopBtnText}>Create Shop & Assign Admin</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
    },

    // Header
    header: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        marginLeft: 4,
    },
    headerBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    masterPill: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    masterPillText: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#4F46E5',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    addShopHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 12,
        elevation: 1,
    },
    addShopHeaderBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    logoutBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },

    // Segmented Tab Switcher
    tabBarContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        borderRadius: 12,
    },
    tabBtnActive: {
        backgroundColor: '#1A1A1A',
    },
    tabBtnText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#666666',
    },
    tabBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tabCountBadge: {
        backgroundColor: '#F0EFEA',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    tabCountBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    tabCountText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#666666',
    },
    tabCountTextActive: {
        color: '#FFFFFF',
    },

    // Search Bar
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#EDEBE6',
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#1A1A1A',
        padding: 0,
    },
    searchClearBtn: {
        padding: 4,
    },

    // Tab Content
    tabContent: {
        paddingBottom: 20,
    },

    // Hero Health Card
    heroHealthCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        marginBottom: 16,
    },
    heroHealthTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heroHealthIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroHealthTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    heroHealthSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 2,
    },
    liveHealthPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    liveHealthDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2E7D32',
    },
    liveHealthText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#2E7D32',
    },
    heroHealthDivider: {
        height: 1,
        backgroundColor: '#F0EFEA',
        marginVertical: 14,
    },
    heroHealthBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 14,
    },
    heroHealthStat: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 3,
    },
    heroStatValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    heroStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#EDEBE6',
    },
    heroCtaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        borderRadius: 14,
        paddingVertical: 11,
        elevation: 1,
    },
    heroCtaBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // 4-Grid Metrics
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    kpiCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    kpiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    kpiIconBox: {
        width: 36,
        height: 36,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiTagPill: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    kpiTagText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#2E7D32',
    },
    kpiValueText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    kpiLabelText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
    },

    // Section Header
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    sectionSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingBottom: 2,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
    },

    // List & Cards
    listContainer: {
        gap: 10,
    },
    orgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
    },
    orgAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    orgNameText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    orgMetaText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
    },
    statusBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeActive: {
        backgroundColor: '#E8F5E9',
    },
    statusBadgeInactive: {
        backgroundColor: '#FFEBEE',
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
    },
    statusBadgeTextActive: {
        color: '#2E7D32',
    },
    statusBadgeTextInactive: {
        color: '#C62828',
    },

    // Tab Detail Cards
    tabHeadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    tabHeadingTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    tabHeadingSub: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    addShopTabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    addShopTabBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDEBE6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    detailCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailCardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailCardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    detailCardSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 1,
    },
    detailMetricsStrip: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#F0EFEA',
    },
    detailMetricCol: {
        flex: 1,
    },
    detailMetricLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 2,
    },
    detailMetricVal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    detailMetricDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E2E0D8',
        alignSelf: 'center',
        marginHorizontal: 10,
    },

    // User Cards
    userAvatarBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
        borderWidth: 1,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    userStatusStrip: {
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#F0EFEA',
    },
    userStatusCol: {
        flex: 1,
    },
    userStatusLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#888888',
        marginBottom: 2,
    },
    userStatusVal: {
        fontSize: 12.5,
        fontWeight: '700',
    },

    // Empty Card
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDEBE6',
        marginTop: 10,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    emptySubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#777777',
        textAlign: 'center',
    },

    // Add Shop Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 22,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    modalSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777777',
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F5F5F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalInputLabel: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#888888',
        letterSpacing: 0.3,
        marginBottom: 6,
        marginTop: 6,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FAF7F2',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E0D8',
        marginBottom: 14,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        padding: 0,
    },
    categoryWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E2E0D8',
    },
    categoryChipActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666666',
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    createShopBtn: {
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 2,
    },
    createShopBtnDisabled: {
        backgroundColor: '#CCCCCC',
        elevation: 0,
    },
    createShopBtnText: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});

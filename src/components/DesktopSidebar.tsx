import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
    LayoutGrid,
    Box,
    ShoppingCart,
    Truck,
    Receipt,
    Users,
    MapPin,
    BookOpen,
    BarChart2,
    UserCheck,
    Settings,
    LogOut,
    Leaf,
    Plus,
    Search,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Store,
    Sparkles,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCurrentRole } from '../hooks/useCurrentRole';
import { clearToken, me } from '../services/api';

interface NavItem {
    id: string;
    label: string;
    route: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
}

export function DesktopSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { role } = useCurrentRole();
    const [collapsed, setCollapsed] = useState(false);
    const [userName, setUserName] = useState('Admin');
    const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

    useEffect(() => {
        me()
            .then((res) => {
                if (res.data?.name) {
                    setUserName(res.data.name);
                }
            })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        try {
            await clearToken();
            router.replace('/(auth)/welcome' as any);
        } catch (e) {
            router.replace('/(auth)/welcome' as any);
        }
    };

    const navSections: { title: string; items: NavItem[] }[] = [
        {
            title: 'MAIN MODULES',
            items: [
                { id: 'home', label: 'Dashboard', route: '/', icon: LayoutGrid },
                { id: 'stock', label: 'Stock & Inventory', route: '/stock', icon: Box },
                { id: 'sales', label: 'Sales & POS', route: '/sales', icon: ShoppingCart },
                { id: 'purchases', label: 'Purchases & Inward', route: '/purchases', icon: Truck },
                { id: 'invoices', label: 'Invoices & Bills', route: '/invoices', icon: Receipt },
            ],
        },
        {
            title: 'OPERATIONS',
            items: [
                { id: 'customers', label: 'Customers', route: '/customers', icon: Users },
                { id: 'suppliers', label: 'Suppliers', route: '/suppliers', icon: Store },
                {
                    id: 'field',
                    label: 'Field Sales',
                    route: '/field-sales',
                    icon: MapPin,
                    badge: 'Live',
                    badgeColor: '#10B981',
                },
                { id: 'delivery', label: 'Delivery Tracking', route: '/delivery', icon: Truck },
            ],
        },
        {
            title: 'MANAGEMENT',
            items: [
                { id: 'ledger', label: 'Accounts & Ledger', route: '/ledger', icon: BookOpen },
                { id: 'reports', label: 'Reports & Analytics', route: '/reports', icon: BarChart2 },
                { id: 'team', label: 'Team & Access', route: '/team-management', icon: UserCheck },
                { id: 'settings', label: 'Store Settings', route: '/settings', icon: Settings },
            ],
        },
    ];

    const isRouteActive = (route: string) => {
        if (route === '/') {
            return (
                pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname === ''
            );
        }
        if (route === '/stock') {
            return pathname === '/stock' || pathname === '/(tabs)/stock';
        }
        if (route === '/sales') {
            return pathname === '/sales' || pathname === '/(tabs)/sales';
        }
        if (route === '/ledger') {
            return pathname === '/ledger' || pathname === '/(tabs)/ledger';
        }
        return pathname?.startsWith(route);
    };

    const navigateTo = (route: string) => {
        if (route === '/') {
            router.push('/(tabs)' as any);
        } else if (route === '/stock' || route === '/sales' || route === '/ledger') {
            router.push(`/(tabs)${route}` as any);
        } else {
            router.push(route as any);
        }
    };

    const getInitials = (name: string) => {
        return (
            name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'AD'
        );
    };

    return (
        <View style={[styles.container, collapsed ? styles.containerCollapsed : styles.containerExpanded]}>
            {/* 1. Header: Store Switcher & Collapse Toggle */}
            {collapsed ? (
                <View style={styles.headerCollapsed}>
                    <TouchableOpacity
                        style={styles.brandIconBoxCollapsed}
                        onPress={() => setCollapsed(false)}
                        activeOpacity={0.7}
                        accessibilityLabel="Expand Sidebar"
                    >
                        <Leaf size={18} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.collapseBtnCollapsed,
                            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                        ]}
                        onPress={() => setCollapsed(false)}
                        activeOpacity={0.7}
                        accessibilityLabel="Expand Sidebar"
                    >
                        <PanelLeftOpen size={16} color="#64748B" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.header}>
                    <View style={styles.storeBadgeRow}>
                        <View style={styles.brandIconBox}>
                            <Leaf size={18} color="#FFFFFF" strokeWidth={2.4} />
                        </View>
                        <View style={styles.storeTextCol}>
                            <View style={styles.storeNameRow}>
                                <Text style={styles.storeTitle} numberOfLines={1}>
                                    Sri Dhanalakshmi
                                </Text>
                            </View>
                            <View style={styles.storeSubRow}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.storeSubtitle}>Rice Mill ERP • {role || 'PRO'}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.collapseBtn,
                            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                        ]}
                        onPress={() => setCollapsed(true)}
                        activeOpacity={0.7}
                        accessibilityLabel="Collapse Sidebar"
                    >
                        <PanelLeftClose size={16} color="#64748B" />
                    </TouchableOpacity>
                </View>
            )}

            {/* 2. Quick Action CTA (Expanded Only) */}
            {!collapsed && (
                <View style={styles.ctaWrapper}>
                    <TouchableOpacity
                        style={[
                            styles.quickSaleBtn,
                            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                        ]}
                        onPress={() => navigateTo('/sales')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.ctaIconCircle}>
                            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                        </View>
                        <Text style={styles.ctaText}>New Sale / POS Bill</Text>
                        <View style={styles.ctaShortcutPill}>
                            <Text style={styles.ctaShortcutText}>F2</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* 3. Navigation Groups */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.navScrollView}
                contentContainerStyle={styles.navScrollContent}
            >
                {navSections.map((sec, secIdx) => (
                    <View key={secIdx} style={styles.sectionGroup}>
                        {!collapsed && <Text style={styles.sectionHeaderTitle}>{sec.title}</Text>}
                        {sec.items.map((item) => {
                            const active = isRouteActive(item.route);
                            const IconComponent = item.icon;
                            const isHovered = hoveredRoute === item.route;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.navItemButton,
                                        collapsed && styles.navItemButtonCollapsed,
                                        active && styles.navItemActive,
                                        !active && isHovered && styles.navItemHovered,
                                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                                    ]}
                                    onPress={() => navigateTo(item.route)}
                                    // @ts-ignore - web hover events
                                    onMouseEnter={() => setHoveredRoute(item.route)}
                                    onMouseLeave={() => setHoveredRoute(null)}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={[styles.iconContainer, active && styles.iconContainerActive]}
                                    >
                                        <IconComponent
                                            size={18}
                                            color={active ? '#FFFFFF' : isHovered ? '#0F172A' : '#64748B'}
                                            strokeWidth={active ? 2.4 : 1.9}
                                        />
                                    </View>

                                    {!collapsed && (
                                        <>
                                            <Text
                                                style={[
                                                    styles.navItemLabel,
                                                    active && styles.navItemLabelActive,
                                                    !active && isHovered && styles.navItemLabelHovered,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>

                                            {item.badge && (
                                                <View
                                                    style={[
                                                        styles.badgePill,
                                                        {
                                                            backgroundColor: item.badgeColor
                                                                ? `${item.badgeColor}18`
                                                                : '#E2E8F0',
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.badgeText,
                                                            { color: item.badgeColor || '#64748B' },
                                                        ]}
                                                    >
                                                        {item.badge}
                                                    </Text>
                                                </View>
                                            )}

                                            {active && !item.badge && <View style={styles.activeGlowDot} />}
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>

            {/* 4. Footer: User Profile & Logout */}
            <View style={[styles.footer, collapsed && styles.footerCollapsed]}>
                {!collapsed ? (
                    <View style={styles.userProfileCard}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.avatarInitials}>{getInitials(userName)}</Text>
                            <View style={styles.onlineStatusDot} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {userName}
                            </Text>
                            <Text style={styles.userRole} numberOfLines={1}>
                                {role || 'STAFF'} • ONLINE
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.logoutIconBtn,
                                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                            ]}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                            accessibilityLabel="Log Out"
                        >
                            <LogOut size={16} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.logoutBtnCollapsed,
                            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
                        ]}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <LogOut size={18} color="#DC2626" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E4E4E7',
        flexDirection: 'column',
        display: 'flex',
        zIndex: 50,
        ...(Platform.OS === 'web'
            ? ({
                  transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '1px 0 10px rgba(0, 0, 0, 0.02)',
              } as any)
            : {}),
    },
    containerExpanded: {
        width: 260,
    },
    containerCollapsed: {
        width: 72,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F4F5',
    },
    headerCollapsed: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F4F5',
        gap: 8,
    },
    storeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    brandIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#15803D',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
    },
    brandIconBoxCollapsed: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#15803D',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    collapseBtnCollapsed: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F4F4F5',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    storeTextCol: {
        flex: 1,
    },
    storeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeTitle: {
        fontFamily: 'Urbanist_800ExtraBold',
        fontSize: 15,
        color: '#09090B',
        letterSpacing: -0.2,
    },
    storeSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 1,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E',
    },
    storeSubtitle: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 11,
        color: '#71717A',
    },
    collapseBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: '#F4F4F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    ctaWrapper: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
    },
    quickSaleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    ctaIconCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#15803D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaText: {
        flex: 1,
        fontFamily: 'Urbanist_700Bold',
        fontSize: 13,
        color: '#FFFFFF',
    },
    ctaShortcutPill: {
        backgroundColor: '#27272A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    ctaShortcutText: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 10,
        color: '#A1A1AA',
    },
    navScrollView: {
        flex: 1,
    },
    navScrollContent: {
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 16,
    },
    sectionGroup: {
        marginBottom: 14,
    },
    sectionHeaderTitle: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 10.5,
        color: '#A1A1AA',
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    navItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 10,
        marginBottom: 2,
        ...(Platform.OS === 'web'
            ? ({
                  transition: 'all 0.15s ease',
              } as any)
            : {}),
    },
    navItemButtonCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    navItemActive: {
        backgroundColor: '#18181B',
    },
    navItemHovered: {
        backgroundColor: '#F4F4F5',
    },
    iconContainer: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerActive: {
        // active state
    },
    navItemLabel: {
        flex: 1,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 13,
        color: '#52525B',
    },
    navItemLabelActive: {
        fontFamily: 'Urbanist_700Bold',
        color: '#FFFFFF',
    },
    navItemLabelHovered: {
        color: '#09090B',
    },
    badgePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 10,
    },
    activeGlowDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E',
    },
    footer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#F4F4F5',
        backgroundColor: '#FAFAFA',
    },
    footerCollapsed: {
        alignItems: 'center',
        paddingHorizontal: 0,
    },
    userProfileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E7',
        gap: 10,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarInitials: {
        fontFamily: 'Urbanist_800ExtraBold',
        fontSize: 12,
        color: '#065F46',
    },
    onlineStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        position: 'absolute',
        bottom: -1,
        right: -1,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: 'Urbanist_700Bold',
        fontSize: 12.5,
        color: '#09090B',
    },
    userRole: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 10,
        color: '#71717A',
    },
    logoutIconBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutBtnCollapsed: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

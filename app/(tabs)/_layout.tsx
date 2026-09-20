import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Text, Platform, useWindowDimensions } from 'react-native';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { LayoutGrid, Box, Plus, ShoppingCart, User, MapPin, Truck, BookOpen, Receipt } from 'lucide-react-native';
import { onUnauthorized, getToken, clearToken, onTokenChanged } from '../../src/services/api';
import { useCurrentRole, RoleName } from '../../src/hooks/useCurrentRole';

export default function TabLayout() {
    const router = useRouter();
    const { role, profileCompleted, ready, failed } = useCurrentRole();
    const [authChecked, setAuthChecked] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        const off = onUnauthorized(() => {
            router.replace('/(auth)/welcome');
        });
        return off;
    }, [router]);

    // Auth gate: this group owns the root URL, so unauthenticated users
    // are redirected to welcome before any tab renders.
    useEffect(() => {
        let cancelled = false;
        const offToken = onTokenChanged((token) => {
            if (!cancelled) {
                setHasToken(!!token);
                setAuthChecked(true);
            }
        });
        getToken().then(token => {
            if (!cancelled) {
                setHasToken(!!token);
                setAuthChecked(true);
            }
        }).catch(() => {
            if (!cancelled) {
                setHasToken(false);
                setAuthChecked(true);
            }
        });
        return () => {
            cancelled = true;
            offToken();
        };
    }, []);

    if (!authChecked) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!hasToken) {
        return <Redirect href="/(auth)/welcome" />;
    }

    if (!ready) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (failed) {
        // Token exists but backend is unreachable or returned an auth error.
        // Clear the stale token so we don't get stuck in a redirect loop.
        clearToken();
        return <Redirect href="/(auth)/welcome" />;    
    }

    if (role === 'MASTER_ADMIN') {
        return <Redirect href="/master-admin" />;
    }

    return (
        <Tabs
            tabBar={(props) => <CustomBottomDock {...props} role={role} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="stock" options={{ title: 'Stock' }} />
            <Tabs.Screen name="menu" options={{ title: 'Modules' }} />
            <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            <Tabs.Screen name="ledger" options={{ href: null }} />
        </Tabs>
    );
}

function CustomBottomDock({ state, navigation, role }: { state: any; navigation: any; role: RoleName | null }) {
    const { width } = useWindowDimensions();
    if (Platform.OS === 'web' && width >= 1024) {
        return null; // On desktop web, the Left Sidebar replaces the bottom dock
    }

    const router = useRouter();
    const currentRoute = state.routes[state.index]?.name;

    const navigateTo = (routeName: string) => {
        if (routeName.startsWith('/')) {
            router.push(routeName as any);
        } else {
            navigation.navigate(routeName);
        }
    };

    // Define role-tailored configuration for Tab 2 and Tab 4
    let tab2Config = { label: 'Stock', icon: Box, route: 'stock', isActive: currentRoute === 'stock' };
    let tab4Config = { label: 'Sales', icon: ShoppingCart, route: 'sales', isActive: currentRoute === 'sales' };

    if (role === 'SALES') {
        tab2Config = { label: 'Route', icon: MapPin, route: '/field-sales', isActive: false };
        tab4Config = { label: 'Sales', icon: ShoppingCart, route: 'sales', isActive: currentRoute === 'sales' };
    } else if (role === 'WAREHOUSE') {
        tab2Config = { label: 'Stock', icon: Box, route: 'stock', isActive: currentRoute === 'stock' };
        tab4Config = { label: 'Purchases', icon: Truck, route: '/purchases', isActive: false };
    } else if (role === 'ACCOUNTANT') {
        tab2Config = { label: 'Ledger', icon: BookOpen, route: 'ledger', isActive: currentRoute === 'ledger' };
        tab4Config = { label: 'Invoices', icon: Receipt, route: '/invoices', isActive: false };
    }

    const Tab2Icon = tab2Config.icon;
    const Tab4Icon = tab4Config.icon;

    return (
        <View style={styles.dockWrapper}>
            <View style={styles.dockBar}>
                {/* 1. Home Tab */}
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigateTo('index')}
                    activeOpacity={0.7}
                >
                    <LayoutGrid
                        size={22}
                        color={currentRoute === 'index' ? '#1A1A1A' : '#8A8A8A'}
                    />
                    <Text style={[styles.tabLabel, currentRoute === 'index' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>

                {/* 2. Role-tailored Tab 2 (Stock / Route / Ledger) */}
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigateTo(tab2Config.route)}
                    activeOpacity={0.7}
                >
                    <Tab2Icon
                        size={22}
                        color={tab2Config.isActive ? '#1A1A1A' : '#8A8A8A'}
                    />
                    <Text style={[styles.tabLabel, tab2Config.isActive && styles.tabLabelActive]}>{tab2Config.label}</Text>
                </TouchableOpacity>

                {/* 3. Center Elevated + FAB Button -> Navigates to Modules/Menu Screen */}
                <TouchableOpacity
                    style={styles.fabWrapper}
                    onPress={() => router.push('/(tabs)/menu')}
                    activeOpacity={0.85}
                >
                    <View style={styles.fabCircle}>
                        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                </TouchableOpacity>

                {/* 4. Role-tailored Tab 4 (Sales / Purchases / Invoices) */}
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigateTo(tab4Config.route)}
                    activeOpacity={0.7}
                >
                    <Tab4Icon
                        size={22}
                        color={tab4Config.isActive ? '#1A1A1A' : '#8A8A8A'}
                    />
                    <Text style={[styles.tabLabel, tab4Config.isActive && styles.tabLabelActive]}>{tab4Config.label}</Text>
                </TouchableOpacity>

                {/* 5. Profile Tab -> Profile details, Settings, User Management (Admin), Log Out */}
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigateTo('profile')}
                    activeOpacity={0.7}
                >
                    <User
                        size={22}
                        color={currentRoute === 'profile' ? '#1A1A1A' : '#8A8A8A'}
                    />
                    <Text style={[styles.tabLabel, currentRoute === 'profile' && styles.tabLabelActive]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    dockWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    dockBar: {
        width: '100%',
        maxWidth: 580,
        height: 64,
        backgroundColor: '#FFFFFF', // Light background per user instruction
        borderTopWidth: 1,
        borderTopColor: '#EFEFEF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    tabLabel: {
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 10,
        color: '#8A8A8A',
        marginTop: 2,
    },
    tabLabelActive: {
        color: '#1A1A1A',
        fontFamily: 'Urbanist_700Bold',
    },
    fabWrapper: {
        top: -14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1A1A1A', // Dark FAB circle contrasting on light dock
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    }
});

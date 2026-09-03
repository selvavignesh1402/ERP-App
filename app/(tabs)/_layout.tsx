import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { LayoutGrid, Box, Plus, ShoppingCart, User } from 'lucide-react-native';
import { onUnauthorized, getToken, clearToken } from '../../src/services/api';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

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

    if (failed) {
        // Token exists but backend is unreachable or returned an auth error.
        // Clear the stale token so we don't get stuck in a redirect loop.
        clearToken();
        return <Redirect href="/(auth)/welcome" />;    
    }

    if (!ready) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (role === 'MASTER_ADMIN') {
        return <Redirect href="/master-admin" />;
    }

    if (!profileCompleted) {
        return <Redirect href="/settings" />;
    }

    // Fail closed: hide the Sales tab unless the role is confirmed non-WAREHOUSE.
    const canSeeSales = role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT' || role === 'SALES';

    return (
        <Tabs
            tabBar={(props) => <CustomBottomDock {...props} canSeeSales={canSeeSales} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="stock" options={{ title: 'Stock' }} />
            <Tabs.Screen name="menu" options={{ title: 'Modules' }} />
            <Tabs.Screen
                name="sales"
                options={canSeeSales ? { title: 'Sales' } : { title: 'Sales', href: null }}
            />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            <Tabs.Screen name="ledger" options={{ href: null }} />
        </Tabs>
    );
}

function CustomBottomDock({ state, navigation, canSeeSales }: any) {
    const router = useRouter();
    const currentRoute = state.routes[state.index]?.name;

    const navigateTo = (routeName: string) => {
        navigation.navigate(routeName);
    };

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

                {/* 2. Stock Tab */}
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigateTo('stock')}
                    activeOpacity={0.7}
                >
                    <Box
                        size={22}
                        color={currentRoute === 'stock' ? '#1A1A1A' : '#8A8A8A'}
                    />
                    <Text style={[styles.tabLabel, currentRoute === 'stock' && styles.tabLabelActive]}>Stock</Text>
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

                {/* 4. Sales Tab */}
                {canSeeSales && (
                    <TouchableOpacity
                        style={styles.tabBtn}
                        onPress={() => navigateTo('sales')}
                        activeOpacity={0.7}
                    >
                        <ShoppingCart
                            size={22}
                            color={currentRoute === 'sales' ? '#1A1A1A' : '#8A8A8A'}
                        />
                        <Text style={[styles.tabLabel, currentRoute === 'sales' && styles.tabLabelActive]}>Sales</Text>
                    </TouchableOpacity>
                )}

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

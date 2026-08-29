import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '../../src/theme/colors';
import {
    ShoppingBag, Box, Clock, TrendingUp, TrendingDown,
    Plus, BarChart2, Sparkles, MapPin, Users, Truck, Receipt, BookOpen, ChevronRight
} from 'lucide-react-native';
import { DashboardHeader } from '../../src/components/DashboardHeader';
import { StaggerContainer, FadeInDown, AnimatedPressable } from '../../src/components/Anime';
import api, { me } from '../../src/services/api';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

export default function Home() {
    const router = useRouter();
    const { role } = useCurrentRole();
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState<string>('Admin');
    const [metrics, setMetrics] = useState({
        totalStock: 0,
        lowStockCount: 0,
        todaySalesKg: 0,
        todayRevenue: 0,
        pendingCredit: 0,
        activeSuppliers: 0,
        recentSales: [] as any[]
    });

    const isWarehouse = role === 'WAREHOUSE';
    const canSeeSales = !isWarehouse;

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            try {
                const meRes = await me();
                if (meRes.data?.name) {
                    setUserName(meRes.data.name.split(' ')[0]);
                }
            } catch (meErr) {
                console.error('Error loading user name:', meErr);
            }

            const response = await api.get('/dashboard');
            if (response.data) {
                setMetrics(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [fetchDashboard])
    );

    const formatCurrency = (amount: number) => {
        return `₹ ${amount.toLocaleString('en-IN')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Organic Pastel Vector Illustration Background */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    
                    {/* Top Pastel Blobs */}
                    <Path
                        d="M150 -50 C240 -20, 390 -30, 400 120 C410 270, 310 240, 240 220 C170 200, 70 300, 0 200 C-70 100, 70 -80, 150 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.25}
                    />
                    <Path
                        d="M-50 120 C30 140, 140 80, 180 200 C220 320, 100 380, 0 340 C-100 300, -130 100, -50 120 Z"
                        fill="#F7E6B8"
                        opacity={0.3}
                    />

                    {/* Middle & Lower Pastel Blobs */}
                    <Path
                        d="M200 400 C280 430, 380 500, 350 620 C320 740, 220 700, 140 650 C60 600, 120 370, 200 400 Z"
                        fill="#DCE6DB"
                        opacity={0.35}
                    />
                    <Path
                        d="M-60 550 C20 530, 120 620, 80 740 C40 860, -80 820, -120 720 C-160 620, -140 570, -60 550 Z"
                        fill="#E2D4F5"
                        opacity={0.3}
                    />

                    <Circle cx="330" cy="280" r="60" fill="#E2D4F5" opacity={0.3} />
                    <Circle cx="40" cy="520" r="55" fill="#FCE1CC" opacity={0.35} />
                </Svg>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* 1. Header Card */}
                <FadeInDown delay={40}>
                    <DashboardHeader
                        date={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit' })}
                        greeting={`Good Morning, ${userName} 👋`}
                        subtext="Here's what's happening with your rice stock today."
                        onSearch={(txt) => {}}
                    />
                </FadeInDown>

                {/* 2. Primary Actions — 2x2 Centered Grid */}
                <FadeInDown delay={90} style={styles.section}>
                    <Text style={styles.sectionTitleHeader}>Primary Actions</Text>
                    
                    {/* Grid Row 1 */}
                    <View style={styles.gridRow}>
                        {canSeeSales && (
                            <AnimatedPressable
                                style={[styles.gridActionCard, { backgroundColor: '#FBE8F0' }]}
                                onPress={() => router.push('/sales')}
                            >
                                <View style={styles.centeredCardContent}>
                                    <View style={[styles.actionIconBadge, { backgroundColor: '#F06A8C' }]}>
                                        <Plus size={18} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.actionTextFlex}>
                                        <Text style={styles.actionTitle} numberOfLines={1}>New Sale</Text>
                                        <Text style={styles.actionSub} numberOfLines={1}>Create POS Bill</Text>
                                    </View>
                                </View>
                            </AnimatedPressable>
                        )}

                        <AnimatedPressable
                            style={[styles.gridActionCard, { backgroundColor: '#FEF4E6' }]}
                            onPress={() => router.push('/stock')}
                        >
                            <View style={styles.centeredCardContent}>
                                <View style={[styles.actionIconBadge, { backgroundColor: '#F0A93C' }]}>
                                    <Box size={18} color="#FFFFFF" />
                                </View>
                                <View style={styles.actionTextFlex}>
                                    <Text style={styles.actionTitle} numberOfLines={1}>Add Stock</Text>
                                    <Text style={styles.actionSub} numberOfLines={1}>Inventory</Text>
                                </View>
                            </View>
                        </AnimatedPressable>
                    </View>

                    {/* Grid Row 2 */}
                    <View style={styles.gridRow}>
                        <AnimatedPressable
                            style={[styles.gridActionCard, { backgroundColor: '#EAF2FF' }]}
                            onPress={() => router.push('/field-sales')}
                        >
                            <View style={styles.centeredCardContent}>
                                <View style={[styles.actionIconBadge, { backgroundColor: '#5B8DEF' }]}>
                                    <MapPin size={18} color="#FFFFFF" />
                                </View>
                                <View style={styles.actionTextFlex}>
                                    <Text style={styles.actionTitle} numberOfLines={1}>Field Sales</Text>
                                    <Text style={styles.actionSub} numberOfLines={1}>Beat Route</Text>
                                </View>
                            </View>
                        </AnimatedPressable>

                        {canSeeSales && (
                            <AnimatedPressable
                                style={[styles.gridActionCard, { backgroundColor: '#F0ECFA' }]}
                                onPress={() => router.push('/reports')}
                            >
                                <View style={styles.centeredCardContent}>
                                    <View style={[styles.actionIconBadge, { backgroundColor: '#7B6FE0' }]}>
                                        <BarChart2 size={18} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.actionTextFlex}>
                                        <Text style={styles.actionTitle} numberOfLines={1}>Reports</Text>
                                        <Text style={styles.actionSub} numberOfLines={1}>Insights</Text>
                                    </View>
                                </View>
                            </AnimatedPressable>
                        )}
                    </View>
                </FadeInDown>

                {loading && metrics.totalStock === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* 3. Redesigned Business Overview Master Card */}
                        <FadeInDown delay={160} style={styles.section}>
                            <View style={styles.overviewMasterCard}>
                                <View style={styles.overviewHeaderRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={16} color="#2D3E32" />
                                        <Text style={styles.overviewTitle}>Business Overview</Text>
                                    </View>
                                    <Text style={styles.overviewDots}>•••</Text>
                                </View>

                                {/* Overview Row 1 */}
                                <View style={styles.gridRow}>
                                    {canSeeSales && (
                                        <AnimatedPressable
                                            style={styles.overviewTileCard}
                                            onPress={() => router.push('/sales')}
                                        >
                                            <View style={styles.overviewTileInner}>
                                                <View style={styles.tileHeaderRow}>
                                                    <View style={[styles.tileIconCircle, { backgroundColor: '#DFF3E3' }]}>
                                                        <ShoppingBag size={16} color="#2FAE55" />
                                                    </View>
                                                    <View style={styles.badgeSuccess}>
                                                        <TrendingUp size={10} color="#2FAE55" />
                                                        <Text style={styles.badgeSuccessText}>12.5%</Text>
                                                    </View>
                                                </View>
                                                <View>
                                                    <Text style={styles.tileLabel} numberOfLines={1}>Total Sales</Text>
                                                    <Text style={styles.tileValue} numberOfLines={1}>{formatCurrency(metrics.todayRevenue || 54320)}</Text>
                                                </View>
                                            </View>
                                        </AnimatedPressable>
                                    )}

                                    <AnimatedPressable
                                        style={styles.overviewTileCard}
                                        onPress={() => router.push('/purchases')}
                                    >
                                        <View style={styles.overviewTileInner}>
                                            <View style={styles.tileHeaderRow}>
                                                <View style={[styles.tileIconCircle, { backgroundColor: '#FBE1DE' }]}>
                                                    <Box size={16} color="#E5493F" />
                                                </View>
                                                <View style={styles.badgeDanger}>
                                                    <TrendingDown size={10} color="#E5493F" />
                                                    <Text style={styles.badgeDangerText}>5.4%</Text>
                                                </View>
                                            </View>
                                            <View>
                                                <Text style={styles.tileLabel} numberOfLines={1}>Total Purchase</Text>
                                                <Text style={styles.tileValue} numberOfLines={1}>{formatCurrency(28760)}</Text>
                                            </View>
                                        </View>
                                    </AnimatedPressable>
                                </View>

                                {/* Overview Row 2 */}
                                <View style={styles.gridRow}>
                                    {canSeeSales && (
                                        <AnimatedPressable
                                            style={styles.overviewTileCard}
                                            onPress={() => router.push('/sales')}
                                        >
                                            <View style={styles.overviewTileInner}>
                                                <View style={styles.tileHeaderRow}>
                                                    <View style={[styles.tileIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                                        <Clock size={16} color="#F2A93B" />
                                                    </View>
                                                </View>
                                                <View>
                                                    <Text style={styles.tileLabel} numberOfLines={1}>Pending Credit</Text>
                                                    <Text style={styles.tileValue} numberOfLines={1}>{formatCurrency(metrics.pendingCredit || 16200)}</Text>
                                                </View>
                                            </View>
                                        </AnimatedPressable>
                                    )}

                                    <AnimatedPressable
                                        style={styles.overviewTileCard}
                                        onPress={() => router.push('/stock')}
                                    >
                                        <View style={styles.overviewTileInner}>
                                            <View style={styles.tileHeaderRow}>
                                                <View style={[styles.tileIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                                    <Box size={16} color="#5BC27A" />
                                                </View>
                                            </View>
                                            <View>
                                                <Text style={styles.tileLabel} numberOfLines={1}>Stock Available</Text>
                                                <Text style={styles.tileValue} numberOfLines={1}>{metrics.totalStock.toLocaleString('en-IN')} kg</Text>
                                            </View>
                                        </View>
                                    </AnimatedPressable>
                                </View>
                            </View>
                        </FadeInDown>

                        {/* 4. Business Operations Shortcuts */}
                        <FadeInDown delay={230} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitleHeader}>Business Operations</Text>
                                <AnimatedPressable onPress={() => router.push('/(tabs)/menu')}>
                                    <Text style={styles.seeAllText}>All Modules →</Text>
                                </AnimatedPressable>
                            </View>

                            <StaggerContainer stagger={50} delay={260}>
                                <View style={styles.modulesGrid}>
                                    <AnimatedPressable
                                        style={styles.moduleListItem}
                                        onPress={() => router.push('/customers')}
                                    >
                                        <View style={[styles.moduleIconBox, { backgroundColor: '#EAF2FF' }]}>
                                            <Users size={18} color="#5B8DEF" />
                                        </View>
                                        <View style={styles.moduleTextFlex}>
                                            <Text style={styles.moduleTitle}>Customers</Text>
                                            <Text style={styles.moduleSub}>Directory & Balances</Text>
                                        </View>
                                        <ChevronRight size={18} color="#B0B0B0" />
                                    </AnimatedPressable>

                                    <AnimatedPressable
                                        style={styles.moduleListItem}
                                        onPress={() => router.push('/suppliers')}
                                    >
                                        <View style={[styles.moduleIconBox, { backgroundColor: '#FBE1DE' }]}>
                                            <Truck size={18} color="#F0574E" />
                                        </View>
                                        <View style={styles.moduleTextFlex}>
                                            <Text style={styles.moduleTitle}>Suppliers</Text>
                                            <Text style={styles.moduleSub}>Vendors & Invoices</Text>
                                        </View>
                                        <ChevronRight size={18} color="#B0B0B0" />
                                    </AnimatedPressable>

                                    <AnimatedPressable
                                        style={styles.moduleListItem}
                                        onPress={() => router.push('/invoices')}
                                    >
                                        <View style={[styles.moduleIconBox, { backgroundColor: '#F0ECFA' }]}>
                                            <Receipt size={18} color="#8B7FD6" />
                                        </View>
                                        <View style={styles.moduleTextFlex}>
                                            <Text style={styles.moduleTitle}>Invoices</Text>
                                            <Text style={styles.moduleSub}>Billing & Receipts</Text>
                                        </View>
                                        <ChevronRight size={18} color="#B0B0B0" />
                                    </AnimatedPressable>

                                    <AnimatedPressable
                                        style={styles.moduleListItem}
                                        onPress={() => router.push('/(tabs)/ledger')}
                                    >
                                        <View style={[styles.moduleIconBox, { backgroundColor: '#E8F5E9' }]}>
                                            <BookOpen size={18} color="#5BC27A" />
                                        </View>
                                        <View style={styles.moduleTextFlex}>
                                            <Text style={styles.moduleTitle}>Ledgers</Text>
                                            <Text style={styles.moduleSub}>Financial Accounts</Text>
                                        </View>
                                        <ChevronRight size={18} color="#B0B0B0" />
                                    </AnimatedPressable>
                                </View>
                            </StaggerContainer>
                        </FadeInDown>
                    </>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        padding: 16,
        paddingTop: 10,
        paddingBottom: 80,
    },
    section: {
        marginBottom: 18,
    },
    sectionTitleHeader: {
        fontSize: 17,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    seeAllText: {
        fontSize: 13,
        color: '#5B8DEF',
        fontFamily: 'Urbanist_700Bold',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    gridActionCard: {
        flex: 1,
        minWidth: 0,
        borderRadius: 16,
        padding: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    centeredCardContent: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextFlex: {
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
    },
    actionTitle: {
        fontSize: 13,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    actionSub: {
        fontSize: 10,
        fontFamily: 'Urbanist_500Medium',
        color: '#707070',
        textAlign: 'center',
    },
    overviewMasterCard: {
        backgroundColor: '#DCE6DB',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    overviewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    overviewTitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A291E',
    },
    overviewDots: {
        fontSize: 16,
        color: '#5C7362',
        fontWeight: 'bold',
    },
    overviewTileCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    overviewTileInner: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: 80,
    },
    tileHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 32,
        marginBottom: 8,
    },
    tileIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileLabel: {
        fontSize: 11,
        fontFamily: 'Urbanist_500Medium',
        color: '#8A8A8A',
        marginBottom: 2,
    },
    tileValue: {
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
    },
    badgeSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#DFF3E3',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
    },
    badgeSuccessText: {
        fontSize: 9,
        fontFamily: 'Urbanist_700Bold',
        color: '#2FAE55',
    },
    badgeDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#FBE1DE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
    },
    badgeDangerText: {
        fontSize: 9,
        fontFamily: 'Urbanist_700Bold',
        color: '#E5493F',
    },
    modulesGrid: {
        gap: 8,
    },
    moduleListItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    moduleIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    moduleTextFlex: {
        flex: 1,
    },
    moduleTitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        marginBottom: 1,
    },
    moduleSub: {
        fontSize: 11,
        fontFamily: 'Urbanist_500Medium',
        color: '#8A8A8A',
    }
});

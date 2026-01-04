import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { MetricCard } from '../../src/components/MetricCard';
import { QuickAction } from '../../src/components/QuickAction';
import { Box, CircleDollarSign, Clock, TrendingUp, Search, Bell, ArrowRight } from 'lucide-react-native';
import { DashboardHeader } from '../../src/components/DashboardHeader';

export default function Home() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header Section */}
                <DashboardHeader
                    date="Sunday, Jan 04"
                    greeting="Good Morning, Ali"
                    subtext="Here's what's happening with your rice stock today."
                />

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <MetricCard
                        title="Stock Available"
                        value="1,250 kg"
                        icon={Box}
                        iconBgColor={Colors.accent}
                        iconColor={Colors.primary}
                    />
                    <MetricCard
                        title="Rice Sold Today"
                        value="320 kg"
                        icon={TrendingUp}
                        iconBgColor={Colors.accent}
                        iconColor={Colors.primary}
                    />
                    <MetricCard
                        title="Total Revenue"
                        value="₹4,280"
                        icon={CircleDollarSign}
                        trend={{ value: '+8%', positive: true }}
                        iconBgColor={Colors.accent}
                        iconColor={Colors.primary}
                    />
                    <MetricCard
                        title="Pending"
                        value="₹1,150"
                        icon={Clock}
                        trend={{ value: '-2%', positive: false }}
                        iconBgColor='#F4EBE8'
                        iconColor='#8D7B75'
                    />
                </View>

                {/* Recent Sales Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Sales</Text>
                        <View style={styles.seeAll}>
                            <Text style={styles.seeAllText}>View All</Text>
                            <ArrowRight size={16} color={Colors.textSecondary} />
                        </View>
                    </View>
                    <View style={styles.salesRow}>
                        <View style={[styles.avatar, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.avatarText, { color: Colors.success }]}>BM</Text>
                        </View>
                        <View style={styles.salesInfo}>
                            <Text style={styles.salesTitle}>Basmati Premium Rice</Text>
                            <Text style={styles.salesSub}>Order #20241 · Today, 10:31 AM</Text>
                        </View>
                        <View style={styles.salesAmount}>
                            <Text style={styles.amountText}>₹120.00</Text>
                            <Text style={styles.statusText}>Paid</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Quick Actions</Text>
                    <View style={styles.actionsRow}>
                        <QuickAction
                            title="New Sale"
                            icon={CircleDollarSign}
                            variant="primary"
                            onPress={() => router.push('/sales')}
                        />
                        <View style={{ width: 16 }} />
                        <QuickAction
                            title="Add Stock"
                            icon={Box}
                            variant="secondary"
                            // Note: router.push('/stock') works even if it's a tab, expo-router handles it
                            onPress={() => router.push('/stock')}
                        />
                    </View>
                </View>

                {/* Low Stock Alert */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Low Stock Alert</Text>
                    <View style={styles.alertCard}>
                        <View style={styles.alertRow}>
                            <Text style={styles.alertItem}>Jasmine Rice 5kg</Text>
                            <View style={styles.alertBadge}>
                                <Text style={styles.alertBadgeText}>Only 12 left</Text>
                            </View>
                        </View>
                        <View style={[styles.alertRow, { marginTop: 12 }]}>
                            <Text style={styles.alertItem}>Brown Rice 1kg</Text>
                            <View style={styles.alertBadge}>
                                <Text style={styles.alertBadgeText}>Only 8 left</Text>
                            </View>
                        </View>
                        <View style={styles.checkInventoryBtn}>
                            <Text style={styles.checkInventoryText}>Check Inventory</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
    },
    header: {
        marginBottom: 24,
        position: 'relative',
        paddingVertical: 10,
    },
    headerActions: {
        position: 'absolute',
        right: 0,
        top: 0,
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    date: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_500Medium',
        marginBottom: 4,
    },
    greeting: {
        fontSize: 24,
        color: Colors.text,
        fontFamily: 'Urbanist_700Bold',
        marginBottom: 8,
    },
    subtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_400Regular',
        maxWidth: '70%',
        lineHeight: 20,
    },
    abstractBg: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 150,
        height: 150,
        backgroundColor: '#E6EFE9',
        borderRadius: 75,
        opacity: 0.5,
        zIndex: -1,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    seeAll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_600SemiBold',
    },
    salesRow: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
    },
    salesInfo: {
        flex: 1,
    },
    salesTitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    salesSub: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    salesAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.success,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    alertCard: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 20,
        padding: 16,
    },
    alertRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 12,
        borderRadius: 12,
    },
    alertItem: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
    },
    alertBadge: {
        backgroundColor: '#FFF0EB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    alertBadgeText: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: '#FF8A65',
    },
    checkInventoryBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    checkInventoryText: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
    }
});

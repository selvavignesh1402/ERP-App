import React from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import {
    CalendarDays, MapPin, Store, ShoppingCart, BarChart2, ClipboardList, Map
} from 'lucide-react-native';
import { IndianRupee } from '../../src/components/IndianRupee';
import { FadeInDown, StaggerContainer } from '../../src/components/Anime';
import { useCurrentRole } from '../../src/hooks/useCurrentRole';

const SALES_MODULES = [
    {
        id: 'today-route',
        title: "Today's Route",
        subtitle: 'Your scheduled shops',
        icon: MapPin,
        color: '#E8F5E9',
        iconColor: Colors.primary,
        route: '/field-sales/today-route',
        roles: ['SALES'],
    },
    {
        id: 'beat-plan',
        title: 'Beat Plan',
        subtitle: 'Weekly visit schedule',
        icon: CalendarDays,
        color: '#E3F2FD',
        iconColor: '#1E88E5',
        route: '/field-sales/beat-plan',
        roles: ['ADMIN', 'MANAGER'],
    },
    {
        id: 'manager-dashboard',
        title: 'Team Dashboard',
        subtitle: 'Live salesperson progress',
        icon: BarChart2,
        color: '#F3E5F5',
        iconColor: '#8E24AA',
        route: '/field-sales/manager-dashboard',
        roles: ['ADMIN', 'MANAGER'],
    },
    {
        id: 'customers',
        title: 'Customers',
        subtitle: 'All retail shops',
        icon: Store,
        color: '#E0F2F1',
        iconColor: '#00897B',
        route: '/customers',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
    },
    {
        id: 'orders',
        title: 'Orders',
        subtitle: 'Field sales orders',
        icon: ShoppingCart,
        color: '#FFF3E0',
        iconColor: '#FB8C00',
        route: '/sales',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
    },
    {
        id: 'collections',
        title: 'Collections',
        subtitle: 'Payments collected',
        icon: IndianRupee,
        color: '#FCE4EC',
        iconColor: '#D81B60',
        route: '/sales',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
    },
    {
        id: 'visit-history',
        title: 'Visit History',
        subtitle: 'All check-in records',
        icon: ClipboardList,
        color: '#E8EAF6',
        iconColor: '#3F51B5',
        route: '/field-sales/today-route',
        roles: ['ADMIN', 'MANAGER', 'SALES'],
    },
    {
        id: 'performance',
        title: 'Performance',
        subtitle: 'Analytics & insights',
        icon: BarChart2,
        color: '#ECEFF1',
        iconColor: '#546E7A',
        route: '/reports',
        roles: ['ADMIN', 'MANAGER'],
    },
];

export default function FieldSalesHub() {
    const router = useRouter();
    const { role } = useCurrentRole();

    const visibleModules = SALES_MODULES.filter(m => m.roles.includes(role ?? ''));

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <FadeInDown delay={0}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Field Sales</Text>
                        <Text style={styles.headerSub}>Manage your routes, visits & collections</Text>
                    </View>
                </FadeInDown>

                <StaggerContainer stagger={60} delay={100}>
                    <View style={styles.grid}>
                        {visibleModules.map(mod => (
                            <TouchableOpacity
                                key={mod.id}
                                style={styles.card}
                                onPress={() => router.push(mod.route as any)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: mod.color }]}>
                                    <mod.icon size={26} color={mod.iconColor} />
                                </View>
                                <Text style={styles.cardTitle}>{mod.title}</Text>
                                <Text style={styles.cardSub}>{mod.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </StaggerContainer>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    card: {
        width: '47%',
        backgroundColor: Colors.card,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        lineHeight: 16,
    },
});

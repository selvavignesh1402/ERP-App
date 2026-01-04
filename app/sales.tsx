import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Search, Filter, Calendar, Download, Plus } from 'lucide-react-native';

// Mock Data
const SALES_DATA = [
    { id: 'INV-001', customer: 'Ali Market', date: 'Jan 04, 2024', summary: 'Basmati Rice (500kg)', amount: '$1,250.00', status: 'Paid' },
    { id: 'INV-002', customer: 'Fresh Foods', date: 'Jan 04, 2024', summary: 'Jasmine Rice (200kg)', amount: '$480.00', status: 'Pending' },
    { id: 'INV-003', customer: 'City Restaurant', date: 'Jan 03, 2024', summary: 'Brown Rice (50kg)', amount: '$150.00', status: 'Paid' },
    { id: 'INV-004', customer: 'Local Shop', date: 'Jan 03, 2024', summary: 'Sticky Rice (100kg)', amount: '$300.00', status: 'Paid' },
    { id: 'INV-005', customer: 'Wedding Hall', date: 'Jan 02, 2024', summary: 'Basmati Premium (1000kg)', amount: '$2,800.00', status: 'Overdue' },
];

export default function SalesScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Sales & Billing</Text>
                    <Text style={styles.subtitle}>Track your daily sales and manage invoices.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Actions Row */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.exportBtn}>
                        <Download size={20} color={Colors.textSecondary} />
                        <Text style={styles.exportText}>Export</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.newInvoiceBtn}>
                        <Plus size={20} color={Colors.card} />
                        <Text style={styles.newInvoiceText}>New Invoice</Text>
                    </TouchableOpacity>
                </View>

                {/* Search & Filter */}
                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search invoices..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                    />
                </View>

                <View style={styles.filtersRow}>
                    <TouchableOpacity style={styles.filterChip}>
                        <Calendar size={16} color={Colors.textSecondary} />
                        <Text style={styles.filterText}>Date Range</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterChip}>
                        <Filter size={16} color={Colors.textSecondary} />
                        <Text style={styles.filterText}>Status</Text>
                    </TouchableOpacity>
                </View>

                {/* Sales List Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, { width: 60 }]}>INV ID</Text>
                    <Text style={[styles.headerText, { flex: 1 }]}>Customer</Text>
                    <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
                    <Text style={[styles.headerText, { width: 70, textAlign: 'center' }]}>Status</Text>
                </View>

                {/* Sales List */}
                <FlatList
                    data={SALES_DATA}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            <View style={{ width: 60 }}>
                                <Text style={styles.invId}>{item.id}</Text>
                                <Text style={styles.date}>{item.date}</Text>
                            </View>
                            <View style={{ flex: 1, paddingHorizontal: 4 }}>
                                <Text style={styles.customer}>{item.customer}</Text>
                                <Text style={styles.summary} numberOfLines={1}>{item.summary}</Text>
                            </View>
                            <Text style={[styles.amount, { width: 80 }]}>{item.amount}</Text>
                            <View style={[styles.statusBadge, { width: 70, backgroundColor: getStatusColor(item.status).bg }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status).text }]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid': return { bg: '#E8F5E9', text: Colors.success };
        case 'Pending': return { bg: '#FFF8E1', text: '#FFA000' }; // Amber
        case 'Overdue': return { bg: '#FFEBEE', text: Colors.danger };
        default: return { bg: Colors.background, text: Colors.textSecondary };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.card,
    },
    exportText: {
        marginLeft: 8,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    newInvoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: Colors.primary,
    },
    newInvoiceText: {
        marginLeft: 8,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.card,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    filtersRow: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 6,
    },
    filterText: {
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        fontSize: 13,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    listContent: {
        paddingBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    invId: {
        fontSize: 13,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
    },
    date: {
        fontSize: 11,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    customer: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
    },
    summary: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        textAlign: 'right',
    },
    statusBadge: {
        paddingVertical: 4,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
    },
});

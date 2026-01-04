import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Search, Filter, Calendar, Plus, ShoppingCart, User, Box } from 'lucide-react-native';

// Mock Data
const SALES_DATA = [
    { id: 'INV-001', customer: 'Ali Market', date: 'Jan 04, 2024', summary: 'Basmati Rice (500kg)', amount: '₹1,250.00', status: 'Paid' },
    { id: 'INV-002', customer: 'Fresh Foods', date: 'Jan 04, 2024', summary: 'Jasmine Rice (200kg)', amount: '₹480.00', status: 'Pending' },
    { id: 'INV-003', customer: 'City Restaurant', date: 'Jan 03, 2024', summary: 'Brown Rice (50kg)', amount: '₹150.00', status: 'Paid' },
    { id: 'INV-004', customer: 'Local Shop', date: 'Jan 03, 2024', summary: 'Sticky Rice (100kg)', amount: '₹300.00', status: 'Paid' },
    { id: 'INV-005', customer: 'Wedding Hall', date: 'Jan 02, 2024', summary: 'Basmati Premium (1000kg)', amount: '₹2,800.00', status: 'Overdue' },
];

export default function SalesScreen() {
    const [invoices, setInvoices] = useState(SALES_DATA);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [newCustomer, setNewCustomer] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('04-01-2024'); // Default or current date
    const [newItemSummary, setNewItemSummary] = useState('');
    const [newAmount, setNewAmount] = useState('');

    const [sortOption, setSortOption] = useState<'date' | 'amountDesc' | 'status'>('date');

    const handleAddInvoice = () => {
        // In real app we would check for items logic
        if (newCustomer) {
            const newInvoice = {
                id: `INV-00${invoices.length + 1}`,
                customer: newCustomer,
                date: invoiceDate,
                summary: 'Mixed Rice Order', // Placeholder logic
                amount: `₹${newAmount || '0.00'}`,
                status: 'Pending',
            };
            setInvoices([newInvoice, ...invoices]);
            setModalVisible(false);
            setNewCustomer('');
            setNewAmount('');
        }
    };

    const getSortedInvoices = () => {
        return [...invoices].sort((a, b) => {
            if (sortOption === 'amountDesc') {
                return parseFloat(b.amount.replace('₹', '').replace(',', '')) - parseFloat(a.amount.replace('₹', '').replace(',', ''));
            }
            if (sortOption === 'status') return a.status.localeCompare(b.status);
            // Default date sort (mock logic since dates are strings)
            return 0;
        });
    };

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
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.exportBtn} onPress={() => {
                        if (sortOption === 'date') setSortOption('amountDesc');
                        else if (sortOption === 'amountDesc') setSortOption('status');
                        else setSortOption('date');
                    }}>
                        <Filter size={20} color={Colors.textSecondary} />
                        <Text style={styles.exportText}>
                            {sortOption === 'date' ? 'Date' : sortOption === 'amountDesc' ? 'Amount' : 'Status'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.newInvoiceBtn} onPress={() => setModalVisible(true)}>
                        <Plus size={20} color={Colors.card} />
                        <Text style={styles.newInvoiceText}>New Invoice</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search invoices..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                    />
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, { width: 60 }]}>INV ID</Text>
                    <Text style={[styles.headerText, { flex: 1 }]}>Customer</Text>
                    <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
                    <Text style={[styles.headerText, { width: 70, textAlign: 'center' }]}>Status</Text>
                </View>

                <FlatList
                    data={getSortedInvoices()}
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

                            <TouchableOpacity
                                style={[styles.statusBadge, { width: 70, backgroundColor: getStatusColor(item.status).bg }]}
                                onPress={() => {
                                    const nextStatus = item.status === 'Pending' ? 'Paid' : 'Pending';
                                    const updated = invoices.map(inv =>
                                        inv.id === item.id ? { ...inv, status: nextStatus } : inv
                                    );
                                    setInvoices(updated);
                                }}
                            >
                                <Text style={[styles.statusText, { color: getStatusColor(item.status).text }]}>
                                    {item.status}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {modalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                                <ShoppingCart size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Create New Invoice</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeText}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>Fill in the details to generate a new sales invoice.</Text>

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>CUSTOMER</Text>
                                <View style={styles.searchResultContainer}>
                                    <User size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        placeholder="Search customer"
                                        style={styles.inputNoBorder}
                                        value={newCustomer}
                                        onChangeText={setNewCustomer}
                                    />
                                </View>
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>INVOICE DATE</Text>
                                <TouchableOpacity
                                    style={styles.searchResultContainer}
                                    onPress={() => {
                                        // Simple Mock Date Picker
                                        const today = new Date();
                                        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                                        setInvoiceDate(dateStr);
                                    }}
                                >
                                    <Text style={styles.dateText}>{invoiceDate}</Text>
                                    <Calendar size={18} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.label}>AMOUNT (₹)</Text>
                            <View style={styles.searchResultContainer}>
                                <Text style={{ fontFamily: 'Urbanist_600SemiBold', marginRight: 4, color: Colors.text }}>₹</Text>
                                <TextInput
                                    placeholder="0.00"
                                    style={styles.inputNoBorder}
                                    value={newAmount}
                                    onChangeText={setNewAmount}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.label}>ITEMS LIST</Text>
                            <View style={styles.emptyItemsBox}>
                                <Box size={32} color={Colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                                <Text style={styles.emptyItemsText}>No items added yet</Text>
                                <TouchableOpacity style={styles.addRiceBtn}>
                                    <Text style={styles.addRiceText}>+ Add Rice Type</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddInvoice} style={styles.confirmBtn}>
                                <Text style={styles.confirmText}>Generate Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid': return { bg: '#E8F5E9', text: Colors.success };
        case 'Pending': return { bg: '#FFF8E1', text: '#FFA000' };
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
    modalOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker
        justifyContent: 'center',
        padding: 20,
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        flex: 1,
    },
    closeBtn: {
        padding: 4,
    },
    closeText: {
        fontSize: 24,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_400Regular',
        marginBottom: 24,
        marginLeft: 52,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    formGroupHalf: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    searchResultContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    inputNoBorder: {
        flex: 1,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        padding: 0,
    },
    dateText: {
        fontFamily: 'Urbanist_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    emptyItemsBox: {
        borderWidth: 1,
        borderColor: '#EFEFEF',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    emptyItemsText: {
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    addRiceBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    addRiceText: {
        fontFamily: 'Urbanist_600SemiBold',
        color: '#769F83',
        fontSize: 13,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
    },
    cancelBtn: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    cancelText: {
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
        fontSize: 16,
    },
    confirmBtn: {
        backgroundColor: '#769F83',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    confirmText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    }
});

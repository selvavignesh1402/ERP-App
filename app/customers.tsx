import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { CustomerCard } from '../src/components/CustomerCard';
import { Search, Plus } from 'lucide-react-native';
import api from '../src/services/api';

export default function CustomersScreen() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

    // Form inputs state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [gst, setGst] = useState('');
    const [creditLimit, setCreditLimit] = useState('20000');

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/customers');
            setCustomers(response.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            Alert.alert('Error', 'Failed to fetch customers list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const openAddModal = () => {
        setEditingCustomer(null);
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setGst('');
        setCreditLimit('20000');
        setModalVisible(true);
    };

    const openEditModal = (customer: any) => {
        setEditingCustomer(customer);
        setName(customer.customerName || '');
        setPhone(customer.phone || '');
        setEmail(customer.email || '');
        setAddress(customer.address || '');
        setGst(customer.gstNumber || '');
        setCreditLimit(customer.creditLimit ? String(customer.creditLimit) : '0');
        setModalVisible(true);
    };

    const handleAddCustomer = async () => {
        if (!name || !phone) {
            Alert.alert('Error', 'Please enter at least a name and a phone number');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                customerName: name,
                phone: phone,
                email: email,
                address: address,
                gstNumber: gst,
                creditLimit: parseFloat(creditLimit) || 0.0
            };
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, payload);
                Alert.alert('Success', 'Customer updated successfully');
            } else {
                await api.post('/customers', payload);
                Alert.alert('Success', 'Customer added successfully');
            }
            setModalVisible(false);
            setEditingCustomer(null);
            setName('');
            setPhone('');
            setEmail('');
            setAddress('');
            setGst('');
            setCreditLimit('20000');
            fetchCustomers();
        } catch (error: any) {
            console.error('Error saving customer:', error);
            const msg = error.response?.data?.message || 'Failed to save customer';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: number) => {
        try {
            await api.put(`/customers/${id}/status`);
            fetchCustomers();
        } catch (error: any) {
            console.error('Error toggling customer status:', error);
            Alert.alert('Error', 'Failed to toggle status');
        }
    };

    const getFilteredCustomers = () => {
        if (!searchQuery) return customers;
        return customers.filter((item: any) =>
            item.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.phone?.includes(searchQuery)
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Customer Ledger</Text>
                    <Text style={styles.subtitle}>Track clients and credit balance accounts.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Add Customer Button */}
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Plus size={20} color={Colors.card} />
                    <Text style={styles.addButtonText}>Add Customer</Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search customers..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Customers List */}
                {loading && customers.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={getFilteredCustomers()}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <CustomerCard
                                name={item.customerName}
                                phone={item.phone}
                                creditLimit={item.creditLimit || 0}
                                creditBalance={item.creditBalance || 0}
                                status={item.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                                onPressStatusToggle={() => handleToggleStatus(item.id)}
                                onEditPress={() => openEditModal(item)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {modalVisible && (
                <Modal animationType="slide" transparent={true} visible={modalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 350, marginVertical: 12 }}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>CUSTOMER NAME</Text>
                                    <TextInput
                                        placeholder="e.g. Ramesh Traders"
                                        style={styles.input}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>PHONE NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. 9876543210"
                                        style={styles.input}
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>CREDIT LIMIT (₹)</Text>
                                    <TextInput
                                        placeholder="e.g. 50000"
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={creditLimit}
                                        onChangeText={setCreditLimit}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                                    <TextInput
                                        placeholder="e.g. ramesh@stores.in"
                                        style={styles.input}
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>GST NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. 33CCCCC2222C3Z3"
                                        style={styles.input}
                                        value={gst}
                                        onChangeText={setGst}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>STREET ADDRESS</Text>
                                    <TextInput
                                        placeholder="Enter full billing address"
                                        style={styles.input}
                                        value={address}
                                        onChangeText={setAddress}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddCustomer} style={styles.saveBtn}>
                                    <Text style={styles.saveText}>{editingCustomer ? 'Update' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
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
        fontSize: 24,
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
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginBottom: 20,
    },
    addButtonText: {
        color: Colors.card,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
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
    listContent: {
        paddingBottom: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    closeText: {
        fontSize: 24,
        color: Colors.textSecondary,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        fontFamily: 'Urbanist_500Medium',
        fontSize: 16,
        backgroundColor: '#FAFAFA',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
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
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
    },
    saveText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    },
});

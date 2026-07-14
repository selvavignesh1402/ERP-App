import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { SupplierCard } from '../src/components/SupplierCard';
import { Search, Plus } from 'lucide-react-native';
import api from '../src/services/api';

export default function SuppliersScreen() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    // Form inputs state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [gst, setGst] = useState('');
    const [category, setCategory] = useState('');

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/suppliers');
            setSuppliers(response.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            Alert.alert('Error', 'Failed to fetch suppliers list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleAddSupplier = async () => {
        if (!name || !phone) {
            Alert.alert('Error', 'Please enter at least a name and a phone number');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                supplierName: name,
                phone: phone,
                email: email,
                address: address,
                gstNumber: gst,
                rating: 5.0,
                category: category || 'General'
            };
            await api.post('/suppliers', payload);
            Alert.alert('Success', 'Supplier added successfully');
            setModalVisible(false);
            setName('');
            setPhone('');
            setEmail('');
            setAddress('');
            setGst('');
            setCategory('');
            fetchSuppliers();
        } catch (error: any) {
            console.error('Error adding supplier:', error);
            const msg = error.response?.data?.message || 'Failed to add supplier';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredSuppliers = () => {
        if (!searchQuery) return suppliers;
        return suppliers.filter((item: any) =>
            item.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.phone?.includes(searchQuery) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Supplier Management</Text>
                    <Text style={styles.subtitle}>Track your sources and purchase history.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Add Supplier Button */}
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus size={20} color={Colors.card} />
                    <Text style={styles.addButtonText}>Add Supplier</Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search suppliers..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Suppliers List */}
                {loading && suppliers.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={getFilteredSuppliers()}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <SupplierCard
                                name={item.supplierName}
                                rating={item.rating || 5.0}
                                category={item.category || 'General'}
                                totalOrders={0}
                                status={item.status === 'INACTIVE' ? 'Inactive' : 'Active'}
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
                                <Text style={styles.modalTitle}>Add Supplier</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 350, marginVertical: 12 }}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>SUPPLIER NAME</Text>
                                    <TextInput
                                        placeholder="e.g. Rice King Ltd"
                                        style={styles.input}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>PHONE NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. +91 9988776655"
                                        style={styles.input}
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                                    <TextInput
                                        placeholder="e.g. contact@riceking.com"
                                        style={styles.input}
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>GST NUMBER</Text>
                                    <TextInput
                                        placeholder="e.g. 07AAAAA1111A1Z1"
                                        style={styles.input}
                                        value={gst}
                                        onChangeText={setGst}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>CATEGORY</Text>
                                    <TextInput
                                        placeholder="e.g. Basmati, Long Grain"
                                        style={styles.input}
                                        value={category}
                                        onChangeText={setCategory}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>STREET ADDRESS</Text>
                                    <TextInput
                                        placeholder="Enter full physical address"
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
                                <TouchableOpacity onPress={handleAddSupplier} style={styles.saveBtn}>
                                    <Text style={styles.saveText}>Save</Text>
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
    // Modal styles
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

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { SupplierCard } from '../src/components/SupplierCard';
import { Search, Plus } from 'lucide-react-native';

const SUPPLIERS_DATA = [
    { id: '1', name: 'Organic Farms Ltd', rating: 4.8, category: 'Basmati', totalOrders: 24, status: 'Active' as const },
    { id: '2', name: 'Punjab Rice Mills', rating: 4.5, category: 'Long Grain', totalOrders: 24, status: 'Active' as const },
    { id: '3', name: 'Eco Grain Co.', rating: 4.9, category: 'Brown Rice', totalOrders: 18, status: 'Active' as const },
];

export default function SuppliersScreen() {
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
                <TouchableOpacity style={styles.addButton}>
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
                    />
                </View>

                {/* Suppliers List */}
                <FlatList
                    data={SUPPLIERS_DATA}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SupplierCard
                            name={item.name}
                            rating={item.rating}
                            category={item.category}
                            totalOrders={item.totalOrders}
                            status={item.status}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
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
        fontSize: 24, // Slightly smaller to fit "Supplier Management"
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
});

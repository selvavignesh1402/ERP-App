import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { InventoryCard } from '../src/components/InventoryCard';
import { Plus, Search, Filter } from 'lucide-react-native';

const CATEGORIES = ['All Stock', 'Basmati', 'Jasmine', 'Brown', 'Sticky'];

// Mock data based on design
const INVENTORY_DATA = [
    { id: '1', name: 'Royal Basmati Premium', supplier: 'Organic Farms Ltd.', price: 45, stock: 140 },
    { id: '2', name: 'Jasmine Rice Grade A', supplier: 'Asia Import Co.', price: 32, stock: 85 },
    { id: '3', name: 'Organic Brown Rice', supplier: 'Eco Grain Co.', price: 28, stock: 45 },
    { id: '4', name: 'Sushi Rice Short Grain', supplier: 'Tokyo Rice Traders', price: 38, stock: 12 },
];

export default function StockScreen() {
    const [selectedCategory, setSelectedCategory] = useState('All Stock');

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Inventory</Text>
                    <Text style={styles.subtitle}>Manage your rice types, stocks and bags.</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Add New Button */}
                <TouchableOpacity style={styles.addButton}>
                    <Plus size={20} color={Colors.card} />
                    <Text style={styles.addButtonText}>Add New Item</Text>
                </TouchableOpacity>

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesContainer}
                    contentContainerStyle={styles.categoriesContent}
                >
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat && styles.categoryChipActive
                            ]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[
                                styles.categoryText,
                                selectedCategory === cat && styles.categoryTextActive
                            ]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search inventory by name, code or category"
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                    />
                    <Filter size={20} color={Colors.textSecondary} />
                </View>

                {/* Inventory Grid */}
                <FlatList
                    data={INVENTORY_DATA}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        // Using View to wrap purely for grid spacing if needed, but FlatList handles vertical well.
                        // Design shows large cards, maybe 1 per row or 2. Mockup looks like 1 large card.
                        <InventoryCard
                            name={item.name}
                            supplier={item.supplier}
                            price={item.price}
                            stock={item.stock}
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
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginBottom: 24,
    },
    addButtonText: {
        color: Colors.card,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        marginLeft: 8,
    },
    categoriesContainer: {
        marginBottom: 24,
        maxHeight: 40,
    },
    categoriesContent: {
        paddingRight: 20,
    },
    categoryChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: 10,
    },
    categoryChipActive: {
        backgroundColor: Colors.text, // Dark active state as per design
        borderColor: Colors.text,
    },
    categoryText: {
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    categoryTextActive: {
        color: Colors.card,
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

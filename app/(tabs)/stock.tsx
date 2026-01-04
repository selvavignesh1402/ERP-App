import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { InventoryCard } from '../../src/components/InventoryCard';
import { Plus, Search, Filter, Box, ScanLine as Barcode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const CATEGORIES = ['All Stock', 'Basmati', 'Jasmine', 'Brown', 'Sticky'];

// Mock data
const INVENTORY_DATA = [
    { id: '1', name: 'Royal Basmati Premium', supplier: 'Organic Farms Ltd.', price: 45, stock: 140 },
    { id: '2', name: 'Jasmine Rice Grade A', supplier: 'Asia Import Co.', price: 32, stock: 85 },
    { id: '3', name: 'Organic Brown Rice', supplier: 'Eco Grain Co.', price: 28, stock: 45 },
    { id: '4', name: 'Sushi Rice Short Grain', supplier: 'Tokyo Rice Traders', price: 38, stock: 12 },
];

export default function StockScreen() {
    const [items, setItems] = useState(INVENTORY_DATA);
    const [selectedCategory, setSelectedCategory] = useState('All Stock');
    const [modalVisible, setModalVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    // Form State
    const [newItemName, setNewItemName] = useState('');
    const [newItemBrand, setNewItemBrand] = useState('');
    const [newItemWeight, setNewItemWeight] = useState('');
    const [newItemStock, setNewItemStock] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    const [sortOption, setSortOption] = useState<'name' | 'stockAsc' | 'stockDesc'>('name');

    const handleAddItem = () => {
        if (newItemName && newItemBrand && newItemStock && newItemPrice) {
            const newItem = {
                id: Math.random().toString(),
                name: `${newItemBrand} ${newItemName}`,
                supplier: 'Local Supply', // could be a field later
                price: parseFloat(newItemPrice),
                stock: parseInt(newItemStock),
            };
            setItems([...items, newItem]);
            setModalVisible(false);
            setNewItemName('');
            setNewItemBrand('');
            setNewItemWeight('');
            setNewItemStock('');
            setNewItemPrice('');
        }
    };

    const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        setScannerVisible(false);
        setScanned(false);
        Alert.alert('Barcode Scanned', `Type: ${type}\nData: ${data}`);

        // Mock Population
        setNewItemBrand('Scanned Brand');
        setNewItemName('Scanned Rice Type');
    };

    if (!permission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 50 }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={{ padding: 20 }}>
                    <Text style={{ color: Colors.primary, textAlign: 'center' }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getSortedItems = () => {
        let filtered = items;
        if (selectedCategory !== 'All Stock') {
            // In a real app we would filter by category
        }

        return [...filtered].sort((a, b) => {
            if (sortOption === 'name') return a.name.localeCompare(b.name);
            if (sortOption === 'stockAsc') return a.stock - b.stock;
            if (sortOption === 'stockDesc') return b.stock - a.stock;
            return 0;
        });
    };

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
                <View style={styles.topActions}>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Plus size={20} color={Colors.card} />
                        <Text style={styles.addButtonText}>Add New Item</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.sortButton}
                        onPress={() => {
                            if (sortOption === 'name') setSortOption('stockDesc');
                            else if (sortOption === 'stockDesc') setSortOption('stockAsc');
                            else setSortOption('name');
                        }}
                    >
                        <Filter size={20} color={Colors.primary} />
                        <Text style={styles.sortText}>
                            {sortOption === 'name' ? 'Name' : sortOption === 'stockDesc' ? 'High Stock' : 'Low Stock'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.categoriesWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
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
                </View>

                <View style={styles.searchContainer}>
                    <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search inventory by name..."
                        placeholderTextColor={Colors.textSecondary}
                        style={styles.searchInput}
                    />
                </View>

                <FlatList
                    data={getSortedItems()}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <InventoryCard
                            name={item.name}
                            supplier={item.supplier}
                            price={item.price} // InventoryCard handles currency symbol or we update component
                            stock={item.stock}
                        />
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
                                <Box size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Add New Rice Stock</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeText}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>Enter the details for the new inventory item.</Text>

                        {/* Barcode Scanner Button */}
                        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
                            <Barcode size={20} color={Colors.primary} />
                            <Text style={styles.scanBtnText}>Scan Code</Text>
                        </TouchableOpacity>

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>RICE NAME</Text>
                                <TextInput
                                    placeholder="e.g. Basmati"
                                    style={styles.input}
                                    value={newItemName}
                                    onChangeText={setNewItemName}
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>BRAND</Text>
                                <TextInput
                                    placeholder="e.g. Royal"
                                    style={styles.input}
                                    value={newItemBrand}
                                    onChangeText={setNewItemBrand}
                                />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>BAG WEIGHT (KG)</Text>
                                <TextInput
                                    placeholder="25"
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={newItemWeight}
                                    onChangeText={setNewItemWeight}
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>STOCK (BAGS)</Text>
                                <TextInput
                                    placeholder="100"
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={newItemStock}
                                    onChangeText={setNewItemStock}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>UNIT PRICE (₹)</Text>
                            <TextInput
                                placeholder="45.00"
                                style={styles.input}
                                keyboardType="numeric"
                                value={newItemPrice}
                                onChangeText={setNewItemPrice}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddItem} style={styles.saveBtn}>
                                <Text style={styles.saveText}>Save Item</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {scannerVisible && (
                <View style={styles.fullScreenModal}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                        <View style={styles.scannerHeader}>
                            <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerCloseBtn}>
                                <Text style={styles.scannerCloseText}>Close</Text>
                            </TouchableOpacity>
                            <Text style={styles.scannerTitle}>Scan Barcode</Text>
                        </View>
                        <View style={styles.cameraContainer}>
                            <CameraView
                                style={styles.camera}
                                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                facing="back"
                            />
                            {/* Overlay */}
                            <View style={styles.scanOverlay}>
                                <View style={styles.scanFrame} />
                                <Text style={styles.scanInstruction}>Align code within frame</Text>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>
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
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addButton: {
        backgroundColor: '#1B2E28', // Darker green as per image
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    addButtonText: {
        color: '#E8F5E9',
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
        marginLeft: 8,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    sortText: {
        marginLeft: 6,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
    },
    categoriesWrapper: {
        marginBottom: 24,
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
        backgroundColor: Colors.text,
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
    modalOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        marginLeft: 52, // Align with title text
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    formGroup: {
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
    saveBtn: {
        backgroundColor: '#769F83', // Muted green from design
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
    },
    saveText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    },
    // Scanner Styles
    scanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 20,
        marginLeft: 0,
    },
    scanBtnText: {
        marginLeft: 8,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
        fontSize: 14,
    },
    fullScreenModal: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: '#000',
        zIndex: 100,
    },
    scannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    scannerCloseBtn: {
        padding: 8,
    },
    scannerCloseText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Urbanist_600SemiBold',
    },
    scannerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Urbanist_700Bold',
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        width: '100%',
        height: '100%',
    },
    scanOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanInstruction: {
        marginTop: 20,
        color: '#fff',
        fontFamily: 'Urbanist_500Medium',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
});

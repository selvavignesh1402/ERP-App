import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Card } from '../src/components/Card';
import { AlertTriangle, BarChart3, Activity, RefreshCw } from 'lucide-react-native';
import api from '../src/services/api';

export default function ReportsScreen() {
    const [activeTab, setActiveTab] = useState<'low' | 'sales' | 'movements'>('low');
    const [loading, setLoading] = useState(false);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [productPickerVisible, setProductPickerVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [history, setHistory] = useState<any>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);

    const fetchLowStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/low-stock');
            setLowStock(res.data || []);
        } catch (error) {
            Alert.alert('Error', 'Failed to load low stock');
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/movements');
            setMovements(res.data || []);
        } catch (error) {
            Alert.alert('Error', 'Failed to load stock movements');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data || []);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchLowStock();
    }, []);

    const loadHistory = async (product: any) => {
        setSelectedProduct(product);
        setProductPickerVisible(false);
        setHistoryLoading(true);
        setHistory(null);
        try {
            const res = await api.get(`/sales/product/${product.id}/history`);
            setHistory(res.data);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to load sales history';
            Alert.alert('Error', msg);
        } finally {
            setHistoryLoading(false);
        }
    };

    const switchTab = (tab: 'low' | 'sales' | 'movements') => {
        setActiveTab(tab);
        if (tab === 'low') fetchLowStock();
        if (tab === 'movements') fetchMovements();
    };

    const movementColor = (qty: number) => (qty >= 0 ? Colors.success : Colors.error);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Text style={styles.title}>Reports & Analytics</Text>
                <Text style={styles.subtitle}>Low stock, sales history & inventory movements.</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === 'low' && styles.tabActive]} onPress={() => switchTab('low')}>
                    <Text style={[styles.tabText, activeTab === 'low' && styles.tabTextActive]}>Low Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'sales' && styles.tabActive]} onPress={() => switchTab('sales')}>
                    <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>Sales History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'movements' && styles.tabActive]} onPress={() => switchTab('movements')}>
                    <Text style={[styles.tabText, activeTab === 'movements' && styles.tabTextActive]}>Movements</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === 'low' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Products below reorder level</Text>
                            <TouchableOpacity onPress={fetchLowStock}><RefreshCw size={18} color={Colors.textSecondary} /></TouchableOpacity>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
                        ) : lowStock.length === 0 ? (
                            <Card style={styles.emptyCard}><Text style={styles.emptyText}>All products are sufficiently stocked!</Text></Card>
                        ) : (
                            lowStock.map(item => (
                                <Card key={item.productId} style={styles.rowCard}>
                                    <View style={styles.rowHeader}>
                                        <AlertTriangle size={16} color="#FF8A65" />
                                        <Text style={styles.rowTitle}>{item.productName} ({item.unit})</Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>Current stock</Text>
                                        <Text style={styles.rowValue}>{item.currentStock} {item.unit}</Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>Reorder level</Text>
                                        <Text style={styles.rowValue}>{item.reorderLevel} {item.unit}</Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>Shortage</Text>
                                        <Text style={[styles.rowValue, { color: Colors.error }]}>{item.shortageAmount} {item.unit}</Text>
                                    </View>
                                </Card>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'sales' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Product sales history</Text>
                        </View>
                        <TouchableOpacity style={styles.productPicker} onPress={() => setProductPickerVisible(true)}>
                            <BarChart3 size={18} color={Colors.primary} />
                            <Text style={[styles.pickerText, { color: selectedProduct ? Colors.text : Colors.textSecondary }]}>
                                {selectedProduct ? selectedProduct.productName : 'Select a product'}
                            </Text>
                        </TouchableOpacity>

                        {historyLoading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
                        ) : history ? (
                            <Card style={styles.historyCard}>
                                <Text style={styles.historyTitle}>{history.productName}</Text>
                                <View style={styles.rowDetail}>
                                    <Text style={styles.rowLabel}>Total quantity sold</Text>
                                    <Text style={styles.rowValue}>{history.totalQuantitySold} {history.unit}</Text>
                                </View>
                                <View style={styles.rowDetail}>
                                    <Text style={styles.rowLabel}>Total revenue</Text>
                                    <Text style={styles.rowValue}>₹{history.totalRevenue}</Text>
                                </View>
                                <View style={styles.rowDetail}>
                                    <Text style={styles.rowLabel}>No. of sales</Text>
                                    <Text style={styles.rowValue}>{history.salesCount}</Text>
                                </View>
                                <View style={styles.rowDetail}>
                                    <Text style={styles.rowLabel}>Avg daily sales</Text>
                                    <Text style={styles.rowValue}>{history.averageDailySales} {history.unit}</Text>
                                </View>
                                <View style={styles.rowDetail}>
                                    <Text style={styles.rowLabel}>Period</Text>
                                    <Text style={styles.rowValue}>{history.startDate} → {history.endDate}</Text>
                                </View>
                            </Card>
                        ) : (
                            <Card style={styles.emptyCard}><Text style={styles.emptyText}>Select a product to view its sales history.</Text></Card>
                        )}
                    </>
                )}

                {activeTab === 'movements' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Stock movement ledger</Text>
                            <TouchableOpacity onPress={fetchMovements}><RefreshCw size={18} color={Colors.textSecondary} /></TouchableOpacity>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
                        ) : movements.length === 0 ? (
                            <Card style={styles.emptyCard}><Text style={styles.emptyText}>No movements recorded yet.</Text></Card>
                        ) : (
                            movements.slice(0, 50).map(m => (
                                <Card key={m.id} style={styles.rowCard}>
                                    <View style={styles.rowHeader}>
                                        <Activity size={16} color={movementColor(m.quantity)} />
                                        <Text style={styles.rowTitle}>{m.product?.productName}</Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>Type</Text>
                                        <Text style={styles.rowValue}>{m.movementType}</Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>Qty change</Text>
                                        <Text style={[styles.rowValue, { color: movementColor(m.quantity) }]}>
                                            {m.quantity >= 0 ? '+' : ''}{m.quantity}
                                        </Text>
                                    </View>
                                    <View style={styles.rowDetail}>
                                        <Text style={styles.rowLabel}>When</Text>
                                        <Text style={styles.rowValue}>{new Date(m.createdAt).toLocaleString()}</Text>
                                    </View>
                                </Card>
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            {productPickerVisible && (
                <Modal animationType="slide" transparent visible={productPickerVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Product</Text>
                                <TouchableOpacity onPress={() => setProductPickerVisible(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeText}>×</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 400 }}>
                                {products.map(p => (
                                    <TouchableOpacity key={p.id} style={styles.pickerOption} onPress={() => loadHistory(p)}>
                                        <Text style={styles.optionText}>{p.productName} ({p.brand})</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
    title: { fontSize: 24, fontFamily: 'Urbanist_700Bold', color: Colors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: 'Urbanist_400Regular', color: Colors.textSecondary },
    tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.card, borderRadius: 14, padding: 4, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { fontFamily: 'Urbanist_600SemiBold', fontSize: 13, color: Colors.textSecondary },
    tabTextActive: { color: '#fff' },
    content: { flex: 1, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    emptyCard: { padding: 20, alignItems: 'center', marginBottom: 12 },
    emptyText: { fontFamily: 'Urbanist_500Medium', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
    rowCard: { padding: 16, marginBottom: 10 },
    rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowTitle: { fontFamily: 'Urbanist_700Bold', fontSize: 15, color: Colors.text, marginLeft: 8, flex: 1 },
    rowDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    rowLabel: { fontFamily: 'Urbanist_500Medium', fontSize: 13, color: Colors.textSecondary },
    rowValue: { fontFamily: 'Urbanist_600SemiBold', fontSize: 13, color: Colors.text },
    productPicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
        borderWidth: 1, borderColor: Colors.border,
    },
    pickerText: { fontFamily: 'Urbanist_500Medium', fontSize: 15, marginLeft: 10, flex: 1 },
    historyCard: { padding: 18, marginBottom: 12 },
    historyTitle: { fontFamily: 'Urbanist_700Bold', fontSize: 17, color: Colors.text, marginBottom: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', width: '100%', padding: 24, borderRadius: 24 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: 'Urbanist_700Bold', color: Colors.text },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 24, color: Colors.textSecondary },
    pickerOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    optionText: { fontFamily: 'Urbanist_500Medium', fontSize: 15, color: Colors.text },
});
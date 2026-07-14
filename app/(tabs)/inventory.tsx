import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Container } from '../../src/components/Container';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Typography } from '../../src/theme/typography';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../src/services/api';

export default function Inventory() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            const data = response.data || [];
            const mapped = data.map((p: any) => ({
                id: p.id.toString(),
                name: `${p.brand ? p.brand + ' ' : ''}${p.productName}`,
                weight: p.unit || '25kg',
                quantity: p.stock,
                price: p.sellingPrice,
            }));
            setItems(mapped);
        } catch (error) {
            console.error('Error fetching inventory summary:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchInventory();
        }, [fetchInventory])
    );

    return (
        <Container>
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
                <Button title="+ Stock" onPress={() => router.push('/stock')} style={styles.addButton} textStyle={{ fontSize: 14 }} />
            </View>

            {loading && items.length === 0 ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <Card style={styles.itemCard}>
                            <View style={styles.itemIcon}>
                                <Feather name="box" size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>{item.weight} Bag • ₹{item.price}</Text>
                            </View>
                            <View style={styles.quantityBox}>
                                <Text style={[styles.qty, item.quantity < 20 && styles.lowStock]}>
                                    {item.quantity}
                                </Text>
                                <Text style={styles.qtyLabel}>Qty</Text>
                            </View>
                        </Card>
                    )}
                />
            )}
        </Container>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.h2,
        color: Colors.text,
    },
    addButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    list: {
        gap: 12,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    itemIcon: {
        width: 48,
        height: 48,
        backgroundColor: Colors.secondary,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.body,
        color: Colors.text,
    },
    itemMeta: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.small,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    quantityBox: {
        alignItems: 'center',
    },
    qty: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.h3,
        color: Colors.text,
    },
    lowStock: {
        color: Colors.error,
    },
    qtyLabel: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 10,
        color: Colors.textSecondary,
    }
});

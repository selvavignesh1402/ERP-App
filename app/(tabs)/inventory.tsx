import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Container } from '../../src/components/Container';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Typography } from '../../src/theme/typography';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';

const STOCK_DATA = [
    { id: '1', name: 'Basmati Rice', weight: '25kg', quantity: 45, price: 1250 },
    { id: '2', name: 'Sona Masoori', weight: '25kg', quantity: 12, price: 950 }, // Low stock
    { id: '3', name: 'Brown Rice', weight: '10kg', quantity: 30, price: 650 },
];

export default function Inventory() {
    return (
        <Container>
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
                <Button title="+ Stock" onPress={() => { }} style={styles.addButton} textStyle={{ fontSize: 14 }} />
            </View>

            <FlatList
                data={STOCK_DATA}
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
        color: Colors.text.primary,
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
        color: Colors.text.primary,
    },
    itemMeta: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        marginTop: 4,
    },
    quantityBox: {
        alignItems: 'center',
    },
    qty: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.primary,
    },
    lowStock: {
        color: Colors.error,
    },
    qtyLabel: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 10,
        color: Colors.text.secondary,
    }
});

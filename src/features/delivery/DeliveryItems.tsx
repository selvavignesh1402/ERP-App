import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface DeliveryDetailItem {
    id?: number;
    product?: { productName?: string | null } | null;
    deliveringQuantity?: number | null;
    deliveredQuantity?: number | null;
    unitPrice?: number | null;
}

function quantity(value: number | null | undefined) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? `${value} bags`
        : 'Unavailable';
}

export function DeliveryItems({ items, status }: { items: DeliveryDetailItem[]; status: string }) {
    const received = status === 'DELIVERED' || status === 'PARTIALLY_DELIVERED';
    return (
        <View>
            {items.length === 0 && <Text style={styles.detail}>No delivery items available.</Text>}
            {items.map((item, index) => (
                <View key={`${item.id ?? 'item'}-${index}`} style={styles.row}>
                    <Text style={styles.name}>
                        {item.product?.productName?.trim() || 'Product unavailable'}
                    </Text>
                    <Text style={styles.detail}>Dispatched: {quantity(item.deliveringQuantity)}</Text>
                    {received && (
                        <Text style={styles.detail}>Received: {quantity(item.deliveredQuantity)}</Text>
                    )}
                    <Text style={styles.detail}>
                        Unit price:{' '}
                        {typeof item.unitPrice === 'number' &&
                        Number.isFinite(item.unitPrice) &&
                        item.unitPrice >= 0
                            ? `₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                            : 'Unavailable'}
                    </Text>
                </View>
            ))}
            {items.length > 0 && (
                <Text style={styles.help}>
                    Unit prices are shown here. See the invoice for final amounts, discounts, and tax.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: Colors.card,
    },
    name: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
    detail: { color: Colors.text, fontSize: 13, lineHeight: 20 },
    help: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 12 },
});

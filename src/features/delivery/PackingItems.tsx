import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface PackingItem {
    id: number;
    orderedQuantity: number;
    deliveredQuantity?: number;
    remainingQuantity?: number | null;
    product?: { productName?: string; stock?: number | null } | null;
}

export function PackingItems({ items }: { items: PackingItem[] }) {
    return (
        <View>
            <Text style={styles.heading}>Verify remaining order quantities</Text>
            <Text style={styles.explanation}>
                Mark this order ready after checking the goods. Choose full or partial dispatch quantities in
                the next step.
            </Text>
            {items.map((item) => {
                const remaining =
                    item.remainingQuantity ??
                    Math.max(0, item.orderedQuantity - (item.deliveredQuantity ?? 0));
                return (
                    <View key={item.id} style={styles.row}>
                        <Text style={styles.name}>{item.product?.productName || 'Product'}</Text>
                        <Text style={styles.quantity}>Remaining: {remaining} bags</Text>
                        <Text style={styles.detail}>Ordered: {item.orderedQuantity} bags</Text>
                        <Text style={styles.detail}>
                            Physical stock: {item.product?.stock == null ? 'Unavailable' : item.product.stock}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    heading: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
    explanation: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary, marginBottom: 12 },
    row: {
        padding: 12,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.card,
    },
    name: { fontSize: 14, fontWeight: '700', color: Colors.text },
    quantity: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 6 },
    detail: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});

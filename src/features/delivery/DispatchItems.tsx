import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import type { DispatchableItem } from './dispatch';

export function DispatchItems({
    items,
    quantities,
    onChange,
}: {
    items: DispatchableItem[];
    quantities: Record<number, string>;
    onChange(productId: number, value: string): void;
}) {
    return (
        <View>
            <Text style={styles.help}>
                Choose how many bags to send on this trip. Use 0 to leave a product for later.
            </Text>
            {items.map((item, index) => {
                const id = item.product?.id;
                const name = item.product?.productName || 'Product';
                return (
                    <View key={`${id}-${index}`} style={styles.row}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.help}>
                            Available to dispatch: {item.availableQuantity ?? 'Unavailable'} bags
                        </Text>
                        <Text style={styles.label}>Bags for this trip</Text>
                        <TextInput
                            accessibilityLabel={`Dispatch quantity for ${name}`}
                            keyboardType="number-pad"
                            value={quantities[id] ?? ''}
                            onChangeText={(value) => onChange(id, value)}
                            style={styles.input}
                        />
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    help: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 },
    row: {
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: Colors.card,
    },
    name: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    label: { color: Colors.text, fontSize: 12, marginBottom: 5 },
    input: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        color: Colors.text,
        fontSize: 16,
    },
});

import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { GST_RATES } from '../features/sales/gst';

export function GstSelector({
    value,
    onChange,
}: {
    value: number | null;
    onChange(value: number | null): void;
}) {
    const option = (rate: number | null, label: string) => (
        <TouchableOpacity
            key={String(rate)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === rate }}
            onPress={() => onChange(rate)}
            style={{
                padding: 12,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: value === rate ? '#275A45' : '#CCCCCC',
                backgroundColor: value === rate ? '#E8F2EB' : '#FFFFFF',
            }}
        >
            <Text>{label}</Text>
        </TouchableOpacity>
    );
    return (
        <View style={{ gap: 10, marginVertical: 12 }}>
            <Text style={{ fontWeight: '700' }}>GST needed?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {option(null, 'No GST')}
                <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ selected: value !== null }}
                    onPress={() => onChange(value ?? 5)}
                    style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}
                >
                    <Text>Yes</Text>
                </TouchableOpacity>
            </View>
            {value !== null && (
                <>
                    <Text>Total GST rate</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {GST_RATES.map((rate) => option(rate, rate + '%'))}
                    </View>
                    <Text>
                        Select the rate applicable to this product’s HSN and packaging. Selling prices exclude
                        GST.
                    </Text>
                    {value === 40 && (
                        <Text>Any applicable cess is separate and is not calculated by this app.</Text>
                    )}
                </>
            )}
        </View>
    );
}

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { callSavedPhone, phoneUri } from '../../utils/phoneCall';

export function ContactCallButton({
    phone,
    label,
    compact = false,
}: {
    phone: unknown;
    label: string;
    compact?: boolean;
}) {
    const available = phoneUri(phone) !== null;
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={available ? label : `${label}: phone unavailable`}
            accessibilityState={{ disabled: !available }}
            disabled={!available}
            onPress={() => callSavedPhone(phone)}
            style={[styles.button, compact && styles.compact, !available && styles.disabled]}
        >
            <Phone size={18} color={Colors.text} />
            <Text style={styles.label}>{available ? label : 'Phone unavailable'}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 6 },
    compact: { flex: 0, maxWidth: 84 },
    disabled: { opacity: 0.5 },
    label: { fontSize: 11, textAlign: 'center', color: Colors.text },
});

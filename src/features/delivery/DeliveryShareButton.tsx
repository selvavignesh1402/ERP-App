import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Share, StyleSheet } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { deliverySummary, ShareableDelivery } from './deliverySharing';

export function DeliveryShareButton({ delivery }: { delivery: ShareableDelivery }) {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [sharing, setSharing] = useState(false);
    const open = () => {
        setError('');
        setMessage('');
        try {
            setMessage(deliverySummary(delivery));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Delivery details are unavailable.');
        }
        setVisible(true);
    };
    const share = async () => {
        if (!message || sharing) return;
        setSharing(true);
        setError('');
        try {
            await Share.share({ title: 'Delivery summary', message });
        } catch (cause) {
            if (!(cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError'))
                setError('Could not open sharing. You can select and copy the summary above.');
        } finally {
            setSharing(false);
        }
    };
    return (
        <>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Preview delivery summary"
                onPress={open}
                style={styles.button}
            >
                <Share2 size={18} color={Colors.text} />
                <Text style={styles.label}>Share</Text>
            </TouchableOpacity>
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.panel}>
                        <Text style={styles.title}>Delivery summary</Text>
                        <ScrollView>
                            <Text selectable style={styles.text}>
                                {message}
                            </Text>
                        </ScrollView>
                        {!!error && (
                            <Text accessibilityRole="alert" style={styles.error}>
                                {error}
                            </Text>
                        )}
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Open share options"
                            disabled={!message || sharing}
                            onPress={share}
                            style={styles.action}
                        >
                            <Text style={styles.text}>
                                {sharing ? 'Opening share options…' : 'Open share options'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Close delivery summary"
                            onPress={() => setVisible(false)}
                            style={styles.action}
                        >
                            <Text style={styles.text}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
const styles = StyleSheet.create({
    button: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 6 },
    label: { color: Colors.text, fontSize: 11 },
    overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: Colors.shadow },
    panel: { backgroundColor: Colors.card, padding: 20, borderRadius: 12, maxHeight: '85%' },
    title: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
    text: { color: Colors.text, fontSize: 14, lineHeight: 22 },
    error: { color: Colors.error, marginVertical: 10 },
    action: {
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
});

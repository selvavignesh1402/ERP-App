import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { ReceiptOptions } from './ThermalReceipt';

export interface PrintSettings {
    paperSize: '58mm' | '80mm';
    fontSize: 'compact' | 'normal' | 'large';
    options: ReceiptOptions;
}
export interface PrintSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    settings: PrintSettings;
    onSaveSettings: (settings: PrintSettings) => void;
}
export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
    visible,
    onClose,
    settings,
    onSaveSettings,
}) => {
    const [local, setLocal] = useState(settings);
    useEffect(() => {
        if (visible) setLocal(settings);
    }, [visible, settings]);
    const options: [keyof ReceiptOptions, string][] = [
        ['showLogo', 'Shop header'],
        ['showGst', 'GST details'],
        ['showCustomer', 'Customer details'],
        ['showPayment', 'Payment summary'],
        ['showThanks', 'Thank-you message'],
    ];
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>Receipt preview settings</Text>
                    <Text style={styles.note}>
                        Printing uses the system print dialog and your installed printer driver. Set the
                        driver paper width to match. Text and visibility options below affect the preview;
                        payment QR is not configured.
                    </Text>
                    <ScrollView>
                        <Text style={styles.heading}>Paper width</Text>
                        <View style={styles.row}>
                            {(['58mm', '80mm'] as const).map((size) => (
                                <TouchableOpacity
                                    key={size}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: local.paperSize === size }}
                                    style={[styles.choice, local.paperSize === size && styles.selected]}
                                    onPress={() => setLocal((previous) => ({ ...previous, paperSize: size }))}
                                >
                                    <Text>{size}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.heading}>Text size</Text>
                        <View style={styles.row}>
                            {(['compact', 'normal', 'large'] as const).map((size) => (
                                <TouchableOpacity
                                    key={size}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: local.fontSize === size }}
                                    style={[styles.choice, local.fontSize === size && styles.selected]}
                                    onPress={() => setLocal((previous) => ({ ...previous, fontSize: size }))}
                                >
                                    <Text>{size}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {options.map(([key, label]) => (
                            <View key={key} style={styles.option}>
                                <Text>{label}</Text>
                                <Switch
                                    accessibilityLabel={label}
                                    value={local.options[key]}
                                    onValueChange={(value) =>
                                        setLocal((previous) => ({
                                            ...previous,
                                            options: { ...previous.options, [key]: value },
                                        }))
                                    }
                                />
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.choice} accessibilityRole="button" onPress={onClose}>
                            <Text>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.choice, styles.selected]}
                            accessibilityRole="button"
                            onPress={() => {
                                onSaveSettings(local);
                                onClose();
                            }}
                        >
                            <Text>Apply preview settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        maxHeight: '90%',
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    note: { marginVertical: 14, color: '#555', lineHeight: 21 },
    heading: { marginTop: 14, marginBottom: 8, fontWeight: '600' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
    selected: { backgroundColor: '#FFF0F5', borderColor: '#B44465' },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
});
export default PrintSettingsModal;

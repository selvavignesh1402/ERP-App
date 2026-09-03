import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    ScrollView, Switch, ActivityIndicator, Platform
} from 'react-native';
import {
    Printer, Bluetooth, Usb, Wifi, X, Check,
    Plus, Minus, Settings2, Sliders, CheckCircle2
} from 'lucide-react-native';
import { ReceiptOptions } from './ThermalReceipt';

export interface PrintSettings {
    printerType: 'BLUETOOTH' | 'USB' | 'LAN';
    selectedDevice: string;
    paperSize: '58mm' | '80mm';
    fontSize: 'compact' | 'normal' | 'large';
    copies: number;
    options: ReceiptOptions;
}

export interface PrintSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    settings: PrintSettings;
    onSaveSettings: (settings: PrintSettings) => void;
    onTriggerPrint: (settings: PrintSettings) => Promise<void> | void;
}

const SAMPLE_BT_DEVICES = [
    { id: 'dev-1', name: 'PT-210_BT Thermal (Remembered)', connected: true },
    { id: 'dev-2', name: 'Epson TM-P80_5492', connected: false },
    { id: 'dev-3', name: 'TVS RP-3150 Star_POS', connected: false },
];

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
    visible,
    onClose,
    settings,
    onSaveSettings,
    onTriggerPrint,
}) => {
    const [localSettings, setLocalSettings] = useState<PrintSettings>(settings);
    const [printing, setPrinting] = useState(false);
    const [scanningBt, setScanningBt] = useState(false);

    const updateOption = (key: keyof ReceiptOptions, val: boolean) => {
        setLocalSettings(prev => ({
            ...prev,
            options: {
                ...prev.options,
                [key]: val,
            },
        }));
    };

    const handlePrintClick = async () => {
        onSaveSettings(localSettings);
        setPrinting(true);
        try {
            await onTriggerPrint(localSettings);
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.grabHandle} />

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.headerIconCircle}>
                                <Settings2 size={18} color="#1A1A1A" />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Print Settings</Text>
                                <Text style={styles.modalSubtitle}>Configure thermal printer & receipt format</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <X size={18} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* 1. PRINTER CONNECTION TYPE */}
                        <Text style={styles.sectionHeading}>PRINTER CONNECTION</Text>
                        <View style={styles.printerTypeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.typeChip,
                                    localSettings.printerType === 'BLUETOOTH' && styles.typeChipActive,
                                ]}
                                onPress={() => setLocalSettings(prev => ({ ...prev, printerType: 'BLUETOOTH' }))}
                                activeOpacity={0.8}
                            >
                                <Bluetooth
                                    size={15}
                                    color={localSettings.printerType === 'BLUETOOTH' ? '#FFFFFF' : '#1A1A1A'}
                                />
                                <Text
                                    style={[
                                        styles.typeChipText,
                                        localSettings.printerType === 'BLUETOOTH' && styles.typeChipTextActive,
                                    ]}
                                >
                                    Bluetooth
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeChip,
                                    localSettings.printerType === 'USB' && styles.typeChipActive,
                                ]}
                                onPress={() => setLocalSettings(prev => ({ ...prev, printerType: 'USB' }))}
                                activeOpacity={0.8}
                            >
                                <Usb
                                    size={15}
                                    color={localSettings.printerType === 'USB' ? '#FFFFFF' : '#1A1A1A'}
                                />
                                <Text
                                    style={[
                                        styles.typeChipText,
                                        localSettings.printerType === 'USB' && styles.typeChipTextActive,
                                    ]}
                                >
                                    USB / OTG
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeChip,
                                    localSettings.printerType === 'LAN' && styles.typeChipActive,
                                ]}
                                onPress={() => setLocalSettings(prev => ({ ...prev, printerType: 'LAN' }))}
                                activeOpacity={0.8}
                            >
                                <Wifi
                                    size={15}
                                    color={localSettings.printerType === 'LAN' ? '#FFFFFF' : '#1A1A1A'}
                                />
                                <Text
                                    style={[
                                        styles.typeChipText,
                                        localSettings.printerType === 'LAN' && styles.typeChipTextActive,
                                    ]}
                                >
                                    Network LAN
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Bluetooth Device Picker / Status */}
                        {localSettings.printerType === 'BLUETOOTH' && (
                            <View style={styles.deviceBox}>
                                <View style={styles.deviceHeaderRow}>
                                    <Text style={styles.deviceBoxLabel}>PAIRED BLUETOOTH PRINTER</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setScanningBt(true);
                                            setTimeout(() => setScanningBt(false), 1200);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.scanText}>
                                            {scanningBt ? 'Scanning...' : 'Scan Nearby'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {SAMPLE_BT_DEVICES.map(dev => {
                                    const isSelected = localSettings.selectedDevice === dev.name;
                                    return (
                                        <TouchableOpacity
                                            key={dev.id}
                                            style={[styles.deviceItem, isSelected && styles.deviceItemActive]}
                                            onPress={() => setLocalSettings(p => ({ ...p, selectedDevice: dev.name }))}
                                            activeOpacity={0.75}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                <Bluetooth size={14} color={isSelected ? '#F06A8C' : '#8A8A8A'} />
                                                <Text style={[styles.deviceName, isSelected && styles.deviceNameActive]} numberOfLines={1}>
                                                    {dev.name}
                                                </Text>
                                            </View>
                                            {isSelected ? (
                                                <View style={styles.connectedBadge}>
                                                    <Check size={12} color="#2E7D32" />
                                                    <Text style={styles.connectedBadgeText}>Ready</Text>
                                                </View>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* 2. PAPER SIZE (58mm vs 80mm) */}
                        <Text style={styles.sectionHeading}>PAPER ROLL WIDTH</Text>
                        <View style={styles.segmentedRow}>
                            <TouchableOpacity
                                style={[
                                    styles.segmentBtn,
                                    localSettings.paperSize === '58mm' && styles.segmentBtnActive,
                                ]}
                                onPress={() => setLocalSettings(p => ({ ...p, paperSize: '58mm' }))}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.segmentBtnText,
                                        localSettings.paperSize === '58mm' && styles.segmentBtnTextActive,
                                    ]}
                                >
                                    58mm (2-inch Compact)
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.segmentBtn,
                                    localSettings.paperSize === '80mm' && styles.segmentBtnActive,
                                ]}
                                onPress={() => setLocalSettings(p => ({ ...p, paperSize: '80mm' }))}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.segmentBtnText,
                                        localSettings.paperSize === '80mm' && styles.segmentBtnTextActive,
                                    ]}
                                >
                                    80mm (3-inch Standard)
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 3. FONT SIZE */}
                        <Text style={styles.sectionHeading}>RECEIPT FONT SCALE</Text>
                        <View style={styles.segmentedRow}>
                            {(['compact', 'normal', 'large'] as const).map(fs => (
                                <TouchableOpacity
                                    key={fs}
                                    style={[
                                        styles.segmentBtn,
                                        localSettings.fontSize === fs && styles.segmentBtnActive,
                                    ]}
                                    onPress={() => setLocalSettings(p => ({ ...p, fontSize: fs }))}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.segmentBtnText,
                                            localSettings.fontSize === fs && styles.segmentBtnTextActive,
                                        ]}
                                    >
                                        {fs.charAt(0).toUpperCase() + fs.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 4. NUMBER OF COPIES */}
                        <View style={styles.copiesRow}>
                            <View>
                                <Text style={styles.copiesTitle}>Print Copies</Text>
                                <Text style={styles.copiesSubtitle}>Customer & merchant receipts</Text>
                            </View>
                            <View style={styles.stepperWrap}>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setLocalSettings(p => ({ ...p, copies: Math.max(1, p.copies - 1) }))}
                                    activeOpacity={0.7}
                                >
                                    <Minus size={14} color="#1A1A1A" />
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{localSettings.copies}</Text>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setLocalSettings(p => ({ ...p, copies: Math.min(5, p.copies + 1) }))}
                                    activeOpacity={0.7}
                                >
                                    <Plus size={14} color="#1A1A1A" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 5. RECEIPT CONTENT TOGGLES */}
                        <Text style={styles.sectionHeading}>RECEIPT SECTIONS & OPTIONS</Text>
                        <View style={styles.togglesCard}>
                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Shop Header & Trade Name</Text>
                                <Switch
                                    value={localSettings.options.showLogo}
                                    onValueChange={v => updateOption('showLogo', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showLogo ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>

                            <View style={styles.toggleDivider} />

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>GSTIN & Tax Details (CGST/SGST)</Text>
                                <Switch
                                    value={localSettings.options.showGst}
                                    onValueChange={v => updateOption('showGst', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showGst ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>

                            <View style={styles.toggleDivider} />

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Customer Details & Phone</Text>
                                <Switch
                                    value={localSettings.options.showCustomer}
                                    onValueChange={v => updateOption('showCustomer', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showCustomer ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>

                            <View style={styles.toggleDivider} />

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Payment & Customer Credit Ledger</Text>
                                <Switch
                                    value={localSettings.options.showPayment}
                                    onValueChange={v => updateOption('showPayment', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showPayment ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>

                            <View style={styles.toggleDivider} />

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>UPI Payment QR Code</Text>
                                <Switch
                                    value={localSettings.options.showQr}
                                    onValueChange={v => updateOption('showQr', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showQr ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>

                            <View style={styles.toggleDivider} />

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Thank You Greeting Note</Text>
                                <Switch
                                    value={localSettings.options.showThanks}
                                    onValueChange={v => updateOption('showThanks', v)}
                                    trackColor={{ false: '#E0E0E0', true: '#F5C6D8' }}
                                    thumbColor={localSettings.options.showThanks ? '#F06A8C' : '#FFFFFF'}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Pinned CTA */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.printBtn}
                            onPress={handlePrintClick}
                            disabled={printing}
                            activeOpacity={0.85}
                        >
                            {printing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Printer size={18} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={styles.printBtnText}>
                                        Print Invoice ({localSettings.copies} {localSettings.copies === 1 ? 'Copy' : 'Copies'})
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FAF7F2',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '88%',
    },
    grabHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D0D0D0',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    headerIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    modalSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFEFEF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 20,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 12,
    },
    printerTypeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    typeChipActive: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    typeChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    typeChipTextActive: {
        color: '#FFFFFF',
    },

    // Bluetooth Device Box
    deviceBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginTop: 10,
    },
    deviceHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deviceBoxLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8A8A8A',
    },
    scanText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F06A8C',
    },
    deviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginVertical: 2,
    },
    deviceItemActive: {
        backgroundColor: '#FAF7F2',
    },
    deviceName: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    deviceNameActive: {
        color: '#1A1A1A',
        fontWeight: '700',
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    connectedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2E7D32',
    },

    // Segmented Row
    segmentedRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
    },
    segmentBtnActive: {
        backgroundColor: '#1A1A1A',
    },
    segmentBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666666',
    },
    segmentBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // Copies
    copiesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginTop: 14,
    },
    copiesTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    copiesSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 1,
    },
    stepperWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        borderRadius: 10,
        padding: 3,
        gap: 8,
    },
    stepperBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    stepperValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A1A1A',
        minWidth: 18,
        textAlign: 'center',
    },

    // Toggles Card
    togglesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    toggleLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#1A1A1A',
        flex: 1,
        marginRight: 10,
    },
    toggleDivider: {
        height: 1,
        backgroundColor: '#F5F5F7',
    },

    // Footer
    modalFooter: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 26 : 14,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: '#FAF7F2',
    },
    printBtn: {
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F06A8C',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 2,
    },
    printBtnText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default PrintSettingsModal;

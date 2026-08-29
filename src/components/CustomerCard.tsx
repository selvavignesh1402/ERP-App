import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../theme/colors';
import { UserCheck, Pencil } from 'lucide-react-native';

interface CustomerCardProps {
    name: string;
    phone: string;
    creditLimit: number;
    creditBalance: number;
    status: 'Active' | 'Inactive';
    onPressStatusToggle?: () => void;
    onEditPress?: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
    name,
    phone,
    creditLimit,
    creditBalance,
    status,
    onPressStatusToggle,
    onEditPress
}) => {
    const availableCredit = creditLimit - creditBalance;
    const creditPercent = creditLimit > 0 ? Math.min(100, (creditBalance / creditLimit) * 100) : 0;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <UserCheck size={20} color={Colors.primary} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.subtext}>{phone || 'No phone'}</Text>
                </View>
                <TouchableOpacityActive
                    onPress={onPressStatusToggle}
                    style={[styles.statusBadge, { backgroundColor: status === 'Active' ? '#E8F5E9' : '#ECEFF1' }]}
                >
                    <Text style={[styles.statusText, { color: status === 'Active' ? Colors.primary : Colors.textSecondary }]}>
                        {status}
                    </Text>
                </TouchableOpacityActive>
            </View>

            <View style={styles.creditRow}>
                <View style={styles.creditHeader}>
                    <Text style={styles.creditLabel}>Credit Usage</Text>
                    <View style={styles.creditRight}>
                        <Text style={styles.creditValue}>
                            ₹{creditBalance} / ₹{creditLimit}
                        </Text>
                        {onEditPress && (
                            <Pressable onPress={onEditPress} style={styles.editBtn} hitSlop={8}>
                                <Pencil size={14} color={Colors.primary} />
                            </Pressable>
                        )}
                    </View>
                </View>
                {/* Credit usage bar */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${creditPercent}%`, backgroundColor: creditPercent > 80 ? Colors.error : Colors.primary }]} />
                </View>
                <View style={styles.creditFooter}>
                    <Text style={styles.creditFooterText}>Available Limit: </Text>
                    <Text style={[styles.creditFooterValue, { color: availableCredit < 5000 ? Colors.error : Colors.text }]}>
                        ₹{availableCredit}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// Simple active pressable helper style
import { TouchableOpacity } from 'react-native';
const TouchableOpacityActive = TouchableOpacity;

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    subtext: {
        fontSize: 13,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
    },
    creditRow: {
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 16,
    },
    creditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    creditRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    editBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    creditLabel: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    },
    creditValue: {
        fontSize: 13,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    progressBarBg: {
        height: 6,
        width: '100%',
        backgroundColor: Colors.border,
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    creditFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    creditFooterText: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    creditFooterValue: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
    }
});

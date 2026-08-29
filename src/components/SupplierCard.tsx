import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../theme/colors';
import { Truck, Pencil } from 'lucide-react-native';

interface SupplierCardProps {
    name: string;
    rating: number;
    category: string;
    totalOrders: number;
    status: 'Active' | 'Inactive';
    onEditPress?: () => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
    name,
    rating,
    category,
    totalOrders,
    status,
    onEditPress
}) => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <Truck size={20} color={Colors.primary} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.subtext}>★ {rating} · {category}</Text>
                </View>
                {/* Placeholder for truck illustration */}
                {onEditPress ? (
                    <Pressable onPress={onEditPress} style={styles.editBtn} hitSlop={8}>
                        <Pencil size={16} color={Colors.primary} />
                    </Pressable>
                ) : (
                    <View style={styles.illustration} />
                )}
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.label}>TOTAL ORDERS</Text>
                    <Text style={styles.value}>{totalOrders}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.label}>STATUS</Text>
                    <Text style={[styles.value, { color: status === 'Active' ? Colors.primary : Colors.textSecondary }]}>
                        {status}
                    </Text>
                </View>
            </View>

            <Pressable style={styles.btn}>
                <Text style={styles.btnText}>View Purchase History</Text>
            </Pressable>
        </View>
    );
};

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
        marginBottom: 20,
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
    illustration: {
        width: 40,
        height: 40,
        // Opacity placeholder for the truck icon in the background of user design
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    stat: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    btn: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    btnText: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.textSecondary,
    }
});

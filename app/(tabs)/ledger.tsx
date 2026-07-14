import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Container } from '../../src/components/Container';
import { Card } from '../../src/components/Card';
import { Typography } from '../../src/theme/typography';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/services/api';

export default function Ledger() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/payments');
            // Sort by date descending
            const sortedPayments = (response.data || []).sort((a: any, b: any) => {
                return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
            });
            setPayments(sortedPayments);
        } catch (error) {
            console.error('Error fetching payments ledger:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchPayments();
        }, [fetchPayments])
    );

    return (
        <Container>
            <View style={styles.header}>
                <Text style={styles.title}>Payments Ledger</Text>
            </View>

            {loading && payments.length === 0 ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const isIncome = item.referenceType === 'SALE';
                        return (
                            <Card style={styles.itemCard}>
                                <View style={[styles.avatar, { backgroundColor: isIncome ? '#E8F5E9' : '#FFEBEE' }]}>
                                    <Feather
                                        name={isIncome ? "trending-up" : "trending-down"}
                                        size={20}
                                        color={isIncome ? Colors.primary : Colors.error}
                                    />
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>
                                        {isIncome ? `Sale Invoice #${item.referenceId}` : `Purchase Invoice #${item.referenceId}`}
                                    </Text>
                                    <Text style={styles.itemMeta}>
                                        {item.paymentMode} • {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text style={[styles.amount, !isIncome && styles.outgoing]}>
                                        {isIncome ? '+' : '-'} ₹{item.amount}
                                    </Text>
                                    <Text style={styles.status}>{isIncome ? 'Received' : 'Paid Out'}</Text>
                                </View>
                            </Card>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No ledger payment logs found.</Text>
                        </View>
                    }
                />
            )}
        </Container>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    title: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.h2,
        color: Colors.text,
    },
    list: {
        gap: 12,
        paddingBottom: 20,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.body,
        color: Colors.text,
    },
    itemMeta: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.small,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    amountBox: {
        alignItems: 'flex-end',
    },
    amount: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.body,
        color: Colors.primary,
    },
    outgoing: {
        color: Colors.error,
    },
    status: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 14,
        color: Colors.textSecondary,
    }
});

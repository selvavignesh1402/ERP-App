import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Container } from '../../src/components/Container';
import { Card } from '../../src/components/Card';
import { Typography } from '../../src/theme/typography';
import { Colors } from '../../src/theme/colors';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { forOrganization } from '../../src/services/api';
import { useRoleContext } from '../../src/contexts/RoleContext';
import { paymentPresentation, reportMoney } from '../../src/services/reporting';
import { RoleGate } from '../../src/components/RoleGate';
import { OrgScopedScreen } from '../../src/components/OrgScopedScreen';
import type { Payment } from '../../src/types/business';

export default function Ledger() {
    return (
        <RoleGate permission="payment:view">
            <OrgScopedScreen>{(_api, orgId) => <ShopLedger activeOrgId={orgId} />}</OrgScopedScreen>
        </RoleGate>
    );
}
function ShopLedger({ activeOrgId }: { activeOrgId: number }) {
    const api = useMemo(() => forOrganization(activeOrgId), [activeOrgId]);
    const [error, setError] = useState('');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<Payment[]>('/payments');
            // Sort by date descending
            const sortedPayments = (response.data || []).sort((a, b) => {
                return new Date(b.paymentDate || '').getTime() - new Date(a.paymentDate || '').getTime();
            });
            setPayments(sortedPayments);
        } catch (error) {
            setPayments([]);
            setError('Payments could not be loaded. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [api]);

    useFocusEffect(
        useCallback(() => {
            fetchPayments();
        }, [fetchPayments]),
    );

    return (
        <Container>
            <View style={styles.header}>
                <Text style={styles.title}>Payments Ledger</Text>
            </View>

            {loading && payments.length === 0 ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : error ? (
                <TouchableOpacity onPress={fetchPayments}>
                    <Text>{error}</Text>
                </TouchableOpacity>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const presentation = paymentPresentation(item);
                        const isIncome = presentation.direction === 'incoming';
                        const isOutgoing = presentation.direction === 'outgoing';
                        return (
                            <Card style={styles.itemCard}>
                                <View
                                    style={[
                                        styles.avatar,
                                        {
                                            backgroundColor: isIncome
                                                ? '#E8F5E9'
                                                : isOutgoing
                                                  ? '#FFEBEE'
                                                  : '#EEEEEE',
                                        },
                                    ]}
                                >
                                    {isIncome ? (
                                        <TrendingUp size={20} color={Colors.primary} />
                                    ) : isOutgoing ? (
                                        <TrendingDown size={20} color={Colors.error} />
                                    ) : (
                                        <Text>?</Text>
                                    )}
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>{presentation.label}</Text>
                                    <Text style={styles.itemMeta}>
                                        {item.paymentMode} •{' '}
                                        {item.paymentDate
                                            ? new Date(item.paymentDate).toLocaleDateString()
                                            : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text
                                        style={[
                                            styles.amount,
                                            isOutgoing && styles.outgoing,
                                            !isIncome && !isOutgoing && { color: Colors.textSecondary },
                                        ]}
                                    >
                                        {presentation.sign}
                                        {reportMoney(item.amount)}
                                    </Text>
                                    <Text style={styles.status}>{presentation.status}</Text>
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
    },
});

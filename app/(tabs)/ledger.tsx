import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Container } from '../../src/components/Container';
import { Card } from '../../src/components/Card';
import { Typography } from '../../src/theme/typography';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';

const LEDGER_DATA = [
    { id: '1', name: 'Ramesh Gupta', amount: 4500, type: 'credit' },
    { id: '2', name: 'Suresh Kumar', amount: 1200, type: 'credit' },
    { id: '3', name: 'Mahesh Shop', amount: 0, type: 'settled' },
];

export default function Ledger() {
    return (
        <Container>
            <View style={styles.header}>
                <Text style={styles.title}>Customer Ledger</Text>
            </View>

            <FlatList
                data={LEDGER_DATA}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <Card style={styles.itemCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name[0]}</Text>
                        </View>
                        <View style={styles.itemDetails}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>Last transaction: Today</Text>
                        </View>
                        <View style={styles.amountBox}>
                            <Text style={[styles.amount, item.type === 'credit' && styles.credit]}>
                                ₹ {item.amount}
                            </Text>
                            <Text style={styles.status}>{item.type === 'credit' ? 'Due' : 'Paid'}</Text>
                        </View>
                    </Card>
                )}
            />
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
        color: Colors.text.primary,
    },
    list: {
        gap: 12,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        backgroundColor: '#F0F0F0',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.secondary,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    itemMeta: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
    },
    amountBox: {
        alignItems: 'flex-end',
    },
    amount: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.size.body,
        color: Colors.success,
    },
    credit: {
        color: Colors.error,
    },
    status: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 10,
        color: Colors.text.secondary,
    }
});

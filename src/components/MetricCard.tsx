import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        positive: boolean;
    };
    iconColor?: string;
    iconBgColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    iconColor = Colors.primary,
    iconBgColor = Colors.accent
}) => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                    <Icon size={20} color={iconColor} />
                </View>
                {trend && (
                    <View style={[styles.trendBadge, { backgroundColor: trend.positive ? Colors.accent : '#FCE8E8' }]}>
                        <Text style={[styles.trendText, { color: trend.positive ? Colors.success : Colors.danger }]}>
                            {trend.value}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        width: '48%', // Approx half width for grid
        marginBottom: 16,
        // Shadow for iOS
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        // Elevation for Android
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        gap: 4,
    },
    title: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_500Medium',
    },
    value: {
        fontSize: 20,
        color: Colors.text,
        fontFamily: 'Urbanist_700Bold',
    },
});

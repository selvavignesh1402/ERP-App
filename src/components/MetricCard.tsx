import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors } from '../theme/colors';
import { LucideIcon } from 'lucide-react-native';
import { useAnimePress, FadeInDown } from './Anime';

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
    onPress?: () => void;
    animateEntrance?: boolean;
    delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    iconColor = Colors.primary,
    iconBgColor = Colors.accent,
    onPress,
    animateEntrance = false,
    delay = 0
}) => {
    const { pressHandlers, animatedStyle } = useAnimePress(0.97);

    const renderCardBody = () => (
        <View style={styles.cardContainer}>
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

    const content = onPress ? (
        <Pressable onPress={onPress} {...pressHandlers}>
            <Animated.View style={animatedStyle}>
                {renderCardBody()}
            </Animated.View>
        </Pressable>
    ) : (
        renderCardBody()
    );

    if (animateEntrance) {
        return (
            <FadeInDown delay={delay} style={styles.wrapper}>
                {content}
            </FadeInDown>
        );
    }

    return (
        <View style={styles.wrapper}>
            {content}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '48%',
        marginBottom: 16,
    },
    cardContainer: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
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

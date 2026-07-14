import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { Colors } from '../theme/colors';
import { useAnimePress, FadeInDown } from './Anime';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    variant?: 'elevated' | 'flat' | 'outlined';
    onPress?: () => void;
    animateEntrance?: boolean;
    delay?: number;
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'elevated',
    onPress,
    animateEntrance = false,
    delay = 0
}) => {
    const { pressHandlers, animatedStyle } = useAnimePress(0.98);

    const cardContent = (
        <View style={[
            styles.card,
            variant === 'elevated' && styles.elevated,
            variant === 'outlined' && styles.outlined,
            style
        ]}>
            {children}
        </View>
    );

    let mainElement = onPress ? (
        <Pressable onPress={onPress} {...pressHandlers}>
            <Animated.View style={animatedStyle}>
                {cardContent}
            </Animated.View>
        </Pressable>
    ) : (
        cardContent
    );

    if (animateEntrance) {
        return (
            <FadeInDown delay={delay}>
                {mainElement}
            </FadeInDown>
        );
    }

    return mainElement;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
    },
    elevated: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    outlined: {
        borderWidth: 1,
        borderColor: Colors.border,
    },
});

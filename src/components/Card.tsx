import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'elevated' | 'flat' | 'outlined';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
    return (
        <View style={[
            styles.card,
            variant === 'elevated' && styles.elevated,
            variant === 'outlined' && styles.outlined,
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.text.white,
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

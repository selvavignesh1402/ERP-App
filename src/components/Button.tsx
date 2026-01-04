import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    style,
    textStyle
}) => {
    const getBackgroundColor = () => {
        switch (variant) {
            case 'primary': return Colors.primary;
            case 'secondary': return Colors.secondary;
            case 'outline': return 'transparent';
            default: return Colors.primary;
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'primary': return Colors.text.white;
            case 'secondary': return Colors.text.primary;
            case 'outline': return Colors.primary;
            default: return Colors.text.white;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.outline,
                style
            ]}
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[
                    styles.text,
                    { color: getTextColor() },
                    textStyle
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    outline: {
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    text: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.body,
        fontWeight: '500',
    },
});

import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAnimePress } from './Anime';

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
            case 'primary': return '#FFFFFF';
            case 'secondary': return Colors.text;
            case 'outline': return Colors.primary;
            default: return '#FFFFFF';
        }
    };

    const { pressHandlers, animatedStyle } = useAnimePress(0.96);

    return (
        <Pressable
            onPress={onPress}
            disabled={loading}
            {...pressHandlers}
        >
            <Animated.View
                style={[
                    styles.button,
                    { backgroundColor: getBackgroundColor() },
                    variant === 'outline' && styles.outline,
                    style,
                    animatedStyle
                ]}
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
            </Animated.View>
        </Pressable>
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

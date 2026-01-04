import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { LucideIcon } from 'lucide-react-native';

interface QuickActionProps {
    title: string;
    icon: LucideIcon;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
}

export const QuickAction: React.FC<QuickActionProps> = ({
    title,
    icon: Icon,
    onPress,
    variant = 'secondary'
}) => {
    const isPrimary = variant === 'primary';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isPrimary ? styles.primaryBg : styles.secondaryBg
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[
                styles.iconContainer,
                isPrimary ? styles.iconPrimary : styles.iconSecondary
            ]}>
                <Icon
                    size={24}
                    color={isPrimary ? Colors.card : Colors.primary}
                />
            </View>
            <Text style={[
                styles.title,
                isPrimary ? styles.textPrimary : styles.textSecondary
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        // Shadow
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        height: 140, // Fixed height for square look
    },
    primaryBg: {
        backgroundColor: Colors.primary,
    },
    secondaryBg: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconPrimary: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    iconSecondary: {
        backgroundColor: Colors.accent,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        textAlign: 'center',
    },
    textPrimary: {
        color: Colors.card,
    },
    textSecondary: {
        color: Colors.primary,
    },
});

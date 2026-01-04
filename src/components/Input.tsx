import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    containerStyle,
    style,
    ...props
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    style
                ]}
                placeholderTextColor={Colors.text.secondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: Typography.fontFamily.regular,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        backgroundColor: Colors.text.white,
    },
    inputError: {
        borderColor: Colors.error,
    },
    errorText: {
        marginTop: 4,
        fontFamily: Typography.fontFamily.regular,
        fontSize: Typography.size.small,
        color: Colors.error,
    },
});
